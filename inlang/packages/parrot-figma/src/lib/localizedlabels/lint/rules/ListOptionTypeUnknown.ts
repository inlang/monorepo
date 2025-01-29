import BaseTextNodeLintRule from "./BaseTextNodeLintRule";

export default class ListOptionTypeUnknown extends BaseTextNodeLintRule {
	constructor() {
		super("ListOptionTypeUnknown");
	}

	matches(textNode: TextNode) {
		if (textNode.characters.length === 0) {
			return false;
		}

		const indentations = textNode.getRangeListOptions(0, textNode.characters.length);
		if (indentations !== figma.mixed) {
			return false;
		}

		const styleSegments = textNode.getStyledTextSegments(["indentation", "listOptions"]);
		for (const styleSegment of styleSegments) {
			if (
				styleSegment.listOptions.type !== "NONE" &&
				styleSegment.listOptions.type !== "ORDERED" &&
				styleSegment.listOptions.type !== "UNORDERED"
			) {
				return true;
			}
		}
		return false;
	}

	fix(textNode: TextNode): void {
		const styleSegments = textNode.getStyledTextSegments(["indentation", "listOptions"]);
		for (const styleSegment of styleSegments) {
			// change unsupported listoptions type to none
			if (
				styleSegment.listOptions.type !== "NONE" &&
				styleSegment.listOptions.type !== "ORDERED" &&
				styleSegment.listOptions.type !== "UNORDERED"
			) {
				textNode.setRangeListOptions(styleSegment.start, styleSegment.end, {
					type: "NONE",
				});
			}
		}
	}
}
