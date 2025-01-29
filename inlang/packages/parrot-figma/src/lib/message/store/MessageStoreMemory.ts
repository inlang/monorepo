import {
	ProjectSettings,
	loadProject,
	getVariant,
	InlangProject,
	LanguageTag,
	updateVariantPattern,
	createVariant,
} from "@inlang/sdk";
import { Message, Pattern } from "@inlang/message";
import blake from "blakejs";
import { Locale } from "../variants/Locale";
import { Plural, getPluralFormsByLanguage } from "../variants/Plural";

import { NodeSelection } from "../../localizedlabels/LocalizedLabelManager";
import { Gender, genderList } from "../variants/Gender";
import { createNodeishMemoryFs } from "./inlang/FigmaRootFs";
import { Config, InlangMessageStore } from "./InlangMessageStoreFigmaRoot";
import { MessageParameterValues } from "../MessageParameterValues";
import PlaceholderHelper from "../PlaceholderUtil";
import TranslatorMachine from "../../translationprovider/TranslatorMachine";
import FigmaUtil from "../../../shared/FigmaUtil";

export type SearchQuery = {
	selected?: "FRAME" | "LABEL" | undefined;
	hasLabel?: string[] | undefined;
	oneLabelOf?: string[] | undefined;
	unverified?: boolean | undefined;
	missingTranslation?: boolean | undefined;
	name?: string | undefined;
	nameAtEnd?: boolean | undefined;
	text?: string | undefined;
	exactText?: boolean | undefined;
	searchString?: string | undefined;
};

export type SearchResult = {
	inNames: Set<string>;
	inText: Set<string>;
	withMissingVariants: Set<string>;
	withMissingVariantsPerLanguage: {
		[language in Locale]?: Set<string>;
	};
	withMissingReview: Set<string>;
	matchingNames: Set<string>;
	referencedInFrame: Set<string>;
	referencedInLabels: Set<string>;
	matches: {
		[messageId: string]: {
			messageNameMatch: { start: number; length: number } | undefined;
			textMatches: {
				[language in Locale]?: {
					[gender in Gender]?: { [plural in Plural]?: { start: number; length: number } };
				};
			};
		};
	};
};

const fs = createNodeishMemoryFs();

export default class MessageStoreMemory extends EventTarget {
	config: Config | undefined;

	inlangProject: InlangProject | undefined;

	parentKeyStore: InlangMessageStore;

	figmaRemote: FigmaUtil;

	constructor(parentKeyStore: InlangMessageStore, figmaRemote: FigmaUtil) {
		super();
		this.parentKeyStore = parentKeyStore;
		this.figmaRemote = figmaRemote;

		window.addEventListener("message", (event: MessageEvent) => {
			if (event.data.pluginMessage.target === "TranslationKeyStore") {
				if (event.data.pluginMessage.type === "cacheUpdate") {
					this.processCacheUpdate(event.data.pluginMessage.changedKeys);
				}
			}
		});
	}

	public async updateMessageLinks(messageIds: string[]) {
		// TODO #22 CACHING rethink message links
		/*
    const changes = {
      updated: [] as string[],
      changedKeys: messageIds,
    };

    for (const updatedKeyLink of messageIds) {
      const message = await this.parentKeyStore.getMessageAsync(updatedKeyLink);
      if (message) {
        this.upsertCache(message);
      }
    }

    const event = new CustomEvent<any>(MessageStoreMemory.updateEventName, { detail: changes });
    this.dispatchEvent(event);
    */
	}

	subscribeMessage(messageId: string, cb: (message: Message) => void) {
		this.inlangProject?.query.messages.get.subscribe(
			{ where: { id: messageId } },
			(updatedMessage) => {
				if (updatedMessage !== undefined) {
					// skip deleted
					cb(updatedMessage);
				}
			},
		);
	}

	static UPDATE_EVENT = "updated";

	private async processCacheUpdate(changedMessages: {
		deleted: string[];
		added: string[];
		updated: string[];
	}) {
		const changes = {
			deleted: [] as string[],
			updated: [] as string[],
			added: [] as string[],
			changedKeys: [] as string[],
		};

		for (const deltedMessageId of changedMessages.deleted) {
			this.inlangProject?.query.messages.delete({ where: { id: deltedMessageId } });
			changes.deleted.push(deltedMessageId);
			changes.changedKeys.push(deltedMessageId);
		}

		for (const updatedMessageId of changedMessages.updated) {
			const freshMessage = await this.parentKeyStore.getMessageAsync(updatedMessageId);
			if (!freshMessage) {
				throw new Error(`fresh message does not exist... [${updatedMessageId}]`);
			}

			this.inlangProject?.query.messages.upsert({
				where: { id: freshMessage.id },
				data: freshMessage,
			});
			changes.updated.push(updatedMessageId);
			changes.changedKeys.push(updatedMessageId);
		}

		for (const addedMessageId of changedMessages.added) {
			const freshMessage = await this.parentKeyStore.getMessageAsync(addedMessageId);
			if (!freshMessage) {
				throw new Error(`fresh message does not exist... [${addedMessageId}]`);
			}
			this.inlangProject?.query.messages.upsert({
				where: { id: freshMessage.id },
				data: freshMessage,
			});
			changes.added.push(addedMessageId);
			changes.changedKeys.push(addedMessageId);
		}

		const event = new CustomEvent<any>(MessageStoreMemory.UPDATE_EVENT, { detail: changes });
		this.dispatchEvent(event);
	}

	getLanugages(): Locale[] | undefined {
		return this.config!.enabledLanguages;
	}

	async setLanguages(languages: Locale[]) {
		const parentConfig = await this.parentKeyStore.getConfig();
		parentConfig.enabledLanguages = languages;
		this.config!.enabledLanguages = languages;

		await this.parentKeyStore.setConfig(parentConfig);

		// forwared languages to inlang project - if initialzied already
		this.inlangProject?.setSettings({
			sourceLanguageTag: this.config!.refLanguage!,
			languageTags: languages as string[],
			modules: [],
		});
	}

	getRefLanugage(): Locale | undefined {
		return this.config!.refLanguage;
	}

	async setRefLanguage(language: Locale) {
		const parentConfig = await this.parentKeyStore.getConfig();
		this.config!.refLanguage = language;
		parentConfig.refLanguage = language;

		await this.parentKeyStore.setConfig(parentConfig);

		// forwared ref language to inlang project - if initialzied already
		this.inlangProject?.setSettings({
			sourceLanguageTag: language,
			languageTags: this.config!.enabledLanguages as string[],
			modules: [],
		});
	}

	getMessage(id: string): Message | undefined {
		return this.inlangProject!.query.messages.get({ where: { id } });
	}

	getMessageByName(messageName: string): Message | undefined {
		return this.inlangProject!.query.messages.get({ where: { id: messageName } });
	}

	static toSearchString(searchQuery: SearchQuery): string {
		let searchString = "";
		if (searchQuery.selected === "FRAME") {
			searchString += "selected:FRAME ";
		}

		if (searchQuery.selected === "LABEL") {
			searchString += "selected:LABEL ";
		}

		if (searchQuery.hasLabel && searchQuery.hasLabel.length > 0) {
			searchString += `label:${searchQuery.hasLabel.join(" label:")} `;
		}

		if (searchQuery.oneLabelOf && searchQuery.oneLabelOf.length > 0) {
			searchString += `one_label_of:${searchQuery.oneLabelOf.join(",")} `;
		}

		if (searchQuery.unverified !== undefined) {
			searchString += `unverified:${searchQuery.unverified ? "true" : "false"} `;
		}

		if (searchQuery.missingTranslation !== undefined) {
			searchString += `missing_translation:${searchQuery.missingTranslation ? "true" : "false"} `;
		}

		if (searchQuery.exactText === true) {
			searchString += "exact_text:true ";
		}

		if (searchQuery.name !== undefined) {
			searchString += `name:${searchQuery.name}`;
			if (!searchQuery.nameAtEnd) {
				searchString += " ";
			}
		}

		searchString += searchQuery.text;

		return searchString;
	}

	static toQueryObject(searchString: string): SearchQuery {
		const searchQueryObj = {
			selected: undefined,
			hasLabel: [],
			oneLabelOf: [],
			verified: undefined,
			name: undefined,
			nameAtEnd: false,
			text: "",
			exactText: false,
			searchString,
		} as SearchQuery;

		let processedInputString = searchString;

		// extract the text surrounded by quotest first:
		const textInQuotesRe = /"((?:[^"\\]|\\.)*)"(?![^\\]*\\)/g;
		const quotedTextMatches = processedInputString.match(textInQuotesRe);

		if (quotedTextMatches) {
			for (const quotedTextMatch of quotedTextMatches) {
				searchQueryObj.text += quotedTextMatch;
				processedInputString = searchString.split(quotedTextMatch).join("");
			}
		}

		// extract and remove all filters
		const filterRe = /((\b\w+:[\w,*:]+))\s/g;
		const filterMatches = processedInputString.match(filterRe);
		const filters = [] as string[];

		if (filterMatches) {
			for (const filterMatch of filterMatches!.sort((match) => match.length)) {
				const filterParts = filterMatch.split(" ").join("").split(":");
				if (filterParts[0] === "selected") {
					if (filterParts[1] === "FRAME") {
						searchQueryObj.selected = "FRAME";
					} else if (filterParts[1] === "LABEL") {
						searchQueryObj.selected = "LABEL";
					}
				} else if (filterParts[0] === "label" && filterParts.length > 1) {
					searchQueryObj.hasLabel!.push(filterParts[1]);
				} else if (filterParts[0] === "one_label_of" && filterParts.length > 1) {
					searchQueryObj.oneLabelOf = searchQueryObj.oneLabelOf!.concat(filterParts[1].split(","));
				} else if (filterParts[0] === "missing_translation" && filterParts.length > 1) {
					searchQueryObj.missingTranslation = filterParts[1] === "true";
				} else if (filterParts[0] === "unverified" && filterParts.length > 1) {
					searchQueryObj.unverified = filterParts[1] === "true";
				} else if (filterParts[0] === "exact_text" && filterParts.length > 1) {
					searchQueryObj.exactText = filterParts[1] === "true";
				} else if (filterParts[0] === "name" && filterParts.length > 1) {
					searchQueryObj.name = filterParts[1];
				} else {
					continue;
				}

				filters.push(filterMatch.split(" ").join(""));
				processedInputString = processedInputString.split(filterMatch).join("");
			}
		}

		if (!searchQueryObj.name) {
			// the regex expects a leading space - if we haven't found the name filter yet - try to find it at
			// the very end

			const nameAtTheEnd = /name:([\w,*:]+)$/g;
			const matches = processedInputString.match(nameAtTheEnd);
			if (matches) {
				searchQueryObj.name = matches[0].split(":")[1];
				processedInputString = processedInputString.split(matches[0]).join("");
				searchQueryObj.nameAtEnd = true;
			}
		}

		// extract the rest as text if none was found previously
		if (searchQueryObj.text === "") {
			searchQueryObj.text = processedInputString;
		}

		return searchQueryObj;
	}

	/**
	 * what do we want to search
	 * "emission"
	 *  - all messageNames with "emission" in their name
	 * or
	 *  - all messageNames with "emission" in their text
	 * or
	 *  - all messageNames with a tag called "emmission"
	 *
	 * name:emision
	 *  - all messageNames with emmision in their name
	 *    - asterix not adding a lot of value
	 *
	 * text:"emision"
	 *  - all messageNames with emmision in thair text
	 *
	 * "translation:missing:de"
	 * "translation:complete"
	 *
	 * "one_tag_of:tag_a,tag_b,"
	 * "tag:tag_a"
	 *
	 * "verified:true"
	 *
	 *
	 * " verified:true "
	 *
	 * messageNames:asdasd_asdasd_asd
	 *
	 * all filter but text have no space, and a leading no space name spearated by colon
	 *
	 *
	 */
	findMessages(query: SearchQuery, selection?: NodeSelection): SearchResult {
		const results = {
			inNames: new Set<string>(),
			inText: new Set<string>(),
			withMissingVariants: new Set<string>(),
			withMissingVariantsPerLanguage: {} as {
				[language in Locale]?: Set<string>;
			},
			withMissingReview: new Set<string>(),
			matchingNames: new Set<string>(),
			referencedInFrame: new Set<string>(),
			referencedInLabels: new Set<string>(),
			matches: {} as {
				[name: string]: {
					messageNameMatch: { start: number; length: number } | undefined;
					textMatches: {
						[language: string]: { [matches: string]: { start: number; length: number } };
					};
				};
			},
		};

		if (selection) {
			Object.values(selection).forEach((selectedNode) => {
				if (selectedNode.messageId !== undefined) {
					if (!selectedNode.directSelection) {
						results.referencedInLabels.add(selectedNode.messageId);
					}
					results.referencedInFrame.add(selectedNode.messageId);
				}
			});
		}

		if (!this.inlangProject) {
			return results;
		}

		for (const message of Object.values(this.inlangProject!.query.messages.getAll())) {
			if (query.text === undefined || query.text === "") {
				results.matchingNames.add(message.id);
			} else {
				for (const messageVariant of message.variants) {
					const patternsLower = messageVariant.pattern
						.map((pattern) => {
							if (pattern.type === "Text") {
								return pattern.value.toLowerCase();
							}
							if (pattern.type === "VariableReference") {
								return pattern.name.toLowerCase();
							}
							return "";
						})
						.join("");

					const matchStartText = patternsLower.indexOf(query.text.toLowerCase());

					if (matchStartText !== -1) {
						if (!results.matches[message.id]) {
							results.matches[message.id] = { textMatches: {}, messageNameMatch: undefined };
						}

						if (!results.matches[message.id].textMatches![messageVariant.languageTag]) {
							results.matches[message.id].textMatches![messageVariant.languageTag]! = {};
						}

						if (!results.matches[message.id].textMatches![messageVariant.languageTag]!["*"]) {
							results.inText.add(message.id);
							results.matchingNames.add(message.id);
							results.matches[message.id].textMatches![messageVariant.languageTag]!["*"] = {
								start: matchStartText,
								length: query.text.length,
							};
						}
					}
				}
			}

			if (query.name) {
				if (query.name !== "*") {
					const mameMatchStart = message.id.toLowerCase().indexOf(query.name.toLowerCase());

					if (mameMatchStart === 0) {
						if (!results.matches[message.id]) {
							results.matches[message.id] = { textMatches: {}, messageNameMatch: undefined };
						}
						results.matches[message.id].messageNameMatch = {
							start: mameMatchStart,
							length: query.name.length,
						};
						results.inNames.add(message.id);
					} else {
						results.matchingNames.delete(message.id);
					}
				}
			} else if (query.text !== undefined && query.text !== "") {
				const nameMatchStart = message.id.toLowerCase().indexOf(query.text.toLowerCase());
				if (nameMatchStart !== -1) {
					if (!results.matches[message.id]) {
						results.matches[message.id] = { textMatches: {}, messageNameMatch: undefined };
					}
					results.matches[message.id].messageNameMatch = {
						start: nameMatchStart,
						length: query.text.length,
					};
					results.inNames.add(message.id);
					results.matchingNames.add(message.id);
				}
			}
		}

		results.withMissingReview = new Set(
			[...results.withMissingReview].filter((x) => results.matchingNames.has(x)),
		);
		results.withMissingVariants = new Set(
			[...results.withMissingVariants].filter((x) => results.matchingNames.has(x)),
		);

		if (query.missingTranslation === true) {
			results.matchingNames = new Set(
				[...results.matchingNames].filter((x) => results.withMissingVariants.has(x)),
			);
		} else if (query.missingTranslation === false) {
			results.matchingNames = new Set(
				[...results.matchingNames].filter((x) => !results.withMissingVariants.has(x)),
			);
		}

		if (query.unverified === true) {
			results.matchingNames = new Set(
				[...results.matchingNames].filter((x) => results.withMissingReview.has(x)),
			);
		} else if (query.unverified === false) {
			results.matchingNames = new Set(
				[...results.matchingNames].filter((x) => !results.withMissingReview.has(x)),
			);
		}

		if (query.selected === "FRAME") {
			results.matchingNames = new Set(
				[...results.matchingNames].filter((x) => results.referencedInFrame.has(x)),
			);
		} else if (query.selected === "LABEL") {
			results.matchingNames = new Set(
				[...results.matchingNames].filter((x) => results.referencedInLabels.has(x)),
			);
		}

		// in case we have no specific we want to suggest specific like
		// - matches in messageNames (n)
		// - matches in text (n)
		// - with missing messages (n)
		// - with missing review (n)
		return results;
	}

	getAllMessages() {
		return this.inlangProject?.query.messages.getAll();
	}

	async createTag() {
		/* TODO #17 versioning we skip this in inlang for now
    // TODO #18 we update the messages here - shouldn't we wait for the messaage bus instead?
    const tagId = this.historyTags.length;
    for (const messageId of Object.keys(this.messages)) {
      this.messages[messageId].historyTags[tagId] = this.messages[messageId].latestVersion;
    }

    this.historyTags[tagId] = await this.parentKeyStore.createTag(tagId, title, description);
    return this.historyTags[tagId];
    */
	}

	async upsertMessage(message: Message, _defaultParameters: MessageParameterValues) {
		// TODO #18 variables - store the default parameters for this message ( we no longer store them in the message it self )
		this.upsertedMessageIds.add(message.id);
		this.inlangProject?.query.messages.upsert({ where: { id: message.id }, data: message });

		const changes = {
			deleted: [] as string[],
			updated: [] as string[],
			added: [] as string[],
			changedKeys: [] as string[],
		};

		changes.changedKeys.push(message.id);

		// make sure the event is fired after the messages returned the updated message
		setTimeout(() => {
			const event = new CustomEvent<any>(MessageStoreMemory.UPDATE_EVENT, { detail: changes });
			this.dispatchEvent(event);
		}, 1);

		return this.getMessage(message.id!)!;
	}

	async deleteMessage(id: string) {
		// await this.parentKeyStore.deleteMessage(id);
		this.deletedMessageIds.add(id);
		this.inlangProject?.query.messages.delete({ where: { id } });
	}

	upsertedMessageIds = new Set<string>();

	deletedMessageIds = new Set<string>();

	private async loadInlangProject() {
		// creating a project file
		const inlangConfig = {
			sourceLanguageTag: this.config!.refLanguage,
			modules: ["./plugin.js"],
			languageTags: this.config!.enabledLanguages,
			// languageTags: ['en', 'de'],
		};

		// writing the project file to the virtual filesystem
		await fs.writeFile("/project.inlang.json", JSON.stringify(inlangConfig));

		// opening the project file and loading the plugin
		this.inlangProject = await loadProject({
			nodeishFs: fs as any,
			settingsFilePath: "/project.inlang.json",
			// simulate the import function that the SDK uses
			// to inject the plugin into the project
			_import: async () => {
				console.log("import called");
				return {
					default: {
						// id: id as Plugin["id"],
						id: "plugin.organization.pluginName", // as Plugin['id'],
						displayName: { en: "test" }, // as Plugin['displayName'],
						description: { en: "test" }, // as Plugin['description'],
						// displayName,
						// description,
						loadMessages: async () => {
							const messages = await this.parentKeyStore.load();
							return messages;
						},
						saveMessages: async ({
							messages,
							settings,
							nodeishFs,
						}: {
							messages: Message[];
							settings: any;
							nodeishFs: any;
						}) => {
							for (const message of messages) {
								if (this.upsertedMessageIds.has(message.id)) {
									await this.parentKeyStore.saveMessage(message);
								}
							}

							for (const deletedMessageId of [...this.deletedMessageIds]) {
								await this.parentKeyStore.deleteMessage(deletedMessageId);
							}
							this.upsertedMessageIds = new Set<string>();
						},
					},
				};
				// return import('./inlang/FigmaPlugin');
			},
		});
		const inlangProjectSettings = this.inlangProject?.settings();
		await this.figmaRemote.setRootPluginData(
			"inlangProjectSettings",
			JSON.stringify(inlangProjectSettings),
		);
		const numberOfLinkedMessages = this.inlangProject?.query.messages
			.includedMessageIds()
			.length.toString();
		await this.figmaRemote.setRootPluginData("numberOfMessages", numberOfLinkedMessages ?? "0");
	}

	async load(): Promise<Readonly<Message[]>> {
		this.config = await this.parentKeyStore.getConfig();

		if (this.config?.refLanguage === undefined) {
			return [];
		}

		await this.loadInlangProject();
		return this.inlangProject!.query.messages.getAll();
	}

	// wrapper methods to centralize the integration of inlang in case of api changes

	static hasVariant(message: Message, targetLanguage: Locale, match?: string[]) {
		const variant = getVariant(message, { where: { languageTag: targetLanguage, match } });
		return variant !== undefined;
	}

	static hasTranslationInVariant(message: Message, targetLanguage: Locale, match?: string[]) {
		const variant = getVariant(message, { where: { languageTag: targetLanguage, match } });
		return variant !== undefined && variant.pattern.length > 0;
	}

	// static isVariantsTranslationOutdated(
	//   message: Message,
	//   sourceLanguage: Locale,
	//   targetLanguage: Locale,
	//   match?: string[],
	// ) {
	//   const sourceVariantPatternHTML = MessageStoreMemory.htmlForPattern(message, sourceLanguage, match);
	//   const currentVariant = getVariant(message, { where: { languageTag: targetLanguage, match } });

	//   if (!currentVariant || blake.blake2sHex(sourceVariantPatternHTML) !== (currentVariant as any).translationSrcHash) {
	//     return true;
	//   }

	//   return false;
	// }

	static upsertVariantPatternHtml(
		message: Message,
		sourceLanguage: Locale | undefined,
		language: Locale,
		match: string[],
		patternHtml: string,
	) {
		// const sourceVariantPatternHTML = MessageStoreMemory.htmlForPattern(message, sourceLanguage, match);
		const currentVariantClone = getVariant(message, { where: { languageTag: language, match } });
		// let variantPatternHTMLHash = '';
		let messageClone: Message;

		if (currentVariantClone) {
			// variantPatternHTMLHash = (blake.blake2sHex(sourceVariantPatternHTML));
			// XXX find the variant using language an pattern to be able to mutate it in place
			messageClone = updateVariantPattern(message, {
				where: { languageTag: language, match },
				data: MessageStoreMemory.patternHtmlToPattern(patternHtml),
			}).data!;
		} else {
			const tranlatedVariant = {
				languageTag: language,
				match,
				pattern: MessageStoreMemory.patternHtmlToPattern(patternHtml),
			};
			// add properties to variant
			// (tranlatedVariant as any).translationSrcHash = (blake.blake2sHex(sourceVariantPatternHTML));
			messageClone = createVariant(message, { data: tranlatedVariant }).data!;
		}

		// const updatedVariantClone = getVariant(message, { where: { languageTag: language, selectors: match } });
		// XXX this is uses json stringify on the variant to check if equal - sdk will change anyway and we change this
		// const mutableVariant = message.variants.find((variant) => variant.languageTag === updatedVariantClone?.languageTag && JSON.stringify(variant.match) === JSON.stringify(updatedVariantClone.match));
		// (mutableVariant as any).translationSrcHash = variantPatternHTMLHash;

		return messageClone;
	}

	static ongoingTranslationPromises = {} as {
		[messageId: string]: Promise<Message>;
	};

	static canTranslate(
		message: Message,
		sourceLanguage: Locale,
		targetLanguage: Locale,
		match: string[],
	) {
		// reasons:

		// TODO #35 target language not supported
		// TODO #35 source language not supported

		// source language not set in Message
		const sourceVariantPatternHTML = MessageStoreMemory.htmlForPattern(
			message,
			sourceLanguage,
			match,
		);
		if (sourceVariantPatternHTML === undefined || sourceVariantPatternHTML === "") {
			return false;
		}
		return true;
	}

	static async upsertUsingAutoTranslateMessage(
		translator: TranslatorMachine,
		message: Message,
		sourceLanguage: Locale,
		targetLanguage: Locale,
		match: string[],
		triggersCTA: boolean,
	) {
		// // we combine multiple translaition promises of the same message that happen in a batch
		// if (MessageStoreMemory.ongoingTranslationPromises[message.id] !== undefined) {
		//   return MessageStoreMemory.ongoingTranslationPromises[message.id];
		// }
		//
		const sourceVariantPatternHTML = MessageStoreMemory.htmlForPattern(
			message,
			sourceLanguage,
			match,
		);
		if (sourceVariantPatternHTML === undefined) {
			throw new Error(`Pattern did not exist for source language: ${sourceLanguage}`);
		}

		const translatedPattern = await translator.translate(
			sourceVariantPatternHTML,
			sourceLanguage as Locale,
			targetLanguage,
			triggersCTA,
		);

		// delete MessageStoreMemory.ongoingTranslationPromises[message.id];
		return this.upsertVariantPatternHtml(
			message,
			sourceLanguage,
			targetLanguage,
			match,
			translatedPattern!,
		);
	}

	static patternHtmlToPattern(patternHtml: string): Pattern {
		const result = [] as Pattern;

		const placeholders = PlaceholderHelper.extractPlaceholdersFromPatterHTML(patternHtml);

		let lastExtractionEnd = 0;

		for (const placeholder of placeholders) {
			if (placeholder.start > lastExtractionEnd) {
				result.push({
					type: "Text",
					value: patternHtml.substring(lastExtractionEnd, placeholder.start),
				});
			}
			result.push({
				type: "VariableReference",
				name: placeholder.placeholder.name,
			});
			lastExtractionEnd = placeholder.start + placeholder.length;
		}

		if (patternHtml.length > lastExtractionEnd) {
			result.push({
				type: "Text",
				value: patternHtml.substring(lastExtractionEnd, patternHtml.length),
			});
		}

		return result;
	}

	static patternToHtml(patterns: Pattern) {
		let html = "";
		// 8 inlang rich text - support other patterns or get rid of html representation
		for (const pattern of patterns) {
			if (pattern.type === "Text") {
				html += pattern.value;
			} else if (pattern.type === "VariableReference") {
				html += `<ph>${pattern.name}</ph>`;
			}
		}

		return html;
	}

	static htmlInLangugage(message: Message, language: string) {
		let html = undefined as string | undefined;

		const variantInLanguage = message.variants.find((variant) => variant.languageTag === language);
		if (variantInLanguage) {
			// TODO #18 inlang rich text - support other patterns or get rid of html representation
			for (const pattern of variantInLanguage.pattern) {
				if (pattern.type === "Text") {
					if (html === undefined) {
						html = "";
					}
					html += pattern.value;
				}
			}
		}

		return html;
	}

	static htmlForPattern(message: Message, languageTag: string, match?: string[]) {
		const variant = getVariant(message, { where: { languageTag, match } });
		if (!variant) {
			return undefined;
		}
		return this.patternToHtml(variant!.pattern);
	}

	static getBestExistingVariant(
		message: Message,
		languageTag: string,
		fallbackLanguageTags: string[],
		match?: string[],
	) {
		const variant = getVariant(message, { where: { languageTag, match } });
		if (!variant) {
			for (const fallbackLanguageTag of fallbackLanguageTags) {
				const fallbackVariant = getVariant(message, {
					where: { languageTag: fallbackLanguageTag, match },
				});
				if (fallbackVariant !== undefined) {
					return fallbackVariant;
				}
			}
		}
		return variant;
	}

	static refLanguageHash(message: Message, language: string, match?: string[]) {
		const variant = getVariant(message, { where: { languageTag: language, match } });
		if (variant) {
			return (variant as any).refLanguageHash as string;
		}

		return undefined;
	}
}
