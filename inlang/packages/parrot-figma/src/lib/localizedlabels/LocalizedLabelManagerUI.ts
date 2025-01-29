import blake from "blakejs";
import * as Sentry from "@sentry/react";
import { Message, createVariant, getVariant, updateVariantPattern } from "@inlang/sdk";
import { MessageLinkState, LocalizedLabel } from "./LocalizedLabel";
import { Plural } from "../message/variants/Plural";
import LocalizedLabelManager, { SandboxUpdateLabelProperties } from "./LocalizedLabelManager";
import { Locale } from "../message/variants/Locale";
import MessageStoreMemory from "../message/store/MessageStoreMemory";
import ChangeEvent from "./ChangeEvent";

import { ILocalizedLabelManagerUI, UILocalizedLabel } from "./UILocalizedLabel";
import LinksLoadedEvent from "./LinksLoadedEvent";
import { ImportMessage } from "../import/ImportMessage";
import { Gender } from "../message/variants/Gender";
import { FillinToPlaceholder, MessageExtension, Parameter } from "../message/MessageExtnesions";
import { MessageParameterValues } from "../message/MessageParameterValues";
import MessageImporter from "../import/MessageImporter";
import TranslatorMachine from "../translationprovider/TranslatorMachine";
import { captureLoadProjectEvent } from "../../ui/utils/analytics";
import FigmaUtil from "../../shared/FigmaUtil";

export default class LocalizedLabelManagerUI
	extends EventTarget
	implements ILocalizedLabelManagerUI
{
	// mapping from nodeId to localizied label instance
	private cachedLocalisedLabels = {} as {
		[labelId: string]: UILocalizedLabel;
	};

	// cached root frames containing localized labels
	private cachedFrames = {} as {
		[rootFrameId: string]: {
			frameId: string;
			frameName?: string;
			localizedLabelIds: Set<string>;
		};
	};

	private removeCachedLabel(labelId: string) {
		const cachedLabel = this.cachedLocalisedLabels[labelId];

		if (!cachedLabel) {
			return false;
		}

		delete this.cachedLocalisedLabels[labelId];

		if (this.cachedFrames[cachedLabel.rootFrameId]) {
			this.cachedFrames[cachedLabel.rootFrameId].localizedLabelIds.delete(labelId);
		}

		// if (cachedLabel.key && this.keysToCachedLabels[cachedLabel.key]) {
		//   this.keysToCachedLabels[cachedLabel.key].delete(cachedLabel.nodeId);
		// }

		return true;
	}

	/**
	 * @param label the label to create a cache entry for or refresh the existing one
	 * @returns true if a refresh was needed
	 */
	private refreshCachedLabel(labelToCache: LocalizedLabel, force = false) {
		const label = new UILocalizedLabel(this, labelToCache);

		// flag that signals if the parents of a node have changed (it was moved to another parent for example)
		let rootFrameDiffers = true;
		let stateDiffers = true;

		const cachedLabel = this.cachedLocalisedLabels[label.nodeId];
		if (cachedLabel) {
			rootFrameDiffers = false;
			stateDiffers = false;

			if (cachedLabel.state!.modified !== label.state!.modified) {
				stateDiffers = true;
			}

			if (cachedLabel.rootFrameId !== label.rootFrameId) {
				rootFrameDiffers = true;
			}

			// key the lable referres to changed - remove from keys to labels cache
			// if (label.key !== cachedLabel.key && cachedLabel.key) {
			//   if (this.keysToCachedLabels[cachedLabel.key]) {
			//     this.keysToCachedLabels[cachedLabel.key].delete(cachedLabel.nodeId);
			//   }
			// }

			if (rootFrameDiffers) {
				this.removeCachedLabel(label.nodeId);
			} else if (
				!force &&
				!stateDiffers &&
				cachedLabel.derivedKey === label.derivedKey &&
				cachedLabel.height === label.height &&
				cachedLabel.messageId === label.messageId &&
				cachedLabel.messageLinkState === label.messageLinkState &&
				cachedLabel.language === label.language &&
				cachedLabel.name === label.name &&
				cachedLabel.nodeId === label.nodeId &&
				cachedLabel.pageId === label.pageId &&
				cachedLabel.pageName === label.pageName &&
				cachedLabel.rootFrameId === label.rootFrameId &&
				cachedLabel.rootFrameLanguage === label.rootFrameLanguage &&
				cachedLabel.rootFrameName === label.rootFrameName &&
				cachedLabel.characters === label.characters &&
				cachedLabel.width === label.width &&
				cachedLabel.labelStyle.bold === label.labelStyle.bold &&
				cachedLabel.labelStyle.fontFamily === label.labelStyle.fontFamily &&
				cachedLabel.labelStyle.italic === label.labelStyle.italic &&
				cachedLabel.labelStyle.textDecoration === label.labelStyle.textDecoration &&
				JSON.stringify(cachedLabel.ops) === JSON.stringify(label.ops) &&
				JSON.stringify(cachedLabel.parameterValues) === JSON.stringify(label.parameterValues) &&
				JSON.stringify(cachedLabel.matchingLabelLints) ===
					JSON.stringify(label.matchingLabelLints) &&
				cachedLabel.x === label.x &&
				cachedLabel.y === label.y
			) {
				return false;
			}
		}

		this.cachedLocalisedLabels[label.nodeId] = label;

		// if (label.key !== undefined) {
		//   if (!this.keysToCachedLabels[label.key]) {
		//     this.keysToCachedLabels[label.key] = new Set<string>();
		//   } this.keysToCachedLabels[label.key].add(label.nodeId);
		// }

		if (rootFrameDiffers) {
			if (!this.cachedFrames[label.rootFrameId]) {
				this.cachedFrames[label.rootFrameId] = {
					frameId: label.rootFrameId,
					localizedLabelIds: new Set<string>(),
				};
			}

			if (this.cachedFrames[label.rootFrameId]) {
				this.cachedFrames[label.rootFrameId].localizedLabelIds.add(label.nodeId);
			}
		}

		return true;
	}

	private localizedLabelMangerSandbox: LocalizedLabelManager;

	messageStore: MessageStoreMemory;

	constructor(
		localizedLabelMangerSandbox: LocalizedLabelManager,
		messageStore: MessageStoreMemory,
		figmaRemote: FigmaUtil,
	) {
		super();
		this.localizedLabelMangerSandbox = localizedLabelMangerSandbox;
		this.messageStore = messageStore;

		window.addEventListener("message", (event: MessageEvent) => {
			if (event.data.pluginMessage.target === "LocalizedLabelManager") {
				if (event.data.pluginMessage.type === "cacheUpdate") {
					this.processCacheUpdate(event.data.pluginMessage as ChangeEvent);
				}
				if (event.data.pluginMessage.type === "linksLoaded") {
					this.onKeyLabelLinksLoaded(event.data.pluginMessage as LinksLoadedEvent);
					captureLoadProjectEvent(figmaRemote);
				}
			}
		});

		this.messageStore.addEventListener(MessageStoreMemory.UPDATE_EVENT, (changesEvent: any) => {
			for (const changedKey of changesEvent.detail.changedKeys) {
				this.handleMessageUpdate(changedKey);
			}
		});
	}

	onKeyLabelLinksLoaded(event: LinksLoadedEvent) {
		this.messageStore.updateMessageLinks(event.keys);
	}

	framesIdToLoad = [] as string[];

	async prepare() {
		await this.localizedLabelMangerSandbox.prepare();
	}

	async startFillupCache() {
		// we don't await this promise since it will fill the cache in the background
		this.localizedLabelMangerSandbox.startFillupCache();
	}

	private handleMessageUpdate(messageId: string) {
		let cacheUpdated = false;

		for (const labelToUpdate of Object.values(this.cachedLocalisedLabels)) {
			if (labelToUpdate.messageId === messageId) {
				if (this.refreshCachedLabel(labelToUpdate)) {
					cacheUpdated = true;
				}
			}
		}

		if (cacheUpdated) {
			const event = new CustomEvent("updated", {});
			this.dispatchEvent(event);
		}
	}

	private processCacheUpdate(cacheUpdateMessage: ChangeEvent) {
		let cacheUpdated = false;
		// TODO check if we need to invalidate the frame
		// console.log('processCacheUpdate');
		// console.log(JSON.stringify(cacheUpdateMessage));
		for (const deletedNodeId of cacheUpdateMessage.deletedNodeIds) {
			if (this.removeCachedLabel(deletedNodeId)) {
				// console.log(`label removed: ${JSON.stringify(deleted)}`);
				cacheUpdated = true;
			}
		}

		// console.log('processing created');
		for (const createdLabel of cacheUpdateMessage.createdLabels) {
			if (this.refreshCachedLabel(createdLabel)) {
				// console.log(`label created: ${JSON.stringify(createdLabel)}`);
				cacheUpdated = true;
			}
		}

		// console.log('processing changed');
		for (const changedLabel of cacheUpdateMessage.changedLabels) {
			if (this.refreshCachedLabel(changedLabel)) {
				// console.log(`label changed: ${JSON.stringify(changedLabel)}`);
				cacheUpdated = true;
			}
		}

		if (cacheUpdated) {
			const event = new CustomEvent("updated", {});
			this.dispatchEvent(event);
		}
	}

	async updateUnpinnedLabelsWithMessage(messageId: string) {
		const labelsLinkedToMessage = await this.getWithMessage(messageId);

		await this.updateToMessageHead(labelsLinkedToMessage);
	}

	getLabelByNodeId(nodeId: string) {
		return this.cachedLocalisedLabels[nodeId];
	}

	async getById(textNodeId: string) {
		if (!this.cachedLocalisedLabels[textNodeId]) {
			const freshLocalizedLabel = await this.localizedLabelMangerSandbox.getById(textNodeId);
			if (freshLocalizedLabel) {
				this.refreshCachedLabel(freshLocalizedLabel);
			}
		}
		return this.cachedLocalisedLabels[textNodeId];
	}

	async getWithMessage(messageId: string) {
		const labelsWithMessage = await this.localizedLabelMangerSandbox.getWithMessage(messageId);
		const uiLabels = [] as UILocalizedLabel[];
		for (const freshLocalizedLabel of labelsWithMessage) {
			this.refreshCachedLabel(freshLocalizedLabel);
			uiLabels.push(this.cachedLocalisedLabels[freshLocalizedLabel.nodeId]);
		}
		return uiLabels;
	}

	async getLocalizedLabelsByFrame(frameId: string) {
		// console.log('getLocalizedLabelsByFrame');
		if (this.cachedFrames[frameId] && this.cachedFrames[frameId].frameName) {
			return [...this.cachedFrames[frameId].localizedLabelIds].map(
				(labelId) => this.cachedLocalisedLabels[labelId]!,
			);
		}

		// console.log(`refreshing frame with id ${frameId}`);
		const frameData = await this.localizedLabelMangerSandbox.getFrameById(frameId);

		this.cachedFrames[frameId] = {
			frameId,
			frameName: frameData.name,
			localizedLabelIds: new Set(frameData.localizedLabelsInFrame.map((node) => node.nodeId)),
		};

		for (const freshLocalizedLabel of frameData.localizedLabelsInFrame) {
			this.refreshCachedLabel(freshLocalizedLabel);
		}

		return [...this.cachedFrames[frameId].localizedLabelIds].map(
			(labelId) => this.cachedLocalisedLabels[labelId]!,
		);
	}

	async setFrameLanguage(frameId: string, targetLanguage: Locale, translator: TranslatorMachine) {
		const version = undefined as undefined | number; // todo fill with fixed version of the frame if set

		let lastError: undefined | Error;

		for (const localizedLabelId of this.cachedFrames[frameId].localizedLabelIds) {
			const localizedLabel = this.cachedLocalisedLabels[localizedLabelId]!;

			try {
				await this.setLabelLanguage(
					localizedLabel,
					targetLanguage,
					translator,
					false,
					false /** CTA is triggered not every time */,
				);
			} catch (e: any) {
				lastError = e;
			}
		}

		await this.localizedLabelMangerSandbox.updateFrameProperties(frameId, {
			language: targetLanguage,
		});

		if (lastError) {
			throw lastError;
		}
		// await this.localizedLabelMangerSandbox.updateFrameById(frameId);
	}

	async updateMessage(message: Message, defaultParameters: MessageParameterValues) {
		await this.messageStore.upsertMessage(message, defaultParameters);

		await this.updateUnpinnedLabelsWithMessage(message.id);
	}

	async setLabelLanguage(
		cachedLabel: LocalizedLabel,
		targetLanguage: Locale,
		// TODO #17 versioning
		// version: number | undefined,
		translator: TranslatorMachine,
		enforceTranslation: boolean,
		triggersCTA: boolean,
	) {
		return new UILocalizedLabel(this, cachedLabel).setLanguage(
			targetLanguage,
			translator,
			enforceTranslation,
			triggersCTA,
		);
	}

	async createNewVersionFromLabelState(localizedLabel: UILocalizedLabel) {
		const messageToUpdate = this.messageStore.getMessage(localizedLabel.messageId!)!;
		const updatedMessage = MessageStoreMemory.upsertVariantPatternHtml(
			messageToUpdate,
			undefined,
			localizedLabel.language,
			[],
			localizedLabel.currentPatternHTML,
		);
		this.updateMessage(updatedMessage, {});

		// await this.updateUnpinnedLabelsWithKey(localizedLabel.messageId!);

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async fixLabelLints(localizedLabel: LocalizedLabel, lintsToFix: string[]) {
		await this.localizedLabelMangerSandbox.fixLabelLints(localizedLabel.nodeId, lintsToFix);

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async updateToMessageHead(localizedLabels: LocalizedLabel[]) {
		const updatePromises = [];
		for (const localizedLabel of localizedLabels) {
			const message = this.messageStore.getMessage(localizedLabel.messageId!)!;

			// TODO #17 versioning implement when inlang history is in place
			// const historyEntryForVersion = message.getHistoryEntry(localizedLabel.rootFrameLanguage, localizedLabel.genderId, localizedLabel.pluralId, message.latestVersion);

			updatePromises.push(
				this.updateLabelProperties(localizedLabel.nodeId, {
					messageState: {
						type: "linked",
						messageId: localizedLabel.messageId!,
						parameterValues: localizedLabel.parameterValues,
					},
					// messageVersion: message.latestVersion,
					language: localizedLabel.rootFrameLanguage,
				}),
			);
		}

		// console.log('started');
		await Promise.all(updatePromises).then(() => console.log("finished"));
	}

	async deleteMessage(messageId: string) {
		console.log(`DELETING ${messageId}`);
		await this.messageStore.deleteMessage(messageId);
		console.log(`unlinking message ${messageId}`);
		await this.unlinkLabelsWithMessage(messageId);
		console.log(`DELETING done ${messageId}`);

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async unlinkLabelsWithMessage(messageId: string) {
		const messageToUnlink = await this.messageStore.getMessage(messageId);
		const labelsWithLinkToMessage = await this.getWithMessage(messageId);

		for (const labelWithLinkToMessage of labelsWithLinkToMessage) {
			if (messageToUnlink !== undefined) {
				await this.updateLabelProperties(labelWithLinkToMessage.nodeId, {
					messageState: {
						type: "unlinked",
						unlinkedMessage: messageToUnlink,
						parameterValues: labelWithLinkToMessage.parameterValues,
					},
				});
			} else {
				await this.updateLabelProperties(labelWithLinkToMessage.nodeId, {
					messageState: { type: "unset" },
				});
			}
		}
	}

	async linkMessage(localizedLabel: UILocalizedLabel, messageNameToLinkTo: string, locale: Locale) {
		let message = this.messageStore.getMessageByName(messageNameToLinkTo);

		if (message !== undefined) {
			// message does exist - we only have to link it
			await this.updateLabelProperties(localizedLabel.nodeId, {
				messageState: {
					type: "linked",
					messageId: message.id,
					parameterValues: localizedLabel.parameterValues,
				},
				language: locale,
			});
		} else {
			if (localizedLabel.unlinkedMessage) {
				localizedLabel.unlinkedMessage.id = messageNameToLinkTo;
				message = await this.messageStore.upsertMessage(
					localizedLabel.unlinkedMessage,
					localizedLabel.parameterValues,
				);
			} else {
				message = await this.messageStore.upsertMessage(
					{
						id: messageNameToLinkTo,
						selectors: [],
						variants: [
							{
								match: [],
								languageTag: locale,
								pattern: [{ type: "Text", value: localizedLabel.currentPatternHTML }],
							},
						],
					},
					localizedLabel.parameterValues,
				);
			}

			await this.updateLabelProperties(localizedLabel.nodeId, {
				messageState: {
					type: "linked",
					messageId: message.id,
					parameterValues: localizedLabel.parameterValues,
				},
				// messageVersion: message.latestVersion, // its save to use latest version here since we created a whole new key here.
				language: locale,
			});
		}

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async unsetLabel(localizedLabel: LocalizedLabel) {
		await this.updateLabelProperties(localizedLabel.nodeId, {
			messageState: { type: "unset" },
		});

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async setLabelToUnmanaged(localizedLabel: LocalizedLabel) {
		await this.updateLabelProperties(localizedLabel.nodeId, {
			messageState: { type: "unmanaged", unmanaged: true },
		});

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async commitUndo() {
		await this.localizedLabelMangerSandbox.commitUndo();
	}

	// TODO #18 add again to allow to change parameter values without touching the message it self
	// async updateLabelFillin(localizedLabel: LocalizedLabel, placeholderName: string, fillinValue: string) {
	//   const newFillins = {
	//     ...localizedLabel.parameterValues, // Copy the old fields
	//   };

	//   newFillins[placeholderName] = { value: fillinValue, default: fillinValue === '' };
	//   await this.updateLabelProperties(localizedLabel.nodeId, {
	//     parameterValues: newFillins,
	//   });

	//   await this.localizedLabelMangerSandbox.commitUndo();
	// }

	async updateLabelName(localizedLabel: LocalizedLabel, labelName: string) {
		await this.updateLabelProperties(localizedLabel.nodeId, {
			labelName,
		});

		await this.localizedLabelMangerSandbox.commitUndo();
	}

	async updateLabelPatternHtml(
		localizedLabel: UILocalizedLabel,
		patternHtml: string,
		parameterValues: MessageParameterValues,
	) {
		if (
			localizedLabel.messageLinkState === MessageLinkState.Unmanaged ||
			localizedLabel.messageLinkState === MessageLinkState.MissingMessage
		) {
			// ignore field should be disabled
			return;
		}

		localizedLabel.setLabelPattern(patternHtml, parameterValues);

		if (localizedLabel.messageLinkState === MessageLinkState.Linked) {
			// update only the patternHTML on the label - updating the message is an explicit action
		} else if (localizedLabel.messageLinkState === MessageLinkState.Unset) {
			// TODO #29 create unlinked message ?
		} else if (localizedLabel.messageLinkState === MessageLinkState.Unlinked) {
			// TODO #29 update unlinked message in place ?
		}
	}

	/**
	 * Updates the label with the given nodeId with provided changes and updates the cache
	 * @param nodeId
	 * @param changedProperties
	 */
	async updateLabelProperties(
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
	) {
		const localizedLabelCached = this.cachedLocalisedLabels[nodeId]!;

		const language = changedProperties.language ?? localizedLabelCached.language;

		let textOpsAndFillinsToPlaceholders:
			| {
					ops: any[];
					characters: string;
					fillinsToPlaceholder: FillinToPlaceholder | null | undefined;
			  }
			| undefined;

		let variantPatternHTMLHash: string | undefined;
		if (changedProperties.messageState?.type === "linked") {
			const message = this.messageStore.getMessage(changedProperties.messageState.messageId)!;
			let parameters: Parameter[] | undefined;
			let variantHTML = changedProperties.messageState.variantPatternHTML;
			if (variantHTML !== undefined) {
				parameters = MessageExtension.getParameter(message, {
					locale: localizedLabelCached.language,
					parameterValues: changedProperties.messageState.parameterValues,
					variantHtml: variantHTML,
				});
			} else {
				parameters = MessageExtension.getParameter(message);
			}

			for (const parameter of parameters) {
				if (changedProperties.messageState!.parameterValues[parameter.name] === undefined) {
					changedProperties.messageState!.parameterValues[parameter.name] = {
						type: "string",
						value: parameter.name, // TODO #18 default values have better default values
						default: true,
					};
				}
			}

			if (variantHTML !== undefined) {
				textOpsAndFillinsToPlaceholders = UILocalizedLabel.toTextOpsAndFillinsToPlaceholder(
					variantHTML,
					changedProperties.messageState.parameterValues,
				);
				variantPatternHTMLHash = blake.blake2sHex(variantHTML);
			} else {
				const updatedMessage = this.messageStore.getMessage(
					changedProperties.messageState.messageId,
				);

				/* const bestMatchingVariant = MessageStoreMemory.getBestExistingVariant(
          updatedMessage!,
          language,
          this.messageStore.getLanugages()!,
          [],
        );

        if (bestMatchingVariant === undefined) {
          throw new Error('The given message has no variant at all');
        }

        variantHTML = MessageStoreMemory.patternToHtml(bestMatchingVariant.pattern);
        */
				variantHTML = MessageStoreMemory.htmlForPattern(updatedMessage!, language, []) ?? "";
				textOpsAndFillinsToPlaceholders = UILocalizedLabel.toTextOpsAndFillinsToPlaceholder(
					variantHTML,
					changedProperties.messageState.parameterValues,
				);
				variantPatternHTMLHash = blake.blake2sHex(variantHTML);

				changedProperties.language = language; // bestMatchingVariant.languageTag as Locale;
			}
			// the variant pattern in the label have changed
		} else if (changedProperties.messageState?.type === "unlinked") {
			const updatedMessage = changedProperties.messageState.unlinkedMessage;

			const variantHTML = MessageStoreMemory.htmlForPattern(updatedMessage!, language, []) ?? "";

			textOpsAndFillinsToPlaceholders = UILocalizedLabel.toTextOpsAndFillinsToPlaceholder(
				variantHTML,
				changedProperties.messageState.parameterValues,
			);
			variantPatternHTMLHash = blake.blake2sHex(variantHTML);

			changedProperties.language = language;
		}
		// unset will be passed automatically

		let localizedLabel: LocalizedLabel | undefined;
		try {
			localizedLabel = await this.localizedLabelMangerSandbox.updateLabelProperties(nodeId, {
				messageState: changedProperties.messageState,
				characters: textOpsAndFillinsToPlaceholders?.characters,
				ops: textOpsAndFillinsToPlaceholders?.ops,
				fillinsToPlaceholder: textOpsAndFillinsToPlaceholders?.fillinsToPlaceholder,
				labelName: changedProperties.labelName,
				language: changedProperties.language,
				// messageVersion:
				variantPatternHTMLHash,
			});
		} finally {
			let forceCacheRefresh = false;
			if (localizedLabel === undefined) {
				localizedLabel = await this.localizedLabelMangerSandbox.getById(nodeId);
				forceCacheRefresh = true;
			}
			if (this.refreshCachedLabel(localizedLabel!, forceCacheRefresh)) {
				const event = new CustomEvent("updated", {});
				this.dispatchEvent(event);
			}
		}
	}

	async getSelection() {
		const selection = await this.localizedLabelMangerSandbox.getSelection();
		return selection;
	}

	async import(messagesToImport: Message[], language: Locale) {
		const importStats = MessageImporter.getImportStatistics(
			this.messageStore,
			messagesToImport,
			language,
		);

		for (const newMessage of importStats.newMessages) {
			console.log(`creating Message: ${newMessage.id}`);

			await this.messageStore.upsertMessage(newMessage, {});
		}

		for (const newVariant of importStats.newVariants) {
			const existingMessage = this.messageStore.getMessage(newVariant.message.id)!;
			const updatedMessage = createVariant(existingMessage, { data: newVariant.variant });
			console.log(
				`creating Variant for Message: ${newVariant.message.id} match: ${newVariant.variant.match} `,
			);

			await this.messageStore.upsertMessage(updatedMessage.data!, {});
		}

		for (const updatedVariant of importStats.updatedVariants) {
			const existingMessage = this.messageStore.getMessage(updatedVariant.message.id)!;
			const updatedMessage = updateVariantPattern(existingMessage, {
				where: { languageTag: language, match: updatedVariant.variant.match },
				data: updatedVariant.variant.pattern,
			});
			console.log(
				`updating Variant for Message: ${updatedVariant.message.id} match: ${updatedVariant.variant.match} `,
			);

			await this.messageStore.upsertMessage(updatedMessage.data!, {});
		}
	}
}
