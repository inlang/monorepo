import { pathnames } from "./variables.js";
import { getLocale } from "./get-locale.js";

/**
 * Localizes the given path.
 *
 * This function is useful if you use localized (i18n) routing
 * in your application.
 *
 * Defaults to `getLocale()` if no locale is provided.
 *
 * @tip
 *   Use `deLocalizePath()` for the inverse operation.
 *
 * @example
 *  // getLocale() = 'en'
 *  localizePath('/home'));
 *  // '/de/home'
 *
 *  // enforcing a specific locale
 *  localizePath('/home', { locale: 'fr' });
 *  // '/fr/home'
 *
 * @example
 *   <a href={localizePath('/home')}>Home</a>
 *
 * @param {string} pathname
 * @param {Object} [options] - Optional parameters.
 * @param {Locale} [options.locale] - The locale to use for the path.
 * @returns {string}
 */
export function localizePath(pathname, options) {
	const locale = options?.locale ?? getLocale();

	for (const [pattern, locales] of Object.entries(pathnames)) {
		const match = createMatcher(pattern)(pathname);
		if (match) {
			let localizedPath = locales[locale];

			if (!localizedPath) {
				return pathname;
			}

			// Replace dynamic segments
			// @ts-expect-error - xyz
			for (const [key, value] of Object.entries(match.pathname.groups || {})) {
				localizedPath = localizedPath.replace(`:${key}`, value);
			}

			return localizedPath;
		}
	}

	// Default to original if no match
	return pathname;
}
