// inspired by (https://github.com/unicode-org/message-format-wg/blob/main/spec/syntax.md)

import type { LanguageTag } from "../languageTag.js"

/**
 * A message is what's rendered to a user.
 */
export type Message = {
	id: string
	languageTag: LanguageTag
	pattern: Array<Text | Placeholder>
}

/**
 * Text can be translated.
 */
export type Text = {
	type: "Text"
	value: string
}

export type Placeholder = {
	type: "Placeholder"
	// only variable reference for now, but will be extended in the future
	body: VariableReference
}

export type VariableReference = {
	type: "VariableReference"
	name: string
}
