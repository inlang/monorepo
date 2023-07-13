import { dedent } from 'ts-dedent'
import { assertNoImportsFromSdkJs } from '../../ast-transforms/assertions.js'
import { findExport } from '../../ast-transforms/utils/exports.js'
import { addImport, isOptOutImportPresent } from '../../ast-transforms/utils/imports.js'
import { codeToSourceFile, nodeToCode } from '../../ast-transforms/utils/js.util.js'
import type { TransformConfig } from '../vite-plugin/config.js'
import { InlangSdkException } from '../vite-plugin/exceptions.js'
import { filePathForOutput } from '../vite-plugin/fileInformation.js'

export const transformLanguageJson = (filePath: string, config: TransformConfig, code: string) => {
	const sourceFile = codeToSourceFile(code, filePath)

	if (isOptOutImportPresent(sourceFile)) return code

	assertNoImportsFromSdkJs(sourceFile, filePath.replace(config.cwdFolderPath, ''))

	if (findExport(sourceFile, 'GET'))
		throw new InlangSdkException(dedent`
			The file (${filePathForOutput(config, filePath)}) already contains a 'GET' export.
			Please remove it as 'inlang' needs to inject it's own magic here.
		`)

	const codeToInsert = ''
	// TODO!!: test this case
	if (config.isStatic && config.inlang.sdk.resources.cache === "build-time")
		sourceFile.insertText(sourceFile.getPos(), dedent`
			export const prerender = true
		`)


	sourceFile.insertText(sourceFile.getPos(), dedent`
		export const GET = async ({ params: { language } }) => {
			await reloadResources()
			return json(getResource(language) || null)
		}
	`)

	if (config.svelteKit.version || "" >= "1.16.3") {
		addImport(sourceFile, "@inlang/sdk-js/adapter-sveltekit/server", "initState")

		// TODO!!: check if relative path is correct
		sourceFile.insertText(sourceFile.getPos(), dedent`
			export const entries = async () => {
				const { languages } = await initState(await import('../../../../inlang.config.js'))

				return languages.map(language => ({ language }))
			}
		`)
	}

	addImport(sourceFile, "@inlang/sdk-js/adapter-sveltekit/server", "getResource", "reloadResources")
	addImport(sourceFile, "@sveltejs/kit", "json")

	sourceFile.insertText(sourceFile.getText().length, codeToInsert)

	return nodeToCode(sourceFile)
}
