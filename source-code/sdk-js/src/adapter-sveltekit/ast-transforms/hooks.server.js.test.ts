import { describe, test, expect } from "vitest"
import { dedent } from "ts-dedent"
import { transformHooksServerJs } from "./hooks.server.js.js"
import { initTransformConfig } from "./test.utils.js"

// TODO: create test matrix for all possible combinations

describe("transformHooksServerJs", () => {
	describe("empty file", () => {
		describe("lang-in-slug", () => {
			test("non-static", () => {
				const code = ""
				const config = initTransformConfig({ languageInUrl: true })
				const transformed = transformHooksServerJs("", config, code)

				expect(transformed).toMatchInlineSnapshot(`
					"import { replaceLanguageInUrl } from '@inlang/sdk-js/adapter-sveltekit/shared';
					import { initAcceptLanguageHeaderDetector } from '@inlang/sdk-js/detectors/server';
					import { redirect } from '@sveltejs/kit';
					import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
					export const handle = initHandleWrapper({
					    inlangConfigModule: import(\\"../inlang.config.js\\"),
					    excludedRoutes: [],
					    getLanguage: ({ url }) => url.pathname.split(\\"/\\")[1],
					    initDetectors: ({ request }) => [initAcceptLanguageHeaderDetector(request.headers)],
					    redirect: {
					        throwable: redirect,
					        getPath: ({ url }, language) => replaceLanguageInUrl(url, language),
					    },
					}).use(({ resolve, event }) => resolve(event));"
				`)
			})

			test("static", () => {
				const code = ""
				const config = initTransformConfig({ languageInUrl: true, isStatic: true })
				const transformed = transformHooksServerJs("", config, code)

				expect(transformed).toMatchInlineSnapshot(`
					"import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
					export const handle = initHandleWrapper({
					    inlangConfigModule: import(\\"../inlang.config.js\\"),
					    excludedRoutes: [],
					    getLanguage: ({ url }) => url.pathname.split(\\"/\\")[1],
					}).use(({ resolve, event }) => resolve(event));"
				`)
			})
		})

		describe("spa", () => {
			test("static", () => {
				const code = ""
				const config = initTransformConfig({ isStatic: true })
				const transformed = transformHooksServerJs("", config, code)

				expect(transformed).toMatchInlineSnapshot(`
					"import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
					export const handle = initHandleWrapper({
					    inlangConfigModule: import(\\"../inlang.config.js\\"),
					    excludedRoutes: [],
					    getLanguage: () => undefined,
					}).use(({ resolve, event }) => resolve(event));"
				`)
			})
		})
	})

	test("adds handle hook to a file with arbitrary contents", () => {
		const code = dedent`
			import * as Sentry from '@sentry/node';
			import crypto from 'crypto';

			Sentry.init.skip({/*...*/})

			/** @type {import('@sveltejs/kit').HandleServerError} */
			export async function handleError({ error, event }) {
				const errorId = crypto.randomUUID();
				// example integration with https://sentry.io/
				Sentry.captureException(error, { event, errorId });

				return {
					message: 'Whoops!',
					errorId
				};
			}
		`
		const config = initTransformConfig()
		const transformed = transformHooksServerJs("", config, code)
		expect(transformed).toMatchInlineSnapshot(`
			"import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
			import * as Sentry from '@sentry/node';
			import crypto from 'crypto';
			Sentry.init.skip({ /*...*/});
			/** @type {import('@sveltejs/kit').HandleServerError} */
			export async function handleError({ error, event }) {
			    const errorId = crypto.randomUUID();
			    // example integration with https://sentry.io/
			    Sentry.captureException(error, { event, errorId });
			    return {
			        message: 'Whoops!',
			        errorId
			    };
			}
			export const handle = initHandleWrapper({
			    inlangConfigModule: import(\\"../inlang.config.js\\"),
			    excludedRoutes: [],
			    getLanguage: () => undefined,
			}).use(({ resolve, event }) => resolve(event));"
		`)
	})

	test("should wrap handle if already defined", () => {
		const transformed = transformHooksServerJs(
			"",
			initTransformConfig(),
			dedent`
				export function handle({ event, resolve }) {
					console.info('TADAA!')
					return resolve(event)
				}
			`,
		)

		expect(transformed).toMatchInlineSnapshot(`
			"import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
			export const handle = initHandleWrapper({
			    inlangConfigModule: import(\\"../inlang.config.js\\"),
			    excludedRoutes: [],
			    getLanguage: () => undefined,
			}).use(function handle({ event, resolve }) {
			    console.info('TADAA!');
			    return resolve(event);
			});"
		`)
	})

	test("should wrap handle if sequence helper get's used", () => {
		const transformed = transformHooksServerJs(
			"",
			initTransformConfig(),
			dedent`
				import { sequence } from '@sveltejs/kit'

				const handle1 = ({ resolve, event }) => resolve(event)

				function handle2({ resolve, event }) {
					console.info('handle called')
					return resolve(event)
				}

				export const handle = sequence(handle1, handle2)
			`,
		)

		expect(transformed).toMatchInlineSnapshot(`
			"import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
			import { sequence } from '@sveltejs/kit';
			const handle1 = ({ resolve, event }) => resolve(event);
			function handle2({ resolve, event }) {
			    console.info('handle called');
			    return resolve(event);
			}
			export const handle = initHandleWrapper({
			    inlangConfigModule: import(\\"../inlang.config.js\\"),
			    excludedRoutes: [],
			    getLanguage: () => undefined,
			}).use(sequence(handle1, handle2));"
		`)
	})

	test("should not do anything if '@inlang/sdk-js/no-transforms' import is detected", () => {
		const code = "import '@inlang/sdk-js/no-transforms'"
		const config = initTransformConfig()
		const transformed = transformHooksServerJs("", config, code)
		expect(transformed).toEqual(code)
	})

	describe("'@inlang/sdk-js' imports", () => {
		test("should transform imports correctly", () => {
			const transformed = transformHooksServerJs(
				"",
				initTransformConfig(),
				dedent`
					import { i } from '@inlang/sdk-js'

					export const handle = ({ event, resolve }) => {
						console.log(i('hi'))
						return resolve(event)
					}
			`,
			)

			expect(transformed).toMatchInlineSnapshot(`
				"import { initHandleWrapper } from '@inlang/sdk-js/adapter-sveltekit/server';
				export const handle = initHandleWrapper({
				    inlangConfigModule: import(\\"../inlang.config.js\\"),
				    excludedRoutes: [],
				    getLanguage: () => undefined,
				}).use(({ event, resolve }, { i }) => {
				    console.log(i('hi'));
				    return resolve(event);
				});"
			`)
		})
	})
})
