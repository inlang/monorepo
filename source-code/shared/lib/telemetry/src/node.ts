import { publicEnv } from "../../../env.js"
import { PostHog } from "posthog-node"

export let telemetryNode: PostHog

/**
 * Initialize the telemetry client.
 *
 * This function should be called before using the `telemetry` variable.
 * Use initTelemetryBrowser in a browser context.
 */
export function initTelemetryNode() {
	if (publicEnv.PUBLIC_POSTHOG_TOKEN === undefined) {
		throw Error("PUBLIC_POSTHOG_TOKEN is not defined.")
	}
	if (telemetryNode === undefined) {
		telemetryNode = new PostHog(publicEnv.PUBLIC_POSTHOG_TOKEN, {
			host: "https://eu.posthog.com",
		})
	}
}
