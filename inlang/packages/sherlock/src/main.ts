import * as vscode from "vscode"
import { msg } from "./utilities/messages/msg.js"
// import { linterDiagnostics } from "./diagnostics/linterDiagnostics.js"
import { handleError } from "./utilities/utils.js"
import { CONFIGURATION } from "./configuration.js"
import { projectView } from "./utilities/project/project.js"
import { setState, state } from "./utilities/state.js"
import { messagePreview } from "./decorations/messagePreview.js"
import { ExtractMessage } from "./actions/extractMessage.js"
import { errorView } from "./utilities/errors/errors.js"
import { messageView } from "./utilities/messages/messages.js"
import { createFileSystemMapper, type FileSystem } from "./utilities/fs/createFileSystemMapper.js"
import fs from "node:fs/promises"
import { gettingStartedView } from "./utilities/getting-started/gettingStarted.js"
import { closestInlangProject } from "./utilities/project/closestInlangProject.js"
import { recommendationBannerView } from "./utilities/recommendation/recommendation.js"
import { telemetry } from "./services/telemetry/index.js"
import packageJson from "../package.json" assert { type: "json" }
import { statusBar } from "./utilities/settings/statusBar.js"
import fg from "fast-glob"
import { saveProjectToDirectory, type IdeExtensionConfig } from "@inlang/sdk"
import path from "node:path"
import { linterDiagnostics } from "./diagnostics/linterDiagnostics.js"
//import { initErrorMonitoring } from "./services/error-monitoring/implementation.js"

// Entry Point
export async function activate(
	context: vscode.ExtensionContext
): Promise<{ context: vscode.ExtensionContext } | undefined> {
	// Sentry Error Handling
	//initErrorMonitoring()

	try {
		vscode.commands.executeCommand("setContext", "sherlock:hasProjectInWorkspace", false)
		vscode.commands.executeCommand("setContext", "sherlock:showRecommendationBanner", false)
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]

		if (!workspaceFolder) {
			console.warn("No workspace folder found.")
			return
		}

		telemetry.capture({
			event: "IDE-EXTENSION activated",
			properties: {
				vscode_version: vscode.version,
				version: packageJson.version,
				platform: process.platform,
			},
		})

		const mappedFs = createFileSystemMapper(path.normalize(workspaceFolder.uri.fsPath), fs)

		await setProjects({ workspaceFolder })
		await main({ context, workspaceFolder, fs: mappedFs })

		return { context }
	} catch (error) {
		handleError(error)
		return
	}
}

// Main Function
async function main(args: {
	context: vscode.ExtensionContext
	workspaceFolder: vscode.WorkspaceFolder
	fs: FileSystem
}): Promise<void> {
	if (state().projectsInWorkspace.length > 0) {
		// find the closest project to the workspace
		const closestProjectToWorkspace = await closestInlangProject({
			workingDirectory: path.normalize(args.workspaceFolder.uri.fsPath),
			projects: state().projectsInWorkspace,
		})

		setState({
			...state(),
			selectedProjectPath:
				closestProjectToWorkspace?.projectPath || state().projectsInWorkspace[0]?.projectPath || "",
		})

		vscode.commands.executeCommand("setContext", "sherlock:hasProjectInWorkspace", true)

		// Recommendation Banner
		await recommendationBannerView(args)
		// Project Listings
		await projectView(args)
		// Messages
		await messageView(args)
		// Errors
		await errorView(args)
		// Status Bar
		await statusBar(args)

		// Register Extension Components & Handle Inlang Errors
		await registerExtensionComponents(args)
		await handleInlangErrors()

		// TODO: Replace by reactive settings API?
		setupFileSystemWatcher(args)

		return
	} else {
		await gettingStartedView(args)
	}
}

function setupFileSystemWatcher(args: {
	context: vscode.ExtensionContext
	workspaceFolder: vscode.WorkspaceFolder
	fs: FileSystem
}) {
	const watcher = vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(
			args.workspaceFolder,
			state().selectedProjectPath || CONFIGURATION.FILES.PROJECT
		)
	)

	watcher.onDidChange(async () => {
		// reload project
		await main({
			context: args.context,
			workspaceFolder: args.workspaceFolder,
			fs: args.fs,
		})
	})
}

async function registerExtensionComponents(args: {
	context: vscode.ExtensionContext
	workspaceFolder: vscode.WorkspaceFolder
	fs: FileSystem
}) {
	args.context.subscriptions.push(
		...Object.values(CONFIGURATION.COMMANDS).map((c) => c.register(c.command, c.callback as any))
	)

	const ideExtension = (await state().project.plugins.get()).find(
		(plugin) => plugin?.meta?.["app.inlang.ideExtension"]
	)?.meta?.["app.inlang.ideExtension"] as IdeExtensionConfig | undefined

	const documentSelectors: vscode.DocumentSelector = [
		{ language: "javascript", pattern: `!${CONFIGURATION.FILES.PROJECT}` },
		...(ideExtension?.documentSelectors ?? []),
	]

	args.context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(documentSelectors, new ExtractMessage(), {
			providedCodeActionKinds: ExtractMessage.providedCodeActionKinds,
		})
	)

	messagePreview(args)
	// TODO: Replace by lix validation rules
	linterDiagnostics(args)
}

async function handleInlangErrors() {
	const inlangErrors = (await state().project.errors.get()) || []
	if (inlangErrors.length > 0) {
		console.error("Extension errors (Sherlock):", inlangErrors)
	}
}

async function setProjects(args: { workspaceFolder: vscode.WorkspaceFolder }) {
	try {
		const projectsList = (
			await fg.async(`${args.workspaceFolder.uri.fsPath}/**/*.inlang`, {
				onlyDirectories: true,
				ignore: ["**/node_modules/**"],
			})
		).map((project) => ({
			projectPath: project,
		}))

		setState({
			...state(),
			projectsInWorkspace: projectsList,
		})
	} catch (error) {
		handleError(error)
	}
}

export async function saveProject(args: {
	workspaceFolder: vscode.WorkspaceFolder
	fs: FileSystem
}) {
	try {
		if (state().selectedProjectPath && state().project) {
			await saveProjectToDirectory({
				fs: args.fs,
				project: state().project,
				path: state().selectedProjectPath,
			})
		}
	} catch (error) {
		handleError(error)
	}
}
