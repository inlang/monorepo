import type { DiffReport, LixPlugin } from "../plugin.js";
import papaparse from "papaparse";

type Cell = { rowIndex: number; columnIndex: number; text: string };

/**
 * A mock plugin that can be used for testing purposes.
 */
export const mockCsvPlugin: LixPlugin<{
	cell: Cell;
}> = {
	key: "csv",
	glob: "*.csv",
	applyChanges: async ({ file, changes, lix }) => {
		const parsed = papaparse.parse(new TextDecoder().decode(file.data));
		for (const change of changes) {
			if (change.value) {
				const { rowIndex, columnIndex, text } = change.value as unknown as Cell;
				// create the row if it doesn't exist
				if (!parsed.data[rowIndex]) {
					parsed.data[rowIndex] = [];
				}
				for (let i = 0; i < columnIndex; i++) {
					// create the column if it doesn't exist recursively
					// till the current cell is reached
					// else, setting the cell value based on the index
					// will lead to bugs
					if (!(parsed.data[rowIndex] as any)[i]) {
						(parsed.data[rowIndex] as any)[i] = "";
					}
				}
				// update the cell
				(parsed.data[rowIndex] as any)[columnIndex] = text;
			} else {
				if (change.parent_id === undefined) {
					throw new Error(
						"Expected a previous change to exist if a value is undefined (a deletion)",
					);
				}
				// TODO possibility to avoid querying the parent change?
				const parent = await lix.db
					.selectFrom("change")
					.innerJoin("snapshot", "snapshot.id", "change.snapshot_id")
					.selectAll()
					.where("change.id", "=", change.parent_id)
					.executeTakeFirstOrThrow();

				const { rowIndex, columnIndex } = parent.value as unknown as Cell;
				(parsed.data as any)[rowIndex][columnIndex] = "";
				// if the row is empty after deleting the cell, remove it
				if (
					(parsed.data[rowIndex] as any).every((cell: string) => cell === "")
				) {
					parsed.data.splice(rowIndex, 1);
				}
			}
		}
		const csv = papaparse.unparse(parsed as any, {
			...parsed.meta,
			// parse.meta and unparse mapping
			newline: parsed.meta.linebreak,
		});
		return {
			fileData: new TextEncoder().encode(csv),
		};
	},
	diff: {
		file: async ({ before, after }) => {
			const result: DiffReport[] = [];
			const beforeParsed = before
				? papaparse.parse(new TextDecoder().decode(before.data))
				: undefined;
			const afterParsed = after
				? papaparse.parse(new TextDecoder().decode(after.data))
				: undefined;

			const numRows = Math.max(
				beforeParsed?.data.length ?? 0,
				afterParsed?.data.length ?? 0,
			);

			if (afterParsed) {
				for (let i = 0; i < numRows; i++) {
					const beforeRow = beforeParsed?.data[i] as string[];
					const afterRow = afterParsed.data[i] as string[];
					const numColumns = Math.max(beforeRow?.length ?? 0, afterRow?.length ?? 0);
					for (let j = 0; j < numColumns; j++) {
						const beforeText = beforeRow?.[j];
						const afterText = afterRow?.[j];
						const diff = await mockCsvPlugin.diff.cell({
							before: beforeText
								? {
										rowIndex: i,
										columnIndex: j,
										text: beforeText,
									}
								: undefined,
							after: afterText
								? {
										rowIndex: i,
										columnIndex: j,
										text: afterText,
									}
								: undefined,
						});

						if (diff.length > 0) {
							result.push(...diff);
						}
					}
				}
			}
			return result;
		},
		// @ts-expect-error type narrowing bug
		cell: async ({ before, after }) => {
			if (before?.text === after?.text) {
				return [];
			} else {
				return [
					{
						type: "cell",
						operation: before && after ? "update" : before ? "delete" : "create",
						before,
						after,
					},
				];
			}
		},
	},
};