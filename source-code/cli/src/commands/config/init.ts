import { Command } from "commander"
import { generateConfigFile } from "@inlang/shared/openai"
import fs from "node:fs/promises"
import { logger, prompt } from "../../api.js"

export const init = new Command()
	.command("init")
	.description("Initialize the inlang.config.js file.")
	.action(async () => {
		// ----------- CHECK IF CONFIG FILE ALREADY EXISTS --------------
		if (await configAlreadyExists()) {
			logger.error("Config file already exists.")
			const answer = await prompt({
				type: "confirm",
				name: "overwrite",
				message: "Do you want to overwrite the existing config file?",
				initial: false,
			})
			if (answer.overwrite === false) {
				logger.info("Aborting.")
				return
			}
		}
		// ----------------- GENERATE CONFIG FILE -----------------
		logger.info("Generating config file with AI 🤖 ...")
		// @ts-ignore
		const result = await generateConfigFile({ fs, path: "./" })
		if (result.isErr) {
			logger.error("Failed to generate config file.", result.error)
			return
		}
		logger.success("Generated config file.")
		// ----------------- WRITE CONFIG FILE TO DISK -----------------
		logger.info("Writing config file to disk...")
		try {
			await fs.writeFile("./inlang.config.js", result.value, "utf-8")
			logger.success("Wrote config file to disk.")
		} catch (error) {
			logger.error("Failed to write config file to disk.", error)
		}
	})

async function configAlreadyExists() {
	try {
		await fs.readFile("./inlang.config.js")
		return true
	} catch (error) {
		return false
	}
}
