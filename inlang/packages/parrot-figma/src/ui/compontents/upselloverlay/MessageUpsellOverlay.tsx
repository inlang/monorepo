import * as React from "react";
import { useEffect, useState } from "react";
import UpsellOverlay from "./UpsellOverlay";
import TranslatorMachine from "../../../lib/translationprovider/TranslatorMachine";
import { TranslationCredit } from "../../../lib/api/Parrot";

export default function MessageUpsellOverlay({
	onclick,
	hideInfo,
}: {
	hideInfo: boolean;
	onclick: () => void;
}) {
	const [availableTranslations, setAvailableTranslations] = useState(0);
	const [messageCreditsTotal, setMessageCreditsTotal] = useState(0);
	const [freeTier, setFreeTier] = useState(true);
	const [loaded, setLoaded] = useState(false);

	const messagesCreditsUsed = messageCreditsTotal - availableTranslations;

	let progress = 1;
	let upsellType: "info" | "warning" | "error" = "info";
	let message = `${availableTranslations} machine translations left`;

	function syncState(stateData: { credits: TranslationCredit[]; availableMessages: number }) {
		let currentMessageCreditsTotal = 0;
		for (const credit of stateData.credits) {
			currentMessageCreditsTotal += credit.msgc;
		}
		if (stateData.credits.length > 1) {
			setFreeTier(false);
		}

		setMessageCreditsTotal(currentMessageCreditsTotal);
		setAvailableTranslations(stateData.availableMessages);
	}

	TranslatorMachine.instance.getCreditStateAsync().then((state) => {
		setLoaded(true);
		syncState(state);
	});

	useEffect(() => {
		const creditUpdateHandler = (event: MessageEvent) => {
			if (event.data.pluginMessage.target === "TranslatorMachine") {
				if (event.data.pluginMessage.type === "creditUpdate") {
					syncState(event.data.pluginMessage.data);
				}
			}
		};

		window.addEventListener("message", creditUpdateHandler);
		// TODO listen to events from translatorMachine

		return () => {
			window.removeEventListener("message", creditUpdateHandler);
		};
	}, []);

	if (availableTranslations > 30) {
		upsellType = "info";
	} else if (availableTranslations <= 50 && availableTranslations > 0) {
		upsellType = "warning";
		if (availableTranslations < 13) {
			upsellType = "error";
		}
		if (freeTier) {
			progress = availableTranslations / 70;
			message = `${availableTranslations} free translations left`;
		} else {
			// 10 of 1000 will not show change on the progress bar - use 50 as baseline...
			progress = availableTranslations / 70; // messageCreditsTotal;
			message = `${availableTranslations} translations left`;
		}
	} else {
		upsellType = "error";
		if (freeTier) {
			message = `All ${messagesCreditsUsed} free translations used.`;
		} else {
			message = "All translations used.";
		}
	}

	return (
		<UpsellOverlay
			type={upsellType}
			msg={message}
			progress={progress}
			cta="Get additional translations"
			onclick={onclick}
			hidden={!loaded || (hideInfo && upsellType === "info")}
		/>
	);
}
