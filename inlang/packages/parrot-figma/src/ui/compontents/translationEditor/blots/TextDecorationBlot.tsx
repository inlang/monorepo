import Quill from "quill";

const Inline = Quill.import("blots/inline");

export default class TextDecorationBlot extends Inline {
	static create(value: any) {
		if (value === "UNDERLINE") {
			return document.createElement("u");
		}
		if (value === "STRIKETHROUGH") {
			return document.createElement("s");
		}
		return super.create(value);
	}

	static formats(domNode: any) {
		if (domNode.tagName === "U") return "UNDERLINE";
		if (domNode.tagName === "S") return "STRIKETHROUGH";
		return undefined;
	}
}
TextDecorationBlot.blotName = "textDecoration";
TextDecorationBlot.tagName = ["S", "U"];
