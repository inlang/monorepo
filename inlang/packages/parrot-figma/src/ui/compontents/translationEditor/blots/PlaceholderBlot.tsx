import Quill from "quill";
import { ParameterType } from "../../../../lib/message/MessageExtnesions";
import { Placeholder } from "../../../../lib/message/Placeholder";

const Inline = Quill.import("blots/inline");

export default class PlaceholderBlot extends Inline {
	static create(value: Placeholder) {
		const node = super.create() as HTMLElement;
		if (value.formatFunctionName) {
			node.setAttribute("formatFn", value.formatFunctionName);
		}

		if (value.specifiedArgumentPosition) {
			node.setAttribute("arg", `${value.specifiedArgumentPosition}`);
		}

		if (value.named === false) {
			node.setAttribute("unnamed", "");
		}

		// TODO #19 variables add formatOptions as namespaced attributes

		node.setAttribute("contenteditable", "false");
		return node;
	}

	static value(node: HTMLElement): Placeholder {
		return {
			name: node.innerText!,
			named: node.getAttribute("unnamed") === null,
			formatFunctionName: node.getAttribute("format") ?? undefined,
			specifiedArgumentPosition: node.getAttribute("arg")
				? parseInt(node.getAttribute("arg")!, 10)
				: undefined,
			// TODO #19 variables handle options as attributes with option- prefix
		};
	}

	static formats(domNode: HTMLElement): Placeholder {
		return {
			name: domNode.innerText!,
			named: domNode.getAttribute("unnamed") === null,
			specifiedArgumentPosition: domNode.getAttribute("arg")
				? parseInt(domNode.getAttribute("arg")!, 10)
				: undefined,
			formatFunctionName: domNode.getAttribute("formatFn") ?? undefined,
			// TODO #19 variables handle options as attributes with option- prefix
		};
	}
}
PlaceholderBlot.blotName = "placeholder";
PlaceholderBlot.tagName = "ph";
