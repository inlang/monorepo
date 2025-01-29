import TextEncoding from "text-encoding";

import blake from "blakejs";
import { Message } from "@inlang/sdk";
import { Locale } from "../variants/Locale";

export interface Config {
	refLanguage?: Locale;
	enabledLanguages?: Locale[];
}

const defaultStringFillinValue = "Loren Impsum";
const defaultDecimalFillinValue = 7;
const defaultFloatFillinValue = Math.PI;

const encoder = new TextEncoding.TextEncoder();

export class InlangMessageStore {
	public proxyClassName = "InlangMessageStore";

	public static configDataKey = "prt_ic";

	/**
	 * we store a version map here:
	 * [
	 *  { name: 'v-1.0.0', description: '', id: string? },
	 * ]
	 */
	public static tagsDataKey = "prt_t";

	/**
	 * Prefix for messageId's
	 * - the head version of a message is stored withing a pluginDataKey of the current document root node
	 * - all messages are strored prefixed with the messagePrefix followed by a slot (for collisions) hashed orignal message name
	 */
	public static messagePrefix = "prt_im__";

	// contains a map from messageId to message hash
	messageState = {} as {
		[messageId: string]: string;
	};

	messageIdToLabels = {} as {
		[messageId: string]: Set<string>;
	};

	constructor(asProxy: boolean) {
		if (!asProxy) {
			figma.on("documentchange", this.forwardDocumentChanges.bind(this));
		}
	}

	forwardDocumentChanges(event: any) {
		for (const change of event.documentChanges) {
			if (
				change.origin === "LOCAL" ||
				change.type !== "PROPERTY_CHANGE" ||
				change.node.id !== "0:0" ||
				change.properties.indexOf("pluginData") === -1
			) {
				continue;
			}

			// TODO #25 CACHING implement for multi user - keep tracK of changes in config as well

			const currentFileStorageKeys = figma.root
				.getPluginDataKeys()
				.filter((value) => value.indexOf(InlangMessageStore.messagePrefix) === 0);
			let currentCachedMessageIds = Object.keys(this.messageState);

			const changedKeys = {
				deleted: [] as string[],
				updated: [] as string[],
				added: [] as string[],
			};

			for (const currentFileStorageKey of currentFileStorageKeys) {
				const id = currentFileStorageKey.slice(InlangMessageStore.messagePrefix.length);

				if (this.messageState[id] === undefined) {
					changedKeys.added.push(id);
				} else {
					if (
						blake.blake2sHex(encoder.encode(figma.root.getPluginData(currentFileStorageKey))) !==
						this.messageState[id]
					) {
						changedKeys.updated.push(id);
					}

					currentCachedMessageIds = currentCachedMessageIds.filter((messageId) => messageId !== id);
				}
			}
			changedKeys.deleted = currentCachedMessageIds;

			for (const deletedKey of currentCachedMessageIds) {
				delete this.messageState[deletedKey];
			}

			if (
				changedKeys.deleted.length > 0 ||
				changedKeys.added.length > 0 ||
				changedKeys.updated.length > 0
			) {
				figma.ui.postMessage({
					target: "TranslationKeyStore",
					type: "cacheUpdate",
					changedKeys,
				});
			}
		}
	}

	getConfigSync() {
		const messageRaw = figma.root.getPluginData(InlangMessageStore.configDataKey);

		if (messageRaw === "" || !messageRaw) {
			return {
				refLanguage: undefined,
				enabledLanguages: [],
			} as Config;
		}

		return JSON.parse(messageRaw) as Config;
	}

	async getConfig() {
		return this.getConfigSync();
	}

	async setConfig(languageConfig: Config) {
		figma.root.setPluginData(InlangMessageStore.configDataKey, JSON.stringify(languageConfig));
	}

	async saveMessage(message: Message): Promise<void> {
		figma.root.setPluginData(
			InlangMessageStore.messagePrefix + message.id,
			JSON.stringify(message),
		);
	}

	async deleteMessage(id: string): Promise<void> {
		figma.root.setPluginData(InlangMessageStore.messagePrefix + id, "");
	}

	async getMessageAsync(messageId: string) {
		return this.getMessage(messageId);
	}

	getMessage(messageId: string) {
		const messageStorageKey = InlangMessageStore.messagePrefix + messageId;

		const messageRaw = figma.root.getPluginData(messageStorageKey);
		if (messageRaw === "") {
			return undefined;
		}
		const messageRawHash = blake.blake2sHex(encoder.encode(messageRaw));
		const message = JSON.parse(messageRaw);
		if (message !== undefined) {
			this.messageState[message.id] = messageRawHash;
		}
		return message;
	}

	async load(): Promise<Message[]> {
		const messages = [] as Message[];
		for (const messageStorageKey of figma.root.getPluginDataKeys()) {
			if (messageStorageKey.startsWith(InlangMessageStore.messagePrefix)) {
				const messageName = messageStorageKey.substring(InlangMessageStore.messagePrefix.length);
				const message = this.getMessage(messageName);
				if (message !== undefined) {
					messages.push(message);
				}
			}
		}
		return messages;
	}

	async commitUndo() {
		return figma.commitUndo();
	}
}
