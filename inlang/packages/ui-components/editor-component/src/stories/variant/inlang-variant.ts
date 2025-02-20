import { type Variant } from "@inlang/sdk";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { baseStyling } from "../../styling/base.js";

//helpers
import overridePrimitiveColors from "../../helper/overridePrimitiveColors.js";
import { createChangeEvent } from "../../helper/event.js";

//components
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";

if (!customElements.get("sl-input")) customElements.define("sl-input", SlInput);
if (!customElements.get("sl-tooltip"))
  customElements.define("sl-tooltip", SlTooltip);
if (!customElements.get("sl-button"))
  customElements.define("sl-button", SlButton);

@customElement("inlang-variant")
export default class InlangVariant extends LitElement {
  static override styles = [
    baseStyling,
    css`
      div {
        box-sizing: border-box;
        font-size: 14px;
      }
      :host {
        border-top: 1px solid var(--sl-input-border-color) !important;
      }
      :host(:first-child) {
        border-top: none !important;
      }
      .variant {
        position: relative;
        min-height: 44px;
        width: 100%;
        display: flex;
        align-items: stretch;
      }
      .match {
        min-height: 44px;
        width: 120px;
        background-color: var(--sl-input-background-color);
        border-right: 1px solid var(--sl-input-border-color);
        position: relative;
        z-index: 0;
      }
      .match:focus-within {
        z-index: 3;
      }
      .match::part(base) {
        border: none;
        border-radius: 0;
        min-height: 44px;
        color: var(--sl-input-color);
      }
      .match::part(input) {
        min-height: 44px;
        background-color: var(--sl-input-background-color);
      }
      .match::part(input):hover {
        background-color: var(--sl-input-background-color-hover);
      }
      .variant {
        position: relative;
        z-index: 0;
      }
      .variant:focus-within {
        z-index: 3;
      }
      .actions {
        position: absolute;
        top: 0;
        right: 0;
        height: 44px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding-right: 12px;
        z-index: 1;
      }
      .add-selector::part(base) {
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      sl-button::part(base) {
        color: var(--sl-input-color);
        background-color: var(--sl-input-background-color);
        border: 1px solid var(--sl-input-border-color);
      }
      sl-button::part(base):hover {
        color: var(--sl-input-color-hover);
        background-color: var(--sl-input-background-color-hover);
        border: 1px solid var(--sl-input-border-color-hover);
      }
      .history-button {
        position: relative;
        z-index: 0;
      }
    `,
  ];

  @property()
  variant: Variant;

  private _updateMatch = (selectorName: string, value: string) => {
    //TODO improve this function
    if (this.variant) {
      const newVariant = structuredClone(this.variant);

      // filter the match if it already exists
      const matches = newVariant.matches.filter((m) => m.key !== selectorName);

      // update the match with value (mutates variant)
      if (value === "*") {
        matches.push({
          type: "catchall-match",
          key: selectorName,
        });
      } else {
        matches.push({
          type: "literal-match",
          key: selectorName,
          value,
        });
      }

      this.dispatchEvent(
        createChangeEvent({
          entityId: this.variant.id,
          entity: "variant",
          newData: {
            ...newVariant,
            matches,
          },
        })
      );
    }
  };

  //hooks
  override async firstUpdated() {
    await this.updateComplete;

    //get all sl-inputs and set the color to the inlang colors
    overridePrimitiveColors();
  }

  override render() {
    return this.variant
      ? html`<div class="variant">
          ${this.variant
            ? this.variant.matches.map((match) => {
                return html`
                  <sl-input
                    exportparts="input:match"
                    id="${this.variant.id}-${match.key}"
                    class="match"
                    size="small"
                    value=${match.type === "literal-match" ? match.value : "*"}
                    @sl-blur=${(e: Event) => {
											const element = this.shadowRoot?.getElementById(
												`${this.variant.id}-${match.key}`
											);
                      if (element && e.target === element) {
                        this._updateMatch(
                          match.key,
                          (e.target as HTMLInputElement).value
                        );
                      }
                    }}
                  ></sl-input>
                `;
              })
            : undefined}

          <slot name="pattern-editor" class="pattern-editor"></slot>
          <div class="actions">
            <slot name="variant-action"></slot>
          </div>
        </div>`
      : undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "inlang-variant": InlangVariant;
  }
}
