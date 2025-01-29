import BaseTextNodeLintRule from "./BaseTextNodeLintRule";

export default class MixedStyleNotSupportedOpenTypeFace extends BaseTextNodeLintRule {
	styleField: string;

	constructor() {
		super("MixedStyleNotSupportedOpenTypeFace");
		this.styleField = "openTypeFeatures";
	}

	matches(textNode: TextNode) {
		if (textNode.getStyledTextSegments(["openTypeFeatures"]).length > 1) {
			return true;
		}
		return false;
	}

	fix(textNode: TextNode): void {
		BaseTextNodeLintRule.fixWithMostProminent(textNode, this.styleField);
	}
}
