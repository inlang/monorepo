import * as React from "react";
import { useEffect, useState } from "react";
import "../../localization/i18n";
import { useTranslation } from "react-i18next";

import posthog from "posthog-js";
import Select, { SelectOption } from "../../compontents/select/select";
import "./Export.css";
import { Locale } from "../../../lib/message/variants/Locale";
import MessageExporter from "../../../lib/export/MessageExporter";
import FEATURES_FLAGS from "../../featuretoggle";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";
import UserManagerUI from "../../../lib/usage/UsageManagerUI";

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
			menuLabel: `${languageNameInCurrentLanguage} - ${language} (${languageNameInForeignLanguage})`,
			isDisabled: true,
		};
	}
	return {
		value: language,
		label: `${languageNameInCurrentLanguage} - ${language}`,
		menuLabel: `${languageNameInCurrentLanguage} - ${language} (${languageNameInForeignLanguage})`,
	};
}

function toLanguageOptions(languages: string[], baseLanguage?: string) {
	return languages.map((language) => toLanguageOption(language, baseLanguage));
}

type ExportProps = {
	labelManager: LocalizedLabelManagerUI;
	userManager: UserManagerUI;
};
/**
 * Select versionTag (allow to tag current Version)
 * Select Language for export
 * Select platform (ios/android) / export format
 */
export default function Export({ labelManager, userManager }: ExportProps) {
	const { t } = useTranslation();
	const translationKeyStore = labelManager.messageStore;

	const baseLanguage = labelManager.messageStore.getRefLanugage()!;
	const selectedLanguages = toLanguageOptions(
		labelManager.messageStore.getLanugages()!.filter((language) => language !== baseLanguage),
	);
	const selectedBaseLanguage = toLanguageOption(baseLanguage);

	const defaultOptions = [
		{
			label: "Current Version",
			value: "head",
		},
		{
			label: "",
			divider: true,
		},
		{
			label: "Tag Current Version...",
			value: "tag-current",
		},
		{
			label: "",
			divider: true,
		},
	] as SelectOption[];

	// const initTagOptions = defaultOptions.concat(labelManager.messageStore.historyTags.slice().reverse().map((historyTag) => ({
	//   label: historyTag.title,
	//   value: historyTag.versionId!,
	// } as SelectOption)));

	const [selectedVersion, setSelectedVersion] = useState<string>("head");
	const [title, setTitle] = useState("test");
	const [description, setDescription] = useState("");
	const [featureEnabled, setFeatureEnabled] = useState(false);

	const [exportTarget, setExportTarget] = useState<string | undefined>(undefined);

	const exportPlatformOptions = [
		{
			label: "i18next - json format",
			value: "i18next",
		},
		{
			label: "Android - Resource XML",
			value: "android-xml",
		},
		{
			label: "iOS - .strings File",
			value: "apple-strings",
		},
	] as SelectOption[];

	const downloadFile = (fileName: string, fileType: string, content: string) => {
		const contentBlob = new Blob([content], { type: fileType });
		const fileUrl = URL.createObjectURL(contentBlob);

		const link = document.createElement("a");
		link.href = fileUrl;
		link.download = fileName;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const onVersionSelect = (version: string) => {
		setSelectedVersion(version);
	};
	// const [baseLanguage, setBaseLanguages] = useState(messageStore.getRefLanugage());

	const onTagCurrentVersionClick = async () => {
		// TODO #17 versioning we dont do this in inlang for now
		/*
    const newTag = await labelManager.messageStore.createTag(title, description);
    const options = defaultOptions.concat(labelManager.messageStore.historyTags.slice().reverse().map((historyTag) => ({
      label: historyTag.title,
      value: historyTag.versionId!,
    } as SelectOption)));
    setTagOptions(options);
    setSelectedVersion(newTag.versionId!);
    */
	};

	const doExport = async (exportLanguage: Locale, format: string) => {
		// const precondition = await userManager.requestFeature('export');
		// if (!precondition) {
		//   console.log('nope');
		//   return
		// }
		const exportedFile = MessageExporter.export(translationKeyStore, exportLanguage, format);
		if (exportedFile) {
			downloadFile(exportedFile.fileName, exportedFile.fileType, exportedFile.content);
		}
	};

	const [keySummary, setKeySummary] = useState(
		labelManager.messageStore.findMessages({}, undefined),
	);

	useEffect(() => {
		const updateSummary = () => {
			setKeySummary(labelManager.messageStore.findMessages({}, undefined));
		};

		labelManager.messageStore.addEventListener("updated", updateSummary);

		return () => {
			labelManager.messageStore.removeEventListener("updated", updateSummary);
		};
	}, []);

	return (
		<div>
			{/* { FEATURES_FLAGS.versioning && (
      <div>
        Please select the version you want to export
        <Select
          placeholder="Select Version"
          onChange={(value) => { onVersionSelect(value.value as string); }}
          getOptions={() => tagOptions}
          defaultValue={tagOptions.find((option) => option.value === selectedVersion)!}
        />
      </div>
      )} */}
			<div style={{ display: "flex" }}>
				<div className="setup-header-title">Export</div>
				<div style={{ marginLeft: "auto", marginRight: "8px" }}>
					<Select
						checkmark={false}
						placeholder="Export Target"
						onChange={(value) => {
							setExportTarget(value.value as string);
						}}
						getOptions={() => exportPlatformOptions}
					/>
				</div>
			</div>
			<div>
				<div className="setup-header">
					<div className="setup-header-title">Main file language</div>
				</div>
				<div className="choosen-language-control">
					<div className="change-control">
						<div className="svg-container world-svg" />

						<div className="choosen-languages">
							<div className="language-name">
								<div>{selectedBaseLanguage?.label}</div>
							</div>
							<div className="language-summary">
								{keySummary.matchingNames.size} Translation Keys
								{keySummary.withMissingVariantsPerLanguage[selectedBaseLanguage!.value as Locale] &&
									keySummary.withMissingVariantsPerLanguage[selectedBaseLanguage!.value as Locale]!
										.size > 0 && (
										<div>
											(
											{
												keySummary.withMissingVariantsPerLanguage[
													selectedBaseLanguage!.value as Locale
												]!.size
											}{" "}
											Missing Translations)
										</div>
									)}
							</div>
							<div className="language-export-action">
								<button
									className="button button--buttonSecondary"
									disabled={exportTarget === undefined}
									type="button"
									onClick={() => {
										doExport(selectedBaseLanguage.value as Locale, exportTarget!);
										posthog.capture("PARROT export messages", {
											exportResult: {
												format: exportTarget,
												language: selectedBaseLanguage.value,
												numberOfMessages: keySummary.matchingNames.size,
											},
										});
									}}
								>
									<span data-tooltip-type="text">Export</span>
								</button>
							</div>
						</div>
					</div>
				</div>
				<div style={{ height: "8px" }} />
				<div className="setup-header needs-base-language">
					<div className="setup-header-title">Target languages</div>
				</div>
				<div className="choosen-language-control">
					<div className="change-control">
						<div className="svg-container world-svg" />
						<div className="choosen-languages">
							{selectedLanguages.map((languageOption) => (
								<>
									<div className="language-name-wrapper">
										<div className="language-name">
											<div>{languageOption.label}</div>
										</div>
									</div>
									<div className="language-summary">
										{/* <div>
                      {keySummary.withMissingVariantsPerLanguage[languageOption.value as Locale]
                        ?.size ?? 0}{' '}
                      Missing Translations
                    </div> */}
									</div>
									<div className="language-export-action">
										<button
											className="button button--buttonSecondary"
											disabled={exportTarget === undefined}
											type="button"
											onClick={() => {
												doExport(languageOption.value as Locale, exportTarget!);
												posthog.capture("PARROT export messages", {
													exportResult: {
														format: exportTarget,
														language: selectedBaseLanguage.value,
														// TODO: fix reactivity to show correct number of exported messages https://github.com/opral/inlang-parrot/issues/16
														// numberOfMessages: keySummary.matchingNames.size - (keySummary.withMissingVariantsPerLanguage[languageOption.value as Locale]
														//   ?.size ?? 0),
													},
												});
											}}
										>
											<span data-tooltip-type="text">Export</span>
										</button>
									</div>
								</>
							))}
						</div>
						{/* <div className="choosen-language-change" onClick={() => { setChangeLanguages(true); }}>Change</div> */}
					</div>
				</div>
			</div>
		</div>
	);
}
