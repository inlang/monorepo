import * as React from "react";
import { useEffect, useRef } from "react";
import useState from "react-usestateref";
import OutsideClickHandler from "react-outside-click-handler";
import "./TextField.css";

type TextFieldProps = {
	singleClick: boolean;
	editingTrigger?: number;
	placeholder?: string;
	icon?: string;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onSearchClick?: Function;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onNoKeyClick?: Function;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onChange?: Function;

	text?: string;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onSave: Function;
};

export default function TextField({
	singleClick,
	editingTrigger,
	placeholder,
	icon,
	onChange,
	onSearchClick,
	onNoKeyClick,
	text,
	onSave,
}: TextFieldProps) {
	const [textState, setTextState, textStateRef] = useState(text);
	const [isEditing, setEditingState] = useState(false);

	const inputFieldRef = useRef<HTMLInputElement>(null);
	const textDivRef = useRef<HTMLDivElement>(null);

	const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
		const val = evt.target?.value;
		setTextState(val);
		onChange?.(val);
	};

	const doSave = () => {
		setEditingState(false);
		onSave(textStateRef.current);
	};

	const onCancel = () => {
		setEditingState(false);
		setTextState(text);
	};

	const handleOutsideClick = () => {
		doSave();
	};

	useEffect(() => {
		const keydownFunction = (e: any) => {
			if (e.key === "Escape") {
				onCancel();
			}
			if (e.key === "Enter") {
				doSave();
			}
		};

		inputFieldRef.current?.addEventListener("keydown", keydownFunction);
		return () => {
			inputFieldRef.current?.removeEventListener("keydown", keydownFunction);
		};
	}, [isEditing]);

	useEffect(() => {
		if (isEditing) {
			inputFieldRef.current?.focus();
			inputFieldRef.current?.select();
		}
	}, [isEditing]);

	useEffect(() => {
		if (editingTrigger) {
			setEditingState(true);
		}
	}, [editingTrigger]);

	useEffect(() => {
		setTextState(text);
	}, [text]);

	return (
		<OutsideClickHandler
			onOutsideClick={handleOutsideClick}
			disabled={!isEditing}
			display="contents"
		>
			<div className={`text-field${isEditing ? " editing" : ""}`}>
				<div
					ref={textDivRef}
					className={`text-field-text${isEditing ? " editing " : ""}${icon ? " icon-left " : ""}${
						onSearchClick ? " icon-right" : ""
					}`}
				>
					<input
						ref={inputFieldRef}
						style={{
							visibility: isEditing ? "visible" : "hidden",
						}}
						value={textState}
						onChange={handleChange}
						placeholder={placeholder}
					/>

					<p
						className={`translation${isEditing ? " editing" : ""}${textState === undefined || textState === "" ? " placeholder" : ""}`}
						onDoubleClick={() => {
							if (!isEditing && !singleClick) {
								setEditingState(!isEditing);
							}
						}}
						onClick={() => {
							if (!isEditing && singleClick) {
								setEditingState(!isEditing);
							}
						}}
					>
						{textState === undefined || textState === "" ? placeholder : textState}
					</p>
					{icon !== undefined && <span className={`svg-container ${icon}`} />}
					{onSearchClick !== undefined && (
						<span
							className="svg-container right search-svg"
							onClick={() => {
								if (onSearchClick !== undefined) onSearchClick(text);
							}}
						/>
					)}
					{onNoKeyClick !== undefined && (
						<span
							className="svg-container right unlinked-svg"
							onClick={() => {
								if (onNoKeyClick !== undefined) onNoKeyClick(text);
							}}
						/>
					)}
				</div>
			</div>
		</OutsideClickHandler>
	);
}
