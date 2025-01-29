// import { text } from 'stream/consumers';
// import BaseTextNodeLintRule from './BaseTextNodeLintRule';

// // eslint-disable-next-line max-classes-per-file
// export default class MixedFontFamiliesNotSupported extends BaseTextNodeLintRule {

//   fontNameStyleField = 'fontName' as 'fontName';

//   // eslint-disable-next-line class-methods-use-this
//   matches(textNode: TextNode): boolean {
//     if (textNode.characters.length === 0) {
//       return false;
//     }

//     if (textNode.fontName !== figma.mixed) {
//       return false;
//     }

//     const fontNameStyleSegments = textNode.getStyledTextSegments([this.fontNameStyleField], 0, textNode.characters.length);
//     const fontFamilies = new Set<string>();
//     for (const fontNameStyleSegment of fontNameStyleSegments) {
//       fontFamilies.add(fontNameStyleSegment.fontName.family);
//     }

//     return fontFamilies.size > 1;
//   }

//   fix(textNode: TextNode): void {
//     const currentStyleSegments = textNode.getStyledTextSegments([field as any]);
//     const stylesPresent = {} as any;
//     for (const stlyeSegment of currentStyleSegments) {
//       const serializedStyle = JSON.stringify(stlyeSegment[field]);
//       if (!stylesPresent[serializedStyle]) {
//         stylesPresent[serializedStyle] = stlyeSegment.end - stlyeSegment.start;
//       }
//       stylesPresent[serializedStyle] += stlyeSegment.end - stlyeSegment.start;
//     }

//     let mostPresentStyleSerialized : undefined | string;
//     let mostPresentStylePresens = 0 as number;

//     for (const [styleSerialized, presens] of Object.entries(stylesPresent)) {
//       if (mostPresentStylePresens < (presens as number)) {
//         mostPresentStylePresens = (presens as number);
//         mostPresentStyleSerialized = styleSerialized;
//       }
//     }

//     try {
//       // eslint-disable-next-line no-param-reassign
//       (textNode as any)[field] = JSON.parse(mostPresentStyleSerialized!);
//     } catch (e) {
//       throw new Error(`${field} inline styles can't get fixed automatically at the Moment. please remvoe those styles manually from the TextNode to use within Parrot.`);
//     }
//   }
//   }
// }
