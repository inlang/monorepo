export enum InlineFormats {
	bold,
	italic,
	boldItalic,
	regular,
}

export default class FontHelper {
	static availableFonts: Font[] | undefined;

	static stylingSupportCache = {} as {
		[fontFamily: string]: {
			regular: FontName | undefined;
			bold: FontName | undefined;
			italic: FontName | undefined;
			boldItalic: FontName | undefined;
		};
	};

	static async initialize() {
		this.availableFonts = await figma.listAvailableFontsAsync();
	}

	static getSupportedInlineFormats(fontName: FontName) {
		const supportedFormats = [] as InlineFormats[];
		const font = FontHelper.getStylingSupport(fontName);

		if (font.bold) {
			supportedFormats.push(InlineFormats.bold);
		}
		if (font.italic) {
			supportedFormats.push(InlineFormats.italic);
		}
		if (font.boldItalic) {
			supportedFormats.push(InlineFormats.boldItalic);
		}
		if (font.regular) {
			supportedFormats.push(InlineFormats.regular);
		}
		return font;
	}

	static getStylingSupport(fontName: FontName) {
		if (this.availableFonts === undefined) {
			throw new Error("Fonthelper not yet initialized");
		}

		const fontFamilyVariants = this.availableFonts
			.filter((font: Font) => font.fontName.family === fontName.family)
			.map((font) => font.fontName);

		const font = {
			variants: {} as { [style: string]: FontName },
			regular: undefined as FontName | undefined,
			bold: undefined as FontName | undefined,
			italic: undefined as FontName | undefined,
			boldItalic: undefined as FontName | undefined,
		};

		// restruction into font.variants->style->font
		for (const fontFamilyVariant of fontFamilyVariants) {
			font.variants[fontFamilyVariant.style] = fontFamilyVariant;
		}

		if (Object.keys(font.variants).length === 1) {
			font.regular = font.variants[Object.keys(font.variants)[0]];
			// this font doesn't support b/i/bi formatting
			return font;
		}

		const regulaStyle = Object.keys(font.variants).find(
			(variant) => variant.toLowerCase() === "regular",
		);
		if (regulaStyle) {
			font.regular = font.variants[regulaStyle];
		}

		const boldStyle = Object.keys(font.variants).find(
			(variant) => variant.toLowerCase() === "bold",
		);
		if (boldStyle) {
			font.bold = font.variants[boldStyle];
		}

		const italicStyle = Object.keys(font.variants).find(
			(variant) => variant.toLowerCase() === "italic",
		);
		if (italicStyle) {
			font.italic = font.variants[italicStyle];
		}

		let boldItalicStyle = Object.keys(font.variants).find(
			(variant) => variant.toLowerCase() === "bold italic",
		);
		if (boldItalicStyle) {
			font.boldItalic = font.variants[boldItalicStyle];
		}

		boldItalicStyle = Object.keys(font.variants).find(
			(variant) => variant.toLowerCase() === "bolditalic",
		);
		if (boldItalicStyle) {
			font.boldItalic = font.variants[boldItalicStyle];
		}

		// try to get regular by excluding other variants as options
		if (!font.regular) {
			const regularCandidates = Object.keys(font.variants).filter((variantStyle) => {
				const variantNameLower = variantStyle.toLowerCase();
				const variant = font.variants[variantStyle];

				// used by bold already
				if (font.bold === variant) {
					return false;
				}

				// used by italic already
				if (font.italic === variant) {
					return false;
				}

				// used by BoldItalic already
				if (font.boldItalic === variant) {
					return false;
				}

				// exclude variants
				if (variantNameLower.indexOf("italic") === -1 && variantNameLower.indexOf("bold") === -1) {
					return true;
				}

				// regular didn't exist - allow fall back to medium
				if (variantNameLower === "medium") {
					return true;
				}
				return false;
			});

			if (regularCandidates.length === 1) {
				// ok we have one option for regular by exultion of bold italic etc
				font.regular = font.variants[regularCandidates[0]];
			} else if (regularCandidates.length > 1) {
				// multipler candidates found - prioritize medium
				const mediumVariant = regularCandidates.find((variantStyle) => {
					const variantNameLower = variantStyle.toLowerCase();
					if (variantNameLower === "medium") {
						return true;
					}
				});

				if (mediumVariant) {
					// console.log('using medium variant')
					font.regular = font.variants[mediumVariant];
				}
			} else {
				// no regular variant found by exclusion for
			}
		}

		return font;
	}
}
