import {
	LanguageTag,
	isValidLanguageTag,
	listProjects,
	loadProject,
	type InlangProject,
} from "@inlang/sdk"
import type { Repository } from "@lix-js/client"
import type { Logger } from "~/services/logger/index.js"
import type { CliStep } from "../utils.js"
import { prompt } from "~/cli/utils.js"
import { DEFAULT_PROJECT_PATH, getNewProjectTemplate } from "~/cli/defaults.js"
import nodePath from "node:path"
import consola from "consola"
import dedent from "dedent"

export const initializeInlangProject: CliStep<
	{ repo: Repository; logger: Logger; repoRoot: string; appId: string },
	{
		project: InlangProject
		/** Relative path to the project */
		projectPath: string
	}
> = async (ctx) => {
	const existingProjectPaths = (await listProjects(ctx.repo.nodeishFs, ctx.repoRoot)).map(
		(v) => v.projectPath
	)

	if (existingProjectPaths.length > 0) {
		const { project, projectPath } = await existingProjectFlow({
			existingProjectPaths,
			repo: ctx.repo,
			logger: ctx.logger,
			appId: ctx.appId,
		})

		return {
			...ctx,
			project,
			projectPath,
		}
	} else {
		const { project, projectPath } = await createNewProjectFlow(ctx)
		return {
			...ctx,
			project,
			projectPath,
		}
	}
}

export const existingProjectFlow = async (ctx: {
	/** An array of absolute paths to existing projects. */
	existingProjectPaths: string[]
	repo: Repository
	logger: Logger
	appId: string
}): Promise<{ project: InlangProject; projectPath: string }> => {
	const NEW_PROJECT_VALUE = "newProject"

	const commonPrefix = getCommonPrefix(ctx.existingProjectPaths)
	const options = ctx.existingProjectPaths.map((path) => {
		return {
			label: path.replace(commonPrefix, ""),
			value: path,
		}
	})

	const selection = (await prompt(
		`Do you want to use an existing Inlang Project or create a new one?`,
		{
			type: "select",
			options: [{ label: "Create a new project", value: NEW_PROJECT_VALUE }, ...options],
		}
	)) as unknown as string // the prompt type is incorrect

	//if the user wants to create a new project - create one & use it
	if (selection === NEW_PROJECT_VALUE) return createNewProjectFlow(ctx)

	const projectPath = selection
	const project = await loadProject({
		projectPath,
		repo: ctx.repo,
		appId: ctx.appId,
	})

	if (project.errors().length > 0) {
		ctx.logger.error(
			"Aborting paragilde initialization. - The selected project has errors. Either fix them, or remove the project and create a new one."
		)
		for (const error of project.errors()) {
			ctx.logger.error(error)
		}
		process.exit(1)
	}

	return { project, projectPath }
}

function parseLanguageTagInput(input: string): {
	validLanguageTags: LanguageTag[]
	invalidLanguageTags: string[]
} {
	const languageTags = input
		.replaceAll(/[,:\s]/g, " ") //replace common separators with spaces
		.split(" ")
		.filter(Boolean) //remove empty segments
		.map((tag) => tag.toLowerCase())

	const validLanguageTags: LanguageTag[] = []
	const invalidLanguageTags: string[] = []

	for (const tag of languageTags) {
		if (isValidLanguageTag(tag)) {
			validLanguageTags.push(tag)
		} else {
			invalidLanguageTags.push(tag)
		}
	}

	return {
		validLanguageTags,
		invalidLanguageTags,
	}
}

async function promptForLanguageTags(
	initialLanguageTags: LanguageTag[] = []
): Promise<LanguageTag[]> {
	const languageTagsInput =
		(await prompt("Which languages do you want to support?", {
			type: "text",
			placeholder: "en, de-ch, ar",
			initial: initialLanguageTags.length ? initialLanguageTags.join(", ") : undefined,
		})) ?? ""

	const { invalidLanguageTags, validLanguageTags } = parseLanguageTagInput(languageTagsInput)

	if (validLanguageTags.length === 0) {
		consola.warn("You must specify at least one language tag")
		return await promptForLanguageTags()
	}

	if (invalidLanguageTags.length > 0) {
		const message =
			invalidLanguageTags.length === 1
				? invalidLanguageTags[0] +
				  " isn't a valid language tag. Please stick to IEEE BCP-47 Language Tags"
				: invalidLanguageTags.map((tag) => `"${tag}"`).join(", ") +
				  " aren't valid language tags. Please stick to IEEE BCP-47 Language Tags"

		consola.warn(message)
		return await promptForLanguageTags(validLanguageTags)
	}

	return validLanguageTags
}
export const createNewProjectFlow = async (ctx: {
	repo: Repository
	logger: Logger
	appId: string
}): Promise<{
	project: InlangProject
	/** An absolute path to the created project */
	projectPath: string
}> => {
	const languageTags = await promptForLanguageTags()
	const settings = getNewProjectTemplate()

	//Should always be defined. This is to shut TS up
	const sourceLanguageTag = languageTags[0]
	if (!sourceLanguageTag) throw new Error("sourceLanguageTag is not defined")

	settings.languageTags = languageTags
	settings.sourceLanguageTag = sourceLanguageTag

	const messagePath = settings["plugin.inlang.messageFormat"].pathPattern

	//create the messages dir if it doesn't exist
	const messageDir = nodePath.dirname(nodePath.resolve(process.cwd(), messagePath))
	await ctx.repo.nodeishFs.mkdir(messageDir, { recursive: true })

	await Promise.allSettled(
		languageTags.map(async (languageTag) => {
			const languageFile = nodePath.resolve(messageDir, languageTag + ".json")
			await ctx.repo.nodeishFs.writeFile(
				languageFile,
				dedent`
                    {
                        "$schema": "https://inlang.com/schema/inlang-message-format"
                    }`
			)
		})
	)

	ctx.logger.info(`Creating a new inlang project in the current working directory.`)
	await ctx.repo.nodeishFs.mkdir(DEFAULT_PROJECT_PATH, { recursive: true })

	const settingsFilePath = nodePath.resolve(process.cwd(), DEFAULT_PROJECT_PATH, "settings.json")
	await ctx.repo.nodeishFs.writeFile(settingsFilePath, JSON.stringify(settings, undefined, 2))

	const projectPath = nodePath.resolve(process.cwd(), DEFAULT_PROJECT_PATH)
	const project = await loadProject({
		projectPath,
		repo: ctx.repo,
		appId: ctx.appId,
	})

	if (project.errors().length > 0) {
		ctx.logger.warn(
			"Failed to create a new inlang project.\n\nThis is likely an internal bug. Please file an issue at https://github.com/opral/monorepo."
		)
		for (const error of project.errors()) {
			ctx.logger.error(error)
		}
		return process.exit(1)
	} else {
		ctx.logger.success("Successfully created a new inlang project.")
	}
	return { project, projectPath }
}

/**
 * Get's the common prefix of a set of strings.
 * If only one string is passed the prefix will be the empty string
 *
 * @example
 * ```ts
 * getCommonPrefix(["foo", "foobar"]) // "foo"
 * getCommonPrefix(["foobar"]) // ""
 * ```
 */
export function getCommonPrefix(strings: string[]): string {
	const strs = strings.filter(Boolean)
	if (strs.length <= 1) return ""

	const firstString = strs[0]
	if (firstString === undefined) {
		return ""
	}

	return strs.reduce((commonPrefix, str) => longestCommonPrefix(commonPrefix, str), firstString)
}

function longestCommonPrefix(strA: string, strB: string): string {
	let commonPrefix = ""
	for (let i = 0; i < Math.min(strA.length, strB.length); i++) {
		if (strA[i] === strB[i]) {
			commonPrefix += strA[i]
		} else {
			break
		}
	}
	return commonPrefix
}
