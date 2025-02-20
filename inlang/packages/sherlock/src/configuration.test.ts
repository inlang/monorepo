import { it, expect, vi } from "vitest"
import packageJson from "../package.json"
import { CONFIGURATION } from "./configuration.js"

vi.mock("vscode", () => {
	return {
		commands: vi.fn(),
		EventEmitter: vi.fn(),
		CodeActionKind: {
			QuickFix: vi.fn(),
		},
	}
})

it("should contain all user facing commands", () => {
	const userFacingCommands = packageJson.contributes.commands.map((c) => c.command)
	const configuredCommands = Object.values(CONFIGURATION.COMMANDS).map((c) => c.command)

	expect(userFacingCommands.every((c) => configuredCommands.includes(c))).toBe(true)
})
