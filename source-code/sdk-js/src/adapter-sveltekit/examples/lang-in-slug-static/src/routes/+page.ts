import { inlangSymbol } from "../inlang.js"
import type { PageLoad } from "./$types.js"
import { detectLanguage, navigatorDetector } from "@inlang/sdk-js/detectors"
import { browser } from "$app/environment"
import { redirect } from "@sveltejs/kit"

export const load = (async ({ parent }) => {
	if (browser) {
		const data = await parent()

		const i = data[inlangSymbol].getInlangFunction()
		console.info("+page.ts", i("welcome"))

		const language = await detectLanguage(
			{ referenceLanguage: data.referenceLanguage, languages: data.languages },
			navigatorDetector,
		)

		throw redirect(307, `/${language}`)
	}
}) satisfies PageLoad
