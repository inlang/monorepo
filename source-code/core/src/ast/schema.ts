export type NodeName = "Identifier" | "Resource" | "Message" | "Pattern" | "Text" | "LanguageTag"

/**
 * A utility type to extend any node with a new property.
 * Does this recursively for all child nodes.
 *
 * @example attach a verified property to all nodes
 * ```
 * type VerifiedResource = Resource<{ verified: boolean }>
 * ```
 * @example attach a verified property only to the Message node
 * ```
 * type ResourceWithVerifiedMessages = Resource<{ Message: { verified: boolean } }>
 * ```
 */
type ExtensionInformation = {
	[node in NodeName | "Node"]?: Record<string, unknown>
}

/**
 * A single node of the AST.
 *
 * Every other definitions are based on Node.
 */
type Node<
	Name extends NodeName,
	Extension extends ExtensionInformation = ExtensionInformation,
> = Extension[Name] &
	Extension["Node"] & {
		type: Name
		/**
		 * Metadata is ignored by inlang.
		 *
		 * Use the metadata property to store additional
		 * information for a particular node like parsing
		 * and serialization information.
		 */
		metadata?: any
	}

/**
 * An identifier.
 *
 * Some Nodes have Identifiers such as a Resource or Message.
 */
export type Identifier<Extension extends ExtensionInformation = ExtensionInformation> = Node<
	"Identifier",
	Extension
> & {
	name: string
}

/**
 * A resource is a collection of messages.
 */
export type Resource<Extension extends ExtensionInformation = ExtensionInformation> = Node<
	"Resource",
	Extension
> & {
	languageTag: LanguageTag<Extension>
	body: Array<Message<Extension>>
}

/**
 * A message is what's rendered to a user.
 */
export type Message<Extension extends ExtensionInformation = ExtensionInformation> = Node<
	"Message",
	Extension
> & {
	id: Identifier<Extension>
	// comment?: MessageComment;
	pattern: Pattern<Extension>
}

/**
 * A pattern denotes how a Message is composed.
 */
export type Pattern<Extension extends ExtensionInformation = ExtensionInformation> = Node<
	"Pattern",
	Extension
> & {
	elements: Array<Text<Extension>>
}

/**
 * Text can be translated.
 */
export type Text<Extension extends ExtensionInformation = ExtensionInformation> = Node<
	"Text",
	Extension
> & {
	value: string
}

/**
 * A language tag that identifies a human language.
 *
 * The node is planned to obey to [IETF BCP 47 language tags](https://en.wikipedia.org/wiki/IETF_language_tag).
 * For now, only a name that acts as an ID can be set. See
 * https://github.com/inlang/inlang/issues/296
 */
export type LanguageTag<Extension extends ExtensionInformation = ExtensionInformation> = Node<
	"LanguageTag",
	Extension
> & {
	/**
	 * The ID of the language.
	 */
	name: string

	/**
	 *
	 * The language can be named freely. It's advisable to follow the IETF BCP 47 language tag scheme.
	 *
	 * @see https://www.ietf.org/rfc/bcp/bcp47.txt
	 * @see https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
	 */
	// language: string;
}

// export type MessageComment = Node<"MessageComment"> & {
// 	value: string;
// };

// export type Placeholder = Node<"Placeholder"> & {
// 	expression: Expression;
// };

// /**
//  * A subset of expressions which can be used as outside of Placeholders.
//  */
// export type InlineExpression = Literal | Function | Variable | Placeholder;
// export declare type Expression = InlineExpression | SelectExpression;

// export type Literal = Node<"Literal"> & {
// 	value: string;
// };

// export type Variable = Node<"Variable"> & {
// 	id: Identifier;
// };

// export type Function = Node<"Function"> & {
// 	id: Identifier;
// };

// export type SelectExpression = Node<"SelectExpression"> & {
// 	selector: InlineExpression;
// 	variants: Array<Variant>;
// };

// export type Variant = Node<"Variant"> & {
// 	id: Identifier;
// 	pattern: Pattern;
// 	default: boolean;
// };
