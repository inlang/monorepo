import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                myCustomGlobal: "readonly"
            }
        }
        // ...other config
    },
	{
		files: ["**/*.{js,ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"no-restricted-imports": [
				"error",
				{
					name: "@lix-js/sdk",
					message:
						"Importing from the compiled dist is not allowed (and you likely did this by accident). Import from source directly instead e.g. `./file.js`",
				},
			],
		},
	},
	{
		files: ["**/*.test.ts"],
		rules: {
			// any makes testing sometimes easier
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
	{
        ignores: ["dist/*", "dist/**", "snippets"]
    },
];
