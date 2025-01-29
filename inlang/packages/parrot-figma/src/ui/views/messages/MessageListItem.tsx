import * as React from "react";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";

import "../../localization/i18n";

import { Locale } from "../../../lib/message/variants/Locale";

import MessageStoreMemory from "../../../lib/message/store/MessageStoreMemory";

import FigmaUtil from "../../../shared/FigmaUtil";

import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";

import Drawer from "../../compontents/drawer/Drawer";
import MessageVariantItem from "./MessageVariantItem";
// import ReactQuill from 'react-quill';

type TranslationKeyListItemProps = {
	rowClassNames?: string | undefined;
	figmaRemote: FigmaUtil;

	searchMatch: any;
	messageStore: MessageStoreMemory;
	messageId: string;
	localizedLabelManager: LocalizedLabelManagerUI;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	select?: Function;
	messageSelected: boolean;
	onFocus?: (messageId: string, locale?: Locale, variantMatch?: string[]) => void;
	onBlur?: (messageId: string, locale?: Locale, variantMatch?: string[]) => void;
};

// TODO #roadmap select message on click - message / message variant
// TODO #roadmap highlight first screen that matches the given combination
// TODO #roadmap add x to seach field to reset filter
// TODO #roadmap deactivate the full seach if no message is available
// TODO #roadmap add little info label to message tab to indicate how many messages are managed

// TODO #27 add celebration and pricing message

// DONE #27 test in firefox
// DONE #27 remove log statements
// DONE #27 make show message a drawer - no need for the list
// DONE #27 fix search drawer layout for to long messages
// DONE #27 ESC does not work to cancel message edit
// DONE #27 style scrollbars https://stackblitz.com/edit/react-ts-frji5h?file=components%2Fscrollbar%2Findex.tsx
// DONE #27 fix sync message buttons
// DONE #27 fix message that are to long / scrolling
// DONE #27 check all z-indexes
// DONE #27 style delete drawer
// DONE #27 add no messages found with filter

export default function TranslationKeyListItem({
	rowClassNames,
	figmaRemote,
	searchMatch,
	messageStore,
	messageId,
	localizedLabelManager,
	select,
	messageSelected,
	onFocus,
	onBlur,
}: TranslationKeyListItemProps) {
	const [messageNameHovered, setMessageNameHoverd] = useState(false);

	const [focusedMessageVariant, setFocusedMessageVariant] = useState<
		undefined | { messageId: string; locale?: Locale; match?: string[] }
	>(undefined);

	// const [history, setHistory] = useState<undefined | VersionEntry[]>(undefined);
	const [messageIdToDelete, setMessageIdToDelete] = useState<undefined | string>(undefined);
	const [keyToDeleteReferences, setKeyToDeleteReferences] = useState<undefined | number>(undefined);

	const [message, setMessage] = useState(localizedLabelManager.messageStore.getMessage(messageId)!);

	const rowRef = React.useRef<HTMLDivElement>(null);

	useEffect(() => {
		messageStore.subscribeMessage(messageId, (updatedMessage) => {
			if (updatedMessage !== undefined) {
				// skip deleted
				setMessage(updatedMessage);
			}
		});
	}, []);

	useEffect(() => {
		const updateReferenceCount = async () => {
			const referenceCount = (await localizedLabelManager.getWithMessage(messageIdToDelete!))
				.length;
			setKeyToDeleteReferences(referenceCount);
		};

		if (messageIdToDelete) {
			updateReferenceCount();
		}
	}, [messageIdToDelete]);

	const refLanguage = messageStore.getRefLanugage();

	// create an array of languages with baselanguage at position zero
	const languages = [
		refLanguage,
		...messageStore.getLanugages()!.filter((l) => l !== refLanguage),
	] as Locale[];

	return (
		<div
			ref={rowRef}
			className={`message-group ${messageSelected ? "message-group-selected" : ""} ${
				rowClassNames !== undefined ? rowClassNames : ""
			} ${messageNameHovered ? " message-group-hovered" : ""} ${
				focusedMessageVariant !== undefined ? " message-group-focused" : ""
			}`}
			onClick={() => {
				if (select) {
					select(message.id);
				}
			}}
		>
			<div
				className={"message-group-header " + (messageSelected ? " selected" : "")}
				onMouseOver={() => {
					setMessageNameHoverd(true);
				}}
				onMouseOut={() => {
					setMessageNameHoverd(false);
				}}
			>
				<div className="spacer" />
				<div className="message-group-header-element-symbol">
					<div className="svg-container with-message-svg" />
				</div>
				<div className="message-group-header-name">
					<div className="rowText">
						{messageId}
						{/* <TextField
              singleClick={false}
              onSave={async (messageName: string) => {
                // TODO #17 versioning - support message renaming. We will allow to rename not before we have the history that can keep track of name changes
                // localizedLabelManager.updateMessage(message.id, {
                //   variants: [],
                //   name: messageName,
                // });
              }}
              text={messageId}
            /> */}
					</div>
				</div>
				<div className="message-group-header-actions">
					{select === undefined && (
						<>
							{/* <div
              className="layerIcon iconWrapper button"
              data-tooltip-content="Delete this translation key"
              onClick={() => {
                // copy
              }}
            >
              <span className="svg-container copy-svg" />
            </div> */}
							<div
								className="layerIcon iconWrapper button"
								data-tooltip-content="Delete this Message"
								onClick={() => {
									setMessageIdToDelete(message.id);
								}}
							>
								<span className="svg-container trash-svg" />
							</div>
						</>
					)}
				</div>
			</div>
			<div className="message-group-header-sticky-border">test</div>

			{languages.map((language) => (
				<MessageVariantItem
					key={language}
					language={language}
					refLanguage={refLanguage!}
					localizedLabelManager={localizedLabelManager}
					messageStore={messageStore}
					searchMatch={searchMatch}
					focusedMessageVariant={focusedMessageVariant}
					message={message}
					select={select}
					onFocus={() => {
						setFocusedMessageVariant({
							messageId: message.id,
							locale: language,
							match: [],
						});
						onFocus?.(message.id, language, []);
					}}
					onBlur={() => {
						setFocusedMessageVariant(undefined);
						onBlur?.(message.id, language, []);
					}}
				/>
			))}
			<Drawer
				position="top"
				buttons={[
					{
						type: "secondary",
						text: "Cancel",
						key: "escape",
						callback: () => {
							// set back to head
							setMessageIdToDelete(undefined);
						},
					},
					{
						type: "primary-destructive",
						text: "Delete Key",
						key: "enter",
						disabled: messageIdToDelete === undefined,
						callback: () => {
							localizedLabelManager.deleteMessage(message.id).catch((e: Error) => {
								Sentry.captureException(e);
								figmaRemote.notifyError(e.message);
							});
							setMessageIdToDelete(undefined);
						},
					},
				]}
				shown={messageIdToDelete !== undefined}
			>
				<div className="modal-drawer-header">
					Delete {localizedLabelManager.messageStore.getMessage(messageIdToDelete!)?.id}
				</div>
				<div className="modal-drawer-body">
					{keyToDeleteReferences !== undefined && keyToDeleteReferences > 0 && (
						<>
							Deletion of the Message{" "}
							{localizedLabelManager.messageStore.getMessage(messageIdToDelete!)?.id} will unlink{" "}
							{keyToDeleteReferences} referencing text layers.
						</>
					)}
					{keyToDeleteReferences === 0 && (
						<>
							Key {localizedLabelManager.messageStore.getMessage(messageIdToDelete!)?.id} is not
							refrenced by a label
						</>
					)}
				</div>
			</Drawer>
		</div>
	);
}
