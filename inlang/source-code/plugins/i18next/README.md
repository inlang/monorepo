# inlang-plugin-i18next

This plugin works with i18next to read and write messages. It also determines how translation functions and namespaces are parsed and handled by the IDE extension.

## Usage

```json
// filename: project.inlang.json

{
	"sourceLanguageTag": "en",
	"languageTags": ["en", "de", "it"],
	"modules": [
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-i18next@4/dist/index.js"
	],
	"settings": {
		"plugin.inlang.i18next": {
			"pathPattern": "./resources/{languageTag}.json"
		}
	}
}
```

## Settings

The plugin offers further configuration options that can be passed as arguments. The following settings exist:

```typescript
type PluginSettings = {
	pathPattern: string | { [key: string]: string }
	variableReferencePattern?: [string] | [string, string]
	sourceLanguageFilePath?: string
}
```

### `pathPattern`

To use our plugin, you need to provide a path to the directory where your language-specific files are stored. Use the dynamic path syntax `{languageTag}` to specify the language name.

#### Without namespaces

```json
"pathPattern": "./resources/{languageTag}.json"
```

#### With namespaces

> Does not get created by 'npx @inlang/cli config init'

```json
"pathPattern": {
	"common": "./resources/{languageTag}/common.json",
	"vital": "./resources/{languageTag}/vital.json"
}
```

`key` (prefix): is prefixing the key with a colon
`values` (path): is the path to the namespace resources

### `variableReferencePattern`

Defines the pattern for variable references. The default is how i18next suggests the usage of placeholders.

default:

```json
"variableReferencePattern": ["{{", "}}"]
```

## IDE-extension usage

The plugin automatically informs the [IDE extension](https://inlang.com/marketplace/app.inlang.ideExtension) how to extract keys and namespaces from your code in order to display inline annotations.

### In-code usage

`t("key")`

With namespaces:

`t("namespace:key")` or `t("key", { ns: "namespace" })`

To learn about namespaces and how to use translation functions in your code, you can refer to [i18next documentation](https://www.i18next.com/principles/namespaces). The plugin is capable of parsing the code and providing the IDE-extension with this information.

## Expected behavior

The message IDs are sorted in the order in which they appear in the sourceLanguage file. The nesting or flattening of IDs is detected on a file-by-file basis. If the sourceLanguage file contains nested IDs, the plugin will also create nested IDs in the targetLanguage files. If the sourceLanguage file contains flattened IDs, the plugin will also create flattened IDs in the targetLanguage files.

## Contributing

### Getting started

Run the following commands in your terminal (node and npm must be installed):

1. `npm install`
2. `npm run dev`

`npm run dev` will start the development environment which automatically compiles the [src/index.ts](./src/index.ts) files to JavaScript ([dist/index.js](dist/index.js)), runs tests defined in `*.test.ts` files and watches changes.

### Publishing

Run `npm run build` to generate a build.

The [dist](./dist/) directory is used to distribute the plugin directly via CDN like [jsDelivr](https://www.jsdelivr.com/). Using a CDN works because the inlang config uses dynamic imports to import plugins.

Read the [jsDelivr documentation](https://www.jsdelivr.com/?docs=gh) on importing from GitHub.

---

_Is something unclear or do you have questions? Reach out to us in our [Discord channel](https://discord.gg/9vUg7Rr) or open a [Discussion](https://github.com/inlang/monorepo/discussions) or an [Issue](https:github.com/inlang/monorepong/issues) on [Github](httpgithub.com/inlang/monorepolang)._
