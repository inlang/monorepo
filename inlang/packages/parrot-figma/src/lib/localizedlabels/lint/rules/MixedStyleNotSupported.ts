import BaseTextNodeLintRule from "./BaseTextNodeLintRule";

export default class MixedStyleNotSupported extends BaseTextNodeLintRule {
	styleField: string;

	constructor(ruleName: string, styleField: string) {
		super(ruleName);
		this.styleField = styleField;
	}

	static createRuleForField(styleField: string) {
		const ruleName = `MixedStyleNotSupportedFor${styleField
			.charAt(0)
			.toUpperCase()}${styleField.slice(1)}`;
		return new MixedStyleNotSupported(ruleName, styleField);
	}

	matches(textNode: TextNode) {
		return (textNode as any)[this.styleField] === figma.mixed;
	}

	fix(textNode: TextNode): void {
		BaseTextNodeLintRule.fixWithMostProminent(textNode, this.styleField);
	}
}
