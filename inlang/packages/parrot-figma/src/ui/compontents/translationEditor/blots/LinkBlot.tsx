import Quill from "quill";

const Inline = Quill.import("blots/inline");

export default class LinkBlot extends Inline {
	static create(value: string) {
		const node = super.create();
		// Sanitize url value if desired
		node.setAttribute("href", value);
		return node;
	}

	static formats(node: any) {
		// We will only be called with a node already
		// determined to be a Link blot, so we do
		// not need to check ourselves
		return node.getAttribute("href");
	}
}
LinkBlot.blotName = "link";
LinkBlot.tagName = "a";
Quill.register(LinkBlot, true);
