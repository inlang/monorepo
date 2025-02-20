import { describe, it, beforeEach, expect, vi } from "vitest"
import { createMessageCommand } from "./createMessage.js"
import { msg } from "../utilities/messages/msg.js"
import { window, commands } from "vscode"
import { CONFIGURATION } from "../configuration.js"
import { getSetting } from "../utilities/settings/index.js"
import { telemetry } from "../services/telemetry/index.js"
import { humanId, upsertBundleNested } from "@inlang/sdk"
import { state } from "../utilities/state.js"
import { v4 as uuidv4 } from "uuid"

vi.mock("vscode", () => ({
	window: {
		showInputBox: vi.fn(),
		showErrorMessage: vi.fn(),
	},
	commands: {
		executeCommand: vi.fn(),
	},
	EventEmitter: vi.fn(),
}))

vi.mock("../utilities/messages/msg", () => ({
	msg: vi.fn(),
}))

vi.mock("../services/telemetry/index.js", () => ({
	telemetry: {
		capture: vi.fn(),
	},
}))

vi.mock("../configuration", () => ({
	CONFIGURATION: {
		EVENTS: {
			ON_DID_CREATE_MESSAGE: {
				fire: vi.fn(),
			},
		},
	},
}))

vi.mock("../utilities/settings", () => ({
	getSetting: vi.fn(),
}))

vi.mock("@inlang/sdk", () => ({
	humanId: vi.fn().mockReturnValue("randomBundleId123"),
	upsertBundleNested: vi.fn(),
}))

vi.mock("../utilities/state", () => ({
	state: vi.fn(),
}))

vi.mock("uuid", () => ({
	v4: vi.fn().mockReturnValue("mocked-uuid-123"),
}))

describe("createMessageCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return if message content input is cancelled", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValueOnce({ baseLocale: "en" }),
				},
			},
		})

		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce(undefined)
		await createMessageCommand.callback()
		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the message content:",
		})
		expect(msg).not.toHaveBeenCalled()
	})

	it("should handle message ID input cancellation", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValueOnce({ baseLocale: "de" }),
				},
			},
		})

		// Ensure getSetting always returns a Promise
		vi.mocked(getSetting).mockResolvedValueOnce(true)

		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Some message content")
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce(undefined)

		await createMessageCommand.callback()

		expect(window.showInputBox).toHaveBeenCalledTimes(2)
		expect(msg).not.toHaveBeenCalled()
	})

	it("should show error message if message creation fails", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValueOnce({ baseLocale: "en" }),
				},
			},
		})

		// Ensure getSetting always returns a Promise
		vi.mocked(getSetting).mockResolvedValueOnce(false)

		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Some message content")
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("messageId123")

		vi.mocked(upsertBundleNested).mockRejectedValueOnce(new Error("Some error"))

		await createMessageCommand.callback()

		expect(window.showErrorMessage).toHaveBeenCalledWith(
			"Couldn't upsert new message. Error: Some error"
		)
	})

	it("should create message and show success message", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValueOnce({ baseLocale: "en" }),
				},
			},
		})

		// Ensure getSetting always returns a Promise
		vi.mocked(getSetting).mockResolvedValueOnce(false)

		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Some message content")
		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("messageId123")

		vi.mocked(upsertBundleNested).mockResolvedValueOnce(true)

		await createMessageCommand.callback()

		expect(upsertBundleNested).toHaveBeenCalled()
		expect(CONFIGURATION.EVENTS.ON_DID_CREATE_MESSAGE.fire).toHaveBeenCalled()
		expect(telemetry.capture).toHaveBeenCalled()
		expect(msg).toHaveBeenCalledWith("Message created.")
	})

	it("should use humanId as default messageId if autoHumanId is true", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValueOnce({ baseLocale: "en" }),
				},
			},
		})

		vi.mocked(getSetting).mockResolvedValueOnce(true)

		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Some message content")

		await createMessageCommand.callback()

		expect(humanId).toHaveBeenCalled()
		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the ID:",
			value: "randomBundleId123",
			prompt:
				"Tip: It's best practice to use random names for your messages. Read this [guide](https://inlang.com/documentation/concept/message#idhuman-readable) for more information.",
		})
	})

	it("should not use humanId as default messageId if autoHumanId is false", async () => {
		vi.mocked(state).mockReturnValue({
			project: {
				// @ts-expect-error
				settings: {
					get: vi.fn().mockResolvedValueOnce({ baseLocale: "en" }),
				},
			},
		})

		vi.mocked(getSetting).mockResolvedValueOnce(false)

		// @ts-expect-error
		window.showInputBox.mockResolvedValueOnce("Some message content")

		await createMessageCommand.callback()

		expect(humanId).not.toHaveBeenCalled()
		expect(window.showInputBox).toHaveBeenCalledWith({
			title: "Enter the ID:",
			value: "",
			prompt: undefined,
		})
	})
})
