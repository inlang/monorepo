import type { PluginSettings } from "../settings.js";
import { parse } from "./messageReferenceMatchers.js";

export const config = {
	messageReferenceMatchers: [
		async (args: { documentText: string; settings: PluginSettings }) => {
			return parse(args.documentText, args.settings);
		},
	],
	extractMessageOptions: [
		{
			callback: (args: { bundleId: string }) => ({
				bundleId: args.bundleId,
				messageReplacement: `{t("${args.bundleId}")}`,
			}),
		},
	],
	documentSelectors: [
		{
			language: "typescriptreact",
		},
		{
			language: "javascript",
		},
		{
			language: "typescript",
		},
		{
			language: "svelte",
		},
	],
};
