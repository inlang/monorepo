import FontUtil from "../../FontUtil";
import BaseTextNodeLintRule from "./BaseTextNodeLintRule";

export default class FontStyleNotSuppoorted extends BaseTextNodeLintRule {
	fontNameStyleField = "fontName" as const;

	constructor() {
		super("FontStyleNotSupported");
	}

	matches(textNode: TextNode) {
		if (textNode.characters.length === 0) {
			return false;
		}

		// no inline styling on the text node
		if (textNode.fontName !== figma.mixed) {
			return false;
		}

		const fontNameStyleSegments = textNode.getStyledTextSegments(
			[this.fontNameStyleField],
			0,
			textNode.characters.length,
		);

		for (const fontNameStyleSegment of fontNameStyleSegments) {
			const font = FontUtil.getStylingSupport(fontNameStyleSegment.fontName);
			if (
				fontNameStyleSegment.fontName.style !== font.bold?.style &&
				fontNameStyleSegment.fontName.style !== font.italic?.style &&
				fontNameStyleSegment.fontName.style !== font.boldItalic?.style &&
				fontNameStyleSegment.fontName.style !== font.regular?.style
			) {
				return true;
			}
		}
		return false;
	}

	fix(textNode: TextNode): void {
		const currentStyleSegments = textNode.getStyledTextSegments([this.fontNameStyleField]);
		const stylesPresent = {} as any;
		let fontFamily = "";
		for (const fontNameStyleSegment of currentStyleSegments) {
			const font = FontUtil.getStylingSupport(fontNameStyleSegment.fontName);
			fontFamily = fontNameStyleSegment.fontName.family;

			if (
				fontNameStyleSegment.fontName.style === font.bold?.style ||
				fontNameStyleSegment.fontName.style === font.italic?.style ||
				fontNameStyleSegment.fontName.style === font.boldItalic?.style ||
				fontNameStyleSegment.fontName.style === font.regular?.style
			) {
				const serializedStyle = JSON.stringify(fontNameStyleSegment[this.fontNameStyleField]);
				if (!stylesPresent[serializedStyle]) {
					stylesPresent[serializedStyle] = 0;
				}
				stylesPresent[serializedStyle] += fontNameStyleSegment.end - fontNameStyleSegment.start;
			}
		}

		let mostPresentStyleSerialized: undefined | string;
		let mostPresentStylePresens = 0 as number;

		for (const [styleSerialized, presens] of Object.entries(stylesPresent)) {
			if (mostPresentStylePresens < (presens as number)) {
				mostPresentStylePresens = presens as number;
				mostPresentStyleSerialized = styleSerialized;
			}
		}

		try {
			(textNode as any)[this.fontNameStyleField] = JSON.parse(mostPresentStyleSerialized!);
		} catch (e) {
			throw new Error(
				`${this.fontNameStyleField} inline styles can't get fixed automatically for font family ${fontFamily}. please remvoe those styles manually from the TextNode to use within Parrot.`,
			);
		}
	}
}
