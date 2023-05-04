import { loadFile, type ProxifiedModule } from "magicast"
import { writeFile } from "node:fs/promises"
import { initConfig } from '../../config/index.js'
import { stat } from "node:fs/promises"

export const doesPathExist = async (path: string) => !!(await stat(path).catch(() => undefined))

export type TransformConfig = {
	languageInUrl: boolean
	isStatic: boolean
	srcFolder: string
	rootRoutesFolder: string
	hasAlreadyBeenInitialized: boolean
	sourceFileName?: string
	sourceMapName?: string
	isTypeScriptProject: boolean
}

const cwd = process.cwd()

let configPromise: Promise<TransformConfig> | undefined = undefined

export const getTransformConfig = async (): Promise<TransformConfig> => {
	if (configPromise) return configPromise

	// eslint-disable-next-line no-async-promise-executor
	return configPromise = new Promise<TransformConfig>(async (resolve) => {
		const srcFolder = cwd + "/src"
		const routesFolder = srcFolder + "/routes"

		await createInlangConfigIfNotPresentYet()

		const inlangConfig = await initConfig()

		const languageInUrl = inlangConfig?.sdk?.languageNegotiation?.strategies?.some(({ type }) => type === 'url') || false

		const rootRoutesFolder = routesFolder + "/(app)" + (languageInUrl ? "/[lang]" : "")
		const isStatic = await shouldContentBePrerendered(rootRoutesFolder)

		const hasAlreadyBeenInitialized = await doesPathExist(rootRoutesFolder)

		const isTypeScriptProject = await doesPathExist(cwd + '/tsconfig.json')

		resolve({
			languageInUrl,
			isStatic,
			srcFolder,
			rootRoutesFolder,
			hasAlreadyBeenInitialized,
			isTypeScriptProject,
		})
	})
}

export const resetConfig = () => configPromise = undefined

// ------------------------------------------------------------------------------------------------

const createInlangConfigIfNotPresentYet = async () => {
	const inlangConfigPath = cwd + "/inlang.config.js"
	const inlangConfigExists = await doesPathExist(inlangConfigPath)
	if (inlangConfigExists) return

	// TODO: use sdkPlugin once ready https://github.com/inlang/inlang/issues/610

	return writeFile(inlangConfigPath, `
/**
 * @type { import("@inlang/core/config").DefineConfig }
 */
export async function defineConfig(env) {
	const { default: jsonPlugin } = await env.$import(
		"https://cdn.jsdelivr.net/gh/samuelstroschein/inlang-plugin-json@2/dist/index.js"
	)
	const { default: sdkPlugin } = await env.$import(
		"https://cdn.jsdelivr.net/npm/@inlang/sdk-js/dist/plugin/index.js"
	)

	return {
		referenceLanguage: "en",
		plugins: [
			jsonPlugin({ pathPattern: "./languages/{language}.json" }),
			sdkPlugin({
				languageNegotiation: {
					strategies: [{ type: "localStorage" }, { type: "navigator" }]
				}
			}),
		],
	}
}
`)
}

// ------------------------------------------------------------------------------------------------

const shouldContentBePrerendered = async (routesFolder: string) => {
	const filesToLookFor = [
		'+layout.server.js',
		'+layout.server.ts',
		'+layout.js',
		'+layout.ts',
	]

	const modules = (await Promise.all(
		filesToLookFor.map(file => loadFile(routesFolder + `/${file}`).catch(() => undefined))
	))
		.filter(Boolean) as ProxifiedModule<any>[]

	return modules.map(mod => [true, 'auto'].includes(mod.exports.prerender))
		.some(Boolean)
}