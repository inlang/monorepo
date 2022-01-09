import { AdapterInterface } from '@inlang/adapters';
import { LanguageCode } from '@inlang/common';
import { SerializedResource } from './types/serializedResource';
import { remove, trim } from 'lodash';
import { Result } from '@inlang/common';
import { isValidMessageId } from './utils/isValidMessageId';
import { Message, parse, Resource } from '@fluent/syntax';

/**
 * Holds all resources as object accesible via a `languageCode`.
 *
 *
 * Example:
 *
 *      const x: RecordOfResources = {
 *          en: Resource,
 *          de: Resource
 *      }
 *
 */
type RecordOfResources = Record<string, Resource | undefined>;

/**
 * Allows to parse files (as resources), act on those resources and serialize back to files.
 *
 * All messages, terms etc. are saved as files (resources) either in the local source code,
 * or the inlang database. In order to act on those files, they need to be parsed.
 * The parsed format is `Resource`. This class acts as wrapper around multiple `Resource`s
 * to act on all those resources at once.
 */
export class Resources {
    resources: RecordOfResources;
    baseLanguageCode: LanguageCode;

    private constructor(args: { baseLanguageCode: LanguageCode; resources: RecordOfResources }) {
        this.resources = args.resources;
        this.baseLanguageCode = args.baseLanguageCode;
    }

    static parse(args: {
        adapter: AdapterInterface;
        files: SerializedResource[];
        baseLanguageCode: LanguageCode;
    }): Result<Resources, Error> {
        const resources: RecordOfResources = {};
        for (const file of args.files) {
            const parsed = args.adapter.parse(file.data);
            if (parsed.isErr) {
                return Result.err(parsed.error);
            }
            for (const entry of parsed.value.body) {
                if (entry.type === 'Junk') {
                    return Result.err(Error('Parsing error: Junk'));
                }
            }
            resources[file.languageCode] = parsed.value;
        }
        return Result.ok(new Resources({ resources, baseLanguageCode: args.baseLanguageCode }));
    }

    /**
     * The language codes contained in the resources.
     *
     * Example:
     * The resources contain "en", "de" and "fr".
     */
    containedLanguageCodes(): LanguageCode[] {
        return Object.entries(this.resources).map(([languageCode]) => languageCode as LanguageCode);
    }

    doesMessageExist(args: { id: Message['id']['name']; languageCode: LanguageCode }): boolean {
        for (const entry of this.resources[args.languageCode]?.body ?? []) {
            if (entry.type === 'Message' && entry.id.name === args.id) {
                return true;
            }
        }
        return false;
    }

    getMessage(args: { id: Message['id']['name']; languageCode: LanguageCode }): Message | undefined {
        for (const entry of this.resources[args.languageCode]?.body ?? []) {
            if (entry.type === 'Message' && entry.id.name === args.id) {
                return entry;
            }
        }
    }

    /**
     * Retrieves all messages with the given id of all resources.
     *
     * @returns A record holding the messages accessible via the languageCode.
     *
     * @example
     *      {
     *          "en": "Hello World",
     *          "de": "Hallo Welt"
     *      }
     */
    getMessageForAllResources(args: { id: Message['id']['name'] }): Record<string, Message | undefined> {
        const result: ReturnType<typeof this.getMessageForAllResources> = {};
        for (const [languageCode] of Object.entries(this.resources)) {
            const message = this.getMessage({ id: args.id, languageCode: languageCode as LanguageCode });
            result[languageCode] = message;
        }
        return result;
    }

    createMessage(args: { id: Message['id']['name']; value: string; languageCode: LanguageCode }): Result<void, Error> {
        if (this.doesMessageExist({ id: args.id, languageCode: args.languageCode })) {
            return Result.err(
                Error(`Message id ${args.id} already exists for the language code ${args.languageCode}.`)
            );
        } else if (isValidMessageId(args.id) === false) {
            return Result.err(Error(`Message id ${args.id} is not a valid id.`));
        } else if (this.resources[args.languageCode] === undefined) {
            return Result.err(Error(`No resource for the language code ${args.languageCode} exits.`));
        } else if (trim(args.value) === '') {
            return Result.err(Error(`The value is an empty string.`));
        }
        const parsed = parse(`${args.id} = ${args.value}`, {}).body[0];
        if (parsed.type === 'Junk') {
            return Result.err(Error('Parsing error: Junk'));
        }
        this.resources[args.languageCode]?.body.push(parsed);
        return Result.ok(undefined);
    }

    deleteMessage(args: { id: Message['id']['name']; languageCode: LanguageCode }): Result<void, Error> {
        const removed = remove(
            this.resources[args.languageCode]?.body ?? [],
            (resource) => (resource.type === 'Message' || resource.type === 'Term') && resource.id.name === args.id
        );
        if (removed.length === 0) {
            return Result.err(Error(`Message with id ${args.id} does not exist in resource ${args.languageCode}`));
        }
        return Result.ok(undefined);
    }

    deleteMessageForAllResources(args: { id: Message['id']['name'] }): Result<void, Error> {
        for (const [languageCode] of Object.entries(this.resources)) {
            this.deleteMessage({ id: args.id, languageCode: languageCode as LanguageCode });
        }
        return Result.ok(undefined);
    }

    getMessageIds(args: { languageCode: LanguageCode }): Set<Message['id']['name']> {
        const result: Set<string> = new Set();
        for (const entry of this.resources[args.languageCode]?.body ?? []) {
            if (entry.type === 'Message') {
                result.add(entry.id.name);
            }
        }
        return result;
    }

    getMessageIdsForAllResources(): Set<Message['id']['name']> {
        let result: Set<string> = new Set();
        for (const languageCode of this.containedLanguageCodes()) {
            // concating both sets
            result = new Set([...result, ...this.getMessageIds({ languageCode })]);
        }
        return result;
    }

    updateMessage(
        args: { id: Message['id']['name']; languageCode: LanguageCode; with: Message },
        options?: { upsert?: true }
    ): Result<void, Error> {
        if (args.id !== args.with.id.name) {
            return Result.err(Error('The given id does not match the with.id'));
        }
        const resource = this.resources[args.languageCode];
        if (resource === undefined) {
            return Result.err(Error(`Resource for language code ${args.languageCode} does not exist.`));
        }
        const indexOfMessage = resource.body.findIndex(
            (entry) => entry.type === 'Message' && entry.id.name === args.id
        );
        if (indexOfMessage === -1) {
            if (options?.upsert !== true) {
                return Result.err(
                    Error(
                        `Message with id '${args.id}' does not exist for the language code ${args.languageCode}. Did you mean to upsert?`
                    )
                );
            } else {
                // appending at the end
                resource.body[resource.body.length] = args.with;
            }
        } else {
            resource.body[indexOfMessage] = args.with;
        }
        return Result.ok(undefined);
    }

    // // This probably runs really poorly... Too bad!
    // checkMissingTranslations(): Result<{ key: string; languageCodes: LanguageCode[] }[], Error> {
    //     const result = [];
    //     for (const baseResource of this.resources) {
    //         if (baseResource.languageCode === this.baseLanguageCode) {
    //             for (const baseEntry of baseResource.data.body) {
    //                 if (baseEntry.type === 'Message') {
    //                     const missingLanguages: LanguageCode[] = [];
    //                     for (const resource of this.resources) {
    //                         let isTranslatedInLanguage = false;
    //                         for (const entry of resource.data.body) {
    //                             if (entry.type === 'Message' && entry.id.name === baseEntry.id.name) {
    //                                 isTranslatedInLanguage = true;
    //                                 break;
    //                             }
    //                         }
    //                         if (isTranslatedInLanguage === false) {
    //                             missingLanguages.push(resource.languageCode);
    //                         }
    //                     }
    //                     if (missingLanguages.length > 0) {
    //                         result.push({ key: baseEntry.id.name, languageCodes: missingLanguages });
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     return Result.ok(result);
    // }

    // checkMissingTranslationsForKey(key: string): Result<{ key: string; languageCode: LanguageCode }[], Error> {
    //     const out = [];
    //     const missingTranslations = this.checkMissingTranslations();
    //     if (missingTranslations.isErr) return Result.err(missingTranslations.error);
    //     for (const missingKey of missingTranslations.value) {
    //         if (missingKey.key === key) {
    //             for (const language of missingKey.languageCodes) {
    //                 out.push({ key: key, languageCode: language });
    //             }
    //             return Result.ok(out);
    //         }
    //     }
    //     return Result.ok([]);
    // }

    /*updateFile(files: TranslationFile[], options = { override: false }): Result<void, Error> {
        for (const file of files) {
            const parse = this.adapter.parse(file.data);
            if (parse.isErr) {
                return Result.err(Error('Parsing error'));
            }
            for (const entry of parse.value.body) {
                if (entry.type === 'Junk') {
                    return Result.err(Error('Parsing error: Junk'));
                }
            }
            for (const resource of this.resources) {
                if (resource.languageCode === file.languageCode) {
                    if (resource.data.body.length > parse.value.body.length && options.override === false) {
                        return Result.err(
                            Error('Less keys than original, please set options.override: true to override')
                        );
                    } else {
                        resource.data = parse.value;
                    }
                }
            }
        }
        return Result.ok(undefined);
    }*/

    // checkMessageForErrors(args: { id: string; languageCode: LanguageCode }): boolean {
    //     if (args.languageCode === this.baseLanguageCode) {
    //         return false;
    //     }
    //     return true;
    // }

    // This could probably be optimized a lot
    // checkMissingVariables(): Result<
    //     { key: string; missingFromBaseTranslation: boolean; variable: string; languageCode: LanguageCode }[],
    //     Error
    // > {
    //     const result = [];
    //     for (const baseResource of this.resources) {
    //         if (baseResource.languageCode === this.baseLanguageCode) {
    //             for (const baseEntry of baseResource.data.body) {
    //                 if (baseEntry.type === 'Message') {
    //                     const basePlaceables = [];
    //                     if (baseEntry.value === null) return Result.err(Error('Base entry value null'));
    //                     for (const baseElement of baseEntry.value.elements) {
    //                         if (baseElement.type === 'Placeable') {
    //                             basePlaceables.push(serializeExpression(baseElement.expression));
    //                         }
    //                     }
    //                     for (const resource of this.resources) {
    //                         if (baseResource.languageCode === resource.languageCode) continue;
    //                         for (const entry of resource.data.body) {
    //                             if (entry.type === 'Message' && entry.id.name === baseEntry.id.name) {
    //                                 const placeables = [];
    //                                 if (entry.value === null) return Result.err(Error('Entry value null'));
    //                                 for (const element of entry.value.elements) {
    //                                     if (element.type === 'Placeable') {
    //                                         placeables.push(serializeExpression(element.expression));
    //                                     }
    //                                 }
    //                                 for (const basePlaceable of basePlaceables) {
    //                                     let match = false;
    //                                     for (const placeable of placeables) {
    //                                         if (placeable === basePlaceable) {
    //                                             match = true;
    //                                             break;
    //                                         }
    //                                     }
    //                                     if (match === false) {
    //                                         result.push({
    //                                             key: entry.id.name,
    //                                             missingFromBaseTranslation: false,
    //                                             variable: basePlaceable,
    //                                             languageCode: resource.languageCode,
    //                                         });
    //                                     }
    //                                 }
    //                                 for (const placeable of placeables) {
    //                                     let match = false;
    //                                     for (const basePlaceable of basePlaceables) {
    //                                         if (placeable === basePlaceable) {
    //                                             match = true;
    //                                             break;
    //                                         }
    //                                     }
    //                                     if (match === false) {
    //                                         result.push({
    //                                             key: entry.id.name,
    //                                             missingFromBaseTranslation: true,
    //                                             variable: placeable,
    //                                             languageCode: resource.languageCode,
    //                                         });
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     return Result.ok(result);
    // }

    // compareVariables(
    //     translations: { key: string; languageCode: LanguageCode; translation?: string }[],
    //     baseTranslation?: { key: string; languageCode: LanguageCode; translation?: string }
    // ): Result<{ [language: string]: { error: string; variable: string } }, Error> {
    //     const errors: { [language: string]: { error: string; variable: string } } = {};
    //     const baseParse = parse(`key = ${baseTranslation?.translation}`, {}).body[0];
    //     if (baseParse.type !== 'Message') {
    //         return Result.ok({
    //             [baseTranslation?.languageCode as string]: { error: 'Base translation is incorrect', variable: '' },
    //         });
    //     }

    //     const expressionArray: Expression[] = [];
    //     for (const element of baseParse.value?.elements ?? []) {
    //         if (element.type === 'Placeable') {
    //             expressionArray.push(element.expression);
    //         }
    //     }

    //     for (const translation of translations) {
    //         const parse = parse(`key = ${translation.translation ?? ''}`, {}).body[0];
    //         if (parse.type !== 'Message') {
    //             errors[translation.languageCode] = {
    //                 error: 'Translation is incorrect',
    //                 variable: '',
    //             };
    //             return Result.ok(errors);
    //         }

    //         const translationExpressionArray: Expression[] = [];
    //         for (const element of parse.value?.elements ?? []) {
    //             if (element.type === 'Placeable') {
    //                 translationExpressionArray.push(element.expression);
    //                 if (
    //                     expressionArray.some(
    //                         (expression) =>
    //                             serializeExpression(expression) ===
    //                             serializeExpression(element.expression)
    //                     ) === false
    //                 ) {
    //                     errors[translation.languageCode] = {
    //                         error: ' is missing from base translation',
    //                         variable: serializeExpression(element.expression),
    //                     };
    //                 }
    //             }
    //         }
    //         for (const expression of expressionArray) {
    //             if (
    //                 translationExpressionArray.some(
    //                     (exp) => serializeExpression(exp) === serializeExpression(expression)
    //                 ) === false
    //             ) {
    //                 errors[translation.languageCode] = {
    //                     error: ' is missing',
    //                     variable: serializeExpression(expression),
    //                 };
    //             }
    //         }
    //     }
    //     return Result.ok(errors);
    // }

    serialize(args: { adapter: AdapterInterface }): Result<SerializedResource[], Error> {
        const files: SerializedResource[] = [];
        for (const [languageCode, resource] of Object.entries(this.resources)) {
            const serialized = args.adapter.serialize(resource as Resource);
            if (serialized.isErr) {
                return Result.err(serialized.error);
            }
            files.push({ data: serialized.value, languageCode: languageCode as LanguageCode });
        }
        return Result.ok(files);
    }
}
