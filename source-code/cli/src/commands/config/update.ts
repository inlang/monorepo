import fs from "node:fs"
import { Command } from "commander"
import path from "node:path"
import { cli } from "../../main.js"
import { log } from "../../utilities.js"
import { getLatestVersion } from "../../utilities/getLatestVersion.js"
import prompts from "prompts"
import { bold, italic } from "../../utilities/format.js"

const configFile = "inlang.config.js"

export const update = new Command()
	.command("update")
	.description("Update the inlang config.")
	.action(updateCommandAction)

/**
 * Updates the plugins in the config file to the latest major version.
 * @returns {Promise<void>} A Promise that resolves when the update is completed.
 */
async function updateCommandAction() {
	try {
		const answer = await prompts({
			type: "confirm",
			name: "update",
			message:
				"This command will update the plugins in your config file to the latest major version. Updating to a new major version can break the code, please look into the docs of the plugins you are using to see if there are breaking changes. Do you want to continue?",
			initial: true,
		})
		if (answer.update === false) {
			log.info("Aborting.")
			return
		}
		log.info("Checking for new plugin versions...")
		const filePath = cli.opts().config
			? path.resolve(process.cwd(), cli.opts().config)
			: path.resolve(process.cwd(), configFile)

		const config = await readConfigFile(filePath)

		// get the urls of the used plugins from the config file
		const pluginURLs = extractPluginUrls(config)

		// parse the urls
		const pluginURLsParsed = pluginURLs.map((url) => {
			const cleanedUrl = url.replace(/^(['"])(.*?)\1$/, "$2") // Remove leading and trailing double quotes
			const urlParts = cleanedUrl.split("/")
			const nameWithVersion = urlParts[5]!
			const [name, version] = nameWithVersion.split("@")
			const publisher = urlParts[4]
			return {
				publisher: publisher,
				name,
				url: cleanedUrl,
				version,
			}
		})

		// get the latest version of each plugin
		const pluginURLsWithLatestVersion = await Promise.all(
			pluginURLsParsed.map(async (pluginURL) => {
				const latestVersion = await getLatestVersion(
					pluginURL.publisher + "/" + pluginURL.name!,
					pluginURL.name! !== "sdk-js-plugin"
				)
				return {
					...pluginURL,
					latestVersion,
				}
			}),
		)

		// if the version & the latest version are equal, the plugin is already on the latest version and does not need to be updated
		const pluginURLsToBeUpdated = pluginURLsWithLatestVersion.filter(
			(pluginURL) => pluginURL.version !== pluginURL.latestVersion,
		)
		const pluginURLsAlreadyUpToDate = pluginURLsWithLatestVersion.filter(
			(pluginURL) => pluginURL.version === pluginURL.latestVersion,
		)
		for (const pluginURL of pluginURLsAlreadyUpToDate) {
			log.info(
				`📦 ${bold(`${pluginURL.publisher}/${pluginURL.name}`)} is already up to date at v${italic(
					`${pluginURL.version}`,
				)}`,
			)
		}

		// skip if all plugins are already up to date
		if (pluginURLsToBeUpdated.length === 0) {
			log.success("🎉 All plugins are already up to date.")
			return
		}

		// for each plugin, log which current version and which latest version will be used
		for (const pluginURL of pluginURLsToBeUpdated) {
			log.info(
				`📦 ${bold(`${pluginURL.publisher}/${pluginURL.name}`)} will be updated from v${italic(
					`${pluginURL.version}`,
				)} to v${italic(`${pluginURL.latestVersion}`)}`,
			)
		}

		// add the latest version to the plugin urls
		const pluginURLsWithUpdatedVersion = pluginURLsWithLatestVersion.map((pluginURL) => {
			const updatedURL = updatePluginVersion(pluginURL.url, pluginURL.latestVersion!)
			return {
				...pluginURL,
				updatedURL,
			}
		})

		// replace the old urls with the new ones
		const updatedConfig = pluginURLsWithUpdatedVersion.reduce((acc, pluginURL) => {
			return acc.replace(pluginURL.url, pluginURL.updatedURL)
		}, config)

		// write the updated config file
		await writeFile(filePath, updatedConfig)

		log.success(`🎉 ${configFile} updated successfully.`)
	} catch (err) {
		log.error("❌ Failed to update plugin versions:", err)
	}
}

/**
 * Reads the content of a config file.
 * @param {string} filePath - The path to the config file.
 * @returns {Promise<string>} A Promise that resolves with the content of the config file.
 */
function readConfigFile(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, "utf8", (err, data) => {
			if (err) {
				reject(err)
				return
			}
			try {
				resolve(data)
			} catch (err) {
				reject(err)
			}
		})
	})
}

/**
 * Extracts URLs from a given code.
 * @param {string} code - The code to extract URLs from.
 * @returns {string[]} An array of extracted URLs.
 */
function extractPluginUrls(code: string): string[] {
	const urlRegex = /(["'])(https?:\/\/.*?)(?=\1)/g
	return [...code.matchAll(urlRegex)]
		.map((match) => match[0])
		.map((url) => url.replace(/^["']/, ""))
}

/**
 * Updates the version in a plugin URL.
 * @param {string} url - The plugin URL.
 * @param {string} newVersion - The new version to update to.
 * @returns {string} The updated plugin URL.
 */
function updatePluginVersion(url: string, newVersion: string): string {
	const versionRegex = /(@[\w.-]+)(?=\/dist\/index.js)/
	return url.replace(versionRegex, `@${newVersion}`)
}

/**
 * Writes data to a file.
 * @param {string} filePath - The path to the file.
 * @param {string} data - The data to write to the file.
 * @returns {Promise<void>} A Promise that resolves when the file is successfully written.
 */
function writeFile(filePath: string, data: string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, data, (err) => {
			if (err) {
				reject(err)
				return
			}
			resolve()
		})
	})
}
