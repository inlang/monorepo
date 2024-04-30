import * as vscode from "vscode"

const settingsProperty = [
	"userId",
	"disableRecommendation",
	"disableConfigFileCreation",
	"disableConfigFileDeletion",
	"previewLanguageTag",
	"inlineAnnotations.enabled",
] as const

type SettingsProperty = (typeof settingsProperty)[number]

/**
 * Updates a configuration setting with the specified value.
 * @param {string} property - The name of the configuration property to update.
 * @param {any} value - The new value for the configuration property.
 * @returns {Promise<void>} - A Promise that resolves once the configuration property has been updated.
 */
export const updateSetting = async (property: SettingsProperty, value: any): Promise<void> => {
	await vscode.workspace.getConfiguration("sherlock").update(property, value, true)
}

/**
 * Gets a configuration setting value.
 * @param {string} property - The name of the configuration property to get.
 * @returns {Promise<any>} - A Promise that resolves to the configuration property value.
 * @throws {Error} - Throws an error if the configuration property is not found.
 *
 */
export const getSetting = async (property: SettingsProperty): Promise<any> => {
	// TODO: remove this migrate settings from inlang to sherlock after 01 April 2024
	migrateSettingsFromInlangToSherlock()

	const value = vscode.workspace.getConfiguration("sherlock").get(property)
	if (value === undefined) {
		throw new Error(`Could not find configuration property ${property}`)
	}
	return value
}

/**
 * Migrates settings from the old inlang namespace to the new sherlock namespace.
 */
// TODO: remove this migrate settings from inlang to sherlock after 01 April 2024
export const migrateSettingsFromInlangToSherlock = async () => {
	if (vscode.workspace.getConfiguration("sherlock").get("userId")) {
		return
	}

	const inlangSettings = vscode.workspace.getConfiguration("inlang")

	for (const property of settingsProperty) {
		const value = inlangSettings.get(property)
		if (value !== undefined) {
			await updateSetting(property, value)
		}
	}
}
