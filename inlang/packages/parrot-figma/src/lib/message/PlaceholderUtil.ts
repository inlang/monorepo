import { Placeholder } from "./Placeholder";

export default class PlaceholderHelper {
	static extractPlaceholdersFromPatterHTML(
		text: string,
	): { start: number; length: number; placeholder: Placeholder }[] {
		// <ph type="s" format=".3" arg="" unnamed >unnamed_arg</ph>
		const pattern = /<ph([^>])*>([^<]*)<\/ph>/g;

		const patternGroups = {
			attributes: 1,
			name: 2,
		};
		// type -> 2
		// format -> 4
		// arg -> 6
		// unnamed -> 7
		// name -> -> 10
		// name, argumentPosition, unnamed, decimalplaces
		//

		const placeholderMatches = [] as { start: number; length: number; placeholder: Placeholder }[];

		let match;

		while ((match = pattern.exec(text)) !== null) {
			const placeholder = this.extractFromRawHtml(
				match[patternGroups.name],
				match[patternGroups.attributes],
			);

			placeholderMatches.push({
				start: match.index,
				length: match[0].length,
				placeholder,
			});
		}

		return placeholderMatches;
	}

	/// accespts an attributes string
	static extractFromRawHtml(name: string, attributeString: string | undefined) {
		const attributeRegex = /(\w+)(?:="([^"]*)")?|(\w+)(?=\s|$)/g;
		const attributes = {} as any;
		const optionsPrefix = "options-";
		let options: any | undefined;

		let match;

		while (
			attributeString !== undefined &&
			(match = attributeRegex.exec(attributeString)) !== null
		) {
			const [, attrWithVal, value, attrWithoutVal] = match;
			const attributeName = attrWithVal || attrWithoutVal;

			if (value !== undefined && attributeName.startsWith(optionsPrefix)) {
				if (options === undefined) {
					options = {};
				}
				options[attributeName.substring(optionsPrefix.length)] = value!;
			} else {
				// If the attribute has a value, use it; otherwise, set it to true
				attributes[attributeName] = value !== undefined ? value : true;
			}
		}

		const foundPlaceholder = {
			name,
			named: attributes.unnamed === undefined || !attributes.unnamed,
			specifiedArgumentPosition:
				attributes.arg !== undefined ? parseInt(attributes.arg, 10) : undefined,
			formatFunctionName: attributes.formatFn,
			options,
		} as Placeholder;

		// TODO #19 variables - extract all atributes from the attributes like options
		return foundPlaceholder;
	}
}
