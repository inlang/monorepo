import BaseTextNodeLintRule from "./BaseTextNodeLintRule";

export default class IndentationNotSupported extends BaseTextNodeLintRule {
	constructor() {
		super("IndentationNotSupported");
	}

	matches(textNode: TextNode) {
		if (textNode.characters.length === 0) {
			return false;
		}
		const indentations = textNode.getRangeIndentation(0, textNode.characters.length);
		if (indentations !== figma.mixed) {
			return false;
		}

		const styleSegments = textNode.getStyledTextSegments(["indentation", "listOptions"]);
		for (const styleSegment of styleSegments) {
			if (styleSegment.indentation !== 0 && styleSegment.listOptions.type === "NONE") {
				return true;
			}
			if (styleSegment.indentation > 1) {
				return true;
			}
		}
		return false;
	}

	fix(textNode: TextNode): void {
		const styleSegments = textNode.getStyledTextSegments(["indentation", "listOptions"]);
		for (const styleSegment of styleSegments) {
			// -> check if !=0 is only present within lists
			if (styleSegment.indentation !== 0 && styleSegment.listOptions.type === "NONE") {
				textNode.setRangeIndentation(styleSegment.start, styleSegment.end, 0);
			}
			// -> check if only 0 and 1 are present
			if (styleSegment.indentation > 1) {
				textNode.setRangeIndentation(styleSegment.start, styleSegment.end, 1);
			}
		}
	}
}
