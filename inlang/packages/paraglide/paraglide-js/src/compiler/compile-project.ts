import { compileBundle } from "./compile-bundle.js";
import { DEFAULT_REGISTRY } from "./registry.js";
import { selectBundleNested, type InlangProject } from "@inlang/sdk";
import { lookup } from "../services/lookup.js";
import { generateLocaleModules } from "./output-structure/locale-modules.js";
import { generateMessageModules } from "./output-structure/message-modules.js";

export type CompilerOptions = {
	/**
	 * Whether to emit TypeScript files instead of JSDoc annotated JavaScript.
	 *
	 * @default false
	 */
	experimentalEmitTs?: boolean;
	/**
	 * Whether to import files as TypeScript in the emitted code.
	 *
	 * The option is useful in some setups where TypeScript is run
	 * directly on the emitted code such as node --strip-types.
	 * [Here](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/#path-rewriting-for-relative-paths)
	 * is more information on path rewriting for relative paths.
	 *
	 * ! Only works in combination with `emitTs: true`.
	 *
	 * @example
	 *   // false
	 *   import { getLocale } from "./runtime.js";
	 *
	 *   // true
	 *   import { getLocale } from "./runtime.ts";
	 */
	experimentalUseTsImports?: boolean;
	/**
	 * Whether to emit a .prettierignore file.
	 *
	 * @default true
	 */
	emitPrettierIgnore?: boolean;
	/**
	 * Whether to emit a .gitignore file.
	 *
	 * @default true
	 */
	emitGitIgnore?: boolean;
	/**
	 * The file-structure of the compiled output.
	 *
	 * @default "message-modules"
	 */
	outputStructure?: "locale-modules" | "message-modules";
};

const defaultCompilerOptions = {
	outputStructure: "message-modules",
	experimentalEmitTs: false,
	experimentalUseTsImports: false,
	emitGitIgnore: true,
	emitPrettierIgnore: true,
} as const satisfies CompilerOptions;

/**
 * Takes an inlang project and compiles it into a set of files.
 *
 * Use this function for more programmatic control than `compile()`.
 * You can adjust the output structure and get the compiled files as a return value.
 *
 * @example
 *   const output = await compileProject({ project });
 *   await writeOutput('path', output, fs.promises);
 */
export const compileProject = async (args: {
	project: InlangProject;
	compilerOptions?: CompilerOptions;
}): Promise<Record<string, string>> => {
	const optionsWithDefaults: Required<CompilerOptions> = {
		...defaultCompilerOptions,
		...args.compilerOptions,
	};

	const settings = await args.project.settings.get();
	const bundles = await selectBundleNested(args.project.db).execute();

	//Maps each language to it's fallback
	//If there is no fallback, it will be undefined
	const fallbackMap = getFallbackMap(settings.locales, settings.baseLocale);
	const compiledBundles = bundles.map((bundle) =>
		compileBundle({
			bundle,
			fallbackMap,
			registry: DEFAULT_REGISTRY,
			emitTs: optionsWithDefaults.experimentalEmitTs,
		})
	);

	const output: Record<string, string> = {};

	if (optionsWithDefaults.outputStructure === "locale-modules") {
		const regularOutput = generateLocaleModules(
			compiledBundles,
			settings,
			fallbackMap,
			optionsWithDefaults.experimentalEmitTs,
			optionsWithDefaults.experimentalUseTsImports
		);
		Object.assign(output, regularOutput);
	}

	if (optionsWithDefaults.outputStructure === "message-modules") {
		const messageModuleOutput = generateMessageModules(
			compiledBundles,
			settings,
			fallbackMap,
			optionsWithDefaults.experimentalEmitTs,
			optionsWithDefaults.experimentalUseTsImports
		);
		Object.assign(output, messageModuleOutput);
	}

	if (optionsWithDefaults.emitGitIgnore) {
		output[".gitignore"] = ignoreDirectory;
	}

	if (optionsWithDefaults.emitPrettierIgnore) {
		output[".prettierignore"] = ignoreDirectory;
	}

	for (const file in output) {
		if (file.endsWith(".js") || file.endsWith(".ts")) {
			output[file] = `// @ts-nocheck\n${output[file]}`;
		}
	}

	return output;
};

export function getFallbackMap<T extends string>(
	locales: T[],
	baseLocale: NoInfer<T>
): Record<T, T | undefined> {
	return Object.fromEntries(
		locales.map((lang) => {
			const fallbackLanguage = lookup(lang, {
				locales: locales.filter((l) => l !== lang),
				baseLocale,
			});

			if (lang === fallbackLanguage) return [lang, undefined];
			else return [lang, fallbackLanguage];
		})
	) as Record<T, T | undefined>;
}

const ignoreDirectory = `# ignore everything because the directory is auto-generated by inlang paraglide-js
# for more info visit https://inlang.com/m/gerre34r/paraglide-js
*
`;