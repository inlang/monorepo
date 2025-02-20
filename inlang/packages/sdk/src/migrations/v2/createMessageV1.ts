import type {
	MessageV1,
	PatternV1,
} from "../../json-schema/old-v1-message/schemaV1.js";

/**
 * @deprecated don't use the messageV1 type anymore.
 *
 * This function exists to ease migrations of v1 plugins to v2 plugins.
 * The tests can call `createMessageV1` to create a message object that satisfies the v1 schema.
 *
 * @example
 *   - createMessage("id", { "en": "Hello" })
 *   + createMessageV1("id", { "en": "Hello" })
 */
export const createMessageV1 = (
	id: string,
	patterns: Record<string, PatternV1 | string>
) =>
	({
		id,
		alias: {},
		selectors: [],
		variants: Object.entries(patterns).map(([languageTag, patterns]) => ({
			languageTag,
			match: [],
			pattern:
				typeof patterns === "string"
					? [
							{
								type: "Text",
								value: patterns,
							},
					  ]
					: patterns,
		})),
	} satisfies MessageV1);
