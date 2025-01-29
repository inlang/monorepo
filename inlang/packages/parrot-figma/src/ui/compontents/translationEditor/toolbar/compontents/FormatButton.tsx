import * as React from "react";
import Quill from "quill";
import Emitter from "quill/core/emitter";

type FormatButtonProps = {
	format: string;
	value?: string;
	icon: string;
	editor: Quill;
	// onClick: () => void
	formats: any;
};
export default function FormatButton({ format, value, icon, editor, formats }: FormatButtonProps) {
	let active: boolean;
	if (value === undefined) {
		active = formats[format] !== undefined;
	} else {
		active = formats[format] === value;
	}

	function onClick() {
		const range = editor.getSelection();
		if (!range) {
			return;
		}

		// get a fresh set of formats
		const currentSelectionFormats = editor.getFormat(range);

		if (value !== undefined) {
			if (currentSelectionFormats[format] === value) {
				editor.format(format, null, Emitter.sources.USER);
			} else {
				editor.format(format, value, Emitter.sources.USER);
			}
		} else if (!currentSelectionFormats[format]) {
			editor.format(format, true, Emitter.sources.USER);
		} else {
			editor.format(format, false, Emitter.sources.USER);
		}
	}

	return (
		<button className={`ql-button ${active ? " ql-active" : ""}`} type="button" onClick={onClick}>
			<div className="close svg-container">
				<div className={icon} />
			</div>
		</button>
	);
}
