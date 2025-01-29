import BaseTextNodeLintRule from "./BaseTextNodeLintRule";

export default class TextDecorationUnknown extends BaseTextNodeLintRule {
	constructor() {
		super("TextDecorationUnknown");
	}

	matches(textNode: TextNode) {
		if (textNode.characters.length === 0) {
			return false;
		}

		if (textNode.textDecoration !== figma.mixed) {
			return false;
		}

		const styleSegments = textNode.getStyledTextSegments(["textDecoration"]);
		for (const styleSegment of styleSegments) {
			if (
				styleSegment.textDecoration !== "NONE" &&
				styleSegment.textDecoration !== "STRIKETHROUGH" &&
				styleSegment.textDecoration !== "UNDERLINE"
			) {
				return true;
			}
		}
		return false;
	}

	fix(textNode: TextNode): void {
		const styleSegments = textNode.getStyledTextSegments(["textDecoration"]);
		for (const styleSegment of styleSegments) {
			// change unsupported listoptions type to none
			if (
				styleSegment.textDecoration !== "NONE" &&
				styleSegment.textDecoration !== "STRIKETHROUGH" &&
				styleSegment.textDecoration !== "UNDERLINE"
			) {
				textNode.setRangeTextDecoration(styleSegment.start, styleSegment.end, "NONE");
			}
		}
	}
}
