import { createMockNodeishFs } from "@inlang/app/test"
import { it, beforeEach, vi, expect } from "vitest"
import {
	PATH_TO_CWD,
	PATH_TO_INLANG_CONFIG,
	PATH_TO_SVELTE_CONFIG,
	initTransformConfig,
	resetTransformConfig,
} from "./config.js"
import {
	openInlangProject,
	type InlangProject,
	ConfigPathNotFoundError,
	createReactiveQuery,
} from "@inlang/app"
import * as createBasicInlangConfigModule from "./utils/createBasicInlangConfig.js"
import { getNodeishFs } from "./utils/getNodeishFs.js"
import { createMessage } from "../../../test.util.js"
import { version } from "../../../../package.json"
import { InlangSdkException } from "../exceptions.js"

vi.mock("./utils/getNodeishFs.js")
vi.mock("@inlang/app", async () => {
	return {
		...(await vi.importActual<typeof import("@inlang/app")>("@inlang/app")),
		openInlangProject: vi.fn(),
	}
})

beforeEach(() => {
	vi.resetAllMocks()
	resetTransformConfig()
})

it.todo("should cache config creation", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementation(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig: () => undefined,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	const config1 = await initTransformConfig()
	expect(config1).toBeDefined()

	const config2 = await initTransformConfig()
	expect(config2).toBeDefined()
	expect(config2).toBe(config1)

	resetTransformConfig()
	const config3 = await initTransformConfig()
	expect(config3).not.toBe(config1)
})

it.todo("should create an inlang config file if no config is present yet", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [new ConfigPathNotFoundError("", {})],
			} as unknown as InlangProject),
	)

	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig: () => undefined,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	const spy = vi.spyOn(createBasicInlangConfigModule, "createBasicInlangConfig")

	await expect(() => fs.readFile(PATH_TO_INLANG_CONFIG, { encoding: "utf-8" })).rejects.toThrow()

	await initTransformConfig()

	expect(spy).toHaveBeenCalledOnce()
	expect(await fs.readFile(PATH_TO_INLANG_CONFIG, { encoding: "utf-8" })).toBeDefined()
})

it.todo("should update the sdk module version", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	const setConfig = vi.fn()
	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	await initTransformConfig()

	expect(setConfig).toHaveBeenCalledOnce()
	expect(setConfig).toHaveBeenNthCalledWith(1, {
		modules: [`https://cdn.jsdelivr.net/npm/@inlang/sdk-js-plugin@${version}/dist/index.js`],
	})
})

it.todo("should not update the sdk module version if already up2date", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	const setConfig = vi.fn()
	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: [`@inlang/sdk-js-plugin@${version}`] }),
				setConfig,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	await initTransformConfig()

	expect(setConfig).not.toHaveBeenCalled()
})

it.todo("should create demo resources if none are present yet", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	const create = vi.fn()
	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig: () => undefined,
				query: { messages: { getAll: () => [], create } },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	await initTransformConfig()

	expect(create).toHaveBeenCalledOnce()
})

it.todo("should add the sdk plugin module if not present yet", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	const setConfig = vi.fn()
	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: [] }),
				setConfig,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({}),
			} as unknown as InlangProject),
	)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig: () => undefined,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	await initTransformConfig()

	expect(setConfig).toHaveBeenCalledOnce()
	expect(setConfig).toHaveBeenNthCalledWith(1, {
		modules: ["../../../../../sdk-js-plugin/dist/index.js"],
	})
})

it.todo("should throw if the SDK is not configured properly", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig: () => undefined,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({ "inlang.app.sdkJs": {} }),
			} as unknown as InlangProject),
	)

	await expect(async () => initTransformConfig()).rejects.toThrow(InlangSdkException)
})

it("should throw if no svelte.config.js file is found", async () => {
	const fs = await createMockNodeishFs()

	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({ modules: ["@inlang/sdk-js-plugin"] }),
				setConfig: () => undefined,
				query: { messages: createReactiveQuery(() => [createMessage("hi", { en: "hello" })]) },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)

	await expect(async () => initTransformConfig()).rejects.toThrow(InlangSdkException)
})

it.todo("should correctly resolve the config", async () => {
	const fs = await createMockNodeishFs()
	await fs.mkdir(PATH_TO_CWD, { recursive: true })
	await fs.writeFile(PATH_TO_SVELTE_CONFIG, "export default {}")

	const create = vi.fn()
	const setConfig = vi.fn()
	vi.mocked(getNodeishFs).mockImplementation(async () => fs)
	vi.mocked(openInlangProject).mockImplementationOnce(
		async () =>
			({
				errors: () => [],
				config: () => ({
					sourceLanguageTag: "en",
					languageTags: ["en", "de"],
					modules: [`@inlang/sdk-js-plugin@${version}`],
				}),
				setConfig,
				query: { messages: { getAll: () => [createMessage("hi", { en: "hello" })], create } },
				appSpecificApi: () => ({
					"inlang.app.sdkJs": { languageNegotiation: { strategies: [{ type: "url" }] } },
				}),
			} as unknown as InlangProject),
	)
	const spy = vi.spyOn(createBasicInlangConfigModule, "createBasicInlangConfig")

	const config = await initTransformConfig()

	expect(spy).not.toHaveBeenCalled()
	expect(setConfig).not.toHaveBeenCalled()
	expect(create).not.toHaveBeenCalled()

	expect(config).toMatchInlineSnapshot(`
		{
		  "cwdFolderPath": "/home/ivanhofer/projects/inlang/inlang/source-code/sdk-js",
		  "debug": false,
		  "languageTags": [
		    "en",
		    "de",
		  ],
		  "messages": [Function],
		  "options": {
		    "excludedRoutes": [],
		    "isStatic": false,
		    "languageInUrl": true,
		    "resourcesCache": "build-time",
		    "rootRoutesFolder": "/home/ivanhofer/projects/inlang/inlang/source-code/sdk-js/src/routes/[lang]",
		  },
		  "sourceLanguageTag": "en",
		  "svelteKit": {
		    "files": {
		      "appTemplate": "/home/ivanhofer/projects/inlang/inlang/source-code/sdk-js/src/app.html",
		      "routes": "/home/ivanhofer/projects/inlang/inlang/source-code/sdk-js/src/routes",
		      "serverHooks": "/home/ivanhofer/projects/inlang/inlang/source-code/sdk-js/src/hooks.server",
		    },
		    "usesTypeScript": false,
		    "version": "1.0.0",
		  },
		}
	`)
})
