import type { TelemetryEvents } from "../services/telemetry/events.js"
import { telemetry } from "../services/telemetry/index.js"
import * as vscode from "vscode"
import packageJson from "../../package.json" assert { type: "json" }

// Utility Functions
export function telemetryCapture(event: TelemetryEvents, properties?: Record<string, any>) {
	telemetry.capture({
		event,
		properties: {
			vscode_version: vscode.version,
			version: packageJson.version,
			...properties,
		},
	})
}

export function handleError(error: any) {
	console.error(error)
}

export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;")
}
