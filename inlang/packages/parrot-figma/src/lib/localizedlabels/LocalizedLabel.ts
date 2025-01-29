import { Message } from "@inlang/sdk";
import { FillinToPlaceholder } from "../message/MessageExtnesions";
import { Locale } from "../message/variants/Locale";
import { DeltaOp } from "./LocalizedLabelManager";

export enum MessageLinkState {
	Unset = "unset", // label has not yet modified by the plugin
	Unlinked = "unlinked",
	Linked = "linked", // key was set to a fixed key
	MissingMessage = "missingMessage", // key was set to a fixed key
	Unmanaged = "unmanaged",
}

export interface LabelStyle {
	fontFamily: string | undefined | null;
	bold: boolean | "MIXED" | undefined | null;
	italic: boolean | "MIXED" | undefined | null;
	textDecoration: TextDecoration | "MIXED" | undefined | null;
}

export interface LocalizedLabel {
	pageId: string;
	pageName: string;

	rootFrameId: string;
	rootFrameName: string;

	nodeId: string;
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;

	rootFrameLanguage: Locale;

	language: Locale;
	unmanaged: boolean;
	messageId?: string;
	characters: string;
	ops: DeltaOp[];
	matchingLabelLints: string[];
	labelStyle: LabelStyle;

	// fillins needed to suppoert bidirectional template filling and extraction
	// 1. if we look at the label Text "Hello Martin, how are you today?" we want to be able to get the key string inclusive placeholders like:
	//    "Hello [[firstname]], how are you today?"
	// 2. if we want to update the text of a lable with a new key string "Hi [[firstname]], how are you today?" we want to use the last fill in value
	//    in this case Martin for firstname ->  "Hi Martin, how are you today?"
	// We enrich the fillins with the invisible character: Zero Width Space (U+200B) to uniquly match the replace texts.
	// For example you have a Welcome Message "Hi [[first_name]] this app has been brought to you by Martin".
	// With the fillin "Martin" for firstname The filled version would look like:
	// "Hi Martin this app has been brought to you by Martin" The fillin text Martin collides with an appearance of Martin at the end of the string.
	// using this approach to replace the fillins with placeholders again would lead to "Hi [[first_name]] this app has been brought to you by [[first_name]]".
	// Instead of using Martin as replacement of the placeholder  we use "MartinX" where X is the invisible character "Zero Width Space". This character is not visible in figma
	// and we can use it to mark the placeholder. This allows us to seacht for "MartinX" in the filled string
	// Now the placeholder version of  "Hi MartinX this app has been brought to you by Martin" is:
	// "Hi [[firstname]] this app has been brought to you by Martin"
	//
	// The same problem appears if two different placeholder have the same value:
	// "You are [[age:i]] years old and you are born in the [[month_of_birth:i]] th of the year"
	// If we use 8 as fillin for age:i and 8 month_of_birth:i the filled text will look like:
	// "You are 8 years old and you are born in the 8 th of the year"
	// converting this back to the placeholder string would hide the month_of_birth since we would start
	// with replacing all appearances of 8 with [[age:i]] resulting in:
	//  "You are [[age:i]] years old and you are born in the [[age:i]] th of the year"
	// To tackle this problem we again use the hidden character Zero Width Space (U+200B) but instead of one we add multiple of them at the end.
	// for each placeholder we replace we increase it by one hidden character: The filled text would look like:
	// "You are 8X years old and you are born in the 8XX th of the year" where X is the represents the vinvisible character again here.
	// If we now replace the fillins strting from the longest first we are prety much save ;-)

	// source of fillins:
	// for each type the plugin provides a default value:
	// string: 'lorem ipsum'
	// decimal: 7
	// float: 3,14...
	// these typeDefault values get set as 'parameterDefault' per key and can be overriden if needed.
	// the parameterDefault can be overriden by each instance of a label
	//
	// When labels need to be updated:
	//  The labels version is not fixed
	//  The label needs to be updated when the parameterDefault has changed and the fillins is not overriden in the label
	//  The available parameters of a key have changed (one is removed)? shall we cleanup?

	parameterValues: ParameterValues;
	fillinsToPlaceholder: FillinToPlaceholder;
	variantPatternHTMLHash?: string;

	derivedKey?: string;

	unlinkedMessage: Message;
}
