---
title: Config
href: /documentation/config
description: The reference for the config.
---

# {% $frontmatter.title %}

**The config powers all apps, plugins, and automations. One config file to cover all localization needs (see [design principles](/documentation/design-principles)).**

The config must be named `inlang.config.js`, exist at the root of a repository, and export an async function named `defineConfig`. Importing external modules is only permitted via the `$import` [environment function](/documentation/environment-functions) within the scope of the exported `defineConfig` function. Read the [plugin](/documentation/plugins) documenation for more information on how to use external modules.

## Example

```ts
// filename: inlang.config.js

/**
 * Using JSDoc to get typesafety.
 * Note: the npm package @inlang/core must be installed.
 * @type {import("@inlang/core/config").DefineConfig}
 */
export async function defineConfig(env) {
	// importing the json plugin
	const plugin = await env.$import(
		"https://cdn.jsdelivr.net/gh/samuelstroschein/inlang-plugin-json@1/dist/index.js",
	)

	const pluginConfig = {
		pathPattern: ".example/{language}.json",
	}

	return {
		referenceLanguage: "en",
		languages: await plugin.getLanguages({
			...env,
			pluginConfig,
		}),
		readResources: (args) => plugin.readResources({ ...args, ...env, pluginConfig }),
		writeResources: (args) => plugin.writeResources({ ...args, ...env, pluginConfig }),
	}
}
```

## Reference

Up-to-date reference can be found [in the repository](https://github.com/inlang/inlang/blob/main/source-code/core/src/config/schema.ts).
