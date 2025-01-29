import * as React from "react";
import { useEffect, useRef, useState } from "react";
import OutsideClickHandler from "react-outside-click-handler";

import "./quill.bubble.css";
import "./TranslationEditor.css";

import Quill, { DeltaStatic, Sources, Delta as DeltaType } from "quill";

import Emitter from "quill/core/emitter";
import { createPortal } from "react-dom";

import MessageStoreMemory from "../../../lib/message/store/MessageStoreMemory";
import TranslationView from "./TranslationView";

import { MessageParameterValues } from "../../../lib/message/MessageParameterValues";
import { OverlayScrollbarsComponent } from "../overlayscrollbar";

import PlaceholderBlot from "./blots/PlaceholderBlot";
import BoldBlot from "./blots/BoldBlot";
import { MyListContainer, MyListItem } from "./blots/MyList";
import ItalicBlot from "./blots/ItalicBlot";
import LinkBlot from "./blots/LinkBlot";
import TextDecorationBlot from "./blots/TextDecorationBlot";
import TooltipToolbar from "./toolbar/TooltipToolbar";
import { Locale } from "../../../lib/message/variants/Locale";

Quill.register(MyListItem, true);
Quill.register(LinkBlot, true);
Quill.register(ItalicBlot, true);
Quill.register(BoldBlot, true);
Quill.register(PlaceholderBlot, true);
Quill.register(MyListContainer, true);

Quill.register(TextDecorationBlot);
const icons = Quill.import("ui/icons");
icons.textDecoration = {
	UNDERLINE: icons.underline,
	STRIKETHROUGH: icons.strike,
};
const saveOnEnter = true;

const Delta = Quill.import("delta") as typeof DeltaType;

type TranslationEditorProps = {
	language: Locale;
	refLanguage: Locale;
	variantHTML?: string;
	parameterValues: MessageParameterValues;
	/**
	 * Triggered when a save is requested - like enter press or click out of the controll
	 */
	onSave?: (patternHtml: string | undefined, parameters: MessageParameterValues) => void;
	/**
	 * Triggered when the user presses esc
	 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onCancel?: Function;
	/**
	 * Triggered when the user changed the fillins or the text
	 */
	onChange?: (
		patternHtml: string | undefined,
		parameters: MessageParameterValues,
		reset?: () => void,
	) => void;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onBlur?: Function;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onFocus?: Function;
	match: { start: number; length: number } | undefined;
	isDisabled: false | true;
	editable: boolean;
	messageStore: MessageStoreMemory;
	children?: React.ReactNode;
};

// We use this view in two ocations:
//  - key editor placeholders no fillins
//  - label editor - text should contain the placeholders but the editor needs to know the fillins?
export default function TranslationEditor({
	language,
	refLanguage,
	variantHTML,
	isDisabled,
	parameterValues,
	onSave,
	onCancel,
	onBlur,
	onFocus,
	match,
	editable = true,
	messageStore,
	onChange,
	children,
}: TranslationEditorProps) {
	const [textState, setTextState] = useState(variantHTML);
	const textRef = useRef(variantHTML);

	const [editingState, setEditingState] = useState(false);
	const dontSaveOnBlurFlag = useRef(false);
	const [isMouseOver, setMouseOver] = useState(false);

	const editorPreRef = useRef<HTMLPreElement>(null);
	const scrollContainer = useRef<HTMLDivElement>(null);

	const quillEditor = useRef<Quill | undefined>(undefined);

	const tooltipContainerRef = useRef<HTMLDivElement>(null);

	const reset = () => {
		(document.activeElement as any)?.blur?.();
		console.log("setEditingState false reset");
		setEditingState(false);
		setTextState(variantHTML);

		textRef.current = variantHTML;
	};

	const handleChange = (value: string, updatedParameters: MessageParameterValues) => {
		if (onChange !== undefined) {
			onChange(value, updatedParameters, reset);
		}

		setTextState(value);

		textRef.current = value;

		// console.log(`propagating change${value}`);
	};

	const onEditorChange = (
		eventName: "text-change" | "selection-change",
		rangeOrDelta: Range | DeltaStatic,
		oldRangeOrDelta: Range | DeltaStatic,
		source: Sources,
	) => {
		if (eventName === "text-change" && source !== "silent") {
			if (!quillEditor.current) {
				return;
			}
			const updatedParameters = { ...parameterValues };
			let htmlContent = quillEditor.current.root.innerHTML;

			// start with real carrage returns
			htmlContent = htmlContent.split("<p><br></p>").join("\n");
			const paragraphs = htmlContent.split("</p>");
			if (paragraphs[paragraphs.length - 1] === "") {
				paragraphs.pop();
			}
			htmlContent = paragraphs.join("\n").split("<p>").join("");
			const regex = /.<span contenteditable="false">([^<]*)<\/span>./g;
			htmlContent = htmlContent.replace(/contenteditable="false">/g, ">");
			htmlContent = htmlContent.replace(regex, (match: any, group1: any) => group1);

			if (htmlContent[htmlContent.length - 1] === "\n") {
				// fix last return - change init
				htmlContent = htmlContent.substring(0, htmlContent.length - 1);
			}

			handleChange(htmlContent, updatedParameters);
		} else if (eventName === "selection-change") {
			// nothing for now
		}
	};

	function initQuill(editorElement: HTMLElement) {
		const editor = new Quill(editorElement, {
			modules: {
				// TODO
				// toolbar: {
				//   handlers: {
				//     placeholder() {
				//       // eslint-disable-next-line react/no-this-in-sfc
				//       this.quill.theme.tooltip.edit('placeholder');
				//     },
				//     link() {
				//       // eslint-disable-next-line react/no-this-in-sfc
				//       this.quill.theme.tooltip.edit('link');
				//     },
				//   },
				// },
				keyboard: {
					bindings: {
						underline: {
							key: "u",
							shortKey: true,
							handler(_range: any, context: any) {
								const format = "textDecoration";
								this.quill.format(
									format,
									context.format[format] === "UNDERLINE" ? undefined : "UNDERLINE",
									Emitter.sources.USER,
								);
							},
						},
						indent: {
							key: "Tab",
							handler() {
								return false;
							},
						},
						outdent: {
							key: "Tab",
							shiftKey: true,
							handler() {
								return false;
							},
						},
						tab: {
							key: "Tab",
							handler() {
								return false;
							},
						},
						"remove tab": {
							key: "Tab",
							shiftKey: true,
							collapsed: true,
							prefix: /\t$/,
							handler() {
								return false;
							},
						},
						// indent: {
						//   // highlight tab or tab at beginning of list, indent or blockquote
						//   key: 'Tab',
						//   format: ['blockquote', 'indent', 'list'],
						//   handler() {
						//     // don't handle tabs any more
						//     return true;
						//   },
						// },
						// tabKey: {
						//   key: 'Tab',
						//   handle() {
						//     return false;
						//   }
						// },
						// 'remove tab': {
						//   key: 'Tab',
						//   shiftKey: true,
						//   collapsed: true,
						//   prefix: /\t$/,
						//   handler: function() {
						//     // do nothing
						//   }
						// },
						enterKey: {
							key: "Enter",
							shiftKey: false,
							handler() {
								// prevent default behaviour of enter key (when shift is not hold)
								if (!saveOnEnter) {
									return true;
								}
								return false;
							},
						},
					},
				},
				clipboard: {
					matchers: [
						[
							"PH",
							(node: HTMLElement, delta: any) => {
								const parameterValue = node.getAttribute("parameterValue");
								const name = node.innerHTML;
								return delta.compose(
									new Delta().retain(delta.length(), { placeholder: { parameterValue, name } }),
								);
							},
						],
						[
							"S",
							(node: HTMLElement, delta: any) =>
								delta.compose(
									new Delta().retain(delta.length(), { textDecoration: "STRIKETHROUGH" }),
								),
						],
						[
							"U",
							(node: HTMLElement, delta: any) =>
								delta.compose(new Delta().retain(delta.length(), { textDecoration: "UNDERLINE" })),
						],
					],
				},
			},
			readOnly: true,
		});
		editor.root.setAttribute("spellcheck", "false");
		delete (editor as any).getModule("keyboard").bindings["9"];
		return editor;
	}

	function updateQuill(
		currentQuillEditor: Quill,
		updatedHtml: string,
		updatedParameters: MessageParameterValues,
	) {
		(currentQuillEditor.clipboard as any).matchers[0][1] = function matchText(
			node: any,
			delta: any,
		) {
			const text = node.data;
			return delta.insert(text);
		};
		// add extra cr

		updatedHtml += "\n";

		const cleanedValue = updatedHtml.split("\n").join("<br>");
		const contents = (currentQuillEditor.clipboard as any).convertHTML(cleanedValue) as any;

		for (const ops of contents.ops!) {
			const placeholderName = ops.attributes?.placeholder?.name;
			if (placeholderName) {
				// TODO #23 fix last return - update quill text
				ops.attributes.placeholder!.value = updatedParameters[placeholderName]?.value ?? "oh oh";
			}
		}
		currentQuillEditor.setContents(contents, "silent");
	}

	useEffect(() => {
		if (!isDisabled && (isMouseOver || editingState)) {
			if (!quillEditor.current) {
				const editor = initQuill(editorPreRef.current!);
				quillEditor.current = editor;
				updateQuill(editor, textState ?? "", parameterValues);
				editor.enable();
			}
			quillEditor.current?.on("editor-change", onEditorChange);
		} else {
			quillEditor.current?.off("editor-change", onEditorChange);
			quillEditor.current = undefined;
			if (editorPreRef.current) {
				editorPreRef.current.innerHTML = "";
			}
		}

		return () => {
			quillEditor.current?.off("editor-change", onEditorChange);
		};
	}, [isDisabled, isMouseOver, editingState]);

	useEffect(() => {
		if (!quillEditor.current || editingState) {
			return;
		}
		updateQuill(quillEditor!.current, textState ?? "", parameterValues);
	}, [textState, parameterValues]);

	useEffect(() => {
		const focusInFunction = (e: any) => {
			setEditingState(true);
			onFocus?.();
		};

		const focusOutFunction = (e: any) => {
			const { relatedTarget } = e;

			if (tooltipContainerRef.current?.contains(relatedTarget) || dontSaveOnBlurFlag.current) {
				return; // focus of the tooltip means editor still has viratual focus
			}

			console.log("onfocusout... save.... but not triggered by quill...");
			setEditingState(false);
			onBlur?.();
			// we use the outside clickhandler to handle focus out other than enter / esc
			handleSave();
		};

		const keydownFunction = (e: any) => {
			if (e.key === "Escape") {
				e.preventDefault(); // Prevent the default behavior
				e.stopPropagation(); // Stop event bubbling
				dontSaveOnBlurFlag.current = true;
				console.log("setEditingState false key down esc");
				setEditingState(false);
				handleCancel();
				dontSaveOnBlurFlag.current = false;
			}
			if (e.key === "Enter" && !e.shiftKey && saveOnEnter) {
				e.preventDefault(); // Prevent the default behavior
				e.stopPropagation(); // Stop event bubbling
				quillEditor.current?.blur();
				console.log("setEditingState false key down return");
				setEditingState(false);
				handleSave();
			}
			if (e.key === "Tab" && !e.shiftKey && saveOnEnter) {
				e.preventDefault(); // Prevent the default behavior
				e.stopPropagation(); // Stop event bubbling
				quillEditor.current?.blur();
				console.log("setEditingState false key down return");
				setEditingState(false);
				handleSave();
			}
		};

		const onClick = (e: any) => {
			// change selection in case we click on a placeholder (making it atomic)
			if (e.target.nodeName === "PH") {
				const range = document.createRange();
				range.selectNodeContents(e.target);
				const selection = window.getSelection();
				selection?.removeAllRanges();
				selection?.addRange(range);
			}
		};

		if (editorPreRef.current) {
			editorPreRef.current.addEventListener("focusin", focusInFunction);
			editorPreRef.current.addEventListener("focusout", focusOutFunction);
			editorPreRef.current.addEventListener("keydown", keydownFunction);
			editorPreRef.current.addEventListener("click", onClick);
		}

		return () => {
			if (editorPreRef.current) {
				editorPreRef.current?.removeEventListener("focusin", focusInFunction);
				editorPreRef.current?.removeEventListener("focusout", focusOutFunction);
				editorPreRef.current.removeEventListener("keydown", keydownFunction);
				editorPreRef.current?.removeEventListener("click", onClick);
			}
		};
	}, [editingState]);

	const handleSave = () => {
		// console.log('#23 QuillEditor.handleSave  ');
		console.log("setEditingState false handle save");
		setEditingState(false);

		onSave?.(textRef.current!, parameterValues);
	};

	const onOutsideClick = (e: any) => {
		if (tooltipContainerRef.current?.contains(e.target)) {
			return;
		}
		handleSave();
	};

	const handleCancel = () => {
		// console.log('#23 QuillEditor.handleCancel');

		reset();

		if (onChange !== undefined) {
			onChange(variantHTML, parameterValues);
		}

		onCancel?.();
	};

	useEffect(() => {
		setTextState(variantHTML);
		textRef.current = variantHTML;
	}, [variantHTML]);

	// TODO #34 we might use this to listen to changes regardig parameter Values from the parrent (deep clone?)
	// useEffect(() => {
	//   parameterValuesRef.current = parameterValues;
	// }, [parameterValues]);

	let textToUse;
	let missingTranslation = false;
	if (textState === undefined || textState === "") {
		textToUse =
			language === refLanguage
				? `Enter reference message text (${refLanguage})...`
				: `Enter translation for ${language}...`;
		missingTranslation = true;
		// } else if (textState.charAt(textState.length - 1) === '\n') {
		//   textToUse = `${textState}\n`;
	} else {
		textToUse = textState;
	}

	return (
		<OutsideClickHandler
			onOutsideClick={onOutsideClick}
			disabled={!editingState}
			display="contents"
		>
			<div
				className={`translation-editor ${editingState ? " editing" : ""} ${
					isDisabled ? " translation-editor-disabled" : ""
				}`}
			>
				<div
					onMouseOver={() => {
						setMouseOver(true);
					}}
					onMouseLeave={() => {
						setMouseOver(false);
					}}
					className={`translation-editor-text ${editingState ? " editing" : ""}`}
				>
					<div className={`translation-editor-input-wrapper ${editingState ? " editing" : ""}`}>
						<div
							style={{
								visibility:
									!isDisabled && ((isMouseOver && !missingTranslation) || editingState)
										? "hidden"
										: "unset",
								pointerEvents: !isDisabled && (isMouseOver || editingState) ? "none" : "unset",
							}}
							className={`translation${editingState ? " editing " : ""}${
								missingTranslation ? " missing " : ""
							}`}
							onClick={() => {
								if (!editingState && editable) {
									console.log(`editin state set to${!editingState}`);
									setEditingState(!editingState);
								}
							}}
						>
							<TranslationView match={match} text={textToUse} />
						</div>

						<div
							style={{
								position: "absolute",
								display: !isDisabled && (isMouseOver || editingState) ? "unset" : "none",
								zIndex: 1,
								top: 0,
								bottom: 0,
								left: 0,
								right: 0,
							}}
							ref={scrollContainer}
						>
							<OverlayScrollbarsComponent
								className="translation-editor-scrollbar-overlay"
								options={{
									scrollbars: {
										clickScroll: true,
									},
								}}
								defer
							>
								<pre ref={editorPreRef} />
								{quillEditor.current &&
									scrollContainer.current &&
									!isDisabled &&
									editingState &&
									createPortal(
										<div style={{ display: "contents" }} ref={tooltipContainerRef}>
											<TooltipToolbar
												editorScrollContainer={scrollContainer.current}
												editor={quillEditor.current}
												rootView={document.body}
												parameterValues={parameterValues}
												setParameterValue={(
													name: string,
													value: string,
													propagate: boolean,
												): void => {
													parameterValues[name] = {
														type: "string",
														value,
													};
													if (propagate) {
														onChange?.(textRef.current, parameterValues);
													}
												}}
											/>
										</div>,
										document.body,
									)}
							</OverlayScrollbarsComponent>
						</div>
					</div>
					<div className="translation-editor-text-button-group">{children}</div>
				</div>
			</div>
		</OutsideClickHandler>
	);
}
