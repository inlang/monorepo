import type { InlangDatabaseSchema } from "@inlang/sdk"
import type { Kysely } from "kysely"
import { CONFIGURATION } from "../../../configuration.js"
import { msg } from "../../messages/msg.js"

/**
 * Delete a single variant.
 *
 * @param db - The Kysely database instance.
 * @param variantId - The ID of the variant to delete.
 */
export const deleteVariant = async ({
	db,
	variantId,
}: {
	db: Kysely<InlangDatabaseSchema>
	variantId: string
}) => {
	try {
		// Delete the variant
		await db.deleteFrom("variant").where("variant.id", "=", variantId).execute()
	} catch (error) {
		console.error("Failed to delete variant", error)
		msg(`Failed to delete variant. ${String(error)}`, "error")
	}

	CONFIGURATION.EVENTS.ON_DID_EDIT_MESSAGE.fire()
	CONFIGURATION.EVENTS.ON_DID_EDITOR_VIEW_CHANGE.fire()
}
