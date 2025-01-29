import { debug } from "console";
import React, { useEffect, useState } from "react";
import "./tileselect.css";

export interface TileSelectOption<T> {
	divider?: string | boolean;
	value: T;
	label: string;
	subLabel?: string;
	tooltip?: string;
	icon?: string;
	title?: string;
	forceSelected?: boolean;
}

export interface TileSelectProps<T> {
	options: TileSelectOption<T>[];
	defaultSelection?: T[];
	multiselect: boolean;
	onChange: (options: T[]) => void;
}

export default function TileSelect<T>({
	options,
	multiselect,
	defaultSelection,
	onChange,
}: TileSelectProps<T>) {
	const [selectedOptions, setSelectedOptions] = useState<T[]>(defaultSelection ?? []);

	function toggleOption(option: TileSelectOption<T>) {
		setSelectedOptions((selectedOptions: T[]) => {
			const position = selectedOptions.findIndex((v) => v === option.value);
			let newSelectedOptions: T[];
			if (multiselect) {
				if (position === -1) {
					newSelectedOptions = selectedOptions.concat([option.value]);
				} else {
					newSelectedOptions = selectedOptions.filter((value) => value !== option.value);
				}
			} else if (position === -1) {
				newSelectedOptions = [option.value];
			} else {
				newSelectedOptions = [];
			}
			return newSelectedOptions;
		});
	}

	useEffect(() => {
		onChange(selectedOptions);
	}, [selectedOptions]);

	return (
		<div className="tile-container">
			{options.map((option) => (
				<div
					data-tooltip-content={option.tooltip}
					className={`tile${
						selectedOptions.findIndex((v) => v === option.value) !== -1 ||
						option.forceSelected === true
							? " selected"
							: ""
					}`}
					key={`${option.value}`}
					onClick={() => toggleOption(option)}
				>
					<div className={`svg-container flag-icon ${option.icon}`} />
					{option.label}
				</div>
			))}
		</div>
	);
}
