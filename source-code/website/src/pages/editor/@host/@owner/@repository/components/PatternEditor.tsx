import { createEffect, createSignal, Show } from "solid-js"
import type * as ast from "@inlang/core/ast"
import { useLocalStorage } from "@src/services/local-storage/index.js"
import { useEditorState } from "../State.jsx"
import type { SlDialog } from "@shoelace-style/shoelace"
import { analytics } from "@src/services/analytics/index.js"
import { query } from "@inlang/core/query"
import { showToast } from "@src/components/Toast.jsx"
import { clickOutside } from "@src/directives/clickOutside.js"
import { InlineNotification } from "@src/components/notification/InlineNotification.jsx"
import MaterialSymbolsCommitRounded from "~icons/material-symbols/commit-rounded"
import MaterialSymbolsTranslateRounded from "~icons/material-symbols/translate-rounded"
import { onMachineTranslate } from "./PatternEditor.telefunc.js"

/**
 * The pattern editor is a component that allows the user to edit the pattern of a message.
 */
export function PatternEditor(props: {
	language: ast.Resource["languageTag"]["name"]
	id: ast.Message["id"]["name"]
	referenceMessage?: ast.Message
	message: ast.Message | undefined
}) {
	const [localStorage, setLocalStorage] = useLocalStorage()
	const { resources, setResources, referenceResource, userIsCollaborator, routeParams } =
		useEditorState()

	const [showMachineLearningWarningDialog, setShowMachineLearningWarningDialog] =
		createSignal(false)

	let machineLearningWarningDialog: SlDialog | undefined

	/** throw if unimplemented features are used  */
	createEffect(() => {
		if (
			(props.message && props.message?.pattern.elements.length > 1) ||
			(props.message && props.message?.pattern.elements[0].type !== "Text")
		) {
			throw Error(
				"Not implemented. Only messages with one pattern element of type Text are supported for now.",
			)
		}
		// if the message is updated externally, update the text value
		else if (props.message) {
			setTextValue(props.message.pattern.elements[0].value)
		}
	})

	/** whether the pattern is focused */
	const [isFocused, setIsFocused] = createSignal(false)

	/** the value of the pattern */
	const [textValue, setTextValue] = createSignal(
		// eslint-disable-next-line solid/reactivity
		(props.message?.pattern.elements[0] as ast.Text | undefined)?.value,
	)

	/** the resource the message belongs to */
	const resource = () => resources.find((resource) => resource.languageTag.name === props.language)!

	/** copy of the message to conduct and track changes */
	const copy: () => ast.Message | undefined = () =>
		props.message
			? // clone message
			  structuredClone(props.message)
			: // new message
			  {
					type: "Message",
					id: {
						type: "Identifier",
						name: props.id,
					},
					pattern: {
						type: "Pattern",
						elements: [{ type: "Text", value: "" }],
					},
			  }

	// const [_isFork] = createResource(
	// 	() => localStorage.user,
	// 	async (user) => {
	// 		const response = await isFork({
	// 			owner: (currentPageContext.routeParams as EditorRouteParams).owner,
	// 			repository: (currentPageContext.routeParams as EditorRouteParams)
	// 				.repository,
	// 			username: user.username,
	// 		});
	// 		if (response.type === "success") {
	// 			return response.fork;
	// 		} else {
	// 			return response;
	// 		}
	// 	}
	// );

	const hasChanges = () =>
		(props.message?.pattern.elements[0] as ast.Text | undefined)?.value !== textValue() &&
		textValue() !== ""

	/**
	 * Saves the changes of the message.
	 */
	const handleCommit = () => {
		analytics.capture("commit changes", {
			targetLanguage: props.language,
			owner: routeParams().owner,
			repository: routeParams().repository,
		})
		const _copy = copy()
		const _textValue = textValue()
		if (_textValue === undefined) {
			return
		}
		;(_copy?.pattern.elements[0] as ast.Text).value = _textValue
		try {
			const updatedResource = query(resource()).upsert({ message: _copy! }).unwrap()
			setResources([
				...resources.filter(
					(_resource) => _resource.languageTag.name !== resource().languageTag.name,
				),
				updatedResource,
			])
			showToast({
				variant: "info",
				title: "The change has been committed.",
				message: `Don't forget to push the changes.`,
			})
		} catch (e) {
			showToast({
				variant: "danger",
				title: "Error",
				message: (e as Error).message,
			})
			throw e
		}
	}

	const [machineTranslationIsLoading, setMachineTranslationIsLoading] = createSignal(false)

	const handleMachineTranslate = async () => {
		analytics.capture("create machine translation", {
			targetLanguage: props.language,
			owner: routeParams().owner,
			repository: routeParams().repository,
		})
		if (props.referenceMessage === undefined) {
			return showToast({
				variant: "info",
				title: "Can't translate if the reference message does not exist.",
			})
		}
		const text = props.referenceMessage.pattern.elements[0].value
		if (text === undefined) {
			return showToast({
				variant: "info",
				title: "Can't translate empty text",
			})
		} else if (localStorage.showMachineTranslationWarning) {
			setShowMachineLearningWarningDialog(true)
			return machineLearningWarningDialog?.show()
		}
		setMachineTranslationIsLoading(true)
		const result = await onMachineTranslate({
			referenceLanguage: referenceResource()!.languageTag.name,
			targetLanguage: props.language,
			text,
		})
		if (result.error) {
			showToast({
				variant: "warning",
				title: "Machine translation failed.",
				message: result.error,
			})
		} else {
			setTextValue(result.data)
		}
		setMachineTranslationIsLoading(false)
	}

	return (
		// outer element is needed for clickOutside directive
		// to close the action bar when clicking outside
		<div
			ref={(element) => [
				clickOutside(
					element,
					// only close the action bar if no outstanding changes exist
					// eslint-disable-next-line solid/reactivity
					() => hasChanges() === false && setIsFocused(false),
				),
			]}
			class="grid grid-row-2 gap-2 grow"
		>
			<div class="flex flex-col gap-1">
				<div>{props.language}</div>
				{/* TODO: #169 use proper text editor instead of input element */}
				<sl-textarea
					prop:resize="auto"
					prop:size="small"
					prop:rows={1}
					class="border-none grow "
					onFocus={() => setIsFocused(true)}
					prop:value={textValue() ?? ""}
					onInput={(e) => setTextValue(e.currentTarget.value ?? undefined)}
				/>
			</div>

			{/* <div
                  onFocus={() => setIsFocused(true)}
                  onInput={(e) => setTextValue(e.currentTarget.textContent ?? undefined)}
                  contentEditable={true}
                  class="rounded border border-outline focus:outline-none py-2 px-3 focus:border-primary focus:ring focus:ring-primary-container"
              >
                  <For each={copy()?.pattern.elements}>
                      {(element) => <PatternElement element={element}></PatternElement>}
                  </For>
              </div> */}
			{/* action bar */}
			<Show when={isFocused()}>
				<div class="flex items-center justify-end  gap-2">
					<Show when={hasChanges() && localStorage.user === undefined}>
						<InlineNotification message="Sign in to commit changes." variant="info" />
					</Show>
					<Show when={hasChanges() && userIsCollaborator() === false}>
						<InlineNotification message="Fork the project to commit changes." variant="info" />
					</Show>
					<sl-button
						onClick={handleMachineTranslate}
						prop:disabled={
							(textValue() !== undefined && textValue() !== "") ||
							props.referenceMessage === undefined
						}
						prop:loading={machineTranslationIsLoading()}
						prop:variant="neutral"
					>
						<MaterialSymbolsTranslateRounded slot="prefix" />
						Machine translate
					</sl-button>
					<sl-button
						prop:variant="primary"
						prop:disabled={hasChanges() === false || userIsCollaborator() === false}
						onClick={handleCommit}
					>
						<MaterialSymbolsCommitRounded slot="prefix" />
						Commit
					</sl-button>
				</div>
			</Show>
			<Show when={showMachineLearningWarningDialog()}>
				<sl-dialog prop:label="Machine translations pitfalls" ref={machineLearningWarningDialog}>
					<ol class="">
						<li>
							1. Machine translations are not always correct. Always check and correct the
							translation as necessary.
						</li>
						<br />
						<li>
							2. Machine translations do not exclude placeholders like "My name is{" "}
							<code class="bg-surface-1 py-0.5 px-1 rounded">{"{name}"}</code>
							{'" '}
							yet. Make sure that placeholders between the reference message and translations match.
							For more information read{" "}
							<a
								href="https://github.com/orgs/inlang/discussions/228"
								target="_blank"
								class="link link-primary"
							>
								#228
							</a>
							.
						</li>
					</ol>
					<sl-button
						prop:variant="warning"
						slot="footer"
						onClick={() => {
							setLocalStorage("showMachineTranslationWarning", false)
							machineLearningWarningDialog?.hide()
							handleMachineTranslate()
						}}
					>
						Proceed with machine translating
					</sl-button>
				</sl-dialog>
			</Show>
		</div>
	)
}
