import * as React from "react";
import { useEffect, useState } from "react";
import "./ConsumptionPaywall.css";

type ConsumptionPaywallProps = {
	showAllFeatures: () => void;
	upgradePlan: () => void;
};

const features = {
	aiTranslation: "",
};

export default function ConsumptionPaywall({
	showAllFeatures,
	upgradePlan,
}: ConsumptionPaywallProps) {
	return (
		<div
			className="consumption_paywall_modals--largeModal"
			role="dialog"
			style={{ minWidth: "704px", maxWidth: "704px" }}
		>
			<div className="consumption_paywall_modals--largeModalTitle">
				Need more machine translations?
			</div>
			<button
				className="consumption_paywall_modals--closeButton"
				role="button"
				aria-label="Close"
				data-not-draggable="true"
				data-testid="close-button"
			>
				<span className="svg-container">
					<svg
						className="svg"
						width="12"
						height="12"
						viewBox="0 0 12 12"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M6 5.293l4.789-4.79.707.708-4.79 4.79 4.79 4.789-.707.707-4.79-4.79-4.789 4.79-.707-.707L5.293 6 .502 1.211 1.21.504 6 5.294z"
							fillRule="nonzero"
							fillOpacity="1"
							fill="#000"
							stroke="none"
						/>
					</svg>
				</span>
			</button>
			<p className="consumption_paywall_modals--largeModalSubtitle">
				Parrot comes with 100 machine translations, but getting more is easy.
			</p>
			<div className="consumption_paywall_modals--planBoxContainer">
				<div className="consumption_paywall_modals--planBox">
					<div>
						<p className="consumption_paywall_modals--planName">
							Translation Refill
							{/* <span data-tooltip-offset-x="0" className="badge--badgeLarge">
                Current plan
              </span> */}
						</p>
						<div style={{ height: "20px" }}>
							<p className="consumption_paywall_modals--planDescription">
								Boost your localization workflow with 1000 additional machine translations
							</p>
						</div>
						<div className="consumption_paywall_modals--planBoxDivider" />
						<div className="consumption_paywall_modals--planFeatureList">
							<div className="consumption_paywall_modals--planFeatureParent">
								<span>
									<span>✓ &nbsp;</span>
									<span className="">Use in unlimited files</span>
								</span>
							</div>
							<div className="consumption_paywall_modals--planFeatureParent">
								<span>
									<span>✓ &nbsp;</span>
									<span className="">1.000 additional messages</span>
								</span>
							</div>
							<div className="consumption_paywall_modals--planFeatureParent">
								<span>
									<span>✓ &nbsp;</span>
									<span className="">no subscription</span>
								</span>
							</div>
							<div className="consumption_paywall_modals--planFeatureParent">
								<span>
									<span>✓ &nbsp;</span>
									<span className="">secure payment via lemonsqueeze</span>
								</span>
							</div>
							<div style={{ height: 16 }} />
						</div>
					</div>
					<button
						className="consumption_paywall_modals--planButton"
						onClick={() => {
							upgradePlan();
						}}
					>
						Get a Refill (20% off in February!)
					</button>
					<p>
						<a className="consumption_paywall_modals--licenseKey">I have a License key already</a>
					</p>
				</div>
			</div>
		</div>
	);
}
