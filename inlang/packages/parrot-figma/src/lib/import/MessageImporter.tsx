import { Message, Variant, getVariant } from "@inlang/sdk";
import MessageStoreMemory from "../message/store/MessageStoreMemory";

import AppleStringsFileImporter from "./AppleStringsFileImporter";
import AndroidXMLImporter from "./AndroidXmlImporter";

import { ImportMessage } from "./ImportMessage";
import LocalizedLabelManagerUI from "../localizedlabels/LocalizedLabelManagerUI";
import I18NextKeyValueImporter from "./I18Next";
import { Gender } from "../message/variants/Gender";
import { Locale } from "../message/variants/Locale";

export enum ImportType {
	UNSUPPORTED = "not supported",
	IOS_STRINGS = "iOS Strings File",
	ANDROID_XML = "Android resource XML",
	L18N_JSON = "l18next JSON",
}

export type ImportResult = {
	fileName: string;
	type: ImportType;
	messages: Message[] | undefined;
	language: Locale;
};

export default class MessageImporter {
	static getImportStatistics(
		messageStore: MessageStoreMemory,
		importMessages: Message[],
		language: Locale,
	) {
		const changedMessages = {
			language,
			newMessages: [] as Message[],
			newVariants: [] as { message: Message; variant: Variant }[],
			updatedVariants: [] as { message: Message; variant: Variant }[],
		};

		for (const messageToImport of importMessages) {
			const diff = this.getDiff(messageStore, messageToImport, language);

			switch (diff.type) {
				case "new":
					changedMessages.newMessages.push(messageToImport);
					break;
				case "updated":
					changedMessages.newVariants = changedMessages.newVariants.concat(
						diff.addedVariants.map((variant) => ({
							message: diff.message,
							variant,
						})),
					);

					changedMessages.updatedVariants = changedMessages.updatedVariants.concat(
						diff.updatedVariants.map((variant) => ({
							message: diff.message,
							variant,
						})),
					);
					break;
				default:
					break;
			}
		}

		return changedMessages;
	}

	static getDiff(
		messageStore: MessageStoreMemory,
		importMessage: Message,
		language: Locale,
	):
		| { type: "equal" }
		| { type: "new"; message: Message }
		| { type: "updated"; message: Message; addedVariants: Variant[]; updatedVariants: Variant[] } {
		const currentMessage = messageStore.getMessageByName(importMessage.id);
		if (!currentMessage) {
			return { type: "new", message: importMessage };
		}

		const addedVariants = [] as Variant[];
		const updatedVariants = [] as Variant[];

		// TODO #18 when we support selectors we need to take those into account as well when importing (the matchers count and order might differ...)
		for (const variantToImport of importMessage.variants) {
			const currentVariant = getVariant(currentMessage, {
				where: { languageTag: language, match: variantToImport.match },
			});
			if (currentVariant) {
				// TODO #24 check if this is an exact match - we need an exact match for import! - can we use an sdk message? - add exact flag to query?
				if (JSON.stringify(currentVariant.match) === JSON.stringify(variantToImport.match)) {
					if (JSON.stringify(currentVariant.pattern) === JSON.stringify(variantToImport.pattern)) {
						// all the same! nothing to do with this variant
						continue;
					}
					// pattern differs -> updated variant
					updatedVariants.push(variantToImport);
					continue;
				}
				// if we are here ->  the found variants matcher didn't match - don't continue add the variat as missing as well
			}

			addedVariants.push(variantToImport);
		}

		if (addedVariants.length > 0 || updatedVariants.length > 0) {
			return {
				type: "updated",
				message: importMessage,
				addedVariants,
				updatedVariants,
			};
		}

		return { type: "equal" };
	}

	static processFile(fileName: string, content: string, language: Locale): ImportResult {
		// console.log(`processing file${fileName} content: ${content}`);

		const results = {
			fileName,
			type: ImportType.UNSUPPORTED,
			messages: undefined as Message[] | undefined,
			language,
		};

		let importObject = AppleStringsFileImporter.toImportObject(fileName, content, language);
		if (importObject) {
			results.type = ImportType.IOS_STRINGS;
			results.messages = importObject;
			return results;
		}

		importObject = AndroidXMLImporter.toImportObject(fileName, content, language);
		if (importObject) {
			results.type = ImportType.ANDROID_XML;
			results.messages = importObject;
			return results;
		}

		importObject = I18NextKeyValueImporter.toImportObject(fileName, content, language);
		if (importObject) {
			results.type = ImportType.L18N_JSON;
			results.messages = importObject;
			return results;
		}

		return results;
	}
}

/* const changedKeys = {
      added: [] as TranslationKey[],
      updated: [] as TranslationKey[],
      deleted: [] as TranslationKey[],
    };

    for (const key of Object.keys(result)) {
      // console.log('processing key ' + key);
      const lang = language as Language;
      const currentKey = this.getKey(key);
      if (!currentKey) {
        const createdKey = await this.createKey(key, [{
          language: lang, plural: Plural.OTHER, text: result[key], skip: false,
        }], false);
        changedKeys.added.push(createdKey);
      } else if (currentKey!.messages[lang]?.other?.text !== result[key]) {
        const skip = currentKey!.messages[lang]?.other?.skip ?? false;
        const updatedKey = await this.updateKey(key, [{
          language: lang, plural: Plural.OTHER, text: result[key], skip,
        }]);
        changedKeys.updated.push(updatedKey);
      } else {
        // console.log('skipping '+ key + ' text is equal');
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    figma.commitUndo();

    if (changedKeys.added.length > 0
      || changedKeys.updated.length > 0) {
      figma.ui.postMessage({
        target: 'TranslationKeyStore',
        type: 'cacheUpdate',
        changedKeys,
      });
    } */
