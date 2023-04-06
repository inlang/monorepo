import { browser } from "$app/environment"
import { initI18nRuntime, inlangSymbol, type Runtime } from "../inlang.js"
import type { LayoutLoad } from "./$types.js"

export const load = (async ({ fetch, data }) => {
	let runtime: Runtime | undefined = undefined

	if (browser) {
		const language = localStorage.getItem("inlang-language") || "en" // TODO: use `referenceLanguage`
		runtime = await initI18nRuntime(fetch, language)
		const i = runtime.getInlangFunction()

		console.info("+layout.ts", i("welcome"))
	}

	return { ...(data || {}), [inlangSymbol]: runtime }
}) satisfies LayoutLoad
