import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"
import { openSettingsFileCommand } from "./openSettingsFile.js" // Adjust the import path

let documentOpened = false // Flag to track whether the document was opened

vi.mock("vscode", () => ({
	commands: {
		registerCommand: vi.fn(),
	},
	window: {
		showTextDocument: vi.fn(() => {
			// Simulate document opening by setting the 'documentOpened' flag
			documentOpened = true
		}),
		showErrorMessage: vi.fn(),
	},
	EventEmitter: vi.fn(),
	Uri: {
		file: vi.fn(),
	},
	CodeActionKind: {
		QuickFix: vi.fn(),
	},
}))

vi.mock("node:path", () => ({
	join: vi.fn(),
}))

describe("openSettingsFileCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		documentOpened = false // Reset the 'documentOpened' flag
	})

	it("should register the command correctly", () => {
		openSettingsFileCommand.register(
			openSettingsFileCommand.command,
			openSettingsFileCommand.callback
		)
		expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
			openSettingsFileCommand.command,
			expect.any(Function)
		)
	})

	it("should open the settings file", async () => {
		const mockNode = { path: "/path/to/project" } as any // Replace with actual mock data

		await openSettingsFileCommand.callback(mockNode)

		expect(documentOpened).toBe(true)
	})
})
