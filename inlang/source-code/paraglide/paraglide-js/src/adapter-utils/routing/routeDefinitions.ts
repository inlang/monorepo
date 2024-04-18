//vendored in from sveltekit and adapted

export type PathDefinitionTranslations<T extends string = string> = {
	[canonicalPath: `/${string}`]: Record<T, `/${string}`>
}

export type RouteParam = {
	name: string
	matcher: string
	optional: boolean
	rest: boolean
	chained: boolean
}
export type ParamMatcher = (segment: string) => boolean

//vendored in from @sveltejs/kit utils/routing.js

const param_pattern = /^(\[)?(\.\.\.)?(\w+)(?:=(\w+))?(\])?$/

/**
 * Creates the regex pattern, extracts parameter names, and generates types for a route
 */
export function parseRouteDefinition(id: string): {
	params: RouteParam[]
	pattern: RegExp
} {
	const params: RouteParam[] = []

	const pattern =
		id === "/"
			? /^\/$/
			: new RegExp(
					`^${get_route_segments(id)
						.map((segment) => {
							// special case — /[...rest]/ could contain zero segments
							const rest_match = /^\[\.\.\.(\w+)(?:=(\w+))?\]$/.exec(segment)
							if (rest_match) {
								params.push({
									name: rest_match[1] as string,
									matcher: rest_match[2] as string,
									optional: false,
									rest: true,
									chained: true,
								})
								return "(?:/(.*))?"
							}
							// special case — /[[optional]]/ could contain zero segments
							const optional_match = /^\[\[(\w+)(?:=(\w+))?\]\]$/.exec(segment)
							if (optional_match) {
								params.push({
									name: optional_match[1] as string,
									matcher: optional_match[2] as string,
									optional: true,
									rest: false,
									chained: true,
								})
								return "(?:/([^/]+))?"
							}

							if (!segment) {
								return
							}

							const parts = segment.split(/\[(.+?)\](?!\])/)
							const result = parts
								.map((content, i) => {
									if (i % 2) {
										if (content.startsWith("x+")) {
											return escape(String.fromCharCode(parseInt(content.slice(2), 16)))
										}

										if (content.startsWith("u+")) {
											return escape(
												String.fromCharCode(
													...content
														.slice(2)
														.split("-")
														.map((code) => parseInt(code, 16))
												)
											)
										}

										// We know the match cannot be null in the browser because manifest generation
										// would have invoked this during build and failed if we hit an invalid
										// param/matcher name with non-alphanumeric character.
										const match = /** @type {RegExpExecArray} */ param_pattern.exec(content)
										if (!match) {
											throw new Error(
												`Invalid param: ${content}. Params and matcher names can only have underscores and alphanumeric characters.`
											)
										}

										const [, is_optional, is_rest, name, matcher] = match
										// It's assumed that the following invalid route id cases are already checked
										// - unbalanced brackets
										// - optional param following rest param

										params.push({
											name: name as string,
											matcher: matcher as string,
											optional: !!is_optional,
											rest: !!is_rest,
											chained: is_rest ? i === 1 && parts[0] === "" : false,
										})
										return is_rest ? "(.*?)" : is_optional ? "([^/]*)?" : "([^/]+?)"
									}

									return escape(content)
								})
								.join("")

							return "/" + result
						})
						.join("")}/?$`
			  )

	return { pattern, params }
}

export function exec(
	match: RegExpMatchArray,
	params: RouteParam[],
	matchers: Record<string, ParamMatcher>
) {
	const result: Record<string, string> = {}

	const values = match.slice(1)
	const values_needing_match = values.filter((value) => value !== undefined)

	let buffered = 0

	for (const [i, param] of params.entries()) {
		let value = values[i - buffered]

		// in the `[[a=b]]/.../[...rest]` case, if one or more optional parameters
		// weren't matched, roll the skipped values into the rest
		if (param.chained && param.rest && buffered) {
			value = values
				.slice(i - buffered, i + 1)
				.filter((s) => s)
				.join("/")

			buffered = 0
		}

		// if `value` is undefined, it means this is an optional or rest parameter
		if (value === undefined) {
			if (param.rest) result[param.name] = ""
			continue
		}

		if (param.matcher && !matchers[param.matcher]) {
			return undefined
		}

		const matcher: ParamMatcher = matchers[param.matcher] ?? (() => true)

		if (matcher(value)) {
			result[param.name] = value

			// Now that the params match, reset the buffer if the next param isn't the [...rest]
			// and the next value is defined, otherwise the buffer will cause us to skip values
			const next_param = params[i + 1]
			const next_value = values[i + 1]
			if (next_param && !next_param.rest && next_param.optional && next_value && param.chained) {
				buffered = 0
			}

			// There are no more params and no more values, but all non-empty values have been matched
			if (
				!next_param &&
				!next_value &&
				Object.keys(result).length === values_needing_match.length
			) {
				buffered = 0
			}
			continue
		}

		// in the `/[[a=b]]/...` case, if the value didn't satisfy the matcher,
		// keep track of the number of skipped optional parameters and continue
		if (param.optional && param.chained) {
			buffered++
			continue
		}

		// otherwise, if the matcher returns `false`, the route did not match
		return
	}

	if (buffered) return
	return result
}

function escape(str: string) {
	return (
		str
			.normalize()
			// escape [ and ] before escaping other characters, since they are used in the replacements
			.replace(/[[\]]/g, "\\$&")
			// replace %, /, ? and # with their encoded versions because decode_pathname leaves them untouched
			.replace(/%/g, "%25")
			.replace(/\//g, "%2[Ff]")
			.replace(/\?/g, "%3[Ff]")
			.replace(/#/g, "%23")
			// escape characters that have special meaning in regex
			.replace(/[.*+?^${}()|\\]/g, "\\$&")
	)
}

const basic_param_pattern = /\[(\[)?(\.\.\.)?(\w+?)(?:=(\w+))?\]\]?/g

/**
 * Populate a route ID with params to resolve a pathname.
 * @example
 * ```js
 * resolveRoute(
 *   `/blog/[slug]/[...somethingElse]`,
 *   {
 *     slug: 'hello-world',
 *     somethingElse: 'something/else'
 *   }
 * ); // `/blog/hello-world/something/else`
 * ```
 */
export function resolveRoute(id: string, params: Record<string, string | undefined>): string {
	const segments = get_route_segments(id)
	return (
		"/" +
		segments
			.map((segment) =>
				segment.replace(basic_param_pattern, (_, optional, rest, name) => {
					const param_value = params[name]

					// This is nested so TS correctly narrows the type
					if (!param_value) {
						if (optional) return ""
						if (rest && param_value !== undefined) return ""
						throw new Error(`Missing parameter '${name}' in route ${id}`)
					}

					if (param_value.startsWith("/") || param_value.endsWith("/"))
						throw new Error(
							`Parameter '${name}' in route ${id} cannot start or end with a slash -- this would cause an invalid route like foo//bar`
						)
					return param_value
				})
			)
			.filter(Boolean)
			.join("/")
	)
}

/**
 * Returns the id and params for the route that best matches the given path.
 * @param canonicalPath Canonical pathname excluding the base and language e.g. /foo/bar
 * @param pathDefinitions An array of pathDefinitions
 * @param matchers A map of param matcher functions
 *
 * @returns undefined if no route matches.
 */
export function bestMatch(
	canonicalPath: string,
	pathDefinitions: string[],
	matchers: Record<string, ParamMatcher>
): { params: Record<string, string>; id: string } | undefined {
	let bestMatch:
		| {
				id: string
				params: Record<string, string>
				route: ReturnType<typeof parseRouteDefinition>
		  }
		| undefined = undefined

	for (const pathDefinition of pathDefinitions) {
		const route = parseRouteDefinition(pathDefinition)
		const match = route.pattern.exec(removeTrailingSlash(canonicalPath))

		//if the path doesn't match the pattern it's not a match
		if (!match) continue

		//the params are undefined IFF the matchers don't match
		const params = exec(match, route.params, matchers)
		if (!params) continue

		if (!bestMatch) {
			bestMatch = { params, route, id: pathDefinition }
			continue
		}

		const bestMatchNumParams = Object.keys(bestMatch.route.params).length
		const currentMatchNumParams = Object.keys(route.params).length

		// the best match requires fewer parameters
		if (bestMatchNumParams < currentMatchNumParams) {
			continue
		}

		//if the current match has fewer parameters, it's a better match
		if (bestMatchNumParams > currentMatchNumParams) {
			bestMatch = { params, route, id: pathDefinition }
			continue
		}

		// if they're tied, pick the shorter one
		if (
			bestMatchNumParams === currentMatchNumParams &&
			route.pattern.source.length < bestMatch.route.pattern.source.length
		) {
			bestMatch = { params, route, id: pathDefinition }
		}
	}

	return bestMatch
		? {
				id: bestMatch.id,
				params: bestMatch.params,
		  }
		: undefined
}

function removeTrailingSlash(path: string): string {
	return path.endsWith("/") ? path.slice(0, -1) : path
}

/**
 * Splits a route id into its segments, removing segments that
 * don't affect the path (i.e. groups). The root route is represented by `/`
 * and will be returned as `['']`.
 * @param {string} route
 * @returns string[]
 */
function get_route_segments(route: string) {
	return route.slice(1).split("/")
}
