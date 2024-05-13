/* eslint-disable no-restricted-imports */
/* eslint-disable no-console */
import { findRepoRoot, openRepository } from "@lix-js/client"
import { loadProject, type Message, normalizeMessage } from "@inlang/sdk"
import { createMessage } from "../src/test-utilities/createMessage.js"
import { createSignal, createResource, createEffect } from "../src/reactivity/solid.js"

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { throttle } from "throttle-debounce"
import childProcess from "node:child_process"
import fs from "node:fs/promises"

import _debug from "debug"
const debug = _debug("load-test")

const throttleMessageGetAllEvents = 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const projectPath = join(__dirname, "project.inlang")

const mockServer = "http://localhost:3000"

const cli = `PUBLIC_SERVER_BASE_URL=${mockServer} pnpm inlang`
const translateCommand = cli + " machine translate -f -n --project ./project.inlang"

const isExperimentalPersistence = await checkExperimentalPersistence()

export async function runLoadTest(
	messageCount: number = 1000,
	translate: boolean = true,
	subscribeToMessages: boolean = true,
	subscribeToLintReports: boolean = false,
	watchMode: boolean = false
) {
	debug(
		"load-test start" +
			(watchMode ? " - watchMode on, ctrl C to exit" : "") +
			(isExperimentalPersistence ? " - using experimental persistence" : "")
	)
	if (translate && !process.env.MOCK_TRANSLATE_LOCAL && !(await isMockRpcServerRunning())) {
		console.error(
			`Please start the mock rpc server with "MOCK_TRANSLATE=true pnpm --filter @inlang/server dev"`
		)
		return
	}

	process.on("SIGINT", () => {
		debug("bye bye")
		process.exit(0)
	})

	await generateMessageFile(1)

	debug("opening repo and loading project")
	const repoRoot = await findRepoRoot({ nodeishFs: fs, path: __dirname })
	if (!repoRoot) {
		debug("no repo root.")
		return
	}
	const repo = await openRepository(repoRoot, { nodeishFs: fs })
	const project = await loadProject({ repo, projectPath })

	debug("subscribing to project.errors")
	project.errors.subscribe((errors) => {
		if (errors.length > 0) {
			debug(`load=test project errors ${errors[0]}`)
		}
	})

	const [messages, setMessages] = createSignal<readonly Message[]>()

	if (subscribeToMessages) {
		debug("subscribing to messages.getAll")
		let countMessagesGetAllEvents = 0

		const messagesGetAllEvent = throttle(
			throttleMessageGetAllEvents,
			(messages: readonly Message[]) => {
				debug(`messages getAll event: ${countMessagesGetAllEvents}, length: ${messages.length}`)
				setMessages(messages)
			}
		)

		createEffect(() => {
			countMessagesGetAllEvents++
			messagesGetAllEvent(project.query.messages.getAll())
		})
	}

	if (subscribeToLintReports) {
		debug("subscribing to messageLintReports.getAll")
		let countLintReportsGetAllEvents = 1

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [lintReports] = createResource(messages, async () => {
			const reports = await project.query.messageLintReports.getAll()
			debug(
				`lintReports getAll event: ${countLintReportsGetAllEvents++}, length: ${reports.length}`
			)
			return reports
		})
	}

	debug(`generating ${messageCount} messages`)
	await generateMessageFile(messageCount)

	if (translate) {
		debug("translating messages with inlang cli")
		await run(translateCommand)
	}

	debug("load-test done - " + (watchMode ? "watching for events" : "exiting"))

	if (watchMode) {
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 1000 * 60 * 60 * 24)
		})
	}
}

// experimental persistence message format
// async function generateMessageFile(messageCount: number) {

// inlang message format
async function generateMessageFile(messageCount: number) {
	if (isExperimentalPersistence) {
		const tempFile = join(__dirname, "project.inlang", "temp.json")
		const messageFile = join(__dirname, "project.inlang", "messages.json")

		const messages: Message[] = []
		for (let i = 1; i <= messageCount; i++) {
			messages.push(createMessage(`message_key_${i}`, { en: `Generated message (${i})` }))
		}
		await fs.writeFile(
			tempFile,
			JSON.stringify(messages.map(normalizeMessage), undefined, 2),
			"utf-8"
		)
		// overwrites existing messageFile
		// https://nodejs.org/docs/v20.12.1/api/fs.html#fsrenameoldpath-newpath-callback
		await fs.rename(tempFile, messageFile)
	} else {
		const messageDir = join(__dirname, "locales", "en")
		const messageFile = join(__dirname, "locales", "en", "common.json")

		await run(`mkdir -p ${messageDir}`)
		const messages: Record<string, string> = {}
		for (let i = 1; i <= messageCount; i++) {
			messages[`message_key_${i}`] = `Generated message (${i})`
		}
		await fs.writeFile(messageFile, JSON.stringify(messages, undefined, 2), "utf-8")
	}
}

async function checkExperimentalPersistence() {
	const settingsFile = join(__dirname, "project.inlang", "settings.json")
	const settings = JSON.parse(await fs.readFile(settingsFile, "utf-8"))
	return !!settings.experimental?.persistence
}

async function isMockRpcServerRunning(): Promise<boolean> {
	try {
		const req = await fetch(`${mockServer}/ping`)
		if (!req.ok) {
			console.error(`Mock rpc server responded with status: ${req.status}`)
			return false
		}
		const res = await req.text()
		const expected = `${mockServer} MOCK_TRANSLATE\n`
		if (res !== expected) {
			console.error(
				`Mock rpc server responded with: ${JSON.stringify(res)} instead of ${JSON.stringify(
					expected
				)}`
			)
			return false
		}
	} catch (error) {
		console.error(`Mock rpc server error: ${error} ${causeString(error)}`)
		return false
	}
	return true
}

function causeString(error: any): string {
	if (typeof error === "object" && error.cause) {
		if (error.cause.errors?.length) return error.cause.errors.join(", ")
		if (error.cause.code) return "" + error.cause.code
		return JSON.stringify(error.cause)
	}
	return ""
}

// run command in __dirname
// resolves promise with 0 or rejects promise with error
// inherits stdio so that vitest shows output
function run(command: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const p = childProcess.spawn(command, {
			cwd: __dirname,
			stdio: "inherit",
			shell: true,
			detached: false,
		})
		p.on("close", (code) => {
			if (code === 0) {
				resolve(0)
			} else {
				reject(new Error(`${command}: non-zero exit code ${code}`))
			}
		})
		p.on("error", (err) => {
			reject(err)
		})
	})
}
