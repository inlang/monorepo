import React from "react";
import "../../localization/i18n";
import { useTranslation } from "react-i18next";
import ReactTimeAgo from "react-time-ago";
import "./HistoryEntryView.css";

interface HistoryEntryViewProps {
	first: boolean;
	last: boolean;
	tag?: string;
	text?: string;
	version: number;
	time: number;
	currentVersion: boolean;
	userName: string;
	userIconUrl: string;
	previousText?: string;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onReuse?: Function;
}

export default function HistoryEntryView({
	first,
	last,
	tag,
	text,
	time,
	version,
	currentVersion,
	userName,
	userIconUrl,
	previousText,
	onReuse,
}: HistoryEntryViewProps) {
	const { t } = useTranslation();
	return (
		<div className="history_view">
			<div
				className={`history_view--verticalLineRow ${
					first ? "history_view--firstVerticalLineRow" : ""
				} ${last ? "history_view--lastVerticalLineRow" : ""}`}
			/>
			<div className="history_view--itemInfo">
				<div
					className="history_view--versionInfo"
					style={{
						visibility: tag || currentVersion || last ? "inherit" : "hidden",
					}}
				>
					<div className="history_view--userInfo">
						<svg
							width="5"
							height="6"
							viewBox="0 0 5 6"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="history_view--baseIcon"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M2.5 4.5C3.32843 4.5 4 3.82843 4 3C4 2.17157 3.32843 1.5 2.5 1.5C1.67157 1.5 1 2.17157 1 3C1 3.82843 1.67157 4.5 2.5 4.5ZM2.5 5.5C3.88071 5.5 5 4.38071 5 3C5 1.61929 3.88071 0.5 2.5 0.5C1.11929 0.5 0 1.61929 0 3C0 4.38071 1.11929 5.5 2.5 5.5Z"
								className="history_view--bulletBorder---TL00"
							/>
							<circle
								style={{
									fill: !currentVersion ? "transparent" : "var(--color-bg, #fff);",
								}}
								cx="2.5"
								cy="3"
								r="1.5"
								className="history_view--bulletFill--8J34y"
							/>
						</svg>
						{!tag && currentVersion && (
							<div
								className="history_view--label ellipsis--ellipsis--70pHK text--fontPos11--rO47d text--_fontBase--VaHfk"
								dir="auto"
								style={{ maxWidth: "165px" }}
							>
								{`Current Version (${version})`}
							</div>
						)}
						{tag && (
							<div
								className="history_view--label ellipsis--ellipsis--70pHK text--fontPos11--rO47d text--_fontBase--VaHfk"
								dir="auto"
								data-tooltip-content="Created by ... at... "
								style={{ maxWidth: "165px" }}
							>
								{tag}
							</div>
						)}
					</div>
				</div>
				<div
					className="history_view--description"
					dir="auto"
					style={{ marginTop: tag || currentVersion ? "-8px" : "-24px" }}
				>
					<span>{text}</span>
					{onReuse !== undefined && (
						<button
							className="button button--buttonSecondary"
							type="button"
							onClick={() => {
								onReuse(text);
							}}
						>
							<span data-tooltip-type="text">{t("keys__version__reuse_button")}</span>
						</button>
					)}
				</div>
				<div>
					<div className="history_view--editors">
						<span className="history_view--avatarNameRow history_view--timeRevised">
							<span
								className="svg-container avatar--avatar avatar--circle   svg--autoscale"
								style={{
									background: "rgb(102, 119, 153)",
									height: "15px",
									width: "15px",
								}}
							>
								<svg
									className="svg"
									width="22"
									height="22"
									viewBox="0 0 22 22"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M7.333 8.25c0-2.025 1.642-3.667 3.667-3.667 2.025 0 3.667 1.642 3.667 3.667 0 2.025-1.642 3.667-3.667 3.667-2.025 0-3.667-1.642-3.667-3.667zm3.61 4.583c-5.73 0-9.257 5.02-7.943 9.167h16c1.432-4.583-2.328-9.167-8.057-9.167z"
										fillRule="nonzero"
										fillOpacity="1"
										fill="#fff"
										stroke="none"
									/>
								</svg>
							</span>
							<div
								className="history_view--editsByEntryRevised history_view--editsByEntry ellipsis--ellipsis"
								data-tooltip-type="text"
								data-tooltip="Martin Lysk"
								data-tooltip-show-left="true"
								data-tooltip-max-width="1000"
								dir="auto"
							>
								{userName}
							</div>
						</span>
					</div>
					<span className="history_view--editsByList history_view--timeRevised">
						{" "}
						<span className="">
							<ReactTimeAgo date={time} locale="en-US" />
						</span>
					</span>
				</div>
			</div>
		</div>
	);
}
