import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"
import { state } from "../state.js"
import {
	createMessageHtml,
	createNoMessagesFoundHtml,
	createMessagesLoadingHtml,
	getHtml,
	getTranslationsTableHtml,
} from "./messages.js"

// Mocking vscode module and state module
vi.mock("vscode", () => ({
	window: {
		activeTextEditor: undefined,
		onDidChangeActiveTextEditor: vi.fn(),
		registerWebviewViewProvider: vi.fn(),
	},
	workspace: {
		onDidChangeTextDocument: vi.fn(),
		onDidChangeConfiguration: vi.fn(),
	},
	Uri: {
		joinPath: vi.fn(),
		file: vi.fn((path: string) => ({ fsPath: path })),
	},
	commands: {
		executeCommand: vi.fn(),
	},
	Webview: vi.fn(() => ({
		asWebviewUri: vi.fn(),
		cspSource: "cspSource",
	})),
	EventEmitter: vi.fn(),
	CodeActionKind: {
		QuickFix: vi.fn(),
	},
	extensions: {
		getExtension: vi.fn(() => ({
			exports: {
				context: {
					extensionUri: { fsPath: "/mocked/extension/path" },
				},
			},
		})),
	},
}))

vi.mock("../state.js", () => ({
	state: vi.fn(),
}))

describe("Message Webview Provider Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should create HTML for a message", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValue({
						baseLocale: "en",
						locales: ["en", "de"],
						experimental: {
							aliases: true,
						},
					}),
				},
			},
			selectedProjectPath: "/workspace/project",
		})

		// Creating a message HTML using the mocked data
		const html = await createMessageHtml({
			bundle: {
				id: "message-id",
				declarations: [],
				messages: [
					{
						id: "message-id",
						bundleId: "bundle-id",
						locale: "en",
						selectors: [],
						variants: [
							{
								id: "variant-id",
								matches: [],
								messageId: "message-id",
								pattern: [{ type: "text", value: "Hello" }],
							},
						],
					},
				],
			},
			isHighlighted: false,
			workspaceFolder: {
				uri: { fsPath: "/workspace/project" },
			} as vscode.WorkspaceFolder,
		})

		// Validating that the created HTML contains the expected content
		expect(html).toContain("message-id")
		expect(html).toContain("Hello")
	})

	it("should handle cases where settings are not available", async () => {
		// Mocking state to return a project with no specific settings
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValue({
						locales: [], // Handling undefined locales case
					}),
				},
			},
			selectedProjectPath: "/workspace/project",
		})

		// Creating a message HTML without aliases enabled
		const html = await createMessageHtml({
			bundle: {
				declarations: [],
				id: "message-id",
				messages: [],
			},
			isHighlighted: false,
			workspaceFolder: {
				uri: { fsPath: "/workspace/project" },
			} as vscode.WorkspaceFolder,
		})

		// Validating that the created HTML does not contain aliasValue since aliases are disabled
		expect(html).toContain("message-id")
		expect(html).not.toContain("aliasValue")
	})

	it("should create a translations table for a message", async () => {
		// Mocking state with valid locales
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValue({
						baseLocale: "en",
						locales: ["en", "de"], // Configured locales
					}),
				},
			},
			selectedProjectPath: "/workspace/project",
		})

		// Creating a translations table HTML
		const html = await getTranslationsTableHtml({
			bundle: {
				id: "message-id",
				declarations: [],
				messages: [
					{
						id: "message-id",
						bundleId: "bundle-id",
						locale: "en",
						selectors: [],
						variants: [
							{
								id: "variant-id",
								matches: [],
								messageId: "message-id",
								pattern: [{ type: "text", value: "Hello" }],
							},
						],
					},
					// German translation is missing (to test the "missing" message)
				],
			},
			workspaceFolder: {
				uri: { fsPath: "/workspace/project" },
			} as vscode.WorkspaceFolder,
		})

		// Update assertions to match new HTML structure
		expect(html).toContain('<span class="languageTag"><strong>en</strong></span>')
		expect(html).toContain("<button onclick=\"openEditorView('message-id')\">Hello</button>")
		expect(html).toContain('<span class="languageTag"><strong>de</strong></span>')
		expect(html).toContain("[missing]")
		expect(html).toContain("codicon-sparkle") // Machine translation button
	})

	it("should handle cases where there are no translations", async () => {
		// Mocking state with valid locales but no translations available
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValue({
						baseLocale: "en",
						locales: ["en", "de"], // Configured locales
					}),
				},
			},
			selectedProjectPath: "/workspace/project",
		})

		// Creating a translations table HTML with no translations available
		const html = await getTranslationsTableHtml({
			bundle: {
				declarations: [],
				id: "message-id",
				messages: [], // No messages for any locale
			},
			workspaceFolder: {
				uri: { fsPath: "/workspace/project" },
			} as vscode.WorkspaceFolder,
		})

		// Validate that the HTML indicates missing translations for each locale
		expect(html).toContain("en") // English section should still appear
		expect(html).toContain("[missing]") // Missing English translation
		expect(html).toContain("de") // German section should appear
		expect(html).toContain("[missing]") // Missing German translation
	})

	it("should create 'No Messages Found' HTML", () => {
		// Creating HTML for when no messages are found
		const html = createNoMessagesFoundHtml()

		// Validating that the created HTML contains the expected content
		expect(html).toContain("No messages found")
	})

	it("should create 'Loading Messages' HTML", () => {
		// Creating HTML for when messages are loading
		const html = createMessagesLoadingHtml()

		// Validating that the created HTML contains the expected content
		expect(html).toContain("Loading messages...")
	})

	it("should create the complete webview HTML", () => {
		// Mocking the context and webview
		const context = {
			extensionUri: vscode.Uri.file("/path/to/extension"),
		} as vscode.ExtensionContext

		// @ts-expect-error
		const webview = new vscode.Webview()

		// Creating the complete webview HTML
		const html = getHtml({
			mainContent: "<div>Main Content</div>",
			webview,
		})

		// Validating that the webview HTML contains the expected content
		expect(html).toContain("<div>Main Content</div>")
		expect(html).toContain("Content-Security-Policy")
	})
})
