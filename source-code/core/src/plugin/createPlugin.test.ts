import { it, expect } from "vitest"
import { createPlugin } from "./createPlugin.js"
import type { InlangEnvironment } from "../environment/types.js"
import { expectType } from "tsd"
import type { InlangConfig } from "../config/schema.js"

it("should be possible to define a plugin without settings and the type should be undefined", () => {
	createPlugin(({ settings }) => {
		expectType<undefined>(settings)
		return {} as any
	})
})

it('should have defined settings if "createPlugin" is called with a settings type', () => {
	createPlugin<{ pathPattern: string }>((args) => {
		expectType<object>(args.settings)
		expectType<string>(args.settings?.pathPattern)
		return {} as any
	})
})

it("should be possible to define a plugin", () => {
	const myPlugin = createPlugin<{ pathPattern: string }>(({ settings }) => {
		return {
			id: "samuelstroschein.plugin-json",
			config: () => {
				if (settings?.pathPattern === undefined) {
					throw new Error("pathPattern is required")
				}
				return {
					languageTags: ["en", "de"],
				}
			},
		}
	})

	const plugin = myPlugin({ pathPattern: "" })({} as InlangEnvironment)
	expect(plugin.id).toEqual("samuelstroschein.plugin-json")
	expect(plugin.config({})).toEqual({
		languageTags: ["en", "de"],
	} satisfies Partial<InlangConfig>)
})

it("config function should receive config object", () => {
	const myPlugin = createPlugin(() => {
		return {
			id: "inlang.identity",
			config: (config) => {
				return {
					sourceLanguageTag: config.sourceLanguageTag,
				}
			},
		}
	})

	const plugin = myPlugin()({} as InlangEnvironment)
	expect(plugin.config({ sourceLanguageTag: "it" })).toEqual({
		sourceLanguageTag: "it",
	})
})
