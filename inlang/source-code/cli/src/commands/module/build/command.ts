import { Command } from "commander"
import { moduleBuildOptions } from "./moduleBuildOptions.js"
/**
 * The build command uses `esbuild-wasm` because platform interop is valued higher than speed.
 *
 * Using regular esbuild is faster but opens the door for platform specific code which
 * can lead to bugs. Thus, rather a bit slower but more reliable.
 */
import { context, Plugin, BuildContext } from "esbuild-wasm"

// Define the forbidden Node.js imports
const forbiddenNodeImports: string[] = ['fs', 'path', 'os', 'net']

// Define types for the build action function arguments
export interface BuildActionArgs {
	entry: string;
	outdir: string;
	watch: boolean;
}

interface ArgsTypes {
	path: string;
}

// Create an esbuild plugin to check Node.js imports
const nodeAPICheckerPlugin: Plugin = {
	name: 'node-api-checker',
	setup(build: BuildContext) {
	  build.onResolve({ filter: /./ }, (args: ArgsTypes) => {
		const importee = args.path;
		if (forbiddenNodeImports.includes(importee)) {
		  throw new Error(`Forbidden Node.js import detected: ${importee}`);
		}
	  });
	},
  };

export const build = new Command()
	.command("build")
	.description("build an inlang module.")
	// not using shorthand flags to be as explicit as possible
	// and increase discoverability "what is -c again?"
	.requiredOption(
		"--entry <entry>",
		"The path to the entry of the module. Usually src/index.{js|ts}."
	)
	// using outdir in anticipation that multiple output file are required in the future
	// such as manifest.json, code-splitting, json schema etc.
	.option("--outdir <path>", "The output directory.", "./dist")
	.option("--watch", "Watch for changes and rebuild.", false)
	.action(buildCommandAction)

export async function buildCommandAction(args: BuildActionArgs & { mockFile?: string}) {
	try {
		const ctx = await context(
			moduleBuildOptions({
				...args,
				// increase debugging experience by not minifying
				// in assumed dev mode
				minify: args.watch ? false : true,
				plugins: [
					nodeAPICheckerPlugin,
					{
						name: "logger",
						setup: ({ onEnd }) => onEnd(() => console.info("🎉 changes processed")),
					},
				],
			})
		)

		if (args.watch) {
			await ctx.watch({})
			console.info("👀 watching for changes...")
		} else {
			await ctx.rebuild()
			console.info("✅ build complete")
			await ctx.dispose()
		}
	} catch (e) {
		console.error("An error occurred while building the module:")
		console.error(e)
		process.exit(1)
	}
}
