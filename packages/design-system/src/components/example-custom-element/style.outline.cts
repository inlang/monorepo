import { USED_COLOR_SYSTEM_CONFIG } from "../../color-system/tailwindPlugin.cjs";
import { forEachColorToken } from "../utilities/forEachColorToken.cjs";

// Theoretically, the color tokens for buttons are always primary.
// But, generating buttons for all accent and semantic colors
// reflects the color coding of web apps.
// See https://carbondesignsystem.com/components/button/usage/#emphasis
// and https://m3.material.io/styles/color/the-color-system/color-roles
export const style = forEachColorToken(
	Object.keys({
		...USED_COLOR_SYSTEM_CONFIG.accentColors,
		...USED_COLOR_SYSTEM_CONFIG.semanticColors,
	}),
	{
		".button-outline-${token}": {
			"&:enabled": {
				color: "theme(colors.${token})",
				"border-color": "theme(colors.outline)",
				"border-width": "theme(borderWidth.DEFAULT)",
			},
			"&:enabled:hover": {
				color: "theme(colors.on-${token})",
				"border-color": "theme(colors.hover-${token})",
				"background-color": "theme(colors.hover-${token})",
			},
			"&:enabled:focus": {
				color: "theme(colors.on-${token})",
				"border-color": "theme(colors.focus-${token})",
				"background-color": "theme(colors.focus-${token})",
			},
			"&:enabled:active": {
				color: "theme(colors.on-${token})",
				"border-color": "theme(colors.active-${token})",
				"background-color": "theme(colors.active-${token})",
			},
			"&:disabled": {
				color: "theme(colors.disabled-content)",
				"border-color": "theme(colors.disabled-container)",
				"border-width": "theme(borderWidth.DEFAULT)",
			},
		},
	}
);
