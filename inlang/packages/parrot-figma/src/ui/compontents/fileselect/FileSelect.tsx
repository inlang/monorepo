import React, { useState, ReactNode } from "react";
import "./FileSelect.css";

type FileSelectProps = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onFilesReceived: Function;
	text: string;
};

export default function FileSelect({ onFilesReceived, text }: FileSelectProps) {
	const handleFiles = async function (files: FileList) {
		const filesReceived = {} as any;

		const contentPromises = [] as Promise<void>[];
		for (const file of files) {
			contentPromises.push(
				(async () => {
					filesReceived[file.name] = await file.text();
				})(),
			);
		}

		await Promise.all(contentPromises);

		onFilesReceived(filesReceived);
	};

	// triggers when file is selected with click
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.target.files && e.target.files[0]) {
			handleFiles(e.target.files);
		}
	};

	return (
		<div className="file-select">
			<div className="file-select-input-wrapper">
				<input type="file" name="file-input" multiple={false} onChange={handleChange} />
			</div>
			<div>{text}</div>
		</div>
	);
}
