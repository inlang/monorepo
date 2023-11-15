import { state } from "../state.js"
import { msg } from "../utilities/message.js"
import { commands, type TextEditor, window, env, Uri } from "vscode"
import { telemetry } from "../services/telemetry/index.js"
import type { Message } from "@inlang/sdk"
import { CONFIGURATION } from "../configuration.js"

/**
 * Helps the user to extract messages from the active text editor.
 */
export const extractMessageCommand = {
	command: "inlang.extractMessage",
	title: "Inlang: Extract Message",
	register: commands.registerTextEditorCommand,
	callback: async function (textEditor: TextEditor) {
		const ideExtension = state().project.customApi()["app.inlang.ideExtension"]

		// guards
		if (!ideExtension) {
			return msg(
				"There is no `plugin` configuration for the inlang extension. One of the `modules` should expose a `plugin` which has `customApi` containing `app.inlang.ideExtension`",
				"warn",
				"notification"
			)
		}
		if (ideExtension.extractMessageOptions === undefined) {
			return msg(
				"The `extractMessageOptions` are not defined in `app.inlang.ideExtension` but required to extract a message.",
				"warn",
				"notification"
			)
		}
		if (state().project.settings()?.sourceLanguageTag === undefined) {
			return msg(
				"The `sourceLanguageTag` is not defined in the project.inlang.json but required to extract a message.",
				"warn",
				"notification"
			)
		}

		const messageId = await window.showInputBox({
			title: "Enter the ID:",
		})
		if (messageId === undefined) {
			return
		}

		const messageValue = textEditor.document.getText(textEditor.selection)

		const preparedExtractOptions = ideExtension.extractMessageOptions.reduce((acc, option) => {
			if (acc.includes(option.callback({ messageId, selection: messageValue }))) {
				return acc
			}
			return [...acc, option.callback({ messageId, selection: messageValue })]
		}, [] as { messageId: string; messageReplacement: string }[])

		const messageReplacements = preparedExtractOptions.map(
			({ messageReplacement }) => messageReplacement
		)

		const preparedExtractOption = await window.showQuickPick(
			[...messageReplacements, "How to edit these replacement options?"],
			{ title: "Replace highlighted text with:" }
		)
		if (preparedExtractOption === undefined) {
			return
		} else if (preparedExtractOption === "How to edit these replacement options?") {
			// TODO #152
			return env.openExternal(
				Uri.parse(
					"https://github.com/inlang/monorepo/tree/main/inlang/source-code/ide-extension#3%EF%B8%8F%E2%83%A3-configuration"
				)
			)
		}

		const selectedExtractOption = preparedExtractOptions.find(
			({ messageReplacement }) => messageReplacement === preparedExtractOption
		)

		if (selectedExtractOption === undefined) {
			return msg("Couldn't find choosen extract option.", "warn", "notification")
		}

		const message: Message = {
			id: selectedExtractOption.messageId,
			selectors: [],
			variants: [
				{
					languageTag: state().project.settings()?.sourceLanguageTag as string,
					match: [],
					pattern: [
						{
							type: "Text",
							value: messageValue,
						},
					],
				},
			],
		}

		// create message
		const success = state().project.query.messages.create({
			data: message,
		})

		if (!success) {
			return window.showErrorMessage(`Couldn't upsert new message with id ${messageId}.`)
		}

		await textEditor.edit((editor) => {
			editor.replace(textEditor.selection, preparedExtractOption)
		})

		// Emit event to notify that a message was extracted
		CONFIGURATION.EVENTS.ON_DID_EXTRACT_MESSAGE.fire()

		telemetry.capture({
			event: "IDE-EXTENSION command executed",
			properties: { name: "extract message" },
		})
		return msg("Message extracted.")
	},
} as const
