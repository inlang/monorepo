import { getLocale } from "./get-locale.js";
import { getUrlOrigin } from "./get-url-origin.js";
import { urlPatterns } from "./variables.js";

/**
 * Lower-level URL localization function, primarily used in server contexts.
 *
 * This function is designed for server-side usage where you need precise control
 * over URL localization, such as in middleware or request handlers. It works with
 * URL objects and always returns absolute URLs.
 *
 * For client-side UI components, use `localizeHref()` instead, which provides
 * a more convenient API with relative paths and automatic locale detection.
 *
 * @example
 * ```typescript
 * // Server middleware example
 * app.use((req, res, next) => {
 *   const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
 *   const localized = localizeUrl(url, { locale: "de" });
 *
 *   if (localized.href !== url.href) {
 *     return res.redirect(localized.href);
 *   }
 *   next();
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using with URL patterns
 * const url = new URL("https://example.com/about");
 * localizeUrl(url, { locale: "de" });
 * // => URL("https://example.com/de/about")
 *
 * // Using with domain-based localization
 * const url = new URL("https://example.com/store");
 * localizeUrl(url, { locale: "de" });
 * // => URL("https://de.example.com/store")
 * ```
 *
 * @param {string | URL} url - The URL to localize. If string, must be absolute.
 * @param {Object} [options] - Options for localization
 * @param {string} [options.locale] - Target locale. If not provided, uses getLocale()
 * @returns {URL} The localized URL, always absolute
 */
export function localizeUrl(url, options) {
	const locale = options?.locale ?? getLocale();
	const urlObj = typeof url === "string" ? new URL(url) : url;

	const search = urlObj.search;

	for (const element of urlPatterns) {
		const pattern = new URLPattern(element.pattern);
		const match = pattern.exec(urlObj.href);

		if (match) {
			/** @type {Record<string, string | null >} */
			const overrides = {};

			for (const [groupName, value] of Object.entries(
				element.localizedNamedGroups?.[locale] ?? {}
			)) {
				overrides[groupName] = value;
			}

			const groups = {
				...aggregateGroups(match),
				...overrides,
			};

			return fillPattern(element.pattern, groups, search);
		}
	}

	throw new Error(`No match found for ${url}`);
}

/**
 * Low-level URL de-localization function, primarily used in server contexts.
 *
 * This function is designed for server-side usage where you need precise control
 * over URL de-localization, such as in middleware or request handlers. It works with
 * URL objects and always returns absolute URLs.
 *
 * For client-side UI components, use `deLocalizeHref()` instead, which provides
 * a more convenient API with relative paths.
 *
 * @example
 * ```typescript
 * // Server middleware example
 * app.use((req, res, next) => {
 *   const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
 *   const baseUrl = deLocalizeUrl(url);
 *
 *   // Store the base URL for later use
 *   req.baseUrl = baseUrl;
 *   next();
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using with URL patterns
 * const url = new URL("https://example.com/de/about");
 * deLocalizeUrl(url); // => URL("https://example.com/about")
 *
 * // Using with domain-based localization
 * const url = new URL("https://de.example.com/store");
 * deLocalizeUrl(url); // => URL("https://example.com/store")
 * ```
 *
 * @param {string | URL} url - The URL to de-localize. If string, must be absolute.
 * @returns {URL} The de-localized URL, always absolute
 */
export function deLocalizeUrl(url) {
	const urlObj = new URL(url, getUrlOrigin());
	const search = urlObj.search;

	for (const element of urlPatterns) {
		const pattern = new URLPattern(element.pattern);
		const match = pattern.exec(urlObj.href);

		if (match) {
			/** @type {Record<string, string | null>} */
			const overrides = {};

			for (const [groupName, value] of Object.entries(
				element.deLocalizedNamedGroups
			)) {
				overrides[groupName] = value;
			}

			const groups = {
				...aggregateGroups(match),
				...overrides,
			};

			return fillPattern(element.pattern, groups, search);
		}
	}

	throw new Error(`No match found for ${url}`);
}

/**
 * Fills a URL pattern with values for named groups, supporting all URLPattern-style modifiers:
 *
 * This function will eventually be replaced by https://github.com/whatwg/urlpattern/issues/73
 *
 * Matches:
 * - :name        -> Simple
 * - :name?       -> Optional
 * - :name+       -> One or more
 * - :name*       -> Zero or more
 * - :name(...)   -> Regex group
 *
 * If the value is `null`, the segment is removed.
 *
 * @param {string} pattern - The URL pattern containing named groups.
 * @param {Record<string, string | null | undefined>} values - Object of values for named groups.
 * @param {string} [search] - Optional search (query) parameters to preserve
 * @returns {URL} - The constructed URL with named groups filled.
 */
function fillPattern(pattern, values, search) {
	const filled = pattern.replace(
		/(\/?):([a-zA-Z0-9_]+)(\([^)]*\))?([?+*]?)/g,
		(_, slash, name, __, modifier) => {
			const value = values[name];

			if (value === null) {
				// If value is null, remove the entire segment including the preceding slash
				return "";
			}

			if (modifier === "?") {
				// Optional segment
				return value !== undefined ? `${slash}${value}` : "";
			}

			if (modifier === "+" || modifier === "*") {
				// Repeatable segments
				if (value === undefined && modifier === "+") {
					throw new Error(`Missing value for "${name}" (one or more required)`);
				}
				return value ? `${slash}${value}` : "";
			}

			// Simple named group (no modifier)
			if (value === undefined) {
				throw new Error(`Missing value for "${name}"`);
			}

			return `${slash}${value}`;
		}
	);

	const url = new URL(filled);
	if (search) {
		url.search = search;
	}
	return url;
}

/**
 * Aggregates named groups from various parts of the URLPattern match result.
 *
 *
 * @type {(match: URLPatternResult) => Record<string, string | null | undefined>}
 */
export function aggregateGroups(match) {
	return {
		...match.hash.groups,
		...match.hostname.groups,
		...match.password.groups,
		...match.pathname.groups,
		...match.port.groups,
		...match.protocol.groups,
		...match.search.groups,
		...match.username.groups,
	};
}
