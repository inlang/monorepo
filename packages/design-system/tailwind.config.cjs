const { colors, typography, components } = require("./dist/index.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/components/**/*.ts"],
	theme: {},
	plugins: [
		colors.configure(colors.defaultConfig),
		typography.configure(),
		components.configure(),
	],
	// !safelisting the utlities used by the components is not required
	// the used utility classes are extracted by the tailwind cli.
	// TLDR tailwind will crash because no tailwind.css exists
};
