import * as vscode from "vscode"
import { state } from "../state.js"
import { contextTooltip } from "./contextTooltip.js"
import { onDidEditMessage } from "../commands/editMessage.js"
import { getStringFromPattern } from "../utilities/query.js"
import { getActiveTextEditor } from "../utilities/initProject.js"

const MAXIMUM_PREVIEW_LENGTH = 40

export async function messagePreview(args: { context: vscode.ExtensionContext }) {
	const messagePreview = vscode.window.createTextEditorDecorationType({
		after: {
			margin: "0 0.5rem",
		},
	})

	async function updateDecorations() {
		const activeTextEditor = getActiveTextEditor()

		if (!activeTextEditor) {
			return
		}

		// TODO: this is a hack to prevent the message preview from showing up in the project.inlang.json file
		if (activeTextEditor.document.fileName.includes("project.inlang.json")) {
			return activeTextEditor.setDecorations(messagePreview, [])
		}

		// Get the reference language
		const sourceLanguageTag = state().project.settings()?.sourceLanguageTag
		const ideExtensionConfig = state().project.customApi()?.["app.inlang.ideExtension"]

		const messageReferenceMatchers = ideExtensionConfig?.messageReferenceMatchers

		if (sourceLanguageTag === undefined || messageReferenceMatchers === undefined) {
			// don't show an error message. See issue:
			// https://github.com/inlang/monorepo/issues/927
			return
		}

		// Get the message references
		const wrappedDecorations = (messageReferenceMatchers ?? []).map(async (matcher) => {
			const messages = await matcher({
				documentText: activeTextEditor.document.getText(),
			})
			return messages.map((message) => {
				const _message = state().project.query.messages.get({
					where: { id: message.messageId },
				})

				const variant = _message?.variants?.find((v) => v.languageTag === sourceLanguageTag)

				const translation = getStringFromPattern({
					pattern: variant?.pattern || [
						{
							type: "Text",
							value: "", // TODO: Fix pattern type to be always defined either/or Text / VariableReference
						},
					],
					languageTag: sourceLanguageTag,
					messageId: message.messageId,
				})

				const truncatedTranslation =
					translation &&
					(translation.length > (MAXIMUM_PREVIEW_LENGTH || 0)
						? `${translation.slice(0, MAXIMUM_PREVIEW_LENGTH)}...`
						: translation)

				const range = new vscode.Range(
					// VSCode starts to count lines and columns from zero
					new vscode.Position(
						message.position.start.line - 1,
						message.position.start.character - 1,
					),
					new vscode.Position(message.position.end.line - 1, message.position.end.character - 1),
				)
				const decoration: vscode.DecorationOptions = {
					range,
					renderOptions: {
						after: {
							contentText:
								truncatedTranslation === "" || truncatedTranslation === undefined
									? `ERROR: '${message.messageId}' not found in source with language tag '${sourceLanguageTag}'`
									: translation, // TODO: Fix pattern type to be always defined either/or Text / VariableReference
							backgroundColor: translation ? "rgb(45 212 191/.15)" : "drgb(244 63 94/.15)",
							border: translation
								? "1px solid rgb(45 212 191/.50)"
								: "1px solid rgb(244 63 94/.50)",
						},
					},
					hoverMessage: contextTooltip(message),
				}
				return decoration
			})
		})
		const decorations = (await Promise.all(wrappedDecorations || [])).flat()
		activeTextEditor.setDecorations(messagePreview, decorations)
	}

	// in case the active text editor is already open, update decorations
	updateDecorations()

	// immediately update decorations when the active text editor changes
	vscode.window.onDidChangeActiveTextEditor(
		() => updateDecorations(),
		undefined,
		args.context.subscriptions,
	)

	// update decorations when the text changes in a document
	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (event.document === vscode.window.activeTextEditor?.document) {
				updateDecorations()
			}
		},
		undefined,
		args.context.subscriptions,
	)

	// update decorations, when message was edited
	onDidEditMessage(() => updateDecorations())
}
