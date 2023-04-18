import type * as Ast from "@inlang/core/ast"
import { getContext, setContext } from "svelte"
import { readonly, writable, type Readable } from "svelte/store"
import type { RelativeUrl } from "../../../../core/index.js"
import { inlangSymbol } from "../../shared/utils.js"
import type { SvelteKitClientRuntime } from "../index.js"
import type * as Runtime from "../../../../runtime/index.js"
import type { Language } from "@inlang/core/ast"

// ------------------------------------------------------------------------------------------------

export const localStorageKey = "language"

// ------------------------------------------------------------------------------------------------

export type RuntimeContext<
	Language extends Ast.Language = Ast.Language,
	InlangFunction extends Runtime.InlangFunction = Runtime.InlangFunction,
> = {
	language: Readable<Language>
	referenceLanguage: Language
	languages: Language[]
	i: Readable<InlangFunction>
	switchLanguage: (language: Language) => Promise<void>
	loadResource: SvelteKitClientRuntime["loadResource"]
	route: (href: RelativeUrl) => RelativeUrl
}

export const getRuntimeFromContext = (): RuntimeContext => getContext(inlangSymbol)

export const addRuntimeToContext = (runtime: SvelteKitClientRuntime) => {
	const _language = writable(runtime.language as Language)
	const _i = writable(runtime.i)

	const switchLanguage = async (language: Language) => {
		if (runtime.language === language) return

		await runtime.loadResource(language)

		runtime.switchLanguage(language)

		_i.set(runtime.i)
		_language.set(language)
	}

	setContext<RuntimeContext>(inlangSymbol, {
		language: readonly(_language),
		referenceLanguage: runtime.referenceLanguage,
		languages: runtime.languages,
		i: readonly(_i),
		loadResource: runtime.loadResource,
		switchLanguage,
		route,
	})
}

// TODO: output warning that calling this does not make sense
const route = (href: RelativeUrl) => href
