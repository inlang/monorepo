import * as vscode from "vscode"
import { state } from "../utilities/state.js"
import { contextTooltip } from "./contextTooltip.js"
import { getStringFromPattern } from "../utilities/messages/query.js"
import { CONFIGURATION } from "../configuration.js"
import { resolveEscapedCharacters } from "../utilities/messages/resolveEscapedCharacters.js"
import { getPreviewLocale } from "../utilities/locale/getPreviewLocale.js"
import { getSetting } from "../utilities/settings/index.js"
import { getExtensionApi, getSelectedBundleByBundleIdOrAlias } from "../utilities/helper.js"

const MAXIMUM_PREVIEW_LENGTH = 40

export async function messagePreview(args: { context: vscode.ExtensionContext }) {
	const messagePreview = vscode.window.createTextEditorDecorationType({})

	async function updateDecorations() {
		const activeTextEditor = vscode.window.activeTextEditor
		const inlineAnnotationsEnabled = vscode.workspace
			.getConfiguration()
			.get<boolean>("sherlock.inlineAnnotations.enabled", true)

		if (!activeTextEditor) {
			return
		}

		// TODO: this is a hack to prevent the message preview from showing up in the project.inlang/settings file
		if (activeTextEditor.document.fileName.includes("project.inlang")) {
			return activeTextEditor.setDecorations(messagePreview, [])
		}

		// Get the reference language
		const baseLocale = (await state().project.settings.get()).baseLocale
		const extensionApi = await getExtensionApi()

		if (!extensionApi) return

		if (baseLocale === undefined || extensionApi.messageReferenceMatchers === undefined) {
			// don't show an error message. See issue:
			// https://github.com/opral/monorepo/issues/927
			return
		}

		const editorInfoColors = {
			foreground: await getSetting("editorColors.info.foreground").catch(
				() => new vscode.ThemeColor("editorInfo.foreground")
			),
			background: await getSetting("editorColors.info.background").catch(
				() => new vscode.ThemeColor("editorInfo.background")
			),
			border: await getSetting("editorColors.info.border").catch(
				() => new vscode.ThemeColor("editorInfo.border")
			),
		}
		const editorErrorColors = {
			foreground: await getSetting("editorColors.error.foreground").catch(
				() => new vscode.ThemeColor("editorError.foreground")
			),
			background: await getSetting("editorColors.error.background").catch(
				() => new vscode.ThemeColor("editorError.background")
			),
			border: await getSetting("editorColors.error.border").catch(
				() => new vscode.ThemeColor("editorError.border")
			),
		}

		// Get the message references
		const wrappedDecorations = (extensionApi.messageReferenceMatchers ?? []).map(
			async (matcher) => {
				const bundles = await matcher({
					documentText: activeTextEditor.document.getText(),
				})

				return bundles.map(async (bundle) => {
					// @ts-ignore TODO: Introduce deprecation message for messageId
					bundle.bundleId = bundle.bundleId || bundle.messageId
					// Retrieve the bundle and messages
					const _bundle = await getSelectedBundleByBundleIdOrAlias(bundle.bundleId)

					// Get the message from the bundle
					const message = _bundle?.messages.find((m) => m.locale === baseLocale)

					const variant =
						message?.variants.find((v) => v.matches.some((m) => m.type === "catchall-match")) ||
						message?.variants[0]

					const previewLocale = await getPreviewLocale()
					const translationLocale = previewLocale.length ? previewLocale : baseLocale

					const translationString = variant
						? getStringFromPattern({
								pattern: variant.pattern || [
									{
										type: "text",
										value: "", // TODO: Fix pattern type to be always defined either/or Text / VariableReference
									},
								],
								locale: translationLocale,
								messageId: variant.messageId,
							})
						: ""

					const translation = resolveEscapedCharacters(translationString)

					const truncatedTranslation =
						translation &&
						(translation.length > (MAXIMUM_PREVIEW_LENGTH || 0)
							? `${translation.slice(0, MAXIMUM_PREVIEW_LENGTH)}...`
							: translation)

					const range = new vscode.Range(
						new vscode.Position(
							bundle.position.start.line - 1,
							bundle.position.start.character - 1
						),
						new vscode.Position(bundle.position.end.line - 1, bundle.position.end.character - 1)
					)

					const decoration: vscode.DecorationOptions = {
						range,
						renderOptions: inlineAnnotationsEnabled
							? {
									after: {
										margin: "0 0.5rem",
										contentText:
											truncatedTranslation === "" || truncatedTranslation === undefined
												? `ERROR: '${bundle.bundleId}' not found in source with language tag '${baseLocale}'`
												: translation,
										backgroundColor: translation
											? editorInfoColors.background
											: editorErrorColors.background,
										color: translation ? editorInfoColors.foreground : editorErrorColors.foreground,
										border: `1px solid ${
											translation ? editorInfoColors.border : editorErrorColors.border
										}`,
									},
								}
							: undefined,
						hoverMessage: await contextTooltip(bundle),
					}
					return decoration
				})
			}
		)
		const decorations = (await Promise.all(wrappedDecorations || [])).flat()
		const unwrappedDecorations = await Promise.all(decorations)
		activeTextEditor.setDecorations(messagePreview, unwrappedDecorations)
	}

	// in case the active text editor is already open, update decorations
	updateDecorations()

	// immediately update decorations when the active text editor changes
	vscode.window.onDidChangeActiveTextEditor(
		() => updateDecorations(),
		undefined,
		args.context.subscriptions
	)

	// update decorations when the text changes in a document
	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (event.document === vscode.window.activeTextEditor?.document) {
				updateDecorations()
			}
		},
		undefined,
		args.context.subscriptions
	)

	// update decorations, when message was edited / extracted
	CONFIGURATION.EVENTS.ON_DID_EDIT_MESSAGE.event(() => {
		updateDecorations()
	})

	CONFIGURATION.EVENTS.ON_DID_EXTRACT_MESSAGE.event(() => updateDecorations())
	CONFIGURATION.EVENTS.ON_DID_CREATE_MESSAGE.event(() => updateDecorations())
	CONFIGURATION.EVENTS.ON_DID_PREVIEW_LOCALE_CHANGE.event(() => updateDecorations())

	vscode.workspace.onDidChangeConfiguration(
		(event) => {
			if (event.affectsConfiguration("sherlock.inlineAnnotations.enabled")) {
				updateDecorations()
			}
		},
		undefined,
		args.context.subscriptions
	)
}
