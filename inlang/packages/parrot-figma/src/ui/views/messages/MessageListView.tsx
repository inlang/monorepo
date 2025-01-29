import * as React from "react";
import { useEffect, useRef, useState } from "react";
import "../../localization/i18n";
import { useTranslation } from "react-i18next";

import { Locale } from "../../../lib/message/variants/Locale";

import MessageStoreMemory, { SearchQuery } from "../../../lib/message/store/MessageStoreMemory";
import FigmaUtil from "../../../shared/FigmaUtil";
import TranslationKeyListItem from "./MessageListItem";
import { Plural } from "../../../lib/message/variants/Plural";

import "./MessageView.css";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";
import { NodeSelection } from "../../../lib/localizedlabels/LocalizedLabelManager";

type MessageListViewProps = {
	initialSearchQuery: SearchQuery;
	showSearchBar: boolean;
	messageStore: MessageStoreMemory;
	localizedLabelManager: LocalizedLabelManagerUI;
	figmaRemote: FigmaUtil;
	select?: (key: string, language: Locale, plural: Plural) => void;
	selectedMessageId?: string;
	highlightSelectedNodes: boolean;
};

export default function MessageListView({
	initialSearchQuery,
	showSearchBar,
	messageStore,
	localizedLabelManager,
	figmaRemote,
	select,
	selectedMessageId,
	highlightSelectedNodes,
}: MessageListViewProps) {
	const { t } = useTranslation();
	const [, setTrigger] = useState(0);
	const [renderEntries, setRenderEntries] = useState(200);

	const [fullyRendered, setFullyRendered] = useState(false);
	const [selectedNodes, setSelectedNodes] = useState({} as NodeSelection);
	const [highlightSelection, setHighlightSelection] = useState(false);

	// const [keys, setKeys] = useState: UITranslationKeys,
	const [searchQuery, setSearchQuery] = useState<SearchQuery>(initialSearchQuery);

	const filteredKeys = messageStore.findMessages(searchQuery, selectedNodes);
	const tableRef = useRef<HTMLDivElement>(null);

	async function refreshSelection(triggerHighlight: boolean) {
		if (highlightSelectedNodes) {
			const freshSelectedNodes = await localizedLabelManager.getSelection();

			setSelectedNodes(freshSelectedNodes);
			setHighlightSelection(triggerHighlight);
		}
	}

	useEffect(() => {
		const messageHandler = (event: any) => {
			if (
				event.data.pluginMessage.type === "event" &&
				event.data.pluginMessage.name === "selectionchange"
			) {
				refreshSelection(true);
			}
		};

		// asynchronous fetch the state from figma helper
		(async () => {
			await refreshSelection(false);
		})();

		const onUpdated = () => {
			setTrigger((v) => v + 1);
		};

		localizedLabelManager.addEventListener("updated", onUpdated);
		messageStore.addEventListener("updated", onUpdated);
		window.addEventListener("message", messageHandler);

		return () => {
			localizedLabelManager.removeEventListener("updated", onUpdated);
			messageStore.removeEventListener("updated", onUpdated);
			window.removeEventListener("message", messageHandler);
		};
	}, []);

	// rendering is done in chunks the first time to give the dom time to settle
	const renderChunkSize = 250;
	useEffect(() => {
		// we use any here since NodeJS.Timout - the suggested type by the ide is not correct
		let renderStepTimeout: any | undefined;
		if (Object.keys(filteredKeys).length > renderEntries) {
			renderStepTimeout = setTimeout(() => {
				// console.log(`rending next portion ${renderEntries + 100}`);
				setRenderEntries((value) => value + renderChunkSize);
			}, 10);
		}

		setFullyRendered(true);

		return () => {
			if (renderStepTimeout !== undefined) clearTimeout(renderStepTimeout);
		};
	}, [renderEntries]);

	useEffect(() => {
		if (tableRef.current && highlightSelection) {
			setHighlightSelection(false);
			const firstSelected = tableRef.current?.querySelector(".selected") as HTMLElement;
			if (firstSelected) {
				(firstSelected.parentNode!.firstChild! as any).scrollIntoViewIfNeeded({ block: "center" });
			}
		}
	}, [highlightSelection]);

	const allMessages = messageStore.getAllMessages() ?? [];

	const fileHasMessages = allMessages.length > 0;
	if (!fileHasMessages) {
		return (
			<div className="emptyState">
				<div className="emptyStateTitle">No messages yet</div>
				<div className="emptyStateSubtitle">
					<div>
						Messages will show up here.
						<br />
						Create one by Linking a Message on a Text Layer in the Layers Tab or Import your
						existing Messages in the Setup Tab.
					</div>
				</div>
			</div>
		);
	}

	const updateQuery = (newQuery: SearchQuery) => {
		setSearchQuery(newQuery);
	};

	const onSearchChange = (searchString: string) => {
		setSearchQuery(MessageStoreMemory.toQueryObject(searchString));
	};

	const longestKey = allMessages
		.map((message) => message.id)
		.reduce((acc, id) => (id.length > acc.length ? id : acc), "");

	let rendered = 0;

	return (
		<div className="message-view">
			{showSearchBar && (
				<div className="message-filter">
					<div style={{ flexGrow: 1 }} />
					<div className="message-filter-search">
						<span className="svg-container search-svg" />
						<input
							type="text"
							placeholder="Find..."
							className="message-filter-search-input"
							spellCheck="false"
							dir="auto"
							value={MessageStoreMemory.toSearchString(searchQuery)}
							onChange={(e) => {
								onSearchChange(e.target.value);
								setRenderEntries(100);
							}}
						/>
					</div>
				</div>
			)}

			<div className="message-list" ref={tableRef}>
				{/* helper row for css to set the width when partially rendered */}

				<TranslationKeyListItem
					key="max-width-helper-row"
					rowClassNames="hidden-helper-row"
					messageStore={messageStore}
					localizedLabelManager={localizedLabelManager}
					searchMatch={undefined}
					messageId={longestKey}
					figmaRemote={figmaRemote}
					select={select}
					messageSelected={false}
				/>
				{[...filteredKeys.matchingNames].length === 0 && (
					<div className="emptyState">
						<div className="emptyStateTitle">No messages matched your search.</div>
						<div className="emptyStateSubtitle">
							<div>Please remove some filters to get more matches.</div>
						</div>
					</div>
				)}
				{[...filteredKeys.matchingNames].map((messageId) => {
					if (rendered > renderEntries) {
						return;
					}

					rendered += 1;

					return (
						<TranslationKeyListItem
							key={messageId}
							messageStore={messageStore}
							localizedLabelManager={localizedLabelManager}
							searchMatch={filteredKeys.matches[messageId]}
							messageId={messageId}
							figmaRemote={figmaRemote}
							select={select}
							messageSelected={
								Object.values(selectedNodes)
									.map((selectedNode) => selectedNode.messageId)
									.includes(messageId) || selectedMessageId === messageId
							}
						/>
					);
				})}
			</div>
		</div>
	);
}
