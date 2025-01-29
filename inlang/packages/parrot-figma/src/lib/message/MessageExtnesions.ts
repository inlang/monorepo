import { Message, Variant, getVariant } from "@inlang/sdk";
import { Locale } from "./variants/Locale";

import MessageStoreMemory from "./store/MessageStoreMemory";
import { MessageParameterValues } from "./MessageParameterValues";
import { Placeholder } from "./Placeholder";

export enum ParameterType {
	string = "s",
	float = "f",
	integer = "d",
}

/**
 * represents the data passed into a message formatter.
 *
 * Parameters do not have a representation in message format they are derived by the union of selectors and placeholders.
 */
export interface Parameter {
	name: string; // name of the placeholder - always preferred to have one but optional as some imports do not provide this
	named: boolean; // false if no name provided

	// default is string, derived by usage of the parameter - could be by a placeholders render function or by a selector mapper function
	// selectors: :gender -> string, :number -> number, :plural -> number
	// placeholder: :datetime -> date, :number -> number ....
	type: ParameterType;
	specifiedArgumentPosition: undefined | number; // if defined the position to provide the argument at when using printf for example
	derivedArgumentPosition: undefined | number; // the argument position derived by analyzing all message variants
}

export interface PlaceholdersByName {
	[placeholderName: string]: Placeholder;
}

// Fillin represents a rendered placeholder - a placeholder can exists multiple times in the same variant - each with different formattings. the same value could lead to different outputs
// based on the formatting function. We keep track of the formatted output by saving the renderered result as fillins in the labels
export interface FillinToPlaceholder {
	[fillin: string]: Placeholder;
}

export class MessageExtension {
	/**
	 *
	 * @param message the message to extract the parameters from
	 * @param refLanguage the ref language (we use this is the starting point to derive the parameter position)
	 * @param currentLanguage the languague we want to skip in favour of variantHtml
	 * @param currentParameterValues the parameters used to get the variant, variantHtml overrides
	 * @param variantHtml the variant to use instead of the one found in the message
	 */
	static getParameter(
		message: Message,
		/* TODO #20 add ref language to analize message including index - order is important refLanguage: Locale, */ overrideVariant?: {
			locale: Locale;
			parameterValues: MessageParameterValues;
			variantHtml: string;
		},
	) {
		const parameterToPlaceholders = {} as {
			[plarameterName: string]: Placeholder[];
		};

		let overwrittenVariant: Variant | undefined;
		if (overrideVariant) {
			// function  was called with overrideVariant (labels text differs from linked message)
			overwrittenVariant = getVariant(message, {
				where: {
					languageTag: overrideVariant.locale,
					match: [], // TODO #18 TODO use matching based on variantParameterValues
				},
			});

			if (overrideVariant) {
				overwrittenVariant!.pattern = MessageStoreMemory.patternHtmlToPattern(
					overrideVariant.variantHtml,
				);
			}
		}

		// build union
		for (let variant of message.variants) {
			// a variant to be overwritten was found - check if the  current variant is the one
			if (
				overwrittenVariant !== undefined &&
				variant.languageTag === overwrittenVariant?.languageTag &&
				JSON.stringify(variant.match) === JSON.stringify(overwrittenVariant)
			) {
				variant = overwrittenVariant;
			}

			for (const patternPart of variant.pattern) {
				if (patternPart.type === "VariableReference") {
					if (!parameterToPlaceholders[patternPart.name]) {
						parameterToPlaceholders[patternPart.name] = [];
					}
					parameterToPlaceholders[patternPart.name].push({
						name: patternPart.name,
						// TODO #20 index based parameter (might lead to named false and specification of the argument postion )
						named: true,
						specifiedArgumentPosition: undefined,

						// TODO #19 until we support other parameter types than string no format function or options are required
						// formatFunctionName
						// options
					});
				}
			}
		}

		const parameters = [] as Parameter[];

		for (const parameterName of Object.keys(parameterToPlaceholders)) {
			// TODO #19 check format function of each placeholder in the parameter map
			parameters.push({
				name: parameterName,
				named: true,
				type: ParameterType.string,
				specifiedArgumentPosition: undefined,
				derivedArgumentPosition: undefined,
			});
		}

		return parameters;
	}
	/**
	 * Placeholder index:
	 * The placeholder format should always have a type. The position index as well as the name is optional.
	 *
	 * The output will *always* create a positioned index. The logic for the indexing is the following:
	 *
	 * ## The base language takes care of the indexing. Current Index + 1 on the first apearance of a named key:
	 *  "[%s:separator] [%s:name] [%s:separator] [%s:firstname]" -> 1:name 2:separator 3:firstname
	 *
	 * ## If a placehodlder is introduced in a plural we add the index in the order OTHER -> ZERO -> MANY if an argument position is provided it will be taken
	 *
	 * Example:
	 * - OTHER: "You have [[number_of_kids:d]] Kids "
	 * - ZERO:  "You plan to give your first child the name [[first_child_name]]"
	 * - ONE:   "You have [[number_of_kids:d]] Kid her name is [[first_child_name]] your next kid will be named [[1:second_child_name]]"
	 *
	 * This will start with Other, and find "number_of_kids",  followed by Zero which introduces "first_child_name".
	 * -> If ony those two forms would have been introduced the order would be 1:number_of_kids, 2:first_child_name
	 * Since the plural one introduces second_child with a fixed position 1 the resulting params will be like:
	 * 1:second_child_name 2:number_of_kids, 3:first_child_name
	 *
	 * The placeholders argument number abrivation continues with the languages:
	 *
	 * If a placehodlder is introduced in a language other than the base language we add the index by language alphabetically
	 * Example:
	 * - EN: "[[firstname]] "
	 * - DE: "[[title]] [[firstname]] [[lastname]]"
	 * - SE: "[[form_of_address]] [[lastname]] [[firstname]]"
	 * -> In this example EN is the base language so we use its translation first and we give firstname index number 1:
	 *   -> 1:firstname
	 * -> The next language, now after the alphabet, is german. this results in index 2 for title and index 3 for lastname
	 *   -> 1:firstname 2:title 3:lastname
	 * -> With the last language, Swedish, another parameter "form_of_address" is introduced. Its index is according to 4
	 *   -> 1:firstname 2:title 3:lastname 4:form_of_address
	 *
	 * Conflicting argument positions:
	 * A conflicting argument postions will be ignored for index building - first index wins. A warning should be shown to the user.
	 * Example:
	 *
	 * - a conflict
	 *
	 * If a placehodlder is introduced in a language other than the base language we add the index by language alphabetically
	 * - EN: "[%s:firstname] "
	 * - DE: "[%s:title] [%s:firstname] [%s:lastname]"
	 * - SE: "[%s:form_of_address] [%s:lastname] [%s:firstname]"
	 * -> In this example EN is the base language so we use its translation first and we give firstname index number 1:
	 *   -> 1:firstname
	 * -> The next language, now after the alphabet, is german. this results in index 2 for title and index 3 for lastname
	 *   -> 1:firstname 2:title 3:lastname
	 * -> With the last language, Swedish, another parameter "form_of_address" is introduced. Its index is according to 4
	 *   -> 1:firstname 2:title 3:lastname 4:form_of_address
	 *
	 * This rule also applies for plurals. The Order here is baselang, Other, One ... alphatbetic string
	 *
	 * Parameters may only containe alphabetic charactes and underscores.
	 *
	 * Open question: do we need a list of parameters per translation?
	 * - How do we know that a text misses a parameter?
	 *    - we check if all parameters defined in the base language are provided?
	 *    - do we check more languages than the base language?
	 * - how shall we flag false positives - parameters that are not needed in a specific language?
	 *
	 */
	/* TODO #19 variables check if this function can become handy in inlang scope
  static extractParameters(messages: Variants, baseLanguage: Locale, includeGenderForms: boolean, includePluralForms: boolean) : PlaceholdersByName {
    // a placeholder can be processed in two ways:
    // 1. with a argument postion [[1:...]]
    // - the first placeholder with a specific argument postion wins
    // - later ones are ignored
    // 2. with no fixed position [[name/noName]]
    // - if no fixed position is found the order of its apearance will be considered
    // if a parameter was processed without an argument postion but a later apearance provides
    // this information it should no longer influence other placehpolders apearance index.
    const processedPlaceholders = {
    } as {
      [placeholderName: string] : boolean // true: with fixed position, false: without fixed position
    };
    const placeholdersWithoutArgumentPosition = [] as Placeholder[];
    const placeholdersWithArgumentPosition = [] as Placeholder[];
    const placeholders = {} as {
      [placeholderName: string] : Placeholder
    };

    // base lang has priority
    if (messages[baseLanguage]) {
      // console.log('extracting baselanguage');
      MessageUI.extractPlaceholdersInLanguage(messages, baseLanguage, includeGenderForms, includePluralForms, processedPlaceholders, placeholdersWithArgumentPosition, placeholdersWithoutArgumentPosition);
    }

    for (const [language] of Object.entries(messages)) {
      if (language !== baseLanguage) {
        // console.log(`extracting language${baseLang}`);
        MessageUI.extractPlaceholdersInLanguage(messages, language as Locale, includeGenderForms, includePluralForms, processedPlaceholders, placeholdersWithArgumentPosition, placeholdersWithoutArgumentPosition);
      }
    }

    // Okay we have two arrays now. one with fixed positions and one that should fill up the empty spaces - so lets try to fill it up
    for (let currentPosition = 1; currentPosition < placeholdersWithArgumentPosition.length; currentPosition++) {
      if (placeholdersWithArgumentPosition[currentPosition] === undefined) {
        const nextFillInPlaceholder = placeholdersWithoutArgumentPosition.shift();
        if (nextFillInPlaceholder) {
          placeholdersWithArgumentPosition[currentPosition] = nextFillInPlaceholder;
          nextFillInPlaceholder.derivedArgumentPosition = currentPosition;
          placeholders[placeholdersWithArgumentPosition[currentPosition].name] = placeholdersWithArgumentPosition[currentPosition];
        } else {
          // ok lets remove this element from the array
          placeholdersWithArgumentPosition.splice(currentPosition, 1);
          // we got to step back one step to hit the next element correctly
          currentPosition--;
        }
      } else {
        // ok slot is already taken - set derived argument Position  for the placeholder
        placeholdersWithArgumentPosition[currentPosition].derivedArgumentPosition = currentPosition;
        placeholders[placeholdersWithArgumentPosition[currentPosition].name] = placeholdersWithArgumentPosition[currentPosition];
      }
    }

    // add the left over fillings
    let nextFillinPlaceholder;
    // eslint-disable-next-line no-cond-assign
    while (nextFillinPlaceholder = placeholdersWithoutArgumentPosition.shift()) {
      nextFillinPlaceholder.derivedArgumentPosition = placeholdersWithArgumentPosition.length;
      placeholdersWithArgumentPosition.push(nextFillinPlaceholder);
      placeholders[nextFillinPlaceholder.name] = nextFillinPlaceholder;
    }

    return placeholders;
  }
  */
}
