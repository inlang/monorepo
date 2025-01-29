import { stat } from "fs";
import ParrotApi, { TranslationCredit, TranslationCreditUsage } from "../api/Parrot";
import { Locale } from "../message/variants/Locale";
import getKey from "./TranslationCredit";

import GoogleTranslator from "./google";
import FeatureFlags from "../featureflags/FeatureFlags";
import Monitoring from "../monitoring/MonitoringProxy";

const translationsCreditUsageLocalStorageKey = "prrt_utc";
const translationCreditsLocalStorageKey = "prrt_tc";

const includedBatteries =
	"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiJpbmNsdWRlZC1iYXR0ZXJpZXMtMyIsImNpcyI6InBhcnJvdCIsImN0Ijoidm91Y2hlciIsIm1zZ2MiOjEwMCwibXNndSI6MH0.QBUCrDcUHYKM9zoYc3xHNvqTUNdr1GdrZzapEkH1tAxforYj1IQsm2B6a40_qLf6p2t4jWUFIz_efMEAXlnUBBqBSVSZJUQMPOgXtagjTSJKHZNqWieP9SZ91aC7uJitL_U4odljlj61wBb6Pa7LhWl9_yf8ycLykbFMK9oXcn2yLFbwA3kLwf0qkkOxpL0z0hPAofzUZc2I90StLeHHgkHC2HE4Sk9HVNkDyyGOxfXOXmfrGxPOzDZKZhcxgRY9BMXgVuR2gXYuIgBzk6naaAOiswC6kPTcy148Jmlc1T5jylWwKNl-JEpRIGBfPM23nTiiWqwT7wuW1Syb62PzLQ";

type UsageState = {
	translationsCreditUsage: TranslationCreditUsage[];
	translationCredits: TranslationCredit[];
};

function getCurrentCredits(
	translationCredits: TranslationCredit[],
	ownerId: string,
	currentTime: number,
) {
	return translationCredits
		.filter(
			// only those with the same owner and within the time span or no timespan and those with free messages are relevant
			(credit) =>
				credit.co === ownerId &&
				(credit.nbf === undefined ||
					credit.exp === undefined ||
					(credit.nbf <= currentTime && currentTime <= credit.exp)),
		)
		.sort((a, b) => {
			// Sort by start time (nbf), with those having nbf as null placed last
			if (a.nbf === undefined) return 1;
			if (b.nbf === undefined) return -1;
			return a.nbf - b.nbf;
		});
}

// calculates the available messages by
// 1. reducing the available messages by translations that have not been sychronised
// 2. only sum credits valid for the current time
function calculateAvailableMessages(
	usageState: UsageState,
	ownerId: string,
	currentTime: number,
): number {
	const { translationsCreditUsage, translationCredits } = usageState;

	// Clone the credits array to avoid modifying the original array
	const sortedCredits = (
		JSON.parse(JSON.stringify(translationCredits)) as TranslationCredit[]
	).sort((a, b) => {
		// Sort by start time (nbf), with those having nbf as null placed last
		if (a.nbf === undefined) return 1;
		if (b.nbf === undefined) return -1;
		return a.nbf - b.nbf;
	});

	// add usages - not known by the server yet
	for (const usage of translationsCreditUsage.sort((a, b) => a.time - b.time)) {
		for (const credit of sortedCredits) {
			// credits are sorted and credits with a time bound come first -> get the usage applied to first
			if (
				credit.co === ownerId &&
				(credit.nbf === undefined ||
					credit.exp === undefined ||
					(credit.nbf <= usage.time && usage.time <= credit.exp)) &&
				credit.msgc - credit.msgu > 0
			) {
				// Use the credit if it has a matching timespan and available messages
				credit.msgu += 1;
				break;
			}
		}
	}

	return sortedCredits.reduce((sum, credit) => {
		if (
			credit.co === ownerId &&
			(credit.nbf === undefined ||
				credit.exp === undefined ||
				(credit.nbf <= currentTime && currentTime <= credit.exp))
		) {
			return sum + (credit.msgc - credit.msgu);
		}
		return sum;
	}, 0);
}

export class NoMoreTranslationsLeftError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NoMoreTranslationsLeftError";
	}
}

export default class TranslatorMachine {
	public proxyClassName = "TranslatorMachine";

	ensureStateLoaded: Promise<void>;

	state: UsageState | null = null;

	parrotApi: ParrotApi | undefined;

	constructor(parrotApi?: ParrotApi) {
		// if its a proxy we don't have an api key
		if (!parrotApi) {
			const promise = async () => {};
			this.ensureStateLoaded = promise();
			TranslatorMachine.instance = this;
			return;
		}

		this.parrotApi = parrotApi;

		// load available translations from parrot backend - fall back to local storage
		const ensureStateLoadedPromise = async () => {
			const usedTranslationsCredits = await figma.clientStorage.getAsync(
				translationsCreditUsageLocalStorageKey,
			);
			const translationCredits = await figma.clientStorage.getAsync(
				translationCreditsLocalStorageKey,
			);

			if (FeatureFlags.features.payment) {
				this.state = {
					translationCredits:
						typeof translationCredits === "object"
							? (translationCredits as TranslationCredit[])
							: [
									{
										cid: "included-batteries-1",
										ct: "voucher",
										co: figma.currentUser!.id!,
										msgc: 100,
										msgu: 0,
										jwt: includedBatteries,
									},
								],
					translationsCreditUsage:
						typeof usedTranslationsCredits === "object"
							? (usedTranslationsCredits as TranslationCreditUsage[])
							: [],
				};

				// remove sent flags - since this is a new run...
				for (const usage of this.state!.translationsCreditUsage) {
					usage.send = false;
				}

				await this.syncTranslations(true);
			}
		};
		this.ensureStateLoaded = ensureStateLoadedPromise();
	}

	static instance: TranslatorMachine;

	async activateLicenseAsync(licenseKey: string) {
		return this.parrotApi?.activateLicense(
			figma.currentUser!.id!,
			figma.currentUser!.name,
			licenseKey,
		);
	}

	async addTranslationCreditUse(ownerId: string, nCharacters: number, triggersCTA: boolean) {
		const usageTime = new Date().getTime();
		//

		await this.ensureStateLoaded;
		// When we start with collaboration we just need to
		this.state!.translationsCreditUsage.push({
			ownerId,
			messages: 1,
			acknowledged: false,
			send: false,
			time: usageTime,
			characters: nCharacters,
		});

		const availableTranslations = calculateAvailableMessages(this.state!, ownerId, usageTime);
		let requestShowUpsellCTA = false;
		if (availableTranslations > 0) {
			// we just blindly reset the flag whenever we have more than 0 translations
			await this.setUpsellCTAShownFlag(false);
		} else if (!(await this.getUpsellCTAShownFlag()) || triggersCTA) {
			await this.setUpsellCTAShownFlag(true);
			requestShowUpsellCTA = true;
		}

		this.fireCreditsUpdateEvent(requestShowUpsellCTA);
		// lets not await the call to the server
		this.syncTranslations();
	}

	async syncTranslations(init?: boolean) {
		if (!init) {
			await this.ensureStateLoaded;
		}

		const usageToSend = [];
		const currentFigmaUserId = figma.currentUser!.id!;
		const currentFigmaFileOwnerId = currentFigmaUserId; // we change this to the real owner when we introduce collaboration

		for (const creditUsage of this.state!.translationsCreditUsage) {
			if (
				!creditUsage.send &&
				(creditUsage.ownerId === currentFigmaUserId ||
					creditUsage.ownerId === currentFigmaFileOwnerId)
			) {
				usageToSend.push(creditUsage);
				creditUsage.send = true;
			}
		}

		await figma.clientStorage.setAsync(
			translationsCreditUsageLocalStorageKey,
			this.state!.translationsCreditUsage,
		);

		try {
			const updatedCredits = await this.updateInBackend(
				currentFigmaUserId,
				currentFigmaFileOwnerId,
				usageToSend,
				this.state!.translationCredits,
			);

			// remove all credits of the current user of of the owner of the current file and those (the updated once) comming from the server.
			this.state!.translationCredits = this.state!.translationCredits.filter(
				(credit) => credit.co !== currentFigmaUserId && credit.co !== currentFigmaFileOwnerId,
			).concat(updatedCredits);

			for (const successfulSend of usageToSend) {
				const indexOfSuccessfullSend = this.state!.translationsCreditUsage.indexOf(successfulSend);
				this.state!.translationsCreditUsage.splice(indexOfSuccessfullSend, 1);
			}

			// update local storage state
			figma.clientStorage.setAsync(
				translationCreditsLocalStorageKey,
				this.state!.translationCredits,
			);
			figma.clientStorage.setAsync(
				translationsCreditUsageLocalStorageKey,
				this.state!.translationsCreditUsage,
			);

			this.fireCreditsUpdateEvent(false);
		} catch (e) {
			// ok we ignore errors here for now - only send them to sentry?
			for (const failedToSend of usageToSend) {
				failedToSend.send = false;
			}
		}
	}

	async updateInBackend(
		figmaUserId: string,
		figmaFileOwnerId: string,
		translationsCreditUsage: TranslationCreditUsage[],
		translationCredits: TranslationCredit[],
	) {
		const result = await this.parrotApi!.synchronizeCredits(
			figmaUserId,
			figmaFileOwnerId,
			translationCredits.map((c) => c.jwt),
			translationsCreditUsage,
		);
		return result;
		// for (const usage of translationsCreditUsage) {
		//   const credit = getCurrentCredit(translationCredits, usage.ownerId, usage.time);
		//   if (credit) {
		//     credit.msgu += 1;
		//   }
		// }
		// return translationCredits;
	}

	async translate(text: string, sourceLange: Locale, targetLanguage: Locale, triggersCTA: boolean) {
		// make sure the state is loaded from the local storage
		await this.ensureStateLoaded;

		// For now don't use the owner of the file
		const userId = figma.currentUser!.id!;

		if (FeatureFlags.features.payment) {
			const availableTranslations = calculateAvailableMessages(
				this.state!,
				userId,
				new Date().getTime(),
			);

			if (availableTranslations <= 0 && FeatureFlags.features.payment) {
				if (triggersCTA) {
					await this.fireCreditsUpdateEvent(true);
				}
				// TODO #29 activate again
				throw new NoMoreTranslationsLeftError("No Machine Translations left");
			}
		}

		let translation: string | null = null;

		// call google translate
		translation = await GoogleTranslator.translate(text, sourceLange, targetLanguage);

		// lets not wait for the results here ;-)
		if (figma.currentUser && FeatureFlags.features.payment) {
			try {
				await this.addTranslationCreditUse(userId, text.length, triggersCTA);
			} catch (e: any) {
				// we won't fail if the backend is down...
				await Monitoring.instance?.sentryCaptureException(e, {});
			}
		}
		return translation;
	}

	async getCreditStateAsync() {
		return this.getCreditState();
	}

	getCreditState() {
		const userId = figma.currentUser!.id!;
		return {
			credits: getCurrentCredits(this.state!.translationCredits, userId, new Date().getTime()),
			availableMessages: this.getAvailableMessages(),
		};
	}

	async setUpsellCTAShownFlag(state: boolean) {
		await figma.clientStorage.setAsync("parrot_upsell_cta_shown", state);
	}

	async getUpsellCTAShownFlag() {
		const ctaShown = await figma.clientStorage.getAsync("parrot_upsell_cta_shown");
		if (ctaShown === undefined) {
			return false;
		}
		return ctaShown;
	}

	getAvailableMessages() {
		// For now don't use the owner of the file
		const userId = figma.currentUser!.id!;
		const availableTranslations = calculateAvailableMessages(
			this.state!,
			userId,
			new Date().getTime(),
		);
		return availableTranslations;
	}

	fireCreditsUpdateEvent(requestShowUpsellCTA: boolean) {
		const message = {
			target: "TranslatorMachine",
			type: "creditUpdate",
			data: this.getCreditState(),
			requestShowUpsellCTA,
		} as any;

		// console.log('keys changed');
		// console.log(keysChanged);
		figma.ui.postMessage(message);
	}
}
