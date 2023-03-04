import * as vscode from "vscode"
import { setState, state } from "../state.js"
import { query } from "@inlang/core/query"
import type { Message } from "@inlang/core/ast"

/**
 * Helps the user to extract messages from the active text editor.
 */
export const extractMessageCommand = {
	id: "inlang.extractMessage",
	title: "Inlang: Extract Message",
	callback: async function (textEditor: vscode.TextEditor) {
		const { ideExtension, referenceLanguage, writeResources } = state().config

		// guards
		if (!ideExtension) {
			return vscode.window.showWarningMessage(
				"There is no `ideExtension` object in the inlang.config.json configured.",
			)
		}
		if (ideExtension.extractMessageOptions === undefined) {
			return vscode.window.showWarningMessage(
				"The `extractMessageReplacementOptions` are not defined in the inlang.config.json but required to extract a message.",
			)
		} else if (referenceLanguage === undefined) {
			return vscode.window.showWarningMessage(
				"The `referenceLanguage` is not defined in the inlang.config.js but required to extract a message.",
			)
		}

		const messageId = await vscode.window.showInputBox({
			title: "Enter the ID:",
		})
		if (messageId === undefined) {
			return
		}

		const messageValue = textEditor.document.getText(textEditor.selection)
		const preparedExtractOptions = ideExtension.extractMessageOptions.map((option) =>
			option.callback(messageId, messageValue),
		)

		const preparedExtractOption = await vscode.window.showQuickPick(
			[...preparedExtractOptions, "How to edit these replacement options?"],
			{ title: "Replace highlighted text with:" },
		)
		if (preparedExtractOption === undefined) {
			return
		} else if (preparedExtractOption === "How to edit these replacement options?") {
			// TODO #152
			return vscode.env.openExternal(vscode.Uri.parse("https://github.com/inlang/inlang"))
		}

		if (preparedExtractOption === undefined) {
			return vscode.window.showWarningMessage("Couldn't find choosen extract option.")
		}

		const message: Message = {
			type: "Message",
			id: { type: "Identifier", name: messageId },
			pattern: {
				type: "Pattern",
				elements: [{ type: "Text", value: messageValue }],
			},
		}
		// find reference langauge resource
		const referenceResource = state().resources.find(
			(resource) => resource.languageTag.name === referenceLanguage,
		)
		if (referenceResource) {
			const newResource = query(referenceResource).upsert({ message })
			if (newResource.isOk) {
				const resources = state().resources.map((resource) =>
					resource.languageTag.name === referenceLanguage ? newResource.unwrap() : resource,
				)
				await writeResources({
					config: state().config,
					resources,
				})
				// update resources in extension state
				setState({ ...state(), resources })
			} else {
				return vscode.window.showErrorMessage("Couldn't upsert new message.")
			}
		}
		await textEditor.edit((editor) => {
			editor.replace(textEditor.selection, preparedExtractOption)
		})
		return vscode.window.showInformationMessage("Message extracted.")
	},
} as const
