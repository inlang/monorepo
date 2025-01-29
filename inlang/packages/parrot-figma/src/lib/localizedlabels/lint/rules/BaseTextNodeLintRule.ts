export default abstract class BaseTextNodeLintRule {
	ruleName: string;

	constructor(ruleName: string) {
		this.ruleName = ruleName;
	}

	/**
	 *
	 * @param textNode the textnode to check if the lintRule matches against
	 * @returns if the lintrule matches
	 */
	abstract matches(textNode: TextNode): boolean;

	abstract fix(textNode: TextNode): void;

	static fieldsToSetSegmentMethodName = {} as any;

	static fixWithMostProminent(textNode: TextNode, field: string) {
		const currentStyleSegments = textNode.getStyledTextSegments([field as any]);
		const stylesPresent = {} as any;
		for (const stlyeSegment of currentStyleSegments) {
			const serializedStyle = JSON.stringify(stlyeSegment[field]);
			if (!stylesPresent[serializedStyle]) {
				stylesPresent[serializedStyle] = 0;
			}
			stylesPresent[serializedStyle] += stlyeSegment.end - stlyeSegment.start;
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
			(textNode as any)[field] = JSON.parse(mostPresentStyleSerialized!);
		} catch (e) {
			throw new Error(
				`${field} inline styles can't get fixed automatically at the Moment. please remvoe those styles manually from the TextNode to use within Parrot.`,
			);
		}
	}
}
