// use polyfill in sandbox https://forum.figma.com/t/sandbox-not-support-urlsearchparams/41676
import URLSearchParams from "@ungap/url-search-params";
import Monitoring from "../monitoring/MonitoringProxy";

export default class GoogleTranslator {
	static async translate(text: string, sourceLanguage: string, targetLanguage: string) {
		// if the text only contains whitespaces - uses the orignal one
		if (/^\s*$/.test(text) || text === "") {
			return text;
		}

		// replace placeholder with numbers to not translate them

		const pattern =
			/(<ph( type="([^"]*)"=)?( format="([^"]*)")?( arg="([^"]*)")?( unnamed)?([^>])*(>([^<]*))<\/ph>)/g;

		const placeholderIndexMapping = [] as string[];
		let currentIndex = 0;

		// const wholeMatch = paramMatch[0];
		// const argumentPosition = paramMatch[1] ? parseInt(paramMatch[1], 10) : undefined;
		// const name = paramMatch[2];

		const textWithMaskedPlaceholders = text.replace(
			pattern,
			(
				match,
				_helper1,
				type,
				_helper3,
				format,
				_helper5,
				argumentPosition,
				unnamed,
				_helper8,
				_helper9,
				name,
			) => {
				// const placeholderName = name;
				placeholderIndexMapping[currentIndex] = match;
				const placeholderReplacement = `[[${currentIndex}]]`;

				currentIndex++;
				return placeholderReplacement;
			},
		);

		const sentences = textWithMaskedPlaceholders.split(". ");
		const translatedSentences = [] as string[];
		for (const sentence of sentences) {
			const patchedQuery = sentence
				.split(".")
				.join("{{dot}}")
				.split("#")
				.join("{{route}}")
				.split("\n")
				.join("{{newline}}");

			if (/^\s*$/.test(patchedQuery) || patchedQuery === "") {
				translatedSentences.push(patchedQuery);
				continue;
			}

			const result = await fetch(
				`https://translate.googleapis.com/translate_a/single?${new URLSearchParams({
					client: "gtx",
					dt: "t",
					sl: sourceLanguage === "se" ? "SV" : sourceLanguage,
					tl: targetLanguage === "se" ? "SV" : targetLanguage,
					q: patchedQuery,
				})}`,
				{
					method: "GET",
					/* headers: {
                'origin-when-cross-origin': '*',
              }, */
				},
			);

			if (!result.ok) {
				// TODO #29 fix this before we release - test
				Monitoring.instance?.sentryCaptureMesage(
					`Translation of ${text} failed. Status code (${result.status}).`,
				);
				return null;
			}

			const translationResults = await result.json();

			if (!translationResults[0] || !translationResults[0][0] || !translationResults[0][0][0]) {
				const error = new Error("Expected a translation within [0][0][0] not found");
				// TODO #29 fix this before we release - test
				Monitoring.instance?.sentryCaptureException(error, {
					extra: {
						sourceLanguage,
						targetLanguage,
						patchedQuery,
						translationResults,
					},
				});
			} else {
				for (let i = 0; i < translationResults[0].length; i += 1) {
					const resultMessage = translationResults[0][i][0];
					translatedSentences.push(
						resultMessage
							.split("{{dot}}")
							.join(".")
							.split("{{route}}")
							.join("#")
							.split("{{newline}}")
							.join("\n"),
					);
				}
			}
		}

		const translationWithMaskedPlaceholders = translatedSentences.join(". ");

		const patternMaskedPlaceholders = /\[\[([0-9]+)\]\]/g;

		// const wholeMatch = paramMatch[0];
		// const argumentPosition = paramMatch[1] ? parseInt(paramMatch[1], 10) : undefined;
		// const name = paramMatch[2];

		const translationWithoutPlaceholders = translationWithMaskedPlaceholders.replace(
			patternMaskedPlaceholders,
			(match, placeholderIndex, _argumentPosition) =>
				`${placeholderIndexMapping[placeholderIndex]}`,
		);

		return translationWithoutPlaceholders;
		/*
          // https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=Hello
          // origin-when-cross-origin
          // console.log(`tranalating: ${text} with deepl`);
          const result = await fetch('http://localhost:3333/api/v1/translate', {
            method: 'POST',
             headers: {
                'Authorization': 'DeepL-Auth-Key 391733de-67e0-be65-a8b7-4298511dd564:fx'
              },
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              {
                text: [text],
                target_lang: targetLanguage === 'se' ? 'SV' : targetLanguage,
              },
            ),
          });
          const translationResults = await result.json();

          return translationResults.messages[0].text; */
	}
}
