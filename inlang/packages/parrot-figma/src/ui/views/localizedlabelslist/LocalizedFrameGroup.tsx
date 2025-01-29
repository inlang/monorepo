import * as React from "react";
import * as Sentry from "@sentry/react";
import { LocalizedLabel } from "../../../lib/localizedlabels/LocalizedLabel";
import LocalizedLabelListItem from "./LocalizedLabelListItem";
import Select, { SelectOption } from "../../compontents/select/select";
import FigmaUtil from "../../../shared/FigmaUtil";
import MessageStoreMemory from "../../../lib/message/store/MessageStoreMemory";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";
import { Locale } from "../../../lib/message/variants/Locale";
import { UILocalizedLabel } from "../../../lib/localizedlabels/UILocalizedLabel";
import { NodeSelection } from "../../../lib/localizedlabels/LocalizedLabelManager";
import GoogleTranslator from "../../../lib/translationprovider/google";
import TranslatorMachine, {
	NoMoreTranslationsLeftError,
} from "../../../lib/translationprovider/TranslatorMachine";

type LocalizedFrameGroupProps = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	showMessage: Function;
	localizedLabels: UILocalizedLabel[];
	selectedNodes: NodeSelection;
	figmaRemote: FigmaUtil;
	localizedLabelManager: LocalizedLabelManagerUI;
};

function toLanguageOption(language: string, baseLanguage?: string) {
	let languageNameInCurrentLanguage = "no name found";
	try {
		languageNameInCurrentLanguage =
			new Intl.DisplayNames("en", { type: "language" }).of(language) ??
			languageNameInCurrentLanguage;
	} catch (e) {
		/* empty */
	}

	let languageNameInForeignLanguage = "no name found";
	try {
		languageNameInForeignLanguage =
			new Intl.DisplayNames(language, { type: "language" }).of(language) ??
			languageNameInForeignLanguage;
	} catch (e) {
		/* empty */
	}

	if (baseLanguage && language === baseLanguage) {
		return {
			value: language,
			label: `${languageNameInCurrentLanguage} - ${language}`,
			tag: "ref",
		};
	}
	return {
		value: language,
		label: `${languageNameInCurrentLanguage} - ${language}`,
	};
}

export default function LocalizedFrameGroup({
	showMessage,
	localizedLabels,
	selectedNodes,
	figmaRemote,
	localizedLabelManager,
}: LocalizedFrameGroupProps) {
	if (localizedLabels.length === 0) return null;

	const firstTranslationState = localizedLabels[0];
	const { rootFrameName, rootFrameId } = firstTranslationState;

	let rootFrameLanguage: SelectOption | undefined;
	const languageOptiones = [] as SelectOption[];

	const languages = localizedLabelManager.messageStore.getLanugages()!.sort();

	languageOptiones.push(
		toLanguageOption(
			localizedLabelManager.messageStore.getRefLanugage()!,
			localizedLabelManager.messageStore.getRefLanugage()!,
		),
	);

	for (const language of languages) {
		const currentLanguageOption = toLanguageOption(language);
		if (language === firstTranslationState.rootFrameLanguage) {
			rootFrameLanguage = currentLanguageOption;
		}
		if (localizedLabelManager.messageStore.getRefLanugage()! !== language) {
			languageOptiones.push(currentLanguageOption);
		}
	}

	async function onLanguageSelectionClick(
		firstLocalizedLabelInFrame: LocalizedLabel,
		language: Locale,
	) {
		const translationProvider = TranslatorMachine.instance;

		try {
			await localizedLabelManager.setFrameLanguage(
				firstLocalizedLabelInFrame.rootFrameId,
				language,
				translationProvider,
			);
		} catch (e: any) {
			if (!(e instanceof NoMoreTranslationsLeftError)) {
				figmaRemote.notify(`Something went wrong with translation - ${e.message}`);
				Sentry.captureException(e);
			}
		}
	}

	async function onNodeSelect(nodeId: string) {
		await figmaRemote.scrollIntoViewIfNeeded(nodeId, true);
	}

	return (
		<>
			<div
				className={`column-1 layer-group-header nodes-parent${
					selectedNodes[rootFrameId]?.directSelection ? " selected" : ""
				}`}
				onClick={() => {
					onNodeSelect(rootFrameId);
				}}
			>
				<div className="spacer" />
				<div className="element-symbol">
					<div className="svg-container number-sign-svg" />
				</div>
				<div className="element-name font-body-24-bold">{rootFrameName}</div>
				<div className="row-actions">
					<Select
						tooltip="Container Frame Langueage"
						placeholder="Select item"
						checkmark
						iconClass="switch-language-svg"
						onChange={(value) => {
							onLanguageSelectionClick(firstTranslationState, value.value as Locale);
						}}
						defaultValue={languageOptiones.find((opt) => opt.value === rootFrameLanguage?.value)}
						getOptions={() => languageOptiones}
					/>
				</div>
			</div>
			<div className="layer-group-header-sticky-border" />

			{rootFrameLanguage?.value &&
				localizedLabels.map((translationState) => {
					let selection = "unselected" as "unselected" | "selected" | "selected-by-parent";
					if (selectedNodes[translationState.nodeId] !== undefined) {
						if (selectedNodes[translationState.nodeId].directSelection) {
							selection = "selected";
						} else {
							selection = "selected-by-parent";
						}
					}

					return (
						<LocalizedLabelListItem
							showMessage={showMessage}
							key={translationState.nodeId}
							figmaRemote={figmaRemote}
							localizedLabelManager={localizedLabelManager}
							selected={selection}
							localizedLabel={translationState}
						/>
					);
				})}

			{rootFrameLanguage?.value === undefined && <div>choose current design language</div>}
		</>
	);
}
