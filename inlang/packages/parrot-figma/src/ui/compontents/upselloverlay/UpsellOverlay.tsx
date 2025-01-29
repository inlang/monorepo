import * as React from "react";
import "./UpsellOverlay.css";

type UpsellOverlayProps = {
	type: "info" | "warning" | "error";
	msg: string;
	hidden: boolean;
	progress: number;
	cta: string;
	onclick: () => void;
};

export default function UpsellOverlay({
	type,
	msg,
	hidden,
	progress,
	cta,
	onclick,
}: UpsellOverlayProps) {
	return (
		<div className={`upsell-overlay-container ${hidden ? "upsell-overlay-container-hidden" : ""}`}>
			<div className="upsell-overlay-container-progressBar">
				<div
					className={`upsell-overlay-container-progressBar-percentage ${type}`}
					style={{ width: `${progress * 100}%` }}
				/>
			</div>
			<p className="upsell-overlay-upsellText">
				{msg}
				<br />
				<a
					className="basic_form--inlineLink--aRePo blue_link--blueLink--4ER8T "
					rel="noopener"
					onClick={onclick}
				>
					{cta}
				</a>
			</p>
		</div>
	);
}
