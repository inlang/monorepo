import { Message } from "@inlang/sdk";
import { Gender } from "../message/variants/Gender";
import { Plural } from "../message/variants/Plural";
import { ImportMessage } from "./ImportMessage";
import MessageStoreMemory from "../message/store/MessageStoreMemory";
import { Locale } from "../message/variants/Locale";

const separator = "__";

export default class I18NextKeyValueImporter {
	static toParrotPlaceholders(inputString: string) {
		const regexDoubleBrackets = /{{([^}]*)}}/g;

		const replacedStringDoubleBrackets = inputString.replace(
			regexDoubleBrackets,
			(match, group1) => {
				// const type = group1 === 'count' ? 'd' : 's';
				// const format = '';
				// const arg = '';
				const parameterName = group1;

				// TODO #19 add attributes for formatting to the tag
				// TODO #20 add attributes for argument indext here.
				// return `<ph type="${type}"${format}${arg} unnamed>${parameterName}</ph>`;
				return `<ph>${parameterName}</ph>`;
			},
		);

		const regex = /{([^}]*)}/g;

		const replacedStringSingleBrackets = replacedStringDoubleBrackets.replace(
			regex,
			(match, group1) => {
				// const type = group1 === 'count' ? 'd' : 's';
				// const format = '';
				// const arg = '';
				const parameterName = group1;

				// TODO #19 add attributes for formatting to the tag
				// TODO #20 add attributes for argument indext here.
				// return `<ph type="${type}"${format}${arg} unnamed>${parameterName}</ph>`;
				return `<ph>${parameterName}</ph>`;
			},
		);
		return replacedStringSingleBrackets;
	}

	static extractPlural(id: string) {
		const pluralPostfixes = {
			_one: Plural.ONE,
			_other: Plural.OTHER,
		};

		for (const [pluralPostfix, pluralForm] of Object.entries(pluralPostfixes)) {
			if (id.endsWith(pluralPostfix)) {
				throw new Error("Plurals are currently not supported");
				return {
					plural: pluralForm,
					id: id.substring(0, id.length - pluralPostfix.length),
				};
			}
		}

		return {
			plural: Plural.OTHER,
			id,
		};
	}

	private static getPluralItems(pluralNode: Element) {
		const items = pluralNode.getElementsByTagName("item");
		const plurals = {} as {
			[plural in Plural]?: {
				text?: string;
				// TODO #9 verified
				skip?: boolean;
			};
		};
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const quantity = item.getAttribute("quantity") as string;
			plurals[quantity as Plural] = { text: item.textContent! };
		}
		return plurals;
	}

	private static unMask(value: string) {
		return value;
	}

	static toImportObject(
		filename: string,
		stringsFileContent: string,
		language: Locale,
	): Message[] | undefined {
		const fileNameParts = filename.split(".");
		const fileExtension = fileNameParts[fileNameParts.length - 1];
		if (fileExtension !== "json") {
			return undefined;
		}

		let json = {} as any;

		try {
			json = JSON.parse(stringsFileContent);

			if (Object.keys(json).length === 0) {
				return undefined;
			}
		} catch (e) {
			console.warn(e);
			return undefined;
		}

		// create an empty object to hold our key-value pairs
		const foundMessages = {} as { [messsageName: string]: Message };

		this.nodeToImpotObjects("", json, foundMessages, language);

		return Object.values(foundMessages);
	}

	static nodeToImpotObjects(
		messageName: string,
		node: any,
		foundMessages: { [messsageName: string]: Message },
		language: Locale,
	) {
		for (const [key, subNode] of Object.entries(node)) {
			const currentKeyName = `${messageName}${key}`;
			if (typeof subNode === "string") {
				const idAndPlrual = I18NextKeyValueImporter.extractPlural(currentKeyName);
				const html = this.toParrotPlaceholders(subNode as string);
				const pattern = MessageStoreMemory.patternHtmlToPattern(html);

				foundMessages[idAndPlrual.id] = {
					id: idAndPlrual.id,
					selectors: [],
					variants: [
						{
							languageTag: language,
							match: [], // #18 use keyAndPlrual.plural instead in case the message is a plural
							pattern,
						},
					],
				};
			} else if (typeof subNode === "object") {
				I18NextKeyValueImporter.nodeToImpotObjects(
					currentKeyName + separator,
					subNode,
					foundMessages,
					language,
				);
			}
		}
	}
}
