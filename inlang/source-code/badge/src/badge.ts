import satori from "satori"
import { openRepository, createNodeishMemoryFs } from "@lix-js/client"
import { markup } from "./helper/markup.js"
import { readFileSync } from "node:fs"
import { telemetryNode } from "@inlang/telemetry"
import { removeCommas } from "./helper/removeCommas.js"
import { calculateSummary } from "./helper/calculateSummary.js"
import { caching } from "cache-manager"
import { type MessageLintReport, loadProject } from "@inlang/sdk"

const fontMedium = readFileSync(new URL("../assets/static/Inter-Medium.ttf", import.meta.url))
const fontBold = readFileSync(new URL("../assets/static/Inter-Bold.ttf", import.meta.url))

const cache = await caching("memory", {
	ttl: 60 * 60 * 24 * 1, // 1 day,
	sizeCalculation: () => 40000, // approx 40kb per badge
	maxSize: 1000 * 1000 * 1000 * 0.25, // 250 MB
})

export const badge = async (url: string) => {
	const fromCache = (await cache.get(url)) as string | undefined

	if (fromCache) {
		return fromCache
	}

	// initialize a lisa repo instance on each request to prevent cross request pollution
	const repo = await openRepository(url, { nodeishFs: createNodeishMemoryFs() })

	// Get the content of the project.inlang.json file
	await repo.nodeishFs.readFile("./project.inlang.json", { encoding: "utf-8" }).catch((e) => {
		if (e.code !== "ENOENT") throw e
		throw new Error("No project.inlang.json file found in the repository.")
	})

	const project = await loadProject({
		settingsFilePath: "./project.inlang.json",
		nodeishFs: repo.nodeishFs,
		_capture(id, props) {
			telemetryNode.capture({
				event: id,
				properties: props,
				distinctId: "unknown",
			})
		},
	})

	// access all messages via inlang instance query
	const messageIds = project.query.messages.includedMessageIds()

	const settings = project.settings()

	// TODO: async reports
	const MessageLintReportsAwaitable = (): Promise<MessageLintReport[]> => {
		return new Promise((resolve) => {
			let reports = project.query.messageLintReports.getAll()

			if (reports) {
				// reports where loaded
				setTimeout(() => {
					// this is a workaround. We do not know when the report changed. Normally this shouldn't be a issue for cli
					const newReports = project.query.messageLintReports.getAll()
					if (newReports) {
						resolve(newReports)
					}
				}, 200)
			} else {
				let counter = 0
				const interval = setInterval(() => {
					reports = project.query.messageLintReports.getAll()
					if (reports) {
						clearInterval(interval)
						resolve(reports)
					} else {
						counter += 1
					}

					if (counter > 30) {
						clearInterval(interval)
						resolve([])
					}
				}, 200)
			}
		})
	}

	const reports = await MessageLintReportsAwaitable()

	const { percentage, errors, warnings, numberOfMissingVariants } = calculateSummary({
		reports: reports,
		languageTags: settings.languageTags,
		messageIds: messageIds,
	})

	const vdom = removeCommas(markup(percentage, errors, warnings, numberOfMissingVariants))

	// render the image
	const image = await satori(
		// @ts-ignore
		vdom,
		{
			width: 340,
			height: 180,
			fonts: [
				{
					name: "Inter Medium",
					weight: 500,
					data: fontMedium,
				},
				{
					name: "Inter Bold",
					weight: 700,
					data: fontBold,
				},
			],
		},
	)

	await cache.set(url, image)
	const gitOrigin = await repo.getOrigin()

	telemetryNode.capture({
		event: "BADGE created",
		groups: { repository: gitOrigin },
		distinctId: "unknown",
	})
	telemetryNode.groupIdentify({
		groupType: "repository",
		groupKey: gitOrigin,
		properties: {
			name: gitOrigin,
		},
	})
	return image
}
