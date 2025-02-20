import { commands } from "vscode"
import { telemetry } from "../services/telemetry/index.js"
import { editorView } from "../utilities/editor/editorView.js"
import * as vscode from "vscode"

export const openEditorViewCommand = {
	command: "sherlock.openEditorView",
	title: "Sherlock: Open Editor View",
	register: commands.registerCommand,
	callback: async function (args: { bundleId: string }) {
		const context = vscode.extensions.getExtension("inlang.vs-code-extension")?.exports.context

		if (!context) {
			console.error("Extension context is not available.")
			return
		}

		const editor = editorView({ context, initialBundleId: args.bundleId })
		await editor.createOrShowPanel()

		telemetry.capture({
			event: "IDE-EXTENSION Editor View opened",
			properties: { bundleId: args.bundleId },
		})
		return undefined
	},
}
