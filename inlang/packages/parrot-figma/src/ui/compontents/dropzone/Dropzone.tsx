import React, { useState, ReactNode } from "react";
import "./Dropzone.css";

type FileDropZoneProps = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onFilesReceived: Function;
};

export default function FileDropZone({ onFilesReceived }: FileDropZoneProps) {
	const [showOverlay, setShowOverlay] = useState(false);

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();

		setShowOverlay(true);
	};

	const handleDragLeave = () => {
		setShowOverlay(false);
	};

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

	const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();

		const { files } = event.dataTransfer;

		handleFiles(files);

		setShowOverlay(false);
	};

	// triggers when file is selected with click
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.target.files && e.target.files[0]) {
			handleFiles(e.target.files);
		}
	};

	const handleOverlayDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		return false;
	};
	// accept=".csv,.xlsx,.json,.xliff"

	return (
		<div
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			style={{ position: "relative" }}
		>
			<div>
				<div className="dropzone-container">
					<div className="dropzone-file-wrapper">
						<input type="file" name="file-input" multiple={false} onChange={handleChange} />
						<div className="dropzone-info onboarding-tip onboarding-tip--normal">
							<div className="dropzone-icon">
								<div className="icon icon-import" />
							</div>
							<div className="dropzone-info-msg">
								<b>Click or drag &amp; drop to import a .stringsdict, .strings, .xml file</b>
								<br />
								Supported are Apple's <b>.stringsdict</b>, <b>.strings</b> and Android's <b>.xml</b>{" "}
								file.
							</div>
						</div>
					</div>
				</div>
			</div>

			{showOverlay && (
				<div
					onDragOver={handleOverlayDragOver}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						background: "rgba(0, 0, 0, 0.2)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						pointerEvents: "none",
					}}
				>
					<p>Drop files here to import</p>
				</div>
			)}
		</div>
	);
}
