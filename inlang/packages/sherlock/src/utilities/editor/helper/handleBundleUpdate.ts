import type { InlangDatabaseSchema } from "@inlang/sdk"
import { getSelectedBundleByBundleIdOrAlias } from "../../helper.js"
import { msg } from "../../messages/msg.js"
import { state } from "../../state.js"
import type { UpdateBundleMessage } from "../editorView.js"
import type { Kysely } from "kysely"

/**
 * Handle the update of a bundle.
 *
 * @param message - The message containing the change.
 * @param bundleId - The ID of the bundle to update.
 */
export async function handleUpdateBundle({
	db,
	message,
}: {
	db: Kysely<InlangDatabaseSchema>
	message: UpdateBundleMessage
}) {
	const { change } = message

	try {
		if (!change.entityId || !change.entity) {
			throw new Error("No entity or entityId provided")
		}

		if (change.newData) {
			db.insertInto(change.entity)
				.values({
					...change.newData,
					// @ts-expect-error - we need to remove the nesting
					messages: undefined,
					variants: undefined,
				})
				.onConflict((oc) =>
					oc.column("id").doUpdateSet({
						...change.newData,
						// @ts-expect-error - we need to remove the nesting
						messages: undefined,
						variants: undefined,
					})
				)
				.execute()
		}
	} catch (e) {
		console.error(`Couldn't update ${change.entity}: ${e}`)
		msg(`Couldn't update ${change.entity}. ${String(e)}`, "error")
	}
}
