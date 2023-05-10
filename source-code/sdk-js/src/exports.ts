import type { Language } from "@inlang/core/ast"
import type { InlangFunction } from "./runtime/inlang-function.js"
import type { Runtime } from "./runtime/runtime.js"
import type { RelativeUrl } from "./types.js"

const error = new Error(
	"You need to use the Inlang plugin to be able to use those imports. See https://inlang.com/docs/sdk",
)

export const referenceLanguage: Language = error as any

export const languages: Language = [error] as any

export const language: Language = error as any

export const i: InlangFunction = () => {
	throw error
}

export const switchLanguage: (language: Language) => Promise<void> = () => {
	throw error
}

export const loadResource: Runtime["loadResource"] = () => {
	throw error
}

export const route: (href: RelativeUrl) => RelativeUrl = () => {
	throw error
}
