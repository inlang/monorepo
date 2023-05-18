import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types.js"
import { getResource } from "@inlang/sdk-js/adapter-sveltekit/server"
import { initState } from "@inlang/sdk-js/adapter-sveltekit/server"

export const prerender = true

export const GET = (({ params: { language } }) =>
	// eslint-disable-next-line unicorn/no-null
	json(getResource(language) || null)) satisfies RequestHandler

export const entries = async () => {
	const { languages } = await initState(await import("../../../../inlang.config.js"))

	return languages.map((language) => ({ language: `${language}.json` }))
}
