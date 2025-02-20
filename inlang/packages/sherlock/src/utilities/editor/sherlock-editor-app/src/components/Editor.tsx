import { BundleNested, Message, ProjectSettings } from "@inlang/sdk"
import { vscode } from "../utils/vscode.js"
import React from "react"
import {
	InlangMessage,
	InlangPatternEditor,
	InlangVariant,
	InlangBundle,
	ChangeEventDetail,
	InlangBundleAction,
	InlangAddSelector,
} from "@inlang/editor-component"
import { createComponent } from "@lit/react"
import { SlDialog, SlDropdown, SlMenu, SlMenuItem } from "@shoelace-style/shoelace/dist/react"
import { v4 as uuidv4 } from "uuid"

const ReactInlangBundle = createComponent({
	tagName: "inlang-bundle",
	elementClass: InlangBundle,
	react: React,
	events: {
		change: "change",
	},
})

const ReactInlangBundleAction = createComponent({
	tagName: "inlang-bundle-action",
	elementClass: InlangBundleAction,
	react: React,
})

const ReactInlangMessage = createComponent({
	tagName: "inlang-message",
	elementClass: InlangMessage,
	react: React,
})

const ReactInlangVariant = createComponent({
	tagName: "inlang-variant",
	elementClass: InlangVariant,
	react: React,
})

const ReactInlangPatternEditor = createComponent({
	tagName: "inlang-pattern-editor",
	elementClass: InlangPatternEditor,
	react: React,
	events: {
		onPatternEditorFocus: "pattern-editor-focus",
		onPatternEditorBlur: "pattern-editor-blur",
	},
})

const ReactInlangAddSelector = createComponent({
	tagName: "inlang-add-selector",
	elementClass: InlangAddSelector,
	react: React,
	events: {
		change: "change",
		onSubmit: "submit",
	},
})

const Editor: React.FC<{
	bundle: BundleNested
	settings: ProjectSettings
}> = ({ bundle, settings }) => {
	const handleChangeEvent = (e: Event) => {
		const change = (e as CustomEvent).detail as ChangeEventDetail
		vscode.postMessage({ command: "change", change })
	}

	const handleDelete = ({
		command,
		message,
	}: {
		command: "delete-bundle" | "delete-variant"
		message: {
			id: string
		}
	}) => {
		vscode.postMessage({ command, id: message.id })
	}

	const createMessage = async (message: Message) => {
		if (message) {
			vscode.postMessage({
				command: "create-message",
				message,
			})
		}
	}

	return (
		<div className="relative">
			<ReactInlangBundle bundle={bundle} change={handleChangeEvent}>
				<ReactInlangBundleAction
					slot="bundle-action"
					actionTitle="Delete"
					onClick={() => handleDelete({ command: "delete-bundle", message: { id: bundle.id } })}
				/>
				{settings.locales.map((locale) => {
					const message = bundle.messages.find((message) => message.locale === locale)
					if (message) {
						return (
							<ReactInlangMessage
								key={message.id}
								slot="message"
								message={message}
								variants={message.variants}
								settings={settings}
							>
								{message.variants.map((variant) => (
									<ReactInlangVariant key={variant.id} slot="variant" variant={variant}>
										<ReactInlangPatternEditor slot="pattern-editor" variant={variant} />
										<SlDropdown
											slot="variant-action"
											className="animate-blendIn"
											distance={4}
											hoist
											onSlShow={(e) => {
												setTimeout(() => {
													;(e.target as HTMLElement)?.querySelector("sl-menu-item")?.focus()
												})
											}}
										>
											<div slot="trigger" className="px-2 cursor-pointer">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="20"
													height="20"
													viewBox="0 0 24 24"
													className="-mx-[2px]"
												>
													<path
														fill="currentColor"
														d="M7 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0"
													/>
												</svg>
											</div>
											<SlMenu>
												<SlMenuItem
													onClick={() => {
														const dialog = document.getElementById(
															`selector-button-dialog-${bundle.id}`
															// @ts-expect-error - TS doesn't know about the dialog component
														) as SlDialog
														if (dialog) {
															const child = dialog.children[0] as InlangAddSelector
															if (child) {
																child.message = message
																child.variants = message.variants
															}
															setTimeout(() => {
																dialog.show()
															})
														}
													}}
												>
													Add Selector
												</SlMenuItem>
												{message.variants.length > 1 && (
													<SlMenuItem
														onClick={() =>
															handleDelete({
																command: "delete-variant",
																message: { id: variant.id },
															})
														}
													>
														Delete
													</SlMenuItem>
												)}
											</SlMenu>
										</SlDropdown>
									</ReactInlangVariant>
								))}
								<div
									slot="selector-button"
									title="Add selector"
									className="px-2 h-8 mt-[6px] ml-[1px] bg-white rounded text-zinc-600 flex items-center justify-center hover:bg-zinc-100 hover:border-zinc-400 cursor-pointer"
									onClick={() => {
										const dialog = document.getElementById(
											`selector-button-dialog-${bundle.id}`
											// @ts-expect-error - TS doesn't know about the dialog component
										) as SlDialog
										if (dialog) {
											const child = dialog.children[0] as InlangAddSelector
											if (child) {
												child.message = message
												child.variants = message.variants
											}
											setTimeout(() => {
												dialog.show()
											})
										}
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										className="-mx-[3px]"
									>
										<path fill="currentColor" d="M19 12.998h-6v6h-2v-6H5v-2h6v-6h2v6h6z" />
									</svg>
								</div>
							</ReactInlangMessage>
						)
					} else {
						const message: Message = {
							id: uuidv4(),
							selectors: [],
							locale,
							bundleId: bundle.id,
						}
						return (
							<ReactInlangMessage
								slot="message"
								message={message}
								settings={settings}
								key={`${bundle.id}-${locale}-empty`}
							>
								<p
									className="min-h-[44px] bg-white hover:bg-zinc-50 flex items-center px-2 text-[14px] text-zinc-500 hover:text-zinc-950 gap-[4px] cursor-pointer w-full"
									slot="variant"
									onClick={() => createMessage(message)}
								>
									<svg viewBox="0 0 24 24" width="18" height="18" className="w-5 h-5">
										<path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"></path>
									</svg>
									{`Add ${locale}`}
								</p>
							</ReactInlangMessage>
						)
					}
				})}
			</ReactInlangBundle>
			<SlDialog
				id={`selector-button-dialog-${bundle.id}`}
				className="add-selector-dialog"
				label="Add selector"
			>
				<ReactInlangAddSelector
					change={handleChangeEvent}
					onSubmit={() => {
						const dialog = document.getElementById(
							`selector-button-dialog-${bundle.id}`
							// @ts-expect-error - TS doesn't know about the dialog component
						) as SlDialog
						dialog.hide()
					}}
					bundle={bundle}
					// message={message}
					// variants={message?.variants}
				/>
			</SlDialog>
		</div>
	)
}

export default Editor
