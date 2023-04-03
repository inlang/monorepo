import { serverSideEnv } from "@env"
import type { Language } from "@inlang/core/ast"
import { assertUsage } from "@src/services/assert-usage/index.js"

//const env = await serverSideEnv()

/**
 * Translate text using Google Translate.
 */
export async function onMachineTranslate(args: {
	text: string
	referenceLanguage: Language
	targetLanguage: Language
}): Promise<{ data?: string; error?: string }> {
	console.log(import.meta.env.GOOGLE_TRANSLATE_API_KEY)
	try {
		const response = await fetch(
			"https://translation.googleapis.com/language/translate/v2?" +
				new URLSearchParams({
					q: args.text,
					target: args.targetLanguage,
					source: args.referenceLanguage,
					format: "text",
					key: import.meta.env.GOOGLE_TRANSLATE_API_KEY!,
				}),
			{ method: "POST" },
		)
		const json = await response.json()
		console.log(json)
		assertUsage(
			json.data.translations.length === 1,
			"Expected exactly one translation. Hardcoded in the code for now.",
		)
		if (response.ok) {
			return { data: json.data.translations[0].translatedText }
		}
		throw Error(json)
	} catch (error) {
		return { error: (error as Error).message }
	}
}
