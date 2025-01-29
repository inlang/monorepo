import * as React from "react";

import Quill, { DeltaStatic, Sources, Delta as DeltaType, RangeStatic } from "quill";
import { useEffect, useRef, useState } from "react";
import { Bounds, Range } from "quill/core/selection";
import Emitter from "quill/core/emitter";

import "./TooltipToolbar.css";
import FormatButton from "./compontents/FormatButton";
import FormatLinkButton from "./compontents/FormatLinkButton";
import FormatPlaceholder from "./compontents/FormatPlaceholder";
import { MessageParameterValues } from "../../../../lib/message/MessageParameterValues";

type TooltipToolbarProps = {
	rootView: HTMLElement;
	editorScrollContainer: HTMLElement;
	editor: Quill;
	parameterValues: MessageParameterValues;
	setParameterValue: (name: string, value: string, save: boolean) => void;
};

// |---------------------------|          Root (usually body)
//             |------------|             Editor (fixed width, fixed position)
//          |-------------------------|   Editor Content - scrollable within the editor
//            ||||||                      Selection
//               ^
export default function TooltipToolbar({
	rootView,
	editorScrollContainer,
	editor,
	parameterValues,
	setParameterValue,
}: TooltipToolbarProps) {
	const tooltipContainer = useRef<HTMLDivElement>(null);

	const [rootViewBounds, setRootViewBounds] = useState<Bounds>(rootView.getBoundingClientRect());
	const [editorScrollContainerBounds, setEditorScrollContainerBounds] = useState<Bounds>(
		editorScrollContainer.getBoundingClientRect(),
	);
	const [contentBounds, setContentBounds] = useState<Bounds>(editor.root.getBoundingClientRect());

	const [selectionBounds, setSelectionBounds] = useState<Bounds | undefined>(undefined);
	const [selectionFormats, setSelectionFormats] = useState<any>({});

	// true if the tooltip is in the users viewport
	const [tooltipVisible, setToolbtipVisible] = useState(false);

	// true if the current selection allows to change properties
	const [toolbarActive, setToolbarActive] = useState(false);

	const [pointUp, setPointUp] = useState(false);

	const [arrowPosition, setArrowPosition] = useState<{ left: number } | undefined>(undefined);
	const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);

	function updateSelectionBounds(range: any) {
		setContentBounds(editor.root.getBoundingClientRect());
		const lines = editor.getLines(range.index, range.length);

		if (lines.length < 2) {
			setSelectionBounds(editor.getBounds(range));
		} else {
			const lastLine = lines[lines.length - 1];
			const index = editor.getIndex(lastLine);
			const length = Math.min(lastLine.length() - 1, range.index + range.length - index);
			// @ts-expect-error -- TODO check if we can just pass the index and the length
			const indexBounds = editor.getBounds(new Range(index, length));
			setSelectionBounds(indexBounds);
		}
	}

	function onEditorChange(
		name: "text-change" | "selection-change",
		deltaOrRange: DeltaStatic | RangeStatic,
		oldContents: DeltaStatic | RangeStatic,
		source: Sources,
	) {
		let range: Range | undefined;

		if (name === "text-change") {
			// @ts-expect-error - check type
			[range] = editor.selection.getRange(); // quill.getSelection triggers update

			// TODO update selected formats on toolbar
		} else if (name === "selection-change") {
			range = deltaOrRange as Range;
			// TODO update selected formats on toolbar
		}

		if (range) {
			update(range);
		}

		// if (
		//   range
		//   && range.length > 0 // TODO we might show the toolbar also on warnings
		//   && source === Emitter.sources.USER
		// ) {
		//   setToolbarVisible(true);
		//   updateSelectionBounds(range);
		// } else if (
		// // TODO
		// // document.activeElement !== this.textbox
		// //     &&
		//   editor.hasFocus()
		// ) {
		//   setToolbarVisible(false);
		// }
	}

	function onEditorScrollOptimize() {
		// Let selection be restored by toolbar handlers before repositioning
		setTimeout(() => {
			// @ts-expect-error - check type
			const [range] = editor.selection.getRange(); // quill.getSelection triggers update
			if (range != null) {
				update(range);
			}
		}, 1);
	}

	function onScrollContainerScroll() {
		setEditorScrollContainerBounds(editorScrollContainer.getBoundingClientRect());
		setContentBounds(editor.root.getBoundingClientRect());
	}

	function update(range: Range) {
		// NOTE currently we only show the toolbar if we have a selection - might be different when we have lints
		setToolbarActive(range.length > 0);
		updateSelectionBounds(range);
		updateControlStates(range);
		setContentBounds(editor.root.getBoundingClientRect());
	}

	function updateControlStates(range: Range) {
		const formats = range == null ? ({} as any) : editor.getFormat(range);
		setSelectionFormats(formats);
	}

	useEffect(() => {
		if (!selectionBounds || !tooltipContainer.current) {
			return;
		}

		const leftCorrection = contentBounds.left;
		const topCorrection = contentBounds.top;

		const maxLeft = editorScrollContainerBounds.left - contentBounds.left;
		const framedLeft = Math.max(maxLeft, selectionBounds.left);

		const maxRightFromLeft = maxLeft + editorScrollContainerBounds.width;
		const framedRightFromLeft = Math.min(
			maxRightFromLeft,
			selectionBounds.left + selectionBounds.width,
		);
		const framedWidth = framedRightFromLeft - framedLeft;

		const minTop = rootViewBounds.top + 40 + 32;
		const maxTopAbove = rootViewBounds.top + rootViewBounds.height;
		const maxTopBelow =
			rootViewBounds.top + rootViewBounds.height - (tooltipContainer.current.offsetHeight + 6);

		const containerMaxLeft = rootViewBounds.left + 10;
		const containerMaxRightLeft =
			rootViewBounds.left + rootViewBounds.width - tooltipContainer.current.offsetWidth - 10;

		const arrowLeftAbsolut = framedLeft + framedWidth / 2 + leftCorrection;
		const containerLeftUnFramed = arrowLeftAbsolut - tooltipContainer.current.offsetWidth / 2;

		let containerLeft = Math.max(containerLeftUnFramed, containerMaxLeft);
		containerLeft = Math.min(containerLeft, containerMaxRightLeft);

		let top = selectionBounds.bottom + editor.root.scrollTop + topCorrection + 6;

		if (framedWidth <= 0 || top < minTop || top > maxTopAbove) {
			setToolbtipVisible(false);
		} else {
			if (top >= maxTopBelow) {
				setPointUp(false);

				const height = tooltipContainer.current.offsetHeight;
				const verticalShift = selectionBounds.bottom - selectionBounds.top + height + 6 * 2;
				top -= verticalShift;
			} else {
				setPointUp(true);
			}
			setToolbtipVisible(true);

			setPosition({
				left: containerLeft,
				top,
			});

			setArrowPosition({
				left: arrowLeftAbsolut - containerLeft,
			});
		}
	}, [rootViewBounds, contentBounds, editorScrollContainerBounds, selectionBounds]);

	// TODO listen to quill range change event
	useEffect(() => {
		const resizeObserver = new ResizeObserver(() => {
			setRootViewBounds(rootView.getBoundingClientRect());
		});

		resizeObserver.observe(rootView, { box: "border-box" });

		// TODO
		// this.textbox = this.root.querySelector('input[type="text"]');
		// this.listen();

		document.addEventListener("wheel", onScrollContainerScroll);

		// @ts-expect-error -- TODO check why the event is not accessible
		editor.on(Emitter.events.SCROLL_OPTIMIZE, onEditorScrollOptimize);
		editor.on(Emitter.events.EDITOR_CHANGE, onEditorChange);

		return () => {
			resizeObserver.disconnect();
			document.removeEventListener("wheel", onScrollContainerScroll);
			// @ts-expect-error -- TODO check why the event is not accessible
			editor.off(Emitter.events.SCROLL_OPTIMIZE, onEditorScrollOptimize);
		};
	}, []);

	return (
		<div
			ref={tooltipContainer}
			className={`ql-tooltip ${pointUp ? "" : "ql-flip"} ${
				tooltipVisible ? "" : "ql-tooltip-hidden"
			}`}
			style={{
				top: `${position?.top ?? 0}px`,
				left: `${position?.left ?? 0}px`,
			}}
		>
			<span className="ql-tooltip-arrow" style={{ left: arrowPosition?.left ?? 0 }} />
			<div role="toolbar" className="ql-toolbar">
				<span className="ql-formats">
					<FormatButton
						format="bold"
						icon="text-decoration-bold-svg"
						formats={selectionFormats}
						editor={editor}
					/>
					<FormatButton
						format="italic"
						icon="text-decoration-italic-svg"
						formats={selectionFormats}
						editor={editor}
					/>
					<div className="ql-button-group">
						<FormatButton
							format="textDecoration"
							value="UNDERLINE"
							icon="text-decoration-underline-svg"
							formats={selectionFormats}
							editor={editor}
						/>
						<FormatButton
							format="textDecoration"
							value="STRIKETHROUGH"
							icon="text-decoration-strikethrough-svg"
							formats={selectionFormats}
							editor={editor}
						/>
					</div>
					<div className="ql-button-group">
						<FormatButton
							format="list"
							icon="list-bullet-svg"
							formats={selectionFormats}
							value="bullet"
							editor={editor}
						/>
						<FormatButton
							format="list"
							icon="list-ordered-svg"
							formats={selectionFormats}
							value="ordered"
							editor={editor}
						/>
					</div>
					<FormatLinkButton
						format="link"
						icon="hyperlink-svg"
						formats={selectionFormats}
						editor={editor}
						toolbarActive={toolbarActive}
						placeholder="Insert Url"
					/>
					<FormatPlaceholder
						format="placeholder"
						icon="variable-svg"
						formats={selectionFormats}
						editor={editor}
						toolbarActive={toolbarActive}
						valuePlaceholder="Insert Value"
						namePlaceholder="Placeholdern name"
						setParameterValue={setParameterValue}
						parameterValues={parameterValues}
					/>
				</span>
			</div>
		</div>
	);
}

// on click set showEditor = true (independet of the state)
// on hide set showEditor = false
// value = value on the property
// placeholder
