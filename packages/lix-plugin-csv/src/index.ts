import { type LixPlugin } from "@lix-js/sdk";
import { applyChanges } from "./applyChanges.js";
import { detectChanges } from "./detectChanges.js";
import { CellDiff } from "./diff.js";
import { CellSchemaV1 } from "./schemas/cell.js";

export const plugin: LixPlugin = {
	key: "lix_plugin_csv",
	detectChangesGlob: "*.csv",
	detectChanges,
	diffUiComponents: [
		{
			schema_key: CellSchemaV1.key,
			component: CellDiff,
		},
	],
	applyChanges,
};

export { CellSchemaV1 } from "./schemas/cell.js";
export { HeaderSchemaV1 } from "./schemas/header.js";
export { RowSchemaV1 } from "./schemas/row.js";
