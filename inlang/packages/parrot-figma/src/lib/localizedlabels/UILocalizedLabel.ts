import Quill, { Delta as DeltaType, DeltaOperation } from "quill";
import blake from "blakejs";
import { Message } from "@inlang/message";
import { unset } from "lodash";
import { Locale } from "../message/variants/Locale";
import { MessageLinkState, LabelStyle, LocalizedLabel } from "./LocalizedLabel";

import LocalizedLabelManager, { DeltaOp, MARKER_CHARACTER } from "./LocalizedLabelManager";
import { Gender } from "../message/variants/Gender";
import MessageStoreMemory from "../message/store/MessageStoreMemory";
import {
	FillinToPlaceholder,
	MessageExtension,
	PlaceholdersByName,
} from "../message/MessageExtnesions";
import PlaceholderBlot from "../../ui/compontents/translationEditor/blots/PlaceholderBlot";
import { MessageParameterValues } from "../message/MessageParameterValues";
import { Placeholder } from "../message/Placeholder";
import PlaceholderUtil from "../message/PlaceholderUtil";
import TranslatorMachine from "../translationprovider/TranslatorMachine";

const Delta = Quill.import("delta") as typeof DeltaType;

export interface ILocalizedLabelManagerUI {
	messageStore: any; // TODO make this UITranslationKeyStore and add all methods to the interface needed
	updateLabelProperties(
		nodeId: string,
		changedProperties: {
			labelName?: string;
			messageState?:
				| {
						type: "linked";
						messageId: string;
						parameterValues: MessageParameterValues;
						variantPatternHTML?: string;
				  }
				| { type: "unlinked"; unlinkedMessage: Message; parameterValues: MessageParameterValues }
				| { type: "unmanaged"; unmanaged: boolean }
				| { type: "unset" }
				| undefined;
			language?: Locale;
		},
	): Promise<void>;
	updateMessage(message: Message, defaultParameters: MessageParameterValues): Promise<void>;
}

export class UILocalizedLabel implements LocalizedLabel {
	pageId: string;

	pageName: string;

	rootFrameId: string;

	rootFrameName: string;

	nodeId: string;

	name: string;

	x: number;

	y: number;

	width: number;

	height: number;

	rootFrameLanguage: Locale;

	language: Locale;

	messageLinkState: MessageLinkState;

	messageId?: string | undefined;

	characters: string;

	state?: { modified: boolean } | undefined;

	/**
	 * contains the translation representation with placeholders and later formation tags
	 */
	// translation: string;

	parameterValues: ParameterValues;

	fillinsToPlaceholder: FillinToPlaceholder;

	derivedKey?: string | undefined;

	matchingLabelLints: string[];

	labelStyle: LabelStyle;

	unlinkedMessage: Message; // | undefined;

	// utils
	// to manage the label within the UI keep a reference of the Label manager
	manager: ILocalizedLabelManagerUI;

	constructor(manager: ILocalizedLabelManagerUI, localizedLabel: LocalizedLabel) {
		this.manager = manager;

		this.pageId = localizedLabel.pageId;
		this.pageName = localizedLabel.pageName;
		this.rootFrameId = localizedLabel.rootFrameId;
		this.rootFrameName = localizedLabel.rootFrameName;
		this.nodeId = localizedLabel.nodeId;
		this.name = localizedLabel.name;
		this.x = localizedLabel.x;
		this.y = localizedLabel.y;
		this.width = localizedLabel.width;
		this.height = localizedLabel.height;
		this.rootFrameLanguage = localizedLabel.rootFrameLanguage;
		this.language = localizedLabel.language;
		this.unlinkedMessage = localizedLabel.unlinkedMessage;
		this.messageId = localizedLabel.messageId;
		this.unmanaged = localizedLabel.unmanaged;

		this.derivedKey = localizedLabel.derivedKey;
		this.parameterValues = localizedLabel.parameterValues;
		this.fillinsToPlaceholder = localizedLabel.fillinsToPlaceholder;

		this.characters = localizedLabel.characters;
		this.ops = localizedLabel.ops;

		this.currentPatternHTML = UILocalizedLabel.toHtml(
			localizedLabel.characters,
			localizedLabel.ops,
		);

		if (localizedLabel.unmanaged) {
			// localized label was marked as unmanaged - ignore message reference / unlinked messages
			this.messageLinkState = MessageLinkState.Unmanaged;
		} else if (localizedLabel.unlinkedMessage) {
			this.messageLinkState = MessageLinkState.Unlinked;

			const refLanguage = this.manager.messageStore.getRefLanugage()! as Locale;
			// override the currents label variant with state form label
			this.unlinkedMessage = MessageStoreMemory.upsertVariantPatternHtml(
				localizedLabel.unlinkedMessage,
				refLanguage,
				this.rootFrameLanguage,
				[],
				this.currentPatternHTML,
			);
		} else if (localizedLabel.messageId) {
			this.messageId = localizedLabel.messageId;
			if (!this.manager.messageStore.getMessage(this.messageId)) {
				this.messageLinkState = MessageLinkState.MissingMessage;
			} else {
				this.messageLinkState = MessageLinkState.Linked;
			}
		} else {
			this.messageLinkState = MessageLinkState.Unset;
		}

		this.matchingLabelLints = localizedLabel.matchingLabelLints;
		this.labelStyle = localizedLabel.labelStyle;
		this.state = this.getState();
	}

	unmanaged: boolean;

	currentPatternHTML: string;

	ops: DeltaOp[];

	variantPatternHTMLHash?: string | undefined;

	getMessageName(): string | undefined {
		if (this.messageId === undefined) return undefined;
		const message = this.manager.messageStore.getMessage(this.messageId);
		if (message) {
			return message.id;
		}

		return undefined;
	}

	static toHtml(text: string, ops: DeltaOp[]) {
		if (text === "") {
			return "";
		}

		const deltaOps = [] as DeltaOperation[];
		const lastTwoCharsBreaks =
			text.length > 1 && text[text.length - 1] === "\n" && text[text.length - 2] === "\n";

		// allways add an additional line break at the end
		if (ops.length > 0) {
			ops[ops.length - 1].end += 1;
		}
		const rawtext = `${text}\n`;

		// s
		// <p>s</p>
		// s\n
		// <p>s</p>
		// s\n\n
		// <p>s</p><p><br></p>
		// s\n\n\n
		// <p>s</p><p><br></p><p><br></p>

		// --> adding a helper new line (\n)
		// s(\n)
		// <p>s</p>
		// s\n(\n)
		// <p>s</p><p><br></p>
		// s\n\n(\n)
		// <p>s</p><p><br></p><p><br></p>
		// s\n\n\n(\n)
		// <p>s</p><p><br></p><p><br></p><p><br></p>

		// --> replacing wrapper and introducing new lines by \n again
		// all <p><br></p> -> \n
		// <p>s</p><p><br></p><p><br></p><p><br></p> -> should become s\n\n\n
		// <p>s</p>\n\n\n
		// all </p> -> \n -> <p>s\n\n\n\n
		// remove all <p> -> s\n\n\n\n
		// remove last \n -> s\n\n\n CHECK

		// --> replacing wrapper and introducing new lines by \n again
		// all <p><br></p> -> \n
		// <p>s</p> -> should become "s"
		// <p>s</p>
		// all </p> -> \n -> <p>s\n
		// remove all <p> -> s\n
		// remove last \n -> s CHECK

		// placholder replacement
		for (const op of ops) {
			if (op.attributes.placeholder) {
				const insert = op.attributes.placeholder.name;
				const parameterOperation = {
					insert,
					attributes: {
						...op.attributes,
					},
				};
				deltaOps.push(parameterOperation);
			} else {
				const insert = rawtext.substring(op.start, op.end);
				deltaOps.push({
					insert,
					attributes: op.attributes,
				});
			}
		}

		const delta = new Delta(deltaOps);

		const tempCont = document.createElement("pre");
		new Quill(tempCont).setContents(delta);
		let htmlContent = tempCont.getElementsByClassName("ql-editor")[0].innerHTML;
		// remove all quill helper attributes
		htmlContent = htmlContent.replace(/ contenteditable="false">/g, ">");
		htmlContent = htmlContent.split("<p><br></p>").join("\n");
		htmlContent = htmlContent.split("</p>").join("\n");

		htmlContent = htmlContent.split("<p>").join("");
		htmlContent = htmlContent.slice(0, htmlContent.length - 1);
		return htmlContent;
	}

	static toTextOpsAndFillinsToPlaceholder(
		html: string,
		messageParameterValues: MessageParameterValues,
	) {
		// helper to be able to create unique identifierts by fillins
		const fillinsCounts = {} as { [fillinValue: string]: number };
		const fillinsToPlaceholder = {} as {
			[fillinValue: string]: Placeholder;
		};

		// - extract all placeholders from the patternHtml providded
		const placeholderPattern = /<ph([^>])*>([^<]*)<\/ph>/g;
		let htmlWithFilledPlaceholders = html.replace(
			placeholderPattern,
			(match, attributesStrings, placeholderName) => {
				const placeholder = PlaceholderUtil.extractFromRawHtml(placeholderName, attributesStrings);
				const parameterValue = messageParameterValues[placeholder.name].value;
				// TODO #19 variables take formatting function into account
				// - create all values based on formatting function
				const formatedValue = parameterValue;
				if (fillinsCounts[formatedValue] === undefined) {
					fillinsCounts[formatedValue] = 0;
				}
				fillinsCounts[formatedValue] += 1;

				// - create unique fillins with markers for unification - each fillin has at least one marker at the end but eventually multiple if it is not unique idenfifiably
				const fillinValue = formatedValue + MARKER_CHARACTER.repeat(fillinsCounts[formatedValue]);
				fillinsToPlaceholder[fillinValue] = placeholder;

				// - replace html placeholders with injected values
				return fillinValue;
			},
		);

		const tempCont = document.createElement("pre");
		const quill = new Quill(tempCont);
		quill.disable();
		htmlWithFilledPlaceholders = htmlWithFilledPlaceholders.split("\n").join("<br>");

		// htmlWithFilledPlaceholders = htmlWithFilledPlaceholders.split(' ').join('&nbsp;');

		(quill.clipboard as any).matchers[0][1] = function matchText(node: any, delta: any) {
			const text = node.data;
			return delta.insert(text);
		};
		let removeLastCR = false;

		if (
			htmlWithFilledPlaceholders.endsWith("</ol>") ||
			htmlWithFilledPlaceholders.endsWith("</ul>")
		) {
			removeLastCR = true;
		}

		htmlWithFilledPlaceholders += "<br>";

		const contents = (quill.clipboard as any).convert({ html: htmlWithFilledPlaceholders }) as any;
		let text = contents
			.filter((op: any) => typeof op.insert === "string")
			.map((op: any) => op.insert)
			.join(""); // quill.getText();// tempCont.getElementsByClassName('ql-editor')[0].textContent ?? '';

		if (removeLastCR) {
			text = text.slice(0, -1);
		}

		const ops = [] as any[];
		let currentPositon = 0;
		contents.ops?.forEach((operation: any) => {
			if (currentPositon + operation.insert.length > text.length) {
				operation.insert = operation.insert.slice(0, -1);
			}

			ops.push({
				from: currentPositon,
				to: currentPositon + operation.insert.length,
				attributes: operation.attributes,
			});

			currentPositon += operation.insert.length;
		});
		// remove the /n at the end?
		return {
			characters: text,
			ops,
			fillinsToPlaceholder,
		};
	}

	/**
	 * The state of a label is represented by two main properties:
	 * modified: was the labels text changed in the design compared to the version of the key which the label is pointing to
	 * behind: the number of changes that have been applied to the language relative to the version the label is currently pointing to
	 *
	 * Label state changes if:
	 *  * the labels text changes and its text is different from the original text
	 *  * the message variant language/gender/plural the label references changed
	 *  *
	 * @param localizedLabel the label to provide the state for
	 * @returns
	 */
	getState(): { modified: boolean } {
		const state = {
			modified: false,
			// variantDeleted: false, // TODO #17 versioning - matches changed?
			// behind: this.variantPatternHTMLHash ? blake.blake2sHex(this.currentPatternHTML) !== this.variantPatternHTMLHash : false,
			// orginalVariantHTML: undefined as string | undefined,
		};

		if (this.messageLinkState === MessageLinkState.Linked) {
			const message = this.manager.messageStore.getMessage(this.messageId!);

			if (!message) {
				// message has been deleted - has the label not been fixed on first cache load?
				throw new Error("Message does not exist");
			}

			const variantPatternHtml = MessageStoreMemory.htmlForPattern(message, this.language, [
				/** TODO #18 selectors build selectors based on variableValues */
			]);
			state.modified = variantPatternHtml !== this.currentPatternHTML;
			if (variantPatternHtml !== this.currentPatternHTML) {
				// debugger;
			}
		}

		return state;
	}

	isTranslatable() {
		const refLanguage = this.manager.messageStore.getRefLanugage();
		if (!refLanguage) {
			return false;
		}

		if (this.language !== this.manager.messageStore.getRefLanugage()) {
			if (this.messageLinkState === MessageLinkState.Unlinked) {
				const { unlinkedMessage } = this;
				return MessageStoreMemory.canTranslate(unlinkedMessage, refLanguage, this.language, []);
			}

			if (this.messageLinkState === MessageLinkState.Linked) {
				const message = this.manager.messageStore.getMessage(this.messageId);
				if (!message) {
					return false;
				}
				return MessageStoreMemory.canTranslate(message, refLanguage, this.language, []);
			}
		}

		return false;
	}

	async setLanguageOnUnsetLabel(
		targetLanguage: Locale,
		translator: TranslatorMachine,
		triggersCTA: boolean,
	) {
		const refLanguage = this.manager.messageStore.getRefLanugage()! as Locale;
		const fromRefLanguage = this.language === refLanguage;

		let unlinkedMessage: Message = {
			id: "____unlinked",
			// we start with no pattern - unlinked messages cannot have variants other than language - for more complex messages a linked message is required
			selectors: [],
			variants: [
				{
					languageTag: this.language,
					match: [],
					pattern: MessageStoreMemory.patternHtmlToPattern(this.currentPatternHTML),
				},
			],
		};

		// make the lable a unlinked label with the current language
		await this.manager.updateLabelProperties(this.nodeId, {
			messageState: {
				type: "unlinked",
				unlinkedMessage,
				parameterValues: this.parameterValues,
			},
		});

		if (fromRefLanguage) {
			try {
				unlinkedMessage = await MessageStoreMemory.upsertUsingAutoTranslateMessage(
					translator,
					unlinkedMessage,
					refLanguage,
					targetLanguage,
					[],
					triggersCTA,
				);
			} catch (e) {
				await this.manager.updateLabelProperties(this.nodeId, {
					language: targetLanguage,
					messageState: {
						type: "unlinked",
						unlinkedMessage,
						parameterValues: this.parameterValues,
					},
				});
				throw e;
			}
		}

		await this.manager.updateLabelProperties(this.nodeId, {
			language: targetLanguage,
			messageState: {
				type: "unlinked",
				unlinkedMessage,
				parameterValues: this.parameterValues,
			},
		});
	}

	async setLanguageOnUnlinkedLabel(
		targetLanguage: Locale,
		translator: TranslatorMachine,
		enforceTranslation: boolean,
		triggersCTA: boolean,
	) {
		const refLanguage = this.manager.messageStore.getRefLanugage()! as Locale;
		const toRefLanguage = targetLanguage === refLanguage;

		const { unlinkedMessage } = this;

		if (toRefLanguage) {
			// we never translate to the ref language and even if that variant doesn't exist we always skip to it to allow to set it
			return this.manager.updateLabelProperties(this.nodeId, {
				messageState: {
					type: "unlinked",
					unlinkedMessage,
					parameterValues: this.parameterValues,
				},
				language: targetLanguage,
			});
		}

		let hasVariantTranslationInTargetLanguage = MessageStoreMemory.hasTranslationInVariant(
			unlinkedMessage,
			targetLanguage,
			[],
		);
		// let isVariantsTranslationOutdated = await MessageStoreMemory.isVariantsTranslationOutdated(unlinkedMessage, refLanguage, targetLanguage, {});

		let possiblyUpdatedMessage = this.unlinkedMessage;
		if (!hasVariantTranslationInTargetLanguage || enforceTranslation) {
			try {
				possiblyUpdatedMessage = await MessageStoreMemory.upsertUsingAutoTranslateMessage(
					translator,
					unlinkedMessage,
					refLanguage,
					targetLanguage,
					[],
					triggersCTA,
				);
				hasVariantTranslationInTargetLanguage = true;
			} catch (e) {
				// we handle the error using isVariantsTranslationOutdated flag
				await this.manager.updateLabelProperties(this.nodeId, {
					messageState: {
						type: "unlinked",
						unlinkedMessage: possiblyUpdatedMessage,
						parameterValues: this.parameterValues,
					},
					language: targetLanguage,
				});
				throw e;
			}
		}
		// if (!isVariantsTranslationOutdated) {
		//   hasVariantInTargetLanguage = true;
		// }
		// }

		// if (hasVariantInTargetLanguage) {
		await this.manager.updateLabelProperties(this.nodeId, {
			messageState: {
				type: "unlinked",
				unlinkedMessage: possiblyUpdatedMessage,
				parameterValues: this.parameterValues,
			},
			language: targetLanguage,
		});
		// } else {
		//   await this.manager.updateLabelProperties(this.nodeId, {});
		// }
	}

	async setLanguageOnLinkedLabel(
		targetLanguage: Locale,
		translator: TranslatorMachine,
		enforceTranslation: boolean,
		triggersCTA: boolean,
	) {
		const refLanguage = this.manager.messageStore.getRefLanugage()! as Locale;
		const toRefLanguage = targetLanguage === refLanguage;
		const message = this.manager.messageStore.getMessage(this.messageId)!;
		// const hasVariantInTargetLanguage = MessageStoreMemory.hasVariant(message, targetLanguage, []);
		const hasVariantTranslationInTargetLanguage = MessageStoreMemory.hasTranslationInVariant(
			message,
			targetLanguage,
			[],
		);
		// updating message
		if (!hasVariantTranslationInTargetLanguage || enforceTranslation) {
			if (!toRefLanguage) {
				try {
					const eventuallyUpdatedMessage = await MessageStoreMemory.upsertUsingAutoTranslateMessage(
						translator,
						message,
						refLanguage,
						targetLanguage,
						[],
						triggersCTA,
					);
					await this.manager.updateMessage(eventuallyUpdatedMessage, {});
				} catch (e) {
					await this.manager.updateLabelProperties(this.nodeId, {
						messageState: {
							type: "linked",
							messageId: this.messageId!,
							parameterValues: this.parameterValues,
						},
						language: targetLanguage,
					});
					throw e;
				}
			}
			// TODO #3 think about fall back mechanism:
			// in case the variant for the given plural is skipped try to fall back to others
			// if this is skipped as well fall back to base language
			//  - for now we just don't change the label
			await this.manager.updateLabelProperties(this.nodeId, {});
			return;
		}
		await this.manager.updateLabelProperties(this.nodeId, {
			messageState: {
				type: "linked",
				messageId: this.messageId!,
				parameterValues: this.parameterValues,
			},
			language: targetLanguage,
		});
	}

	/**
	 * When we set the language on a labele there are various cases that we need to take care of:
	 *
	 * Missing Message - the message thats referenced by the label does not exist (anymore)
	 * - don't change the state of the label at all
	 *
	 * UnManaged
	 * - don't do anything with it
	 *
	 * Unset
	 * - this label becomes an unlinked label with an anonymouse message
	 *   - option 1) current language is nonRefLanguage
	 *
	 *
	 * Unlinked
	 * - Check if the
	 *
	 *
	 *
	 * @param targetLanguage
	 * @param missingTranslationProvider
	 * @returns
	 */
	async setLanguage(
		targetLanguage: Locale,
		// NOTE we dont support versioning for now version: number | undefined,
		translator: TranslatorMachine,
		enforceTranslation: boolean,
		triggersCTA: boolean,
	) {
		switch (this.messageLinkState) {
			case MessageLinkState.MissingMessage:
				// we don't change any label that is in this state - got to be manually fixed by the user
				// just trigger cache update to propagate the changed root language
				await this.manager.updateLabelProperties(this.nodeId, {});
				return;

			case MessageLinkState.Unmanaged:
				// just trigger cache update to propagate the changed root language
				await this.manager.updateLabelProperties(this.nodeId, {});
				return;

			case MessageLinkState.Unset:
				await this.setLanguageOnUnsetLabel(targetLanguage, translator, triggersCTA);
				break;

			case MessageLinkState.Unlinked:
				await this.setLanguageOnUnlinkedLabel(
					targetLanguage,
					translator,
					enforceTranslation,
					triggersCTA,
				);
				break;
			case MessageLinkState.Linked:
				await this.setLanguageOnLinkedLabel(
					targetLanguage,
					translator,
					enforceTranslation,
					triggersCTA,
				);
				break;
			default:
				throw new Error(`unhandled Linksstate ${this.messageLinkState}`);
				break;
		}
	}

	async setLabelPattern(patternHtml: string, parameterValues: MessageParameterValues) {
		const refLanguage = this.manager.messageStore.getRefLanugage()! as Locale;
		if (this.messageLinkState === MessageLinkState.Unset) {
			// TODO #29 in unset - create message ?

			const unlinkedMessage = {
				id: "____unlinked",
				// we start with no pattern - unlinked messages cannot have variants other than language - for more complex messages a linked message is required
				selectors: [],
				variants: [
					{
						languageTag: refLanguage,
						match: [],
						pattern: MessageStoreMemory.patternHtmlToPattern(patternHtml),
					},
				],
			};

			await this.manager.updateLabelProperties(this.nodeId, {
				messageState: { type: "unlinked", parameterValues, unlinkedMessage },
				language: refLanguage,
			});
		} else if (this.messageLinkState === MessageLinkState.Unlinked) {
			const updatedMessage = MessageStoreMemory.upsertVariantPatternHtml(
				this.unlinkedMessage,
				refLanguage,
				this.language,
				[],
				patternHtml,
			);

			await this.manager.updateLabelProperties(this.nodeId, {
				messageState: { type: "unlinked", parameterValues, unlinkedMessage: updatedMessage },
			});
		} else if (this.messageLinkState === MessageLinkState.Linked) {
			await this.manager.updateLabelProperties(this.nodeId, {
				messageState: {
					type: "linked",
					messageId: this.messageId!,
					parameterValues,
					variantPatternHTML: patternHtml,
				},
			});
		}
	}

	toJSON() {
		const localizedObject = {
			...this,
		} as any;
		localizedObject.manager = undefined;
		return localizedObject as LocalizedLabel;
	}
}
