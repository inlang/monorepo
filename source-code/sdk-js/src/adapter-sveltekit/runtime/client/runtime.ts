import type { LoadEvent } from "@sveltejs/kit"
import { base } from "$app/paths"
import { initRuntimeWithLanguageInformation } from "../../../runtime/index.js"
import type { LanguageTag } from '@inlang/core/languageTag'

type InitSvelteKitClientRuntimeArgs = {
	fetch: LoadEvent["fetch"]
	sourceLanguageTag: LanguageTag
	languageTags: LanguageTag[]
	languageTag: LanguageTag | undefined
}

export const initSvelteKitClientRuntime = async ({
	fetch,
	languageTag,
	sourceLanguageTag,
	languageTags,
}: InitSvelteKitClientRuntimeArgs) => {
	const runtime = initRuntimeWithLanguageInformation({
		readResource: async (languageTag: LanguageTag) =>
			fetch(`${base}/inlang/${languageTag}.json`).then((response) =>
				response.ok ? response.json() : undefined,
			),
		sourceLanguageTag,
		languageTags,
	})

	if (languageTag) {
		await runtime.loadResource(languageTag)
		runtime.changeLanguageTag(languageTag)
	}

	return runtime
}

export type SvelteKitClientRuntime = Awaited<ReturnType<typeof initSvelteKitClientRuntime>>
