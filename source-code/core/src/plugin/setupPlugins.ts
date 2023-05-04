import type { InlangConfig } from "../config/schema.js"
import type { Plugin, PluginSetupFunction } from "./types.js"
import { PluginSetupError } from "./errors/PluginSetupError.js"
import { deepmergeInto } from "deepmerge-ts"
import type { InlangEnvironment } from "../environment/types.js"

export type ConfigWithSetupPlugins = Omit<Partial<InlangConfig>, "plugins"> & {
	plugins: Plugin[]
}

/**
 * Setup the plugins and process the config callback.
 *
 * The function mutates the config object. Mutating the config object
 * is expected to:
 *
 * 	1. decrease the initial startup time of inlang apps with 10+ plugins
 *     (immutability is expensive).
 * 	2. leads to a lightly better API for `setupConfig`.
 *	3. plugins configs are only merged
 *
 * We can change this behaviour
 * if required as this function is only used internally.
 *
 */
export async function setupPlugins(args: {
	config: Partial<InlangConfig>
	env: InlangEnvironment
}): Promise<ConfigWithSetupPlugins> {
	if (args.config.plugins === undefined) {
		args.config.plugins = []
		return args.config as ConfigWithSetupPlugins
	}

	// Note: we can't use structuredClone because the object could contain functions
	// To have some sort of immutability (for the first level), we destructure it into a new object
	const mergedConfig = { ...args.config }
	for (let i = 0; i < args.config.plugins.length; i++) {
		try {
			// If a plugin uses a setup function, the setup function needs to be invoked.
			if (typeof args.config.plugins[i] === "function") {
				args.config.plugins[i] = (args.config.plugins[i] as PluginSetupFunction)(args.env)
			}
			const plugin = args.config.plugins[i] as Plugin
			const config = await plugin?.config({ ...mergedConfig })
			deepmergeInto(mergedConfig, config)
		} catch (error) {
			// continue with next plugin.
			// if one plugin fails, the whole app should not crash.
			console.error(
				new PluginSetupError(`Failed to setup plugin '${(args.config.plugins[i] as Plugin)?.id}'`, {
					cause: error,
				}),
			)
		}
	}

	// remove duplicates from languages in case multiple plugins add the same language.
	mergedConfig.languages = [...new Set(mergedConfig.languages)]

	return mergedConfig as ConfigWithSetupPlugins
}
