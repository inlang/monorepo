import * as vscode from "vscode"
import { state } from "../state.js"
import { CONFIGURATION } from "../../configuration.js"
import { getStringFromPattern } from "./query.js"
import { escapeHtml } from "../utils.js"
import { throttle } from "throttle-debounce"
import {
	selectBundleNested,
	type BundleNested,
	type IdeExtensionConfig,
	type InlangProject,
} from "@inlang/sdk"
import { pollQuery } from "../polling/pollQuery.js"

export function createMessageWebviewProvider(args: {
	workspaceFolder: vscode.WorkspaceFolder
	context: vscode.ExtensionContext
}) {
	let bundles: BundleNested[] | undefined
	let isLoading = true
	let subscribedToProjectPath = ""
	let activeFileContent: string | undefined
	let debounceTimer: NodeJS.Timeout | undefined

	const updateMessages = async () => {
		const project = state().project as InlangProject | undefined
		if (!project) {
			isLoading = true
			updateWebviewContent()
			return
		}

		// Subscribe to messages just once for a project
		if (subscribedToProjectPath !== state().selectedProjectPath) {
			subscribedToProjectPath = state().selectedProjectPath

			updateWebviewContent() // Initial render
		}

		pollQuery(() => selectBundleNested(project.db).execute(), 2000).subscribe((newBundles) => {
			// Only update if bundles have actually changed
			if (JSON.stringify(bundles) !== JSON.stringify(newBundles)) {
				bundles = newBundles
				isLoading = false
				updateWebviewContent() // Direct update instead of throttled
			}
		})
	}

	const debounceUpdate = () => {
		const activeEditor = vscode.window.activeTextEditor
		const fileContent = activeEditor ? activeEditor.document.getText() : ""
		if (debounceTimer) {
			clearTimeout(debounceTimer)
		}
		debounceTimer = setTimeout(() => {
			if (activeFileContent !== fileContent) {
				activeFileContent = fileContent
				updateWebviewContent()
			}
		}, 300)
	}

	const updateWebviewContent = async () => {
		const activeEditor = vscode.window.activeTextEditor
		const fileContent = activeEditor ? activeEditor.document.getText() : ""
		const ideExtension = (await state().project.plugins.get()).find(
			(plugin) => plugin?.meta?.["app.inlang.ideExtension"]
		)?.meta?.["app.inlang.ideExtension"] as IdeExtensionConfig | undefined
		const messageReferenceMatchers = ideExtension?.messageReferenceMatchers

		const matchedBundles = (
			await Promise.all(
				(messageReferenceMatchers ?? []).map(async (matcher) => {
					return matcher({ documentText: fileContent })
				})
			)
		).flat()

		const highlightedBundles = await Promise.all(
			matchedBundles.map(async (bundle) => {
				// @ts-ignore TODO: Introduce deprecation message for messageId
				bundle.bundleId = bundle.bundleId || bundle.messageId
				const bundleData = await selectBundleNested(state().project.db)
					.where("id", "=", bundle.bundleId)
					.executeTakeFirst()
				return bundleData
			})
		)

		const highlightedMessagesHtml =
			highlightedBundles.length > 0
				? `<div class="highlighted-section">
                        <div class="banner"><span class="active-dot"></span><span>Current file<span></div>
                        ${await Promise.all(
													highlightedBundles.map(
														async (bundle) =>
															await createMessageHtml({
																bundle: bundle!,
																position: matchedBundles.find((m) => m.bundleId === bundle?.id)
																	?.position,
																isHighlighted: true,
																workspaceFolder: args.workspaceFolder,
															})
													)
												).then((htmls) => htmls.join(""))}
                    </div>`
				: ""

		const allMessagesBanner = '<div class="banner">All Messages</div>'
		let mainContentHtml = ""
		if (isLoading) {
			mainContentHtml = createMessagesLoadingHtml()
		} else if (bundles && bundles.length > 0) {
			mainContentHtml = `${highlightedMessagesHtml}<main>${allMessagesBanner}${await Promise.all(
				bundles.map(
					async (message) =>
						await createMessageHtml({
							bundle: message,
							isHighlighted: false,
							workspaceFolder: args.workspaceFolder,
						})
				)
			).then((htmls) => htmls.join(""))}</main>`
		} else {
			mainContentHtml = `${highlightedMessagesHtml}<main>${
				allMessagesBanner + createNoMessagesFoundHtml()
			}</main>`
		}

		if (webviewView) {
			webviewView.webview.html = getHtml({
				mainContent: mainContentHtml,
				webview: webviewView.webview,
			})
		}
	}

	const throttledUpdateWebviewContent = throttle(500, updateWebviewContent)

	let webviewView: vscode.WebviewView | undefined

	return {
		resolveWebviewView(view: vscode.WebviewView) {
			webviewView = view

			view.webview.options = {
				enableScripts: true,
			}

			view.webview.onDidReceiveMessage(
				(message) => {
					if (message.command === "executeCommand") {
						const commandName = message.commandName
						const commandArgs = message.commandArgs

						vscode.commands.executeCommand(commandName, commandArgs)
					}
				},
				undefined,
				args.context.subscriptions
			)

			args.context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(debounceUpdate))
			args.context.subscriptions.push(
				vscode.workspace.onDidChangeTextDocument((event) => {
					if (
						vscode.window.activeTextEditor &&
						event.document === vscode.window.activeTextEditor.document
					) {
						debounceUpdate()
					}
				})
			)
			args.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(updateMessages))

			args.context.subscriptions.push(
				CONFIGURATION.EVENTS.ON_DID_CREATE_MESSAGE.event(() => {
					updateMessages()
				})
			)

			args.context.subscriptions.push(
				CONFIGURATION.EVENTS.ON_DID_EXTRACT_MESSAGE.event(() => {
					updateMessages()
				})
			)

			args.context.subscriptions.push(
				CONFIGURATION.EVENTS.ON_DID_EDIT_MESSAGE.event(() => {
					updateMessages()
				})
			)

			args.context.subscriptions.push(
				CONFIGURATION.EVENTS.ON_DID_PROJECT_TREE_VIEW_CHANGE.event(() => {
					updateMessages()
				})
			)

			args.context.subscriptions.push(
				CONFIGURATION.EVENTS.ON_DID_SETTINGS_VIEW_CHANGE.event(() => {
					updateMessages()
				})
			)

			updateMessages() // Initial update
		},
	}
}

export async function createMessageHtml(args: {
	bundle: BundleNested
	position?: {
		start: {
			line: number
			character: number
		}
		end: {
			line: number
			character: number
		}
	}
	isHighlighted: boolean
	workspaceFolder: vscode.WorkspaceFolder
}): Promise<string> {
	const translationsTableHtml = await getTranslationsTableHtml({
		bundle: args.bundle,
		workspaceFolder: args.workspaceFolder,
	})

	// Find the relative path from the workspace/git root
	const relativeProjectPathFromWorkspace = state().selectedProjectPath.replace(
		args.workspaceFolder.uri.fsPath,
		""
	)

	const positionHtml = encodeURIComponent(JSON.stringify(args.position))
	const jumpCommand = `jumpToPosition('${args.bundle.id}', '${positionHtml}');event.stopPropagation();`
	const openCommand = `openInFink('${args.bundle.id}', '${relativeProjectPathFromWorkspace}');event.stopPropagation();`

	return `
    <div class="tree-item">
        <div class="collapsible" data-message-id="${args.bundle.id}">
            <div class="messageId">
                <span><strong>#</strong></span>
                <span>${args.bundle.id}</span>
            </div>
            <div class="actionButtons">
                ${
									args.position
										? `<span title="Jump to message" onclick="${jumpCommand}"><span class="codicon codicon-magnet"></span></span>`
										: ""
								}
				<!-- Removed until we have a proper way to open in Fink with Lix host -->
                <!--<span title="Open in Fink" onclick="${openCommand}"><span class="codicon codicon-link-external"></span></span>-->
            </div>
        </div>
        <div class="content" style="display: none;">
            ${translationsTableHtml}
        </div>
    </div>
    `
}

export function createNoMessagesFoundHtml(): string {
	return `<div class="no-messages">
                <span>No messages found. Extract text to create a message by selecting a text and using the "Extract message" quick action / command.</span>
            </div>`
}

export function createMessagesLoadingHtml(): string {
	return `<div class="loading">
				<span>Loading messages...</span>
			</div>`
}

export function getHtml(args: { mainContent: string; webview: vscode.Webview }): string {
	const context = vscode.extensions.getExtension("inlang.vs-code-extension")?.exports.context
	if (!context) {
		console.error("Extension context is not available.")
		return ""
	}

	const styleUri = args.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, "assets", "styles.css")
	)
	const codiconsUri = args.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, "assets", "codicon.css")
	)
	const codiconsTtfUri = args.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, "assets", "codicon.ttf")
	)

	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <!-- Use a content security policy to only allow loading specific resources in the webview -->
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${args.webview.cspSource}; style-src ${args.webview.cspSource} 'unsafe-inline'; script-src ${args.webview.cspSource} 'unsafe-inline';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inlang Message View</title>
            <link href="${styleUri}" rel="stylesheet" />
            <link href="${codiconsUri}" rel="stylesheet" />
			<link href="${codiconsTtfUri}" rel="stylesheet" />
        </head>
        <body>
            <input type="text" id="searchInput" placeholder="Search">
            ${args.mainContent}
            <script>
				let collapsibles = [];
				let copyButtons = [];
				const vscode = acquireVsCodeApi();
			
				document.addEventListener('DOMContentLoaded', () => {
					collapsibles = document.querySelectorAll('.collapsible');
					copyButtons = document.querySelectorAll('.copy-btn');
					initializeSearchFunctionality();
					initializeCollapsibleItems();
					initializeCopyButtons();
				});
			
				function initializeCollapsibleItems() {
					collapsibles.forEach(collapsible => {
						const messageId = collapsible.getAttribute('data-message-id');
						const isHighlighted = collapsible.closest('.highlighted-section') !== null;
						const sectionPrefix = isHighlighted ? 'highlighted' : 'all';
						const storageKey = 'sherlock.collapsibleState.' + sectionPrefix + '.' + messageId;
				
						const storedState = localStorage.getItem(storageKey);
						const content = collapsible.nextElementSibling;
						if (storedState) {
							const isActive = storedState === 'true';
							collapsible.classList.toggle('active', isActive);
							content.style.display = isActive ? 'block' : 'none';
						} else {
							// Ensure default state is correctly set
							content.style.display = 'none';
						}
				
						collapsible.addEventListener('click', function() {
							collapsible.classList.toggle('active');
							const isExpanded = content.style.display === 'block';
							content.style.display = isExpanded ? 'none' : 'block';
							localStorage.setItem(storageKey, !isExpanded);
						});
					});
				}
				
				function initializeCopyButtons() {
					copyButtons.forEach(button => {
						button.addEventListener('click', function() {
							const messageId = this.getAttribute('data-message-id');
							navigator.clipboard.writeText(messageId);
						});
					});
				}

                function initializeSearchFunctionality() {
                    const searchInput = document.getElementById('searchInput');
                    const storedSearchValue = localStorage.getItem('sherlock.searchValue') || '';
                    searchInput.value = storedSearchValue;

                    // Apply filter based on stored value on load
                    filterItems(storedSearchValue.toLowerCase());

                    searchInput.addEventListener('input', () => {
                        const searchTerm = searchInput.value.toLowerCase();
                        localStorage.setItem('sherlock.searchValue', searchTerm);
                        filterItems(searchTerm);
                    });
                }

				function filterItems(searchTerm) {
					document.querySelectorAll('.tree-item').forEach(item => {
						const messageId = item.querySelector('.collapsible').textContent.toLowerCase();
						const messageButtons = item.querySelectorAll('.message button');
						let translationsText = '';
						messageButtons.forEach(button => {
							translationsText += button.textContent.toLowerCase() + ' ';
						});

						// Use the data-alias attribute for search
						const aliases = item.querySelectorAll('.aliases [data-alias]');
						let aliasesText = '';
						aliases.forEach(alias => {
							aliasesText += alias.getAttribute('data-alias').toLowerCase() + ' ';
						});
				
						const itemVisible = messageId.includes(searchTerm) || translationsText.includes(searchTerm) || aliasesText.includes(searchTerm);
						item.style.display = itemVisible ? '' : 'none';
					});
				}

				function openEditorView(bundleId) {
					vscode.postMessage({
						command: 'executeCommand',
						commandName: 'sherlock.openEditorView',
						commandArgs: { bundleId, context: vscode.context },
					});
				}
			
				function openInFink(bundleId, selectedProjectPath) {
					vscode.postMessage({
						command: 'executeCommand',
						commandName: 'sherlock.openInFink',
						commandArgs: { bundleId, selectedProjectPath },
					});
				}

				function jumpToPosition(bundleId, position) {
					const decodedPosition = JSON.parse(decodeURIComponent(position));
					vscode.postMessage({
						command: 'executeCommand',
						commandName: 'sherlock.jumpToPosition',
						commandArgs: { bundleId, position: decodedPosition },
					});
				}

				function machineTranslate(bundleId, baseLocale, targetLanguageTags) {
					vscode.postMessage({
						command: 'executeCommand',
						commandName: 'sherlock.machineTranslateMessage',
						commandArgs: { bundleId, baseLocale, targetLanguageTags },
					});
				}
            </script>
        </body>
        </html>
    `
}

export async function getTranslationsTableHtml(args: {
	bundle: BundleNested
	workspaceFolder: vscode.WorkspaceFolder
}): Promise<string> {
	const settings = await state().project.settings.get()
	const configuredLocales = settings.locales
	const contextTableRows = configuredLocales.flatMap((locale) => {
		const message = args.bundle.messages.find((m) => m.locale === locale)

		// Handle missing translation scenario
		if (!message) {
			const missingTranslationMessage = CONFIGURATION.STRINGS.MISSING_TRANSLATION_MESSAGE
			const editCommand = `openEditorView('${args.bundle.id}')`
			const machineTranslateCommand = `machineTranslate('${args.bundle.id}', '${
				settings.baseLocale
			}', ['${locale}'])`

			return `
				<div class="section">
					<span class="languageTag"><strong>${escapeHtml(locale)}</strong></span>
					<span class="message"><button onclick="${editCommand}">${escapeHtml(missingTranslationMessage)}</button></span>
					<span class="actionButtons">
						<button title="Translate message with Inlang AI" onclick="${machineTranslateCommand}"><span class="codicon codicon-sparkle"></span></button>
					</span>
				</div>
			`
		}

		// If message is present, map over each variant
		return message.variants.map((variant, index) => {
			const pattern = getStringFromPattern({
				pattern: variant.pattern,
				locale: message.locale,
				messageId: message.id,
			})

			const editCommand = `openEditorView('${args.bundle.id}')`

			// Create a readable string from variant matches
			const variantLabel = variant.matches
				? variant.matches
						.map((match) => {
							if (match.type === "literal-match") {
								return match.value
							}
							if (match.type === "catchall-match") {
								return "*"
							}
							return ""
						})
						.filter(Boolean)
						.join(", ")
				: undefined

			return `
				<div class="section">
					<span class="languageTag"><strong>${escapeHtml(locale)}${escapeHtml(variantLabel ? ` - ${variantLabel}` : "")}</strong></span>
					<span class="message"><button onclick="${editCommand}">${escapeHtml(pattern)}</button></span>
					<span class="actionButtons">
						<button title="Edit" onclick="${editCommand}"><span class="codicon codicon-edit"></span></button>
					</span>
				</div>
			`
		})
	})

	return `<div class="table">${contextTableRows.join("")}</div>`
}

export async function messageView(args: {
	workspaceFolder: vscode.WorkspaceFolder
	context: vscode.ExtensionContext
}) {
	const provider = createMessageWebviewProvider({
		workspaceFolder: args.workspaceFolder,
		context: args.context,
	})
	args.context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("messageView", provider)
	)
}
