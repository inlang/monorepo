import type { LoadEvent } from "@sveltejs/kit"
import { initRuntime, type LookupFunction } from "@inlang/sdk-js/runtime"
import { getContext, setContext } from "svelte"
import { goto } from "$app/navigation"
import { page } from "$app/stores"
import { get } from "svelte/store"
import type { Resource } from "@inlang/core/ast"

// ------------------------------------------------------------------------------------------------

export const initI18nRuntime = async (fetch: LoadEvent["fetch"], language: string) => {
	const loadInlangData = <T>(url: string): Promise<T> =>
		fetch(`/inlang${url}`).then((response) => (response.ok ? response.json() : undefined))

	const runtime = initRuntime({
		readResource: async (language: string) => loadInlangData<Resource>(`/${language}`),
	})

	const [_, languages] = await Promise.all([
		runtime.loadResource(language),
		loadInlangData<string[]>(""), // TODO: only load this if `languages` get used somewhere
	])

	runtime.switchLanguage(language)

	return {
		...runtime,
		getLanguages: () => languages,
	}
}

// ------------------------------------------------------------------------------------------------

export const inlangSymbol = Symbol.for("inlang")

type Runtime = Awaited<ReturnType<typeof initI18nRuntime>>

export type I18nContext = {
	language: string
	languages: string[]
	i: LookupFunction
	switchLanguage: (language: string) => Promise<void>
	loadResource: Runtime["loadResource"]
	route: (href: RelativeUrl) => RelativeUrl
}

export const setI18nContext = (runtime: Runtime) => {
	const language = runtime.getLanguage() as string

	const switchLanguage = (language: string) => {
		if (runtime.getLanguage() === language) return

		const pathname = get(page).url.pathname
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [_, __, ...path] = pathname.split("/")
		return goto(`/${language}/${path.join("/")}`, {})
	}

	setContext(inlangSymbol, {
		language,
		languages: runtime.getLanguages(),
		i: runtime.getLookupFunction(),
		loadResource: runtime.loadResource,
		switchLanguage,
		route: route.bind(undefined, language),
	})
}

export const getI18nContext = (): I18nContext => getContext(inlangSymbol)

// ------------------------------------------------------------------------------------------------

type RelativeUrl = `/${string}`

export const route = (language: string, href: RelativeUrl) => {
	const url = `/${language}${href}`

	return (url.endsWith("/") ? url.slice(0, -1) : url) as RelativeUrl
}
