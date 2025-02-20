import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"
import { openProjectCommand } from "./openProject.js"

vi.mock("vscode", () => ({
	commands: {
		registerCommand: vi.fn(),
	},
	EventEmitter: vi.fn(),
	workspace: {
		workspaceFolders: [],
		findFiles: vi.fn().mockResolvedValue([]),
	},
	workspaceFolder: {
		uri: {
			fsPath: "/test/path",
		},
	},
	CodeActionKind: {
		QuickFix: vi.fn(),
	},
}))

describe("openProjectCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should register the command correctly", () => {
		openProjectCommand.register(openProjectCommand.command, openProjectCommand.callback)
		expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
			openProjectCommand.command,
			expect.any(Function)
		)
	})
})
