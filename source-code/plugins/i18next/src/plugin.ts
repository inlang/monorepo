import type { InlangConfig } from "@inlang/core/config"
import type { InlangEnvironment } from "@inlang/core/environment"
import type * as ast from "@inlang/core/ast"
import { createPlugin } from "@inlang/core/plugin"
import {
	throwIfInvalidSettings,
	type PluginSettings,
	type PluginSettingsWithDefaults,
} from "./settings.js"
import merge from "lodash.merge"
import {
	addNestedKeys,
	collectStringsWithParents,
	detectJsonSpacing,
	type ExtendedMessagesType,
} from "./helper.js"
import { ideExtensionConfig } from "./ideExtension/config.js"

export const plugin = createPlugin<PluginSettings>(({ settings, env }) => ({
	id: "inlang.plugin-i18next",
	async config() {
		// will throw if the settings are invalid,
		// leading to better DX because fails fast
		throwIfInvalidSettings(settings)

		const withDefaultSettings: PluginSettingsWithDefaults = {
			variableReferencePattern: ["{{", "}}"],
			...settings,
		}

		return {
			languages: await getLanguages({
				$fs: env.$fs,
				settings,
			}),
			readResources: (args) =>
				readResources({
					...args,
					$fs: env.$fs,
					settings: withDefaultSettings,
				}),
			writeResources: (args) =>
				writeResources({
					...args,
					$fs: env.$fs,
					settings: withDefaultSettings,
				}),
			ideExtension: ideExtensionConfig,
		} satisfies Partial<InlangConfig>
	},
}))

/**
 * Automatically derives the languages in this repository.
 */
async function getLanguages(args: { $fs: InlangEnvironment["$fs"]; settings: PluginSettings }) {
	// replace the path
	const [pathBeforeLanguage] = args.settings.pathPattern.split("{language}")
	if (pathBeforeLanguage === undefined) {
		throw new Error("pathPattern must contain {language} placeholder")
	}
	const paths = await args.$fs.readdir(pathBeforeLanguage)
	const languages: Array<string> = []
	for (const language of paths) {
		if (!language.includes(".")) {
			// this is a dir
			const languagefiles = await args.$fs.readdir(`${pathBeforeLanguage}${language}`)
			if (languagefiles.length === 0) {
				languages.push(language)
			} else {
				for (const languagefile of languagefiles) {
					// this is the file, check if the language folder contains .json files
					if (
						languagefile.endsWith(".json") &&
						!args.settings.ignore?.some((s) => s === language) &&
						!languages.includes(language)
					) {
						languages.push(language)
					}
				}
			}
		} else if (language.endsWith(".json") && !args.settings.ignore?.some((s) => s === language)) {
			// this is the file, remove the .json extension to only get language name
			languages.push(language.replace(".json", ""))
		}
	}
	return languages
}

/**
 * Reading resources.
 */
export async function readResources(
	// merging the first argument from config (which contains all arguments)
	// with the custom settings argument
	args: Parameters<InlangConfig["readResources"]>[0] & {
		$fs: InlangEnvironment["$fs"]
		settings: PluginSettingsWithDefaults
	},
): ReturnType<InlangConfig["readResources"]> {
	const result: ast.Resource[] = []
	const languages = await getLanguages(args)
	for (const language of languages) {
		const resourcePath = args.settings.pathPattern.replace("{language}", language)
		//try catch workaround because stats is not working
		try {
			// is file
			const stringifiedFile = (await args.$fs.readFile(resourcePath, {
				encoding: "utf-8",
			})) as string
			const space = detectJsonSpacing(
				(await args.$fs.readFile(resourcePath, {
					encoding: "utf-8",
				})) as string,
			)
			const extendedMessages = collectStringsWithParents(JSON.parse(stringifiedFile))

			//make a object out of the extendedMessages Array
			let parsedMassagesForAst: ExtendedMessagesType = {}
			extendedMessages.map((message) => {
				parsedMassagesForAst = {
					...parsedMassagesForAst,
					...{
						[message.id]: {
							value: message.value,
							parents: message.parents,
							keyName: message.keyName,
						},
					},
				}
			})
			result.push(
				parseResource(
					parsedMassagesForAst,
					language,
					space,
					args.settings.variableReferencePattern,
				),
			)
		} catch {
			// is directory
			let obj: any = {}
			const path = `${resourcePath.replace("/*.json", "")}`
			const files = await args.$fs.readdir(path)
			const space =
				files.length === 0
					? 2
					: detectJsonSpacing(
							(await args.$fs.readFile(`${path}/${files[0]}`, {
								encoding: "utf-8",
							})) as string,
					  )

			if (files.length !== 0) {
				//go through the files per language
				for (const languagefile of files) {
					const stringifiedFile = (await args.$fs.readFile(`${path}/${languagefile}`, {
						encoding: "utf-8",
					})) as string
					const fileName = languagefile.replace(".json", "")
					const extendedMessages = collectStringsWithParents(
						JSON.parse(stringifiedFile),
						[],
						fileName,
					)

					//make a object out of the extendedMessages Array
					let parsedMassagesForAst: ExtendedMessagesType = {}
					extendedMessages.map((message) => {
						parsedMassagesForAst = {
							...parsedMassagesForAst,
							...{
								[message.id]: {
									value: message.value,
									parents: message.parents,
									fileName,
									keyName: message.keyName,
								},
							},
						}
					})

					//merge the objects of every file
					obj = {
						...obj,
						...parsedMassagesForAst,
					}
				}
			}
			result.push(parseResource(obj, language, space, args.settings.variableReferencePattern))
		}
	}
	return result
}

/**
 * Parses a resource.
 *
 * @example parseResource(resource, en, 2,["{{", "}}"])
 */
function parseResource(
	messages: ExtendedMessagesType,
	language: string,
	space: number | string,
	variableReferencePattern: PluginSettingsWithDefaults["variableReferencePattern"],
): ast.Resource {
	return {
		type: "Resource",
		metadata: {
			space: space,
		},
		languageTag: {
			type: "LanguageTag",
			name: language,
		},
		body: Object.entries(messages).map(([id, value]) =>
			parseMessage(id, value, variableReferencePattern),
		),
	}
}

/**
 * Parses a message.
 *
 * @example parseMessage("testId", "test", ["{{", "}}"])
 */
function parseMessage(
	id: string,
	extendedMessage: ExtendedMessagesType[string],
	variableReferencePattern: PluginSettingsWithDefaults["variableReferencePattern"],
): ast.Message {
	const regex = variableReferencePattern[1]
		? new RegExp(
				`(\\${variableReferencePattern[0]}[^\\${variableReferencePattern[1]}]+\\${variableReferencePattern[1]})`,
				"g",
		  )
		: new RegExp(`(${variableReferencePattern}\\w+)`, "g")

	const newElements = []
	if (regex) {
		const splitArray = extendedMessage.value.split(regex)
		for (const element of splitArray) {
			if (regex.test(element)) {
				newElements.push({
					type: "Placeholder",
					body: {
						type: "VariableReference",
						name: variableReferencePattern[1]
							? element.slice(
									variableReferencePattern[0].length,
									// negative index, removing the trailing pattern
									-variableReferencePattern[1].length,
							  )
							: element.slice(variableReferencePattern[0].length),
					},
				})
			} else {
				if (element !== "") {
					newElements.push({
						type: "Text",
						value: element,
					})
				}
			}
		}
	} else {
		newElements.push({
			type: "Text",
			value: extendedMessage.value,
		})
	}

	return {
		type: "Message",
		metadata: {
			fileName: extendedMessage.fileName,
			parentKeys: extendedMessage.parents,
			keyName: extendedMessage.keyName,
		},
		id: {
			type: "Identifier",
			name: id,
		},
		pattern: {
			type: "Pattern",
			elements: newElements as Array<ast.Text | ast.Placeholder>,
		},
	}
}

/**
 * Writing resources.
 *
 * @example writeResources({resources, settings, $fs})
 */
async function writeResources(
	args: Parameters<InlangConfig["writeResources"]>[0] & {
		settings: PluginSettingsWithDefaults
		$fs: InlangEnvironment["$fs"]
	},
): ReturnType<InlangConfig["writeResources"]> {
	for (const resource of args.resources) {
		const resourcePath = args.settings.pathPattern.replace("{language}", resource.languageTag.name)
		// default to 2 spaces
		const space = resource.metadata?.space || 2

		if (resource.body.length === 0) {
			// make a dir if resource with no messages
			if (resourcePath.split(resource.languageTag.name.toString())[1].includes("/")) {
				await args.$fs.mkdir(
					resourcePath.replace(
						resourcePath.split(resource.languageTag.name.toString())[1].toString(),
						"",
					),
				)
				if (!resourcePath.includes("/*.json")) {
					await args.$fs.writeFile(resourcePath, JSON.stringify({}, undefined, space))
				}
			} else {
				await args.$fs.writeFile(resourcePath, JSON.stringify({}, undefined, space))
			}
		} else if (resourcePath.includes("/*.json")) {
			//deserialize the file names
			const clonedResource =
				resource.body.length === 0 ? {} : JSON.parse(JSON.stringify(resource.body))
			//get prefixes
			const fileNames: Array<string> = []

			clonedResource.map((message: ast.Message) => {
				if (!message.metadata?.fileName) {
					fileNames.push(message.id.name.split(".")[0])
				} else if (message.metadata?.fileName && !fileNames.includes(message.metadata?.fileName)) {
					fileNames.push(message.metadata?.fileName)
				}
			})
			for (const fileName of fileNames) {
				const filteredMassages = clonedResource
					.filter((message: ast.Message) => message.id.name.startsWith(fileName))
					.map((message: ast.Message) => {
						return {
							...message,
							id: {
								...message.id,
								name: message.id.name.replace(`${fileName}.`, ""),
							},
						}
					})
				const splitedResource: ast.Resource = {
					type: resource.type,
					languageTag: resource.languageTag,
					body: filteredMassages,
				}
				await args.$fs.writeFile(
					resourcePath.replace("*", fileName),
					serializeResource(splitedResource, space, args.settings.variableReferencePattern),
				)
			}
		} else {
			await args.$fs.writeFile(
				resourcePath,
				serializeResource(resource, space, args.settings.variableReferencePattern),
			)
		}
	}
}

/**
 * Serializes a resource.
 */
function serializeResource(
	resource: ast.Resource,
	space: number | string,
	variableReferencePattern: PluginSettingsWithDefaults["variableReferencePattern"],
): string {
	const result = {}
	for (const message of resource.body) {
		const msg: Record<string, string | Record<string, string>> = {}
		const serializedPattern = serializePattern(message.pattern, variableReferencePattern)
		if (message.metadata.keyName) {
			addNestedKeys(msg, message.metadata.parentKeys, message.metadata.keyName, serializedPattern)
		} else if (message.metadata.fileName) {
			msg[message.id.name.split(".").slice(1).join(".")] = serializedPattern
		} else {
			msg[message.id.name] = serializedPattern
		}
		// nested keys
		merge(result, msg)
	}
	return JSON.stringify(result, undefined, space)
}

/**
 * Serializes a pattern.
 */
function serializePattern(
	pattern: ast.Message["pattern"],
	variableReferencePattern: PluginSettingsWithDefaults["variableReferencePattern"],
) {
	const result = []
	for (const element of pattern.elements) {
		switch (element.type) {
			case "Text":
				result.push(element.value)
				break
			case "Placeholder":
				result.push(
					variableReferencePattern[1]
						? `${variableReferencePattern[0]}${element.body.name}${variableReferencePattern[1]}`
						: `${variableReferencePattern[0]}${element.body.name}`,
				)
				break
			default:
				throw new Error(`Unknown message pattern element of type: ${(element as any)?.type}`)
		}
	}
	return result.join("")
}
