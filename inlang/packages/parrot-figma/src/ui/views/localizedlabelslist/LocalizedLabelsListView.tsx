import * as React from "react";
import { useEffect, useRef, useState } from "react";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";
import FigmaUtil from "../../../shared/FigmaUtil";
import LocalizedFrameGroup from "./LocalizedFrameGroup";
import "./LocalizedLabelsListView.css";
import { UILocalizedLabel } from "../../../lib/localizedlabels/UILocalizedLabel";
import { NodeSelection } from "../../../lib/localizedlabels/LocalizedLabelManager";

declare global {
	interface Element {
		scrollIntoViewIfNeeded: (bool?: boolean) => void;
	}
}

if (!Element.prototype.scrollIntoViewIfNeeded) {
	Element.prototype.scrollIntoViewIfNeeded = function (
		this: HTMLElement,
		centerIfNeeded?: boolean,
	) {
		centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;

		const parent = this.parentNode! as HTMLElement;
		const parentComputedStyle = window.getComputedStyle(parent, null);
		const parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue("border-top-width"));
		const parentBorderLeftWidth = parseInt(
			parentComputedStyle.getPropertyValue("border-left-width"),
		);
		const overTop = this.offsetTop - parent.offsetTop < parent.scrollTop;
		const overBottom =
			this.offsetTop - parent.offsetTop + this.clientHeight - parentBorderTopWidth >
			parent.scrollTop + parent.clientHeight;
		const overLeft = this.offsetLeft - parent.offsetLeft < parent.scrollLeft;
		const overRight =
			this.offsetLeft - parent.offsetLeft + this.clientWidth - parentBorderLeftWidth >
			parent.scrollLeft + parent.clientWidth;
		const alignWithTop = overTop && !overBottom;

		if ((overTop || overBottom) && centerIfNeeded) {
			parent.scrollTop =
				this.offsetTop -
				parent.offsetTop -
				parent.clientHeight / 2 -
				parentBorderTopWidth +
				this.clientHeight / 2;
		}

		if ((overLeft || overRight) && centerIfNeeded) {
			parent.scrollLeft =
				this.offsetLeft -
				parent.offsetLeft -
				parent.clientWidth / 2 -
				parentBorderLeftWidth +
				this.clientWidth / 2;
		}

		if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
			this.scrollIntoView(alignWithTop);
		}
	};
}

type LocalizedLabelsListViewProps = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	showMessage: Function;
	figmaRemote: FigmaUtil;
	localizedLabelManager: LocalizedLabelManagerUI;
};

export default function LocalizedLabelsListView({
	showMessage,
	figmaRemote,
	localizedLabelManager,
}: LocalizedLabelsListViewProps) {
	const [localizedLabels, setLocalizedLabels] = useState<UILocalizedLabel[]>([]);

	const tableRef = useRef<HTMLDivElement>(null);

	const [selection, setSelection] = useState({} as NodeSelection);

	const [parentIds, setParentIds] = useState(new Set<string>());

	const freeTier = true;

	async function refreshSelection() {
		const selectedNodes = await localizedLabelManager.getSelection();
		setSelection(selectedNodes);
		const updatedParentIds = new Set<string>();

		let selectedLabels = [] as UILocalizedLabel[];

		for (const selectedNode of Object.values(selectedNodes)) {
			if (!selectedNode.rootFrameId) {
				continue;
			}

			if (!updatedParentIds.has(selectedNode.rootFrameId)) {
				// console.log('getting labels from manager');

				const selectedLabelsByFrame = await localizedLabelManager.getLocalizedLabelsByFrame(
					selectedNode.rootFrameId,
				);

				if (selectedLabelsByFrame) {
					selectedLabels = selectedLabels.concat(selectedLabelsByFrame);
				}
				updatedParentIds.add(selectedNode.rootFrameId);
			}
		}
		setParentIds(updatedParentIds);
		setLocalizedLabels(selectedLabels);
	}

	function messageHandler(event: any) {
		if (event.data.pluginMessage.type === "event") {
			if (event.data.pluginMessage.name === "selectionchange") {
				refreshSelection();
			}
		}
	}

	useEffect(() => {
		// asynchronous fetch the state from figma helper
		(async () => {
			await refreshSelection();
		})();

		localizedLabelManager.addEventListener("updated", refreshSelection);
		localizedLabelManager.messageStore.addEventListener("updated", refreshSelection);
		window.addEventListener("message", messageHandler);

		return () => {
			localizedLabelManager.removeEventListener("updated", refreshSelection);
			localizedLabelManager.messageStore.removeEventListener("updated", refreshSelection);
			window.removeEventListener("message", messageHandler);
		};
	}, []);

	useEffect(() => {
		if (tableRef.current) {
			const firstSelected = tableRef.current.querySelector(".selected") as HTMLElement;
			if (firstSelected) {
				const foundElement = firstSelected.firstChild as any;
				if (foundElement.scrollIntoViewIfNeeded) {
					(firstSelected.firstChild as any).scrollIntoViewIfNeeded({ block: "center" });
				}
			}
		}
	}, [selection]);

	return (
		<>
			{localizedLabels.length === 0 && (
				<div className="emptyState">
					<div className="emptyStateTitle">No Frame selected</div>
					<div className="emptyStateSubtitle">
						<div>
							Labels for localization
							<br />
							will show up here when selected - Select a Frame containing Text in your Design.
						</div>
					</div>
				</div>
			)}
			{localizedLabels.length >= 0 && (
				<div>
					<div className="table" ref={tableRef}>
						<div className="top-border" />

						{[...parentIds].map((parentId) => (
							<div key={parentId}>
								<LocalizedFrameGroup
									showMessage={showMessage}
									localizedLabels={localizedLabels
										.filter((l) => l.rootFrameId === parentId)
										.sort((a, b) => Math.hypot(a.x, a.y * 2 - Math.hypot(b.x, b.y * 2)))}
									selectedNodes={selection}
									figmaRemote={figmaRemote}
									localizedLabelManager={localizedLabelManager}
								/>
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
}
