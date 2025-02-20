import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import {
	createErrorNode,
	createErrorNodes,
	getTreeItem,
	createErrorTreeDataProvider,
	errorView,
} from "./errors.js"
import { state } from "../state.js"
import { CONFIGURATION } from "../../configuration.js"

vi.mock("vscode", () => ({
	TreeItem: vi.fn(),
	ThemeIcon: vi.fn().mockImplementation((iconName) => iconName),
	ThemeColor: vi.fn().mockImplementation((colorName) => colorName),
	TreeItemCollapsibleState: {
		None: 0,
	},
	window: {
		registerTreeDataProvider: vi.fn(),
	},
	commands: {
		registerCommand: vi.fn(),
	},
	EventEmitter: vi.fn(),
	env: {
		clipboard: {
			writeText: vi.fn(),
		},
	},
	CodeActionKind: {
		QuickFix: vi.fn(),
	},
}))

// Mock the state module
vi.mock("../state.js", () => ({
	state: vi.fn(),
}))

describe("error handling", () => {
	beforeEach(() => {
		// Clear all mocks and reset state to avoid leaks between tests
		vi.clearAllMocks()
		vi.resetAllMocks()
	})

	it("creates an error node for an actual error", () => {
		const error = new Error("Test Error")
		const errorNode = createErrorNode(error)
		expect(errorNode).toEqual({
			label: "Error",
			tooltip: "Test Error",
			description: "Test Error",
			error,
		})
	})

	it("creates an error node for no project in workspace", () => {
		const errorNode = createErrorNode(undefined)
		expect(errorNode).toEqual({
			label: "No project found in workspace",
			tooltip:
				"No project found in workspace. Please open a project to see errors. To create a new project, visit https://manage.inlang.com",
			error: new Error(
				"No project found in workspace. Please open a project to see errors. To create a new project, visit https://manage.inlang.com"
			),
		})
	})

	it("creates an error node when there are no errors", () => {
		const errorNode = createErrorNode(0)
		expect(errorNode).toEqual({
			label: "No errors found",
			tooltip: "All good!",
			error: undefined,
		})
	})

	it("creates a single error node when there are no errors", async () => {
		vi.mocked(state).mockReturnValue({
			// @ts-expect-error
			project: {
				errors: {
					get: vi.fn().mockResolvedValue([]),
				},
			},
		})

		const nodes = await createErrorNodes()
		expect(nodes).toHaveLength(1)
		expect(nodes[0]).toEqual({
			label: "No errors found",
			tooltip: "All good!",
			error: undefined,
		})
	})

	it("creates a tree item from an error node", () => {
		const errorNode = {
			label: "Test Error",
			tooltip: "Error message",
			description: "Error message",
			error: new Error("Error message"),
		}

		const treeItem = getTreeItem(errorNode)
		expect(treeItem.tooltip).toBe("Error message")
		expect(treeItem.description).toBe("Error message")
		expect(treeItem.iconPath).toEqual(
			new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"))
		)
	})

	it("creates a tree data provider", () => {
		const provider = createErrorTreeDataProvider()
		expect(provider).toBeDefined()
		expect(typeof provider.getTreeItem).toBe("function")
		expect(typeof provider.getChildren).toBe("function")
		expect(provider.onDidChangeTreeData).toBe(
			CONFIGURATION.EVENTS.ON_DID_ERROR_TREE_VIEW_CHANGE.event
		)
	})

	it("registers error view", async () => {
		const mockContext = { subscriptions: [] }
		await errorView({
			context: mockContext as unknown as vscode.ExtensionContext,
		})
		expect(mockContext.subscriptions).toHaveLength(1)
		expect(vscode.window.registerTreeDataProvider).toHaveBeenCalledWith(
			"errorView",
			expect.any(Object)
		)
	})
})
