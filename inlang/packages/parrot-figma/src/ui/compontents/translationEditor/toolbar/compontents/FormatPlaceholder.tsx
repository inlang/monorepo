import * as React from "react";
import Quill, { Delta as DeltaType } from "quill";
import Emitter from "quill/core/emitter";
import { useEffect, useState } from "react";
import { MessageParameterValues } from "../../../../../lib/message/MessageParameterValues";
import { Placeholder } from "../../../../../lib/message/Placeholder";

const Delta = Quill.import("delta") as typeof DeltaType;

type FormatPlaceholderProps = {
	toolbarActive: boolean;
	format: string;
	value?: string;
	icon: string;
	editor: Quill;
	valuePlaceholder: string;
	namePlaceholder: string;
	parameterValues: MessageParameterValues;
	setParameterValue: (name: string, value: string, save: boolean) => void;
	// onClick: () => void
	formats: any;
};

export default function FormatPlaceholder({
	format,
	value,
	icon,
	editor,
	formats,
	valuePlaceholder,
	namePlaceholder,
	toolbarActive,
	parameterValues,
	setParameterValue,
}: FormatPlaceholderProps) {
	const [placeholderNameInputShown, setPlaceholderNameInputShown] = useState(false);
	const [placeholderValueInputShown, setPlaceholderValueInputShown] = useState(false);

	const [currentPlaceholderName, setCurrentPlaceholderName] = useState("");
	const [currentPlaceholderValue, setCurrentPlaceholderValue] = useState<string>("");

	useEffect(() => {
		if (toolbarActive) {
			setPlaceholderNameInputShown(false);
		}
	}, [toolbarActive]);

	useEffect(() => {
		setCurrentPlaceholderValue(parameterValues[formats[format]?.name]?.value ?? "");
		setCurrentPlaceholderName(formats[format]?.name ?? "");
		setPlaceholderValueInputShown(formats[format] !== undefined);
	}, [formats[format]]);

	function onClick() {
		setPlaceholderNameInputShown(true);
	}

	function handlePlaceholderNameChange(e: any) {
		setCurrentPlaceholderName(e.target.value);
	}

	function handlePlaceholderValueChange(e: any) {
		setCurrentPlaceholderValue(e.target.value);
	}

	function updatePlaceholderName(event: React.KeyboardEvent) {
		// editor.restoreFocus();
		// before we set the focus to the editor - lets cancel the enter event
		event.preventDefault();

		editor.focus();
		const range = editor.getSelection();
		if (!range) {
			return;
		}
		// editor.format(format, url, Emitter.sources.USER);

		if (currentPlaceholderName) {
			const parameterName = currentPlaceholderName;
			const parameterValue =
				formats[format] && formats[format].name
					? parameterValues[formats[format].name].value
					: (editor as any).getText({ index: range?.index, length: range!.length! });
			const parameterType = "string";

			setParameterValue(parameterName, parameterValue, false);

			const contents = editor.getContents();
			const beforeSelectionContents = contents.slice(0, range.index);
			const selectionContents = contents.slice(range.index, range.index + range.length);
			const afterSelectionContents = contents.slice(range.index + range.length, contents.length());

			const updatedAttributes = {
				...selectionContents.ops![0].attributes,
			};
			updatedAttributes.placeholder = { name: parameterName, named: true } as Placeholder;

			const replacementDelta = new Delta().insert(parameterName, updatedAttributes);
			// }

			const updatedDelta = beforeSelectionContents
				.concat(replacementDelta as any)
				.concat(afterSelectionContents);

			editor.setContents(updatedDelta, "user" /* Emitter.sources.USER */);
		} else {
			editor.format(format, null, Emitter.sources.USER);
		}
	}

	function resetPlaceholderName(event: React.KeyboardEvent) {
		console.log(`resetting placeholder name in control to ${formats[format].name}`);
		setCurrentPlaceholderName(formats[format].name ?? "");
	}

	function resetPlaceholderValue(event: React.KeyboardEvent) {
		console.log(
			`resetting placeholder value in control to ${parameterValues[currentPlaceholderName].value}`,
		);
		setCurrentPlaceholderValue(parameterValues[currentPlaceholderName].value ?? "");
	}

	function updatePlaceholderValue(event: React.KeyboardEvent) {
		console.log(
			`updateingPlaceholderValue ${currentPlaceholderName} to ${currentPlaceholderValue}`,
		);
		setParameterValue(currentPlaceholderName, currentPlaceholderValue, true);
	}

	return (
		<>
			<div className="ql-button-group">
				<button
					className={`ql-button${formats[format] !== undefined ? " ql-active" : ""}`}
					type="button"
					onClick={onClick}
				>
					<div className="close svg-container">
						<div className={icon} />
					</div>
				</button>
				<input
					className="ql-input"
					style={{ display: placeholderValueInputShown ? "flex" : "none" }}
					type="text"
					placeholder={valuePlaceholder}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							updatePlaceholderValue(e);
						} else if (e.key === "Escape") {
							resetPlaceholderValue(e);
						}
					}}
					onChange={handlePlaceholderValueChange}
					value={currentPlaceholderValue}
				/>
			</div>
			<div
				className="ql-input-overlay"
				style={{ display: placeholderNameInputShown ? undefined : "none" }}
			>
				<div className="ql-placholder-wrapper">
					<input
						type="text"
						placeholder={namePlaceholder}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								updatePlaceholderName(e);
								setPlaceholderNameInputShown(false);
							} else if (e.key === "Escape") {
								resetPlaceholderName(e);
								setPlaceholderNameInputShown(false);
							}
						}}
						onChange={handlePlaceholderNameChange}
						value={currentPlaceholderName}
					/>
				</div>
			</div>
		</>
	);
}
