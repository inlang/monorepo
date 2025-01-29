import BaseTextNodeLintRule from "./rules/BaseTextNodeLintRule";
import MixedStyleNotSupported from "./rules/MixedStyleNotSupported";
import UnmatchingFontWeightNotSupported from "./rules/FontStyleNotSupported";
import IndentationNotSupported from "./rules/IndentationNotSupported";
import TextDecorationUnknown from "./rules/TextDecorationUnknown";
import FontStyleNotSuppoorted from "./rules/FontStyleNotSupported";
import MixedStyleNotSupportedOpenTypeFace from "./rules/MixedStyleNotSupportedOpenTypeFace";

export default class TextNodeLinter {
	defaultRules = [
		new MixedStyleNotSupportedOpenTypeFace(),
		MixedStyleNotSupported.createRuleForField("textCase"),
		MixedStyleNotSupported.createRuleForField("fontSize"),
		MixedStyleNotSupported.createRuleForField("letterSpacing"),
		MixedStyleNotSupported.createRuleForField("lineHeight"),
		MixedStyleNotSupported.createRuleForField("leadingTrim"),
		MixedStyleNotSupported.createRuleForField("fills"),
		new UnmatchingFontWeightNotSupported(),
		new IndentationNotSupported(),
		new TextDecorationUnknown(),
		new FontStyleNotSuppoorted(),
	];

	registeredRules = {} as { [ruleName: string]: BaseTextNodeLintRule };

	constructor() {
		for (const defaultRule of this.defaultRules) {
			this.registerRule(defaultRule);
		}
	}

	registerRule(textNodeLintRule: BaseTextNodeLintRule) {
		this.registeredRules[textNodeLintRule.ruleName] = textNodeLintRule;
	}

	lint(textNode: TextNode) {
		const matchingRules = [];
		for (const rule of Object.values(this.registeredRules)) {
			const currentRuleMatches = rule.matches(textNode);
			if (currentRuleMatches) {
				matchingRules.push(rule.ruleName);
			}
		}
		return matchingRules;
	}

	fix(textNode: TextNode, ruleNames: string[]) {
		for (const ruleNameToFix of ruleNames) {
			this.registeredRules[ruleNameToFix].fix(textNode);
		}
	}
}

// TODO:

// fontFamily source for bold/italic/regular
// -> check if family does not differ
// - fix find fontfamily that is used the most and replace all others
// -> check if clear mapping to bold/italic is possible
// - fix remove non clear mapping segments (replace with regular for now - later use project configs mapping)
// fontWeight - ignore for - taken care of by bold? but check if it only differs on bold/italic?
