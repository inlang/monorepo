import * as React from "react";
import { useEffect, useState } from "react";
import "./MessagesConsumptionPaywall.css";

type MessagesConsumptionPaywallProps = {
	closeClick: () => void;
	buyClick: () => void;
	gotLicencesClick: () => void;
};

export default function MessagessConsumptionPaywall({
	closeClick,
	buyClick,
	gotLicencesClick,
}: MessagesConsumptionPaywallProps) {
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
				onClick={closeClick}
			>
				<div className="svg-container cross-svg" />
			</button>
			<p className="consumption_paywall_modals--largeModalSubtitle">
				Parrot comes with 100 machine translations, but getting more is easy.
			</p>
			<div className="consumption_paywall_modals--planBoxContainer">
				<div className="consumption_paywall_modals--planBox">
					<div>
						<div style={{ display: "flex" }}>
							<p className="consumption_paywall_modals--planName">
								Translation refill
								{/* {<span data-tooltip-offset-x="0" className="badge--badgeLarge">
                  20% off using FLUEGGE
                </span>} */}
							</p>
							<p className="consumption_paywall_modals--planName" style={{ marginLeft: "auto" }} />
						</div>
						<div style={{ height: "20px" }}>
							<p className="consumption_paywall_modals--planDescription">
								Boost your localization workflow with 1.000 additional machine translations
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
									<span className="">1.000 additional machine translations</span>
								</span>
							</div>
							<div className="consumption_paywall_modals--planFeatureParent">
								<span>
									<span>✓ &nbsp;</span>
									<span className="">No subscription</span>
								</span>
							</div>
							<div className="consumption_paywall_modals--planFeatureParent">
								<span>
									<span>✓ &nbsp;</span>
									<span className="">
										No additional account needed - secure payment via lemonsqueeze{" "}
									</span>
								</span>
							</div>
							<div style={{ height: 16 }} />
						</div>
					</div>
					<button
						className="consumption_paywall_modals--planButton"
						onClick={() => {
							buyClick();
						}}
					>
						Get a Refill
					</button>
					<p>
						<a className="consumption_paywall_modals--licenseKey" onClick={gotLicencesClick}>
							I have a license key already
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
