/**
 * Follow the IETF BCP 47 language tag schema.
 *
 * @see https://www.ietf.org/rfc/bcp/bcp47.txt
 * @see https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
 */
// TODO improve typescript type to be a union of all valid language tags https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
export type LanguageTag = string

// TODO parseLanguageTag