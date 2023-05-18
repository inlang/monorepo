import * as vscode from "vscode"
import { setState, state } from "../state.js"
import { query } from "@inlang/core/query"
import type { Message } from "@inlang/core/ast"
import { msg } from "../utils/message.js"
// import { telemetryNode } from "@inlang/telemetry"

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
			return msg(
				"There is no `ideExtension` object in the inlang.config.json configured.",
				"warn",
				"notification",
			)
		}
		if (ideExtension.extractMessageOptions === undefined) {
			return msg(
				"There are no `extractMessageOptions` in the `ideExtension` object in the inlang.config.json configured.",
				"warn",
				"notification",
			)
		}
		if (referenceLanguage === undefined) {
			return msg(
				"The `referenceLanguage` is not defined in the inlang.config.js but required to extract a message.",
				"warn",
				"notification",
			)
		}

		const messageId = await vscode.window.showInputBox({
			title: "Enter the ID:",
		})
		if (messageId === undefined) {
			return
		}

		const messageValue = textEditor.document.getText(textEditor.selection)

		const preparedExtractOptions = ideExtension.extractMessageOptions.reduce((acc, option) => {
			// eslint-disable-next-line
			if (acc.find((accOption) => accOption === option.callback(messageId, messageValue))) {
				return acc
			}
			return [...acc, option.callback(messageId, messageValue)]
		}, [] as string[])

		const preparedExtractOption = await vscode.window.showQuickPick(
			[...preparedExtractOptions, "How to edit these replacement options?"],
			{ title: "Replace highlighted text with:" },
		)
		if (preparedExtractOption === undefined) {
			return
		} else if (
			preparedExtractOption ===
			"How to edit these replacement options? See `extractMessageOptions`."
		) {
			// TODO #152
			return vscode.env.openExternal(
				vscode.Uri.parse(
					"https://github.com/inlang/inlang/tree/main/source-code/ide-extension#3%EF%B8%8F%E2%83%A3-configuration",
				),
			)
		}

		if (preparedExtractOption === undefined) {
			return msg("Couldn't find choosen extract option.", "warn", "notification")
		}

		const message: Message = {
			type: "Message",
			id: { type: "Identifier", name: messageId },
			pattern: {
				type: "Pattern",
				elements: [{ type: "Text", value: messageValue }],
			},
		}
		// find reference language resource
		const referenceResource = state().resources.find(
			(resource) => resource.languageTag.name === referenceLanguage,
		)
		if (referenceResource) {
			const [newResource, exception] = query(referenceResource).upsert({ message })
			if (exception) {
				return vscode.window.showErrorMessage("Couldn't upsert new message. ", exception.message)
			}
			const resources = state().resources.map((resource) =>
				resource.languageTag.name === referenceLanguage ? newResource : resource,
			)
			await writeResources({
				config: state().config,
				resources,
			})
			// update resources in extension state
			setState({ ...state(), resources })
		}
		await textEditor.edit((editor) => {
			editor.replace(textEditor.selection, preparedExtractOption)
		})
		// telemetryNode.capture({
		// 	distinctId: "unknown",
		// 	event: "IDE-EXTENSION message extracted",
		// 	properties: {
		// 		config: state().config,
		// 	},
		// })
		return msg("Message extracted.")
	},
} as const
