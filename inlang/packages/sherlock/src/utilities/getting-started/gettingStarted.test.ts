import { describe, it, expect, vi } from "vitest"
import * as vscode from "vscode"
import { createNoProjectsFoundViewProvider, getNoProjectsFoundHtml } from "./gettingStarted.js"
vi.mock("vscode", () => ({
	commands: {
		registerCommand: vi.fn(),
	},
	window: {
		registerWebviewViewProvider: vi.fn(),
		createWebviewPanel: vi.fn(() => ({
			webview: {
				options: {},
				html: "",
				onDidReceiveMessage: vi.fn(),
				postMessage: vi.fn(),
				asWebviewUri: vi.fn(),
			},
		})),
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
	},
	WebviewView: class {
		webview = {
			options: {},
			html: "",
			onDidReceiveMessage: vi.fn(),
		}
	},
	CancellationTokenSource: class {
		token = {}
	},
	EventEmitter: vi.fn(),
	Uri: {
		parse: vi.fn(),
		file: vi.fn(),
	},
	CodeActionKind: {
		QuickFix: vi.fn(),
	},
}))

describe("createNoProjectsFoundViewProvider", () => {
	it("should create a WebviewViewProvider", () => {
		const provider = createNoProjectsFoundViewProvider({
			workspaceFolder: {} as vscode.WorkspaceFolder,
		})
		expect(provider).toBeDefined()
		expect(typeof provider.resolveWebviewView).toBe("function")
	})

	it("should set webview options and HTML content correctly", () => {
		const mockWebviewView: vscode.WebviewView = {
			webview: {
				options: {},
				html: "",
				onDidReceiveMessage: vi.fn(),
			},
		} as unknown as vscode.WebviewView

		// Correctly structured mock context with 'state' property
		const mockContext = {
			state: {},
		}

		const mockToken = new vscode.CancellationTokenSource().token

		const provider = createNoProjectsFoundViewProvider({
			workspaceFolder: {} as vscode.WorkspaceFolder,
		})

		// Now pass the mockContext with the required 'state' property
		provider.resolveWebviewView(mockWebviewView, mockContext, mockToken)

		expect(mockWebviewView.webview.options.enableScripts).toBe(true)
		expect(mockWebviewView.webview.html).toContain("No Projects Found")
		expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled()
	})
})

describe("getNoProjectsFoundHtml", () => {
	it("should return the correct HTML string", () => {
		const html = getNoProjectsFoundHtml()
		expect(html).toContain("<title>No Projects Found</title>")
		expect(html).toContain("<h1>No project found</h1>")
		expect(html).toContain('onclick="createProject()"')
	})
})
