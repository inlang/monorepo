import * as React from "react";
import { useEffect, useState } from "react";
import "./ComparisonChart.css";

type ComparisonChartProps = {
	upgradePlan: () => void;
};

const features = {
	aiTranslation: "",
};

export default function ComparisonChart({ upgradePlan }: ComparisonChartProps) {
	return (
		<table className="comparison_chart--table">
			<colgroup>
				<col span={1} />
				<col span={1} />
				<col span={1} />
				<col span={1} />
			</colgroup>
			<thead>
				<tr>
					<th className="comparison_chart--featureContainer" />
					<th className="comparison_chart--planInformationContainer">
						<div>
							<div className="plan_information--headerContainer">
								<h2 className="plan_information--name">Starter </h2>
								<p className="plan_information--description">Free, for trying things out. </p>
								<div className="helper_div" />
							</div>
							<div className="plan_information--priceContainer" />
							<div
								role="button"
								className="plan_information--disabledButton"
								data-testid="plan-information-free-button"
								data-tooltip-type="text"
								data-tooltip-show-immediately="true"
								data-tooltip-show-above="true"
								data-tooltip-max-width="200"
								data-tooltip-offset-y="-8"
							>
								Current plan
							</div>
							<div className="plan_information--additionalInformation" />
						</div>
					</th>
					<th className="comparison_chart--planInformationContainer comparison_chart--highlighted">
						<div>
							<div className="plan_information--headerContainer">
								<h2 className="plan_information--name">
									Professional
									<strong className="plan_information--mostPopular">Most popular</strong>
								</h2>
								<p className="plan_information--description">
									For you and your team, with unlimited files and all the pro features.{" "}
								</p>
								<div className="helper_div" />
							</div>
							<div className="plan_information--priceContainer">
								<div className="plan_information--priceRow">
									<p className="plan_information--priceRowProductName">Figma Design</p>
									<p>
										<strong className="plan_information--priceRowPrice">12&nbsp;€</strong>
										/editor/mo.
									</p>
								</div>
								<div className="plan_information--priceRow">
									<p className="plan_information--priceRowProductName">FigJam</p>
									<p>
										<strong className="plan_information--priceRowPrice">3&nbsp;€</strong>
										/editor/mo.
									</p>
								</div>
							</div>
							<button className="plan_information--button">Upgrade to Professional</button>
							<div className="plan_information--additionalInformation" />
						</div>
					</th>
					<th className="comparison_chart--planInformationContainer">
						<div>
							<div className="plan_information--headerContainer">
								<h2 className="plan_information--name">Organization </h2>
								<p className="plan_information--description">
									For bringing teams together, sharing an org-wide design system, and more.{" "}
								</p>
								<div className="helper_div" />
							</div>
							<div className="plan_information--priceContainer">
								<div className="plan_information--priceRow">
									<p className="plan_information--priceRowProductName">Figma Design</p>
									<p>
										<strong className="plan_information--priceRowPrice">45&nbsp;€</strong>
										/editor/mo.
									</p>
								</div>
								<div className="plan_information--priceRow">
									<p className="plan_information--priceRowProductName">FigJam</p>
									<p>
										<strong className="plan_information--priceRowPrice">5&nbsp;€</strong>
										/editor/mo.
									</p>
								</div>
							</div>
							<button className="plan_information--button">Upgrade to Organization</button>
							<div className="plan_information--additionalInformation">
								<p>
									Or,
									<a
										data-testid="plan-information-contact-sales"
										className="basic_form--inlineLink--aRePo blue_link--blueLink--4ER8T plan_information--contactSalesLink--XLpeC"
										rel="noopener"
									>
										contact sales
									</a>
								</p>
							</div>
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Create and manage multiple projects and files."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Usage limits</p>
					</td>
					<td className="comparison_chart--planFeature">3 files, 3 pages, and 1 project</td>
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted">
						Unlimited files, pages, and projects
					</td>
					<td className="comparison_chart--planFeature">Unlimited files, pages, and projects</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Figma auto-saves and creates versions of your file every 30 minutes. You can name a version at any time and link to past versions."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Version history</p>
					</td>
					<td className="comparison_chart--planFeature">30 days only</td>
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted">
						✓
					</td>
					<td className="comparison_chart--planFeature">✓</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Create design systems with shared UI components for your team to use."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Libraries</p>
					</td>
					<td className="comparison_chart--planFeature" />
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted">
						Team-wide
					</td>
					<td className="comparison_chart--planFeature">Org-wide</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Create invite-only spaces for your team to work privately."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Custom file and user permissions</p>
					</td>
					<td className="comparison_chart--planFeature" />
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted">
						✓
					</td>
					<td className="comparison_chart--planFeature">✓</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Use audio to talk with your collaborators directly in a Figma or FigJam file."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Audio conversations</p>
					</td>
					<td className="comparison_chart--planFeature" />
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted">
						✓
					</td>
					<td className="comparison_chart--planFeature">✓</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Set up SAML single sign-on with your existing identity management system; enforce SSO for all team members and manage provisioning via SCIM."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">SSO, advanced security</p>
					</td>
					<td className="comparison_chart--planFeature" />
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted" />
					<td className="comparison_chart--planFeature">✓</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="View usage metrics to track adoption, measure impact, and more effectively maintain your design system."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Design system analytics</p>
					</td>
					<td className="comparison_chart--planFeature" />
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted" />
					<td className="comparison_chart--planFeature">✓</td>
				</tr>
				<tr>
					<td
						className="comparison_chart--featureContainer"
						data-tooltip-type="text"
						data-tooltip="Make your own templates and share them with your organization."
						data-tooltip-show-right="true"
						data-tooltip-show-immediately="true"
						data-tooltip-light-mode="true"
					>
						<p className="comparison_chart--featureName--EHISz">Custom templates</p>
					</td>
					<td className="comparison_chart--planFeature" />
					<td className="comparison_chart--planFeature comparison_chart--planFeature--highlighted" />
					<td className="comparison_chart--planFeature">✓</td>
				</tr>
			</tbody>
		</table>
	);
}
