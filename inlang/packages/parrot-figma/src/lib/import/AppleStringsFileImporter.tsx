import { Message } from "@inlang/sdk";
import MessageStoreMemory from "../message/store/MessageStoreMemory";
import { Locale } from "../message/variants/Locale";

export default class AppleStringsFileImporter {
	static reformatPlaceholders(text: string) {
		return text; // TODO #8 map all ios placeholders to plugin format
	}

	private static toParrotPlaceholders(inputString: string) {
		const regex = /%(([\d]*)\$)?(\.[\d]*)*([sdf])/g;

		let index = 1;
		const replacedString = inputString.replace(regex, (match, group1, group2, group3, group4) => {
			// const type = group4;
			// let format = '';
			// let arg = '';
			const parameterName = `${index++}__unnamed`;

			// TODO #23 catch information in sentry on import of unsupported parameter types - to quantify usage

			// TODO #19 add format function that allows to know its a float/decimal or keep empty for string
			// if (type === 'f' && group3) {
			//   format = ` format="${group3}"`;
			// }

			// TODO #20 we don't add the possition arg for now...
			// if (group2) {
			//   arg = ` arg="${group2}"`;
			// }

			// TODO #19 add attributes for formatting to the tag
			// TODO #20 add attributes for argument indext here.
			return `<ph>${parameterName}</ph>`;
		});
		return replacedString;
	}

	static toImportObject(
		filename: string,
		stringsFileContent: string,
		language: Locale,
	): Message[] | undefined {
		const fileNameParts = filename.split(".");
		const fileExtension = fileNameParts[fileNameParts.length - 1];
		if (fileExtension !== "strings") {
			return undefined;
		}

		// split the file contents into an array of lines
		const lines = stringsFileContent.split("\n");

		// create an empty object to hold our key-value pairs
		const foundMessages = [] as Message[];

		// iterate over each line of the file

		let inComment = false;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// handle the start of a /* */ comment
			if (line.startsWith("/*")) {
				inComment = true;
				// handle oneliner comments
				if (line.endsWith("*/")) {
					inComment = false;
				}
				continue;
			}

			// handle the end of a /* */ comment
			if (line.endsWith("*/")) {
				inComment = false;
				continue;
			}

			// skip any comments or empty lines
			if (line.startsWith("//") || line.length === 0 || inComment) {
				continue;
			}

			// split the line into a key and value pair
			const parts = line.split("=");
			let messageName = parts[0].trim();
			let value = parts[1].trim();
			let quoteWrapped = false;

			// remove any surrounding quotes from the messageName and value
			if (messageName.startsWith('"') && messageName.endsWith('"')) {
				messageName = messageName.slice(1, -1);
			}
			if (value.startsWith('"') && value.endsWith('"')) {
				value = value.slice(1, -1);
				quoteWrapped = true;
			}

			if (value.startsWith('"') && value.endsWith('";')) {
				value = value.slice(1, -2);
				quoteWrapped = true;
			}

			if (quoteWrapped) {
				value = value.split('\\"').join('"');
			}
			value = value.replace(/\\n/g, "\n");

			// enrich string with parrot arguments
			value = this.toParrotPlaceholders(value);

			const pattern = MessageStoreMemory.patternHtmlToPattern(value);

			// add the key-value pair to our result object
			foundMessages.push({
				id: messageName,
				selectors: [],
				variants: [
					{
						languageTag: language,
						match: [],
						pattern,
					},
				],
			});
		}

		return foundMessages;
	}
}
