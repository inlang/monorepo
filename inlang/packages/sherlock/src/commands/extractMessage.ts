import { state } from "../utilities/state.js"
import { msg } from "../utilities/messages/msg.js"
import { commands, type TextEditor, window } from "vscode"
import { telemetry } from "../services/telemetry/index.js"
import { CONFIGURATION } from "../configuration.js"
import { isQuoted, stripQuotes } from "../utilities/messages/isQuoted.js"
import { getSetting } from "../utilities/settings/index.js"
import {
	humanId,
	upsertBundleNested,
	type IdeExtensionConfig,
	type NewBundleNested,
} from "@inlang/sdk"
import { v4 as uuidv4 } from "uuid"

/**
 * Helps the user to extract messages from the active text editor.
 */
export const extractMessageCommand = {
	command: "sherlock.extractMessage",
	title: "Sherlock: Extract Message",
	register: commands.registerTextEditorCommand,
	callback: async function (textEditor: TextEditor | undefined) {
		// Simulating an error to test the catch block
		// throw new Error("Forced error for testing");

		const ideExtension = (await state().project.plugins.get()).find(
			(plugin) => plugin?.meta?.["app.inlang.ideExtension"]
		)?.meta?.["app.inlang.ideExtension"] as IdeExtensionConfig | undefined

		const baseLocale = (await state().project.settings.get()).baseLocale

		if (!ideExtension) {
			return msg(
				"There is no `plugin` configuration for the Visual Studio Code extension (Sherlock). One of the `modules` should expose a `plugin` which has `customApi` containing `app.inlang.ideExtension`",
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

		if (textEditor === undefined) {
			return msg(
				"No active text editor found. Please open a file in the editor to extract a message.",
				"warn",
				"notification"
			)
		}

		if (textEditor.selection.isEmpty) {
			return msg("Please select a text to extract in your text editor.", "warn", "notification")
		}

		const autoHumanId = await getSetting("extract.autoHumanId.enabled").catch(() => true)
		const bundleId = await window.showInputBox({
			title: "Enter the ID:",
			value: autoHumanId ? humanId() : "",
			prompt:
				autoHumanId &&
				"Tip: It's best practice to use random names for your messages. Read this [guide](https://inlang.com/documentation/concept/message#idhuman-readable) for more information.",
		})

		if (bundleId === undefined) {
			return
		}

		const messageValue = textEditor.document.getText(textEditor.selection)

		const preparedExtractOptions = ideExtension.extractMessageOptions.reduce(
			(acc, option) => {
				const formattedSelection = isQuoted(messageValue) ? stripQuotes(messageValue) : messageValue
				const formattedOption = option.callback({
					bundleId,
					selection: formattedSelection,
				})

				if (acc.includes(formattedOption)) {
					return acc
				}
				return [...acc, formattedOption]
			},
			[] as { bundleId: string; messageReplacement: string }[]
		)

		const messageReplacements = preparedExtractOptions.map(
			({ messageReplacement }) => messageReplacement
		)

		const preparedExtractOption = await window.showQuickPick(messageReplacements, {
			title: "Replace highlighted text with:",
		})

		if (preparedExtractOption === undefined) {
			return msg("Couldn't find choosen extract option.", "warn", "notification")
		}

		const selectedExtractOption = preparedExtractOptions.find(
			({ messageReplacement }) => messageReplacement === preparedExtractOption
		)

		if (selectedExtractOption === undefined) {
			return msg("Couldn't find choosen extract option.", "warn", "notification")
		}

		const messageId = uuidv4()
		const bundle: NewBundleNested = {
			id: bundleId,
			declarations: [],
			messages: [
				{
					bundleId,
					id: messageId,
					locale: baseLocale,
					selectors: [],
					variants: [
						{
							messageId,
							matches: [],
							pattern: [
								{
									type: "text",
									value: isQuoted(messageValue) ? stripQuotes(messageValue) : messageValue,
								},
							],
						},
					],
				},
			],
		}

		try {
			await upsertBundleNested(state().project.db, bundle)

			await textEditor.edit((editor) => {
				editor.replace(textEditor.selection, preparedExtractOption)
			})

			CONFIGURATION.EVENTS.ON_DID_EXTRACT_MESSAGE.fire()

			telemetry.capture({
				event: "IDE-EXTENSION command executed: Extract Message",
			})

			return msg("Message extracted.")
		} catch (e) {
			return window.showErrorMessage(`Couldn't extract new message. ${e}`)
		}
	},
}
