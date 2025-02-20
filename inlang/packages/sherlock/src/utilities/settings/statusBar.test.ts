import * as vscode from "vscode"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { statusBar, showStatusBar } from "./statusBar.js"
import { state } from "../state.js"
import { getSetting } from "./index.js"
import { CONFIGURATION } from "../../configuration.js"

let lastStatusBarItem: any = undefined // Track the last status bar item created for testing

vi.mock("vscode", () => ({
	window: {
		createStatusBarItem: vi.fn().mockImplementation(() => {
			const statusBarMock = {
				dispose: vi.fn(),
				command: undefined,
				text: undefined,
				tooltip: undefined,
				show: vi.fn(),
			}
			lastStatusBarItem = statusBarMock
			return statusBarMock
		}),
	},
	StatusBarAlignment: {
		Right: 1,
	},
	commands: {
		registerCommand: vi.fn(),
	},
	EventEmitter: vi.fn().mockImplementation(() => ({
		event: vi.fn(),
	})),
	CodeActionKind: {
		QuickFix: vi.fn(),
	},
}))

vi.mock("../state", () => ({
	state: vi.fn().mockImplementation(() => ({
		project: {
			settings: {
				get: vi.fn().mockResolvedValueOnce({ baseLocale: "en", locales: ["en", "de"] }),
			},
		},
	})),
}))

vi.mock("./index", () => ({
	getSetting: vi.fn().mockResolvedValueOnce("de"),
}))

describe("statusBar", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should subscribe to the appropriate events", async () => {
		const context = {
			subscriptions: { push: vi.fn() },
		} as unknown as vscode.ExtensionContext
		await statusBar({ context })

		expect(context.subscriptions.push).toHaveBeenCalledTimes(2)
		expect(CONFIGURATION.EVENTS.ON_DID_PROJECT_TREE_VIEW_CHANGE.event).toHaveBeenCalled()
		expect(CONFIGURATION.EVENTS.ON_DID_PREVIEW_LOCALE_CHANGE.event).toHaveBeenCalled()
	})
})

describe("showStatusBar", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should create a new status bar item if it does not exist", async () => {
		await showStatusBar()
		expect(vscode.window.createStatusBarItem).toHaveBeenCalledTimes(1)
	})

	it("should dispose the existing status bar item if it exists", async () => {
		await showStatusBar()
		const disposeMock = lastStatusBarItem.dispose

		await showStatusBar()

		expect(disposeMock).toHaveBeenCalled()
	})

	it("should handle the case when previewLocale is not available", async () => {
		vi.mocked(getSetting).mockResolvedValueOnce("")
		await showStatusBar()
		expect(vscode.window.createStatusBarItem).toHaveBeenCalledTimes(1)
	})

	it("should not set previewLocale if it's not in settings.locales", async () => {
		vi.mocked(getSetting).mockResolvedValueOnce("es")
		await showStatusBar()

		expect(lastStatusBarItem.text).toBe("Sherlock: en")
	})
})
