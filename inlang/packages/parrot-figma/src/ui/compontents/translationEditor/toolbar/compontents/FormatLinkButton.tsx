import * as React from "react";
import Quill from "quill";
import Emitter from "quill/core/emitter";
import { useEffect, useState } from "react";

type FormatLinkButtonProps = {
	toolbarActive: boolean;
	format: string;
	value?: string;
	icon: string;
	editor: Quill;
	placeholder: string;
	// onClick: () => void
	formats: any;
};
export default function FormatLinkButton({
	format,
	value,
	icon,
	editor,
	formats,
	placeholder,
	toolbarActive,
}: FormatLinkButtonProps) {
	const [inputShown, setInputShown] = useState(false);

	function fromFormat(form: any) {
		if (form === undefined) {
			return "";
		}
		if (typeof form === "string") {
			return form;
		}
		return "Mixed";
	}

	const [currentValue, setCurrentValue] = useState(fromFormat(formats[format]));

	useEffect(() => {
		if (toolbarActive) {
			setInputShown(false);
		}
	}, [toolbarActive]);

	useEffect(() => {
		setCurrentValue(fromFormat(formats[format]));
	}, [formats[format]]);

	function onClick() {
		setInputShown(true);
	}

	function toUrl(rawValue: string): string | undefined {
		const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
		const urlRegex = /^(https?|HTTPS?):\/\/[^\s/$.?#].[^\s]*$/;

		if (rawValue === "") {
			return undefined;
		}

		if (rawValue.startsWith("mailto:")) {
			// check if we have a valid mail abc@abc1.com ...
			if (emailRegex.test(rawValue.substring("mailto:".length))) {
				return rawValue;
			}
			// invalid mail adress
		} else if (
			rawValue.startsWith("http://") ||
			rawValue.startsWith("https://") ||
			rawValue.startsWith("/")
		) {
			const urlToCheck = rawValue.startsWith("/") ? `https://helperdomain${rawValue}` : rawValue;
			if (urlRegex.test(urlToCheck)) {
				return rawValue;
			}
			// invalid url
		} else if (emailRegex.test(rawValue)) {
			// value matches an email adress
			return `mailto:${value}`;
		} else if (urlRegex.test(`https://${rawValue}`)) {
			// matches a url pattern
			return `https://${rawValue}`;
		} else {
			// invalid url :-/
			return undefined;
		}
	}

	function onkeydown(event: any) {
		if (event.key === "Enter") {
			const url = toUrl(event.target.value);
			if (url) {
				// before we set the focus to the editor - lets cancel the enter event
				event.preventDefault();

				editor.focus();
				const range = editor.getSelection();
				if (!range) {
					return;
				}
				editor.format(format, url, Emitter.sources.USER);
				setInputShown(false);
			} else {
				// TODO inform about invalid url
				setInputShown(false);
			}
		} else if (event.key === "Escape") {
			setCurrentValue(formats[format]?.toString());
			event.preventDefault();
			setInputShown(false);
		}
	}

	function handleChange(e: any) {
		setCurrentValue(e.target.value);
	}

	return (
		<>
			<button
				className={`ql-button${formats[format] !== undefined ? " ql-active" : ""}`}
				type="button"
				onClick={onClick}
			>
				<div className="close svg-container">
					<div className={icon} />
				</div>
			</button>
			<div className="ql-input-overlay" style={{ display: inputShown ? undefined : "none" }}>
				<input
					type="text"
					placeholder={placeholder}
					onKeyDown={onkeydown}
					onChange={handleChange}
					value={currentValue}
				/>
			</div>
		</>
	);
}
