import type { TransformConfig } from "../../config.js"

export const baseTestConfig: TransformConfig = {
	isStatic: false,
	languageInUrl: false,
	srcFolder: "",
	rootRoutesFolder: "",
	hasAlreadyBeenInitialized: false,
	isTypeScriptProject: false
}
