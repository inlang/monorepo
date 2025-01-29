import * as React from "react";
import { useEffect, useState } from "react";
import { Message } from "@inlang/sdk";
import { Locale } from "../../../lib/message/variants/Locale";
import TranslationEditor from "../../compontents/translationEditor/TranslationEditor";
import { MessageParameterValues } from "../../../lib/message/MessageParameterValues";
import MessageStoreMemory from "../../../lib/message/store/MessageStoreMemory";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";
import TranslatorMachine from "../../../lib/translationprovider/TranslatorMachine";
import FeatureFlags from "../../../lib/featureflags/FeatureFlags";

type MessageVariantItemProps = {
	language: Locale;
	refLanguage: Locale;
	localizedLabelManager: LocalizedLabelManagerUI;
	messageStore: MessageStoreMemory;
	searchMatch: any;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO define proper types
	select?: Function;
	message: Message;
	onFocus: () => void;
	onBlur: () => void;
	focusedMessageVariant: undefined | { messageId: string; locale?: Locale; match?: string[] };
};

export default function MessageVariantItem({
	language,
	refLanguage,
	localizedLabelManager,
	messageStore,
	searchMatch,
	focusedMessageVariant,
	message,
	select,
	onFocus,
	onBlur,
}: MessageVariantItemProps) {
	const variant = message.variants.find(
		(currentVariant) => currentVariant.languageTag === language,
	);

	const refVariant = message.variants.find(
		(currentVariant) => currentVariant.languageTag === refLanguage,
	);

	const refVariantHtml =
		refVariant !== undefined ? MessageStoreMemory.patternToHtml(refVariant.pattern) : undefined;

	// const [variantHTML, setVariantHTML] = useState(variant !== undefined ? MessageStoreMemory.patternToHtml(variant.pattern) : undefined);

	const variantHTML =
		variant !== undefined ? MessageStoreMemory.patternToHtml(variant.pattern) : undefined;

	const [isEmpty, setEmpty] = useState(variantHTML === undefined || variantHTML === "");

	const parameterValues = {}; /*  TODO #18 default values  support fillins message.defaultFillins */
	return (
		<div
			className={`message-group-variant-wrapper ${
				language === refLanguage ? " ref-language" : ""
			} ${
				focusedMessageVariant !== undefined && focusedMessageVariant.locale === language
					? " message-group-variant-focused"
					: ""
			}`}
			key={language}
		>
			<div className="message-group-variant">
				<div className="spacer" />
				<div className="spacer" />
				<div className="message-group-variant-column-language">
					<span className="language">{language}</span>
					{language === refLanguage && <span className="language-tag">ref</span>}
				</div>
				<div className="message-group-variant-column-translation">
					<TranslationEditor
						language={language}
						refLanguage={refLanguage!}
						parameterValues={parameterValues}
						editable={select === undefined}
						isDisabled={false}
						match={searchMatch?.textMatches[language]?.["*"]}
						onChange={(value: string | undefined) => {
							console.log(`on change ${value}`);
							setEmpty(value === "" || value === undefined);
						}}
						onSave={async (text: string | undefined, parameters: MessageParameterValues) => {
							// let skip = message.variants[language as Locale]?.[gender as Gender]?.[plural as Plural]?.skip ?? false;

							Object.values(parameters).forEach((parameter) => {
								parameter.default = true;
							});

							// TODO #18 variables how to deal with default values acutally - as soon as we have variants this can become tricky since the matcher does differ from the default value :( )
							// - one thought on this - variables used in selectors can not have a default value...
							const updatedMessage = MessageStoreMemory.upsertVariantPatternHtml(
								message,
								undefined,
								language,
								[],
								text ?? "",
							);
							await localizedLabelManager.updateMessage(updatedMessage, parameters);
						}}
						onFocus={onFocus}
						onBlur={onBlur}
						variantHTML={variantHTML}
						messageStore={messageStore}
					>
						{language !== refLanguage && isEmpty && FeatureFlags.features.payment && (
							<button
								type="button"
								disabled={refVariantHtml === undefined}
								onClick={async () => {
									// TODO #29 check if we apply the ne message to all text layers as we do for manual input
									const translation = await TranslatorMachine.instance.translate(
										refVariantHtml!,
										refLanguage,
										language,
										true,
									);

									if (translation) {
										const updatedMessage = MessageStoreMemory.upsertVariantPatternHtml(
											message,
											undefined,
											language,
											[],
											translation,
										);
										await localizedLabelManager.updateMessage(updatedMessage, parameterValues);
										setEmpty(false);
									}
								}}
								data-tooltip-content={
									refVariantHtml !== undefined
										? "Translate this message using machine translation."
										: "Can`t machine translate - reference text missing"
								}
							>
								Translate
							</button>
						)}
					</TranslationEditor>
				</div>

				{/* TODO roadmap - message lints make this depending on the warning
         {false && ( 
          <div
            className="layerIcon iconWrapper button"
            data-tooltip-content="Show warnings..."
            onClick={() => {
              // show warning/error menu
            }}
          >
            <span className="svg-container notice-svg" />
          </div>
        )}
          TODO roadmap - message lints make this depending on the warning
        {false && ( 
          <div
            className="layerIcon iconWrapper button"
            data-tooltip-content="More..."
            onClick={() => {
              // show action menu
            }}
          >
            <span className="svg-container three-dots-svg" />
          </div>
        )} */}
			</div>
		</div>
	);
}
