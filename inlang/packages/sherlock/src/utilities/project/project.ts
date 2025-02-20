import * as vscode from "vscode"
import { loadProjectFromDirectoryInMemory } from "@inlang/sdk"
import { CONFIGURATION } from "../../configuration.js"
import { telemetry } from "../../services/telemetry/index.js"
import { setState, state } from "../state.js"
import * as Sherlock from "@inlang/recommend-sherlock"
import { transpileToCjs } from "../import/transpileToCjs.js"
import * as fs from "node:fs"
import type { FileSystem } from "../fs/createFileSystemMapper.js"
import path from "node:path"

let projectViewNodes: ProjectViewNode[] = []

export interface ProjectViewNode {
	label: string
	path: string
	relativePath: string
	isSelected: boolean
	collapsibleState: vscode.TreeItemCollapsibleState
	context: vscode.ExtensionContext
}

export function createProjectViewNodes(args: {
	context: vscode.ExtensionContext
	workspaceFolder: vscode.WorkspaceFolder
}): ProjectViewNode[] {
	const projectsInWorkspace = state().projectsInWorkspace

	if (!projectsInWorkspace) {
		console.error("state().projectsInWorkspace is undefined")
		return []
	}

	projectViewNodes = projectsInWorkspace.map((project) => {
		// Ensure projectPath is a string
		if (!project.projectPath) {
			return {
				label: "",
				path: "",
				isSelected: false,
				collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
				context: args.context,
			} as ProjectViewNode
		}

		const projectPath = typeof project.projectPath === "string" ? project.projectPath : ""
		const projectName = projectPath.split("/").slice(-1).join("/").replace(".inlang", "")
		const relativePath =
			"./" + path.normalize(projectPath.replace(args.workspaceFolder.uri.fsPath, "./"))

		return {
			label: projectName,
			path: project.projectPath,
			relativePath: relativePath,
			isSelected: project.projectPath === state().selectedProjectPath,
			collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
			context: args.context,
		} as ProjectViewNode
	})

	return projectViewNodes
}

export function getTreeItem(args: {
	element: ProjectViewNode
	fs: FileSystem
	workspaceFolder: vscode.WorkspaceFolder
}): vscode.TreeItem {
	return {
		label: args.element.label,
		tooltip: args.element.path,
		description: args.element.relativePath,
		iconPath: args.element.isSelected
			? new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("sideBar.foreground"))
			: new vscode.ThemeIcon("circle-large-outline", new vscode.ThemeColor("sideBar.foreground")),
		contextValue: args.element.isSelected ? "projectViewNodeSelected" : "projectViewNode",
		command: {
			command: "sherlock.openProject",
			title: "Open File",
			arguments: [args.element, args.fs, args.workspaceFolder],
		},
	}
}

export async function handleTreeSelection(args: {
	selectedNode: ProjectViewNode
	fs: FileSystem
	workspaceFolder: vscode.WorkspaceFolder
}): Promise<void> {
	const selectedProject = path.normalize(args.selectedNode.path)

	projectViewNodes = projectViewNodes.map((node) => ({
		...node,
		isSelected: node.path === args.selectedNode.path,
	}))

	const newSelectedProject = projectViewNodes.find((node) => node.isSelected)?.path as string

	try {
		const inlangProject = await loadProjectFromDirectoryInMemory({
			path: newSelectedProject,
			fs,
			preprocessPluginBeforeImport: transpileToCjs,
		})

		setState({
			...state(),
			project: inlangProject,
			selectedProjectPath: newSelectedProject,
		})

		// Update decorations
		CONFIGURATION.EVENTS.ON_DID_EDIT_MESSAGE.fire(undefined)
		CONFIGURATION.EVENTS.ON_DID_CREATE_MESSAGE.fire(undefined)
		CONFIGURATION.EVENTS.ON_DID_EXTRACT_MESSAGE.fire(undefined)
		// Refresh the entire tree to reflect selection changes
		CONFIGURATION.EVENTS.ON_DID_PROJECT_TREE_VIEW_CHANGE.fire(undefined)
		CONFIGURATION.EVENTS.ON_DID_ERROR_TREE_VIEW_CHANGE.fire(undefined)

		const isInWorkspaceRecommendation = await Sherlock.shouldRecommend({
			fs: args.fs,
			workingDirectory: path.normalize(args.workspaceFolder.uri.fsPath),
		})

		telemetry.capture({
			event: "IDE-EXTENSION loaded project",
			properties: {
				errors: await inlangProject.errors.get(),
				isInWorkspaceRecommendation,
			},
		})
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to load project "${selectedProject}": ${error}`)
	}
}

export function createTreeDataProvider(args: {
	fs: FileSystem
	workspaceFolder: vscode.WorkspaceFolder
	context: vscode.ExtensionContext
}): vscode.TreeDataProvider<ProjectViewNode> {
	return {
		getTreeItem: (element: ProjectViewNode) =>
			getTreeItem({
				element,
				fs: args.fs,
				workspaceFolder: args.workspaceFolder,
			}),
		getChildren: () =>
			createProjectViewNodes({
				context: args.context,
				workspaceFolder: args.workspaceFolder,
			}),
		onDidChangeTreeData: CONFIGURATION.EVENTS.ON_DID_PROJECT_TREE_VIEW_CHANGE.event,
	}
}

export const projectView = async (args: {
	context: vscode.ExtensionContext
	workspaceFolder: vscode.WorkspaceFolder
	fs: FileSystem
}) => {
	const treeDataProvider = createTreeDataProvider({
		fs: args.fs,
		workspaceFolder: args.workspaceFolder,
		context: args.context,
	})

	treeDataProvider.getChildren()

	args.context.subscriptions.push(
		vscode.window.registerTreeDataProvider("projectView", treeDataProvider)
	)

	// Trigger handleTreeSelection for the selected project after initializing the tree view
	const selectedProjectPath = state().selectedProjectPath
	if (selectedProjectPath) {
		const selectedNode = projectViewNodes.find((node) => node.path === selectedProjectPath)
		if (selectedNode) {
			await handleTreeSelection({
				selectedNode,
				fs: args.fs,
				workspaceFolder: args.workspaceFolder,
			})
		}
	}
}
