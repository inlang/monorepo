import * as React from "react";
import * as Sentry from "@sentry/react";
import { useEffect, useRef, useState } from "react";
import { Plural } from "../../../lib/message/variants/Plural";
import { MessageLinkState } from "../../../lib/localizedlabels/LocalizedLabel";
import FigmaUtil from "../../../shared/FigmaUtil";
import InputSelect, {
	InputSelectOption,
	InputSelectionOptionType,
} from "../../compontents/selectInput/inputselect";
import { SelectOption } from "../../compontents/select/select";
import MessageStoreMemory from "../../../lib/message/store/MessageStoreMemory";
import { Locale } from "../../../lib/message/variants/Locale";
import TranslationEditor from "../../compontents/translationEditor/TranslationEditor";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";
import TextField from "../../compontents/textfield/TextField";
import MessageListView from "../messages/MessageListView";
import { UILocalizedLabel } from "../../../lib/localizedlabels/UILocalizedLabel";
import { track } from "../../utils/analytics";
import Drawer from "../../compontents/drawer/Drawer";
import { MessageParameterValues } from "../../../lib/message/MessageParameterValues";
import TranslatorMachine, {
	NoMoreTranslationsLeftError,
} from "../../../lib/translationprovider/TranslatorMachine";
import FeatureFlags from "../../../lib/featureflags/FeatureFlags";

type LocalizedLabelListItemProps = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	showMessage: Function;
	localizedLabel: UILocalizedLabel;
	figmaRemote: FigmaUtil;
	localizedLabelManager: LocalizedLabelManagerUI;
	selected: "selected-by-parent" | "selected" | "unselected";
};

export default function LocalizedLabelListItem({
	showMessage,
	localizedLabel,
	figmaRemote,
	localizedLabelManager,
	selected,
}: LocalizedLabelListItemProps) {
	const { messageStore } = localizedLabelManager;
	const message =
		localizedLabel.messageLinkState !== MessageLinkState.Unset
			? messageStore.getMessage(localizedLabel.messageId!)
			: undefined;

	const rowRef = React.useRef<HTMLDivElement>(null);

	const labelState = localizedLabel.state!;

	const [messageSearch, setMessageSearch] = useState(undefined as any);

	const [showMessageInDrawer, setShowMessageInDrawer] = useState(undefined as any);

	const drawerSelectedKey = useRef<string | undefined>(undefined);
	// Dummy state variable to trigger re-render when currentHighlightIndex.current changes
	const [, setDummyState] = useState<any>();

	const pluralsAvailable = [] as SelectOption[];

	async function createNewVersionFromDesign() {
		await localizedLabelManager.createNewVersionFromLabelState(localizedLabel).catch((e: Error) => {
			Sentry.captureException(e);
			figmaRemote.notifyError(e.message);
		});
	}

	async function fixLints() {
		await localizedLabelManager
			.fixLabelLints(localizedLabel, localizedLabel.matchingLabelLints)
			.catch((e: Error) => {
				Sentry.captureException(e);
				figmaRemote.notifyError(e.message);
			});
	}

	async function updateToLatestKeyVersion() {
		track("updateToLatestKeyVersion");
		await localizedLabelManager.updateToMessageHead([localizedLabel]).catch((e: Error) => {
			Sentry.captureException(e);
			figmaRemote.notifyError(e.message);
		});
	}

	async function onNodeSelect(nodeId: string) {
		await figmaRemote.scrollIntoViewIfNeeded(nodeId, true);
	}

	// TODO #18 selectors check if inlang supports plurals
	// if (messages) {
	//   for (const plural of Object.keys(messages)) {
	//     const pluralOption = {
	//       value: plural, label: plural,
	//     };
	//     pluralsAvailable.push(pluralOption);
	//   }
	// } else {
	pluralsAvailable.push({
		value: Plural.OTHER,
		label: Plural.OTHER,
	});
	// }

	let messageName = "";

	if (localizedLabel.messageLinkState === MessageLinkState.Linked) {
		messageName = localizedLabel.getMessageName()!;
	}

	let iconClass = "no-message-svg";
	if (localizedLabel.messageLinkState === MessageLinkState.Linked) {
		iconClass = "with-message-svg";
	} else if (localizedLabel.messageLinkState === MessageLinkState.Unmanaged) {
		iconClass = "not-localized-svg";
	} else if (localizedLabel.messageLinkState === MessageLinkState.MissingMessage) {
		iconClass = "no-message-svg";
	} else if (localizedLabel.messageLinkState === MessageLinkState.Unlinked) {
		iconClass = "no-message-svg";
	}

	useEffect(() => {
		setDummyState({});
	}, [localizedLabel]);

	return (
		<>
			<Drawer
				position="top"
				buttons={[
					{
						type: "secondary",
						text: "Cancel",
						key: "escape",
						callback: () => {
							setMessageSearch(undefined);
						},
					},
					{
						type: "primary",
						text: "Use message",
						key: "enter",
						callback: () => {
							const messageToLink = localizedLabelManager.messageStore.getMessage(
								drawerSelectedKey.current!,
							)!;

							localizedLabelManager
								.linkMessage(localizedLabel, messageToLink.id, localizedLabel.rootFrameLanguage!)
								.catch((e) => {
									figmaRemote.notifyError(`could not set message${e.message}`);
									Sentry.captureException(e);
								});
							setMessageSearch(undefined);
						},
						disabled: drawerSelectedKey.current === undefined,
					},
				]}
				shown={messageSearch !== undefined}
			>
				<div className="modal-title" style={{ width: "1000px" }}>
					Select a Message
				</div>
				{messageSearch !== undefined && (
					<MessageListView
						showSearchBar
						messageStore={messageStore}
						localizedLabelManager={localizedLabelManager}
						figmaRemote={figmaRemote}
						selectedMessageId={drawerSelectedKey.current}
						initialSearchQuery={MessageStoreMemory.toQueryObject(`name:* ${messageSearch.search}`)}
						select={(key: string, language: Locale, plural: Plural) => {
							drawerSelectedKey.current = key;
							setDummyState({});
						}}
						highlightSelectedNodes={false}
					/>
				)}
			</Drawer>

			<Drawer
				className="message-editor-drawer"
				position="top"
				buttons={[
					{
						type: "secondary",
						text: "Close",
						key: "escape",
						callback: () => {
							setShowMessageInDrawer(undefined);
						},
					},
				]}
				shown={showMessageInDrawer !== undefined}
			>
				<div className="modal-title" style={{ width: "1000px" }}>
					Edit Message
				</div>
				{showMessageInDrawer !== undefined && (
					<MessageListView
						showSearchBar={false}
						messageStore={messageStore}
						localizedLabelManager={localizedLabelManager}
						figmaRemote={figmaRemote}
						selectedMessageId={showMessageInDrawer}
						initialSearchQuery={MessageStoreMemory.toQueryObject(`name:${showMessageInDrawer}`)}
						select={(key: string, language: Locale, plural: Plural) => {
							// drawerSelectedKey.current = showMessage;
							setDummyState({});
						}}
						highlightSelectedNodes={false}
					/>
				)}
			</Drawer>

			<div
				className={`layer ${selected} layer-message-state__${localizedLabel.messageLinkState} `}
				onClick={() => {
					onNodeSelect(localizedLabel.nodeId);
				}}
			>
				<div className="layer-name">
					<div className="spacer" />
					<div className="spacer" />
					<div className="element-symbol">
						<div className="svg-container text-sign-svg" />
					</div>
					<TextField
						singleClick={false}
						onSave={async (labelName: string) => {
							await localizedLabelManager.updateLabelName(localizedLabel, labelName).catch((e) => {
								figmaRemote.notifyError(`could not set message${e.message}`);
								Sentry.captureException(e);
							});
						}}
						text={localizedLabel.name}
					/>
				</div>

				<div className="layer-details" ref={rowRef}>
					<div className="message-panel">
						<InputSelect
							className="message-select"
							placeholder={
								localizedLabel.messageLinkState === MessageLinkState.Unmanaged
									? "not localized"
									: "Link a message..."
							}
							isDisabled={localizedLabel.matchingLabelLints.length > 0}
							iconClass={iconClass}
							inputPlaceholder="e.g. home__tagline"
							onCancel={() => {
								setDummyState({});
							}}
							onChange={async (selectedOption, reset) => {
								if (selectedOption.type === InputSelectionOptionType.ACTION) {
									if (selectedOption.value === "select-message") {
										setMessageSearch({
											search: localizedLabel.characters,
										});
									} else if (selectedOption.value === "show-message") {
										setShowMessageInDrawer(localizedLabel.getMessageName());
									} else if (selectedOption.value === "reset") {
										// triggered by empty field - option added by the select field it self
										reset();
										await localizedLabelManager.unsetLabel(localizedLabel);
									} else if (selectedOption.value === "text-layer-not-localized") {
										// triggered by empty field - option added by the select field it self
										reset();
										await localizedLabelManager.setLabelToUnmanaged(localizedLabel);
									}
								} else if (selectedOption.type === InputSelectionOptionType.ADD) {
									await localizedLabelManager.linkMessage(
										localizedLabel,
										selectedOption.value,
										localizedLabel.rootFrameLanguage!,
									);
								} else if (selectedOption.type === InputSelectionOptionType.SUGGESTION) {
									await localizedLabelManager.linkMessage(
										localizedLabel,
										selectedOption.value,
										localizedLabel.rootFrameLanguage!,
									);
								}
								/* if (selectedOption.type === 'action') {
                      if (selectedOption.value === 'no-translation') {
                        localizedLabelManager.setNoKey(localizedLabel);
                      } else if (selectedOption.value === 'select-message') {
                        setSearchKey({
                          search: localizedLabel.characters,
                        });
                      } else if (selectedOption.value === 'create-key') {
                        setNewKey(localizedLabel.derivedKey ?? '');
                      } else if (selectedOption.value === 'show-message') {
                        showKey(localizedLabel.key!);
                      }
                    } else if (selectedOption.type === 'key') {
                      localizedLabelManager.linkKey(localizedLabel, selectedOption.value as string, selectedOption.language!, selectedOption.plural!);
                    } */
							}}
							valueReplaceFn={(value) =>
								value.replace(/[ .]/g, (match) => (match === "." ? "__" : "_"))
							}
							defaultValue={messageName}
							getOptions={(enteredValue: string) => {
								let options = [] as InputSelectOption[];

								const keySearch = enteredValue === "" ? "*" : enteredValue;
								const textMatchQuery = MessageStoreMemory.toQueryObject(
									`exact_text:true name:${keySearch} ${localizedLabel.characters}`,
								);
								const { inText: suggestedKeys, matchingNames: matchingKeysByName } =
									messageStore.findMessages(textMatchQuery);

								const isValidKey =
									enteredValue.length >= 0 &&
									/^[a-zA-Z0-9]$/.test(enteredValue[enteredValue.length - 1]);

								if (
									isValidKey &&
									!suggestedKeys.has(enteredValue) &&
									!matchingKeysByName.has(enteredValue)
								) {
									options.push({
										type: InputSelectionOptionType.ADD,
										value: enteredValue,
										label: "",
									});
								}

								if (suggestedKeys.size > 0) {
									options.push({
										type: InputSelectionOptionType.DIVIDER,
										value: "",
										label: "Text matches",
									});
								}

								options = options.concat(
									[...suggestedKeys].map((key) => {
										matchingKeysByName.delete(key);
										return {
											type: InputSelectionOptionType.SUGGESTION,
											icon: "with-message-svg",
											value: messageStore.getMessage(key)!.id,
											label: messageStore.getMessage(key)!.id,
										};
									}),
								);

								if (keySearch.length > 2 && matchingKeysByName.size > 0) {
									options.push({
										type: InputSelectionOptionType.DIVIDER,
										value: "",
										label: "Messages",
									});

									options = options.concat(
										[...matchingKeysByName]
											.filter((matchingKey) => !suggestedKeys.has(matchingKey))
											.map((key) => ({
												type: InputSelectionOptionType.SUGGESTION,
												icon: "with-message-svg",
												value: messageStore.getMessage(key)!.id,
												label: messageStore.getMessage(key)!.id,
											})),
									);
								}

								if (options.length > 1) {
									options.push({
										type: InputSelectionOptionType.DIVIDER,
										value: "",
										label: "",
									});
								}

								options.push({
									label: "Full Search...",
									icon: "search-svg",
									value: "select-message",
									type: InputSelectionOptionType.ACTION,
								});

								if (
									localizedLabel.messageLinkState === MessageLinkState.Linked &&
									messageName === enteredValue
								) {
									options.push({
										label: "Show linked Message...",
										icon: "goto-message-svg",
										value: "show-message",
										type: InputSelectionOptionType.ACTION,
									});
								}

								if (localizedLabel.messageLinkState === MessageLinkState.Unmanaged) {
									options.push({
										label: "Enable translation...",
										icon: "with-message-svg",
										value: "reset",
										type: InputSelectionOptionType.ACTION,
									});
								} else {
									options.push({
										label: "Do not translate this text layer...",
										icon: "not-localized-svg",
										value: "text-layer-not-localized",
										type: InputSelectionOptionType.ACTION,
									});
								}

								// Unlink?
								return options;
							}}
						/>

						<div className="message-variant">
							<div
								className="message-variant-language"
								data-tooltip-content="Current Language of this Label"
							>
								<span className="language">{localizedLabel.language}</span>
								{localizedLabel.language ===
									localizedLabelManager.messageStore.getRefLanugage() && (
									<span className="language-tag">ref</span>
								)}
							</div>
							{/* <div key={localizedLabel.pluralId} className={`keyPluralWrapper ${translatedKey?.plural ? 'onePlural' : ' multiplePlurals'}`}> */}

							<div className="grid-item-translation translation-container">
								<TranslationEditor
									language={localizedLabel.language}
									refLanguage={localizedLabelManager.messageStore.getRefLanugage()!}
									editable
									isDisabled={localizedLabel.matchingLabelLints.length > 0}
									match={undefined}
									onCancel={async () => {
										localizedLabelManager.commitUndo();
									}}
									onChange={async (
										patternHtml: string | undefined,
										parameters: MessageParameterValues,
										reset: any,
									) => {
										if (patternHtml !== undefined) {
											localizedLabelManager
												.updateLabelPatternHtml(localizedLabel, patternHtml, parameters)
												.catch((e: Error) => {
													Sentry.captureException(e);
													figmaRemote.notifyError(e.message);
													reset();
												});
										}
									}}
									parameterValues={localizedLabel.parameterValues}
									variantHTML={localizedLabel.currentPatternHTML}
									messageStore={messageStore}
								>
									{localizedLabel.language !==
										localizedLabelManager.messageStore.getRefLanugage() &&
										(localizedLabel.currentPatternHTML === undefined ||
											localizedLabel.currentPatternHTML === "") &&
										FeatureFlags.features.payment && (
											<button
												type="button"
												disabled={!localizedLabel.isTranslatable()}
												onClick={() => {
													const translationProvider = TranslatorMachine.instance;

													try {
														localizedLabelManager.setLabelLanguage(
															localizedLabel,
															localizedLabel.language,
															translationProvider,
															true,
															true,
														);
													} catch (e: any) {
														if (!(e instanceof NoMoreTranslationsLeftError)) {
															figmaRemote.notify(
																`Something went wrong with translation - ${e.message}`,
															);
															Sentry.captureException(e);
														}
													}
												}}
												data-tooltip-content={
													localizedLabel.isTranslatable()
														? "Translate this message using machine translation."
														: "Can`t machine translate - reference text missing"
												}
											>
												Translate
											</button>
										)}

									{localizedLabel.messageLinkState === MessageLinkState.Linked &&
										(labelState.modified ||
											localizedLabel.language !== localizedLabel.rootFrameLanguage) && ( // allow the user to catch up with the keys version
											<button
												type="button"
												data-tooltip-content="Reset to text from Message"
												onClick={updateToLatestKeyVersion}
											>
												Revert
											</button>
										)}

									{localizedLabel.messageLinkState === MessageLinkState.Linked &&
										labelState.modified && (
											<button
												type="button"
												onClick={createNewVersionFromDesign}
												data-tooltip-content="Use Text in Message"
											>
												Use
											</button>
										)}

									{localizedLabel.matchingLabelLints.length > 0 && (
										<div
											className="layerIcon iconWrapper button"
											data-tooltip-content={`Label contains unsupported inline styles: ${localizedLabel.matchingLabelLints.join(
												", ",
											)}`}
											onClick={fixLints}
										>
											<div className="svg-container warning-svg" />
										</div>
									)}
								</TranslationEditor>
								{/* TODO #18 make paramter editable again when we have selectors in place - variables only used as selectors can't be accesed otherwise
                      { selected !== 'unselected' && (
                        <div className="placeholder-view-grid" style={{ display: Object.keys(localizedLabel.parameterValues).length > 0 ? undefined : 'none' }}>

                          <div />
                          <div />
                          <div>Placeholder</div>
                          <div />
                          <div />
                          {Object.entries(localizedLabel.parameterValues).map((entry, i, array) => (
                            <PlaceholderEditorListItem
                              key={entry[0]}
                              placeholder={entry[1]}
                              fillin={localizedLabel.parameterValues?.[entry[0]]?.value ? localizedLabel.parameterValues?.[entry[0]]?.value : 'unset'}
                              onValueChange={(placeholderName, fillinValue) => {
                                // TODO #18 variables - this is not used at the moment but bases on fillins instead of parameters
                                localizedLabelManager.updateLabelFillin(localizedLabel, placeholderName, fillinValue).catch((e: Error) => {
                                  Sentry.captureException(e);
                                  figmaRemote.notifyError(e.message);
                                });
                              }}
                            />

                          ))}
                        </div>
                      )} */}
							</div>
						</div>
					</div>
				</div>

				<div className="layer-spacer" />
			</div>
		</>
	);
}
