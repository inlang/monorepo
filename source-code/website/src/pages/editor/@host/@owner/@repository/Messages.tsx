import type * as ast from "@inlang/core/ast";
import { createEffect, createSignal, For, Show } from "solid-js";
import {
  resources,
  inlangConfig,
  setResources,
  referenceResource,
  userIsCollaborator,
  filteredLanguages,
} from "./state.js";
import MaterialSymbolsCommitRounded from "~icons/material-symbols/commit-rounded";
import { query } from "@inlang/core/query";
import { clickOutside } from "@src/directives/clickOutside.js";
import { showToast } from "@src/components/Toast.jsx";
import { useLocalStorage } from "@src/services/local-storage/LocalStorageProvider.jsx";
import { InlineNotification } from "@src/components/notification/InlineNotification.jsx";
import MaterialSymbolsRobotOutline from "~icons/material-symbols/robot-outline";
import { onMachineTranslate } from "./index.telefunc.js";
import type SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

export function Messages(props: {
  messages: Record<
    ast.Resource["languageTag"]["name"],
    ast.Message | undefined
  >;
}) {
  const referenceMessage = () => {
    return props.messages[inlangConfig()!.referenceLanguage];
  };

  /**
   * The id of the message.
   *
   * If the reference language is not defined, the first message id is used.
   */
  const id: () => ast.Message["id"]["name"] = () => {
    if (referenceMessage()) {
      return referenceMessage()!.id.name;
    }
    for (const message of Object.values(props.messages)) {
      if (message?.id.name !== undefined) {
        return message.id.name;
      }
    }
    throw Error("No message id found");
  };
  return (
    <div class="border border-outline p-4 rounded flex flex-col gap-4">
      <h3 slot="summary" class="font-medium">
        {id()}
      </h3>
      <div class="grid grid-cols-2 gap-16">
        <PatternEditor
          language={inlangConfig()!.referenceLanguage}
          id={id()}
          referenceMessage={referenceMessage()}
          message={props.messages[inlangConfig()!.referenceLanguage]}
        />
        <div class="flex flex-col gap-4">
          <For each={inlangConfig()?.languages}>
            {(language) => (
              <Show when={language !== inlangConfig()?.referenceLanguage}>
                <div
                  class="flex "
                  classList={{
                    hidden: filteredLanguages().includes(language) === false,
                  }}
                >
                  <PatternEditor
                    language={language}
                    id={id()}
                    referenceMessage={referenceMessage()}
                    message={props.messages[language]}
                  />
                </div>
              </Show>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function PatternEditor(props: {
  language: ast.Resource["languageTag"]["name"];
  id: ast.Message["id"]["name"];
  referenceMessage?: ast.Message;
  message: ast.Message | undefined;
}) {
  const [localStorage, setLocalStorage] = useLocalStorage();

  const [
    showMachineLearningWarningDialog,
    setShowMachineLearningWarningDialog,
  ] = createSignal(false);

  let machineLearningWarningDialog: SlDialog | undefined;

  /** throw if unimplemented features are used  */
  createEffect(() => {
    if (
      (props.message && props.message?.pattern.elements.length > 1) ||
      (props.message && props.message?.pattern.elements[0].type !== "Text")
    ) {
      throw Error(
        "Not implemented. Only messages with one pattern element of type Text are supported for now."
      );
    }
  });

  /** whether the pattern is focused */
  const [isFocused, setIsFocused] = createSignal(false);

  /** the value of the pattern */
  const [textValue, setTextValue] = createSignal(
    // eslint-disable-next-line solid/reactivity
    (props.message?.pattern.elements[0] as ast.Text | undefined)?.value
  );

  /** the resource the message belongs to */
  const resource = () =>
    resources.find((resource) => resource.languageTag.name === props.language)!;

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
        };

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
    (props.message?.pattern.elements[0] as ast.Text | undefined)?.value !==
      textValue() && textValue() !== "";

  /**
   * Saves the changes of the message.
   */
  const handleSave = () => {
    const _copy = copy();
    const _textValue = textValue();
    if (_textValue === undefined) {
      return;
    }
    (_copy?.pattern.elements[0] as ast.Text).value = _textValue;
    try {
      const updatedResource = query(resource())
        .upsert({ message: _copy! })
        .unwrap();
      setResources([
        ...resources.filter(
          (_resource) =>
            _resource.languageTag.name !== resource().languageTag.name
        ),
        updatedResource,
      ]);
      showToast({
        variant: "info",
        title: "The change has been committed.",
        message: `Don't forget to push the changes.`,
      });
    } catch (e) {
      showToast({
        variant: "danger",
        title: "Error",
        message: (e as Error).message,
      });
      throw e;
    }
  };

  const [machineTranslationIsLoading, setMachineTranslationIsLoading] =
    createSignal(false);

  const handleMachineTranslate = async () => {
    if (props.referenceMessage === undefined) {
      return showToast({
        variant: "info",
        title: "Can't translate if the reference message does not exist.",
      });
    }
    const text = props.referenceMessage.pattern.elements[0].value;
    if (text === undefined) {
      return showToast({
        variant: "info",
        title: "Can't translate empty text",
      });
    } else if (localStorage.showMachineTranslationWarning) {
      setShowMachineLearningWarningDialog(true);
      return machineLearningWarningDialog?.show();
    }
    setMachineTranslationIsLoading(true);
    const result = await onMachineTranslate({
      referenceLanguage: referenceResource()!.languageTag.name,
      targetLanguage: props.language,
      text,
    });
    if (result.error) {
      showToast({
        variant: "warning",
        title: "Machine translation failed.",
        message: result.error,
      });
    } else {
      setTextValue(result.data);
    }
    setMachineTranslationIsLoading(false);
  };

  return (
    // outer element is needed for clickOutside directive
    // to close the action bar when clicking outside
    <div
      ref={(element) => [
        clickOutside(
          element,
          // only close the action bar if no outstanding changes exist
          // eslint-disable-next-line solid/reactivity
          () => hasChanges() === false && setIsFocused(false)
        ),
      ]}
      class="grid grid-row-2 gap-2 grow 	"
    >
      <div class="flex flex-col gap-1">
        <div class="">{props.language}</div>

        {/* TODO: #169 use proper text editor instead of input element */}
        <sl-textarea
          prop:resize="auto"
          prop:size="small"
          prop:rows={1}
          class="border-none grow "
          onFocus={() => setIsFocused(true)}
          prop:value={textValue() ?? ""}
          prop:disabled={userIsCollaborator() === false}
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
            <InlineNotification
              title="Sign in"
              message="You must be signed in to commit changes."
              variant="info"
            />
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
            <MaterialSymbolsRobotOutline slot="prefix" />
            Machine translate
          </sl-button>
          <sl-button
            prop:variant="primary"
            prop:disabled={
              hasChanges() === false || localStorage.user === undefined
            }
            onClick={handleSave}
          >
            <MaterialSymbolsCommitRounded slot="prefix" />
            Commit
          </sl-button>
        </div>
      </Show>
      <Show when={showMachineLearningWarningDialog()}>
        <sl-dialog
          prop:label="Machine translations pitfalls"
          ref={machineLearningWarningDialog}
        >
          <ol class="">
            <li>
              1. Machine translations are not always correct. Always check and
              correct the translation as necessary.
            </li>
            <br />
            <li>
              2. Machine translations do not exclude placeholders like "My name
              is{" "}
              <code class="bg-surface-1 py-0.5 px-1 rounded">{"{name}"}</code>
              {'" '}
              yet. Make sure that placeholders between the reference message and
              translations match. For more information read{" "}
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
              setLocalStorage("showMachineTranslationWarning", false);
              machineLearningWarningDialog?.hide();
              handleMachineTranslate();
            }}
          >
            Proceed with machine translating
          </sl-button>
        </sl-dialog>
      </Show>
    </div>
  );
}

/** will probably be replaced with #164 */
// function PatternElement(props: { element: ast.Text | ast.Placeholder }) {
// 	/** Switch fallback error (non-exhaustive switch statement) */
// 	const Error = (props: { code: string }) => (
// 		<span class="text-danger">
// 			You encountered a bug. please file the bug and mention code {props.code}
// 		</span>
// 	);

// 	/** visually differentiate between text and placeholder elements */
// 	const Placeholder = (props: { children: JSXElement }) => (
// 		<code class="bg-tertiary-container rounded text-on-tertiary-container font-medium">
// 			{props.children}
// 		</code>
// 	);

// 	return (
// 		<Switch fallback={<Error code="2903ns"></Error>}>
// 			<Match when={props.element.type === "Text"}>
// 				<span>{(props.element as ast.Text).value}</span>
// 			</Match>
// 			<Match when={props.element.type === "Placeholder"}>
// 				<Switch fallback={<Error code="2203sfss"></Error>}>
// 					{(() => {
// 						// defining a variable to avoid type assertions and lengthier code
// 						const expression = (props.element as ast.Placeholder).expression;
// 						return (
// 							<>
// 								<Match when={expression.type === "Literal"}>
// 									<Placeholder>{(expression as ast.Literal).value}</Placeholder>
// 								</Match>
// 								<Match when={expression.type === "Function"}>
// 									<Placeholder>
// 										{(expression as ast.Function).id.name}
// 									</Placeholder>
// 								</Match>
// 								<Match when={expression.type === "Variable"}>
// 									<Placeholder>
// 										{(expression as ast.Variable).id.name}
// 									</Placeholder>
// 								</Match>
// 								<Match when={expression.type === "Placeholder"}>
// 									{/* recursively call pattern element */}
// 									<PatternElement element={props.element}></PatternElement>
// 								</Match>
// 							</>
// 						);
// 					})()}
// 				</Switch>
// 			</Match>
// 		</Switch>
// 	);
// }
