import { initRootPageLoadWrapper } from "@inlang/sdk-js/adapter-sveltekit/client"
import { navigatorDetector } from "@inlang/sdk-js/detectors/client"
import type { PageLoad } from "./$types.js"
import { browser } from "$app/environment"
import { redirect } from '@sveltejs/kit'
import { replaceLanguageInUrl } from '@inlang/sdk-js/adapter-sveltekit/shared'

export const load = initRootPageLoadWrapper<PageLoad>({
	browser,
	initDetectors: () => [navigatorDetector],
	redirect: {
		throwable: redirect,
		getPath: ({ url }, language) => replaceLanguageInUrl(new URL(url), language)
	},
}).wrap(async ({ parent }) => {
	if (browser) {
		// const data = await parent()
		// const i = getRuntimeFromData(data).i
		// console.info("+page.ts", i("welcome"))
	}
})
