// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import type { DiffReport, LixPlugin } from "@lix-js/sdk";
import { loadDatabaseInMemory } from "sqlite-wasm-kysely";
import { initDb } from "../database/initDb.js";
import { applyChanges } from "./applyChanges.js";
import { detectConflicts } from "./detectConflicts.js";
import type { Bundle, Message, Variant } from "../database/schema.js";

export const inlangLixPluginV1: LixPlugin<{
	bundle: Bundle;
	message: Message;
	variant: Variant;
}> = {
	key: "inlang-lix-plugin-v1",
	glob: "*",
	applyChanges,
	detectConflicts,
	diff: {
		// TODO does not account for deletions
		file: async ({ old, neu }) => {
			// can only handle the database for now
			if (neu === undefined || neu.path?.endsWith("db.sqlite") === false) {
				return [];
			}
			const result: DiffReport[] = [];
			const oldDb = old
				? initDb({ sqlite: await loadDatabaseInMemory(old.data) })
				: undefined;

			const newDb = neu
				? initDb({
						sqlite: await loadDatabaseInMemory(neu.data),
				  })
				: undefined;

			const newProjectBundles = await newDb
				?.selectFrom("bundle")
				.selectAll()
				.execute();

			const newProjectMessages = await newDb
				?.selectFrom("message")
				.selectAll()
				.execute();
			const newProjectVariants = await newDb
				?.selectFrom("variant")
				.selectAll()
				.execute();

			for (const bundle of newProjectBundles ?? []) {
				const oldBundle = await oldDb
					?.selectFrom("bundle")
					.selectAll()
					.where("id", "=", bundle.id)
					.executeTakeFirst();
				result.push(
					...(await inlangLixPluginV1.diff.bundle({
						old: oldBundle,
						neu: bundle,
					}))
				);
			}
			for (const message of newProjectMessages ?? []) {
				const oldMessage = await oldDb
					?.selectFrom("message")
					.selectAll()
					.where("id", "=", message.id)
					.executeTakeFirst();

				result.push(
					...(await inlangLixPluginV1.diff.message({
						old: oldMessage,
						neu: message,
					}))
				);
			}
			for (const variant of newProjectVariants ?? []) {
				const oldVariant = await oldDb
					?.selectFrom("variant")
					.selectAll()
					.where("id", "=", variant.id)
					.executeTakeFirst();
				result.push(
					...(await inlangLixPluginV1.diff.variant({
						old: oldVariant,
						neu: variant,
					}))
				);
			}

			return result;
		},
		bundle: ({ old, neu }) => diffSnapshot({ old, neu, type: "bundle" }),
		message: ({ old, neu }) => diffSnapshot({ old, neu, type: "message" }),
		variant: ({ old, neu }) => diffSnapshot({ old, neu, type: "variant" }),
	},
};

function diffSnapshot({
	old,
	neu,
	type,
}: {
	old?: Bundle | Message | Variant;
	neu?: Bundle | Message | Variant;
	type: "bundle" | "message" | "variant";
}): DiffReport[] {
	if (old === undefined && neu) {
		return [{ type, old, neu, operation: "create" } satisfies DiffReport];
	} else if (old !== undefined && neu === undefined) {
		return [{ type, old, neu, operation: "delete" } satisfies DiffReport];
	} else if (old && neu) {
		const hasDiff = JSON.stringify(old) !== JSON.stringify(neu);
		if (hasDiff) {
			return [
				{
					type,
					meta: {
						// id is required for deletions
						id: old.id ?? neu.id,
					},
					operation: "update",
					old,
					neu,
				} satisfies DiffReport,
			];
		}
	}
	return [];
}
