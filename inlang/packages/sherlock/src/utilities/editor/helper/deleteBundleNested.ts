import { Kysely } from "kysely"
import { type InlangDatabaseSchema } from "@inlang/sdk"

/**
 * Delete a bundle along with its nested messages and variants.
 *
 * @param db - The Kysely database instance.
 * @param bundleId - The ID of the bundle to delete.
 */
export const deleteBundleNested = async ({
	db,
	bundleId,
}: {
	db: Kysely<InlangDatabaseSchema>
	bundleId: string
}) => {
	try {
		// Step 1: Delete variants associated with the messages of the bundle
		await db
			.deleteFrom("variant")
			.where("variant.messageId", "in", (qb) =>
				qb.selectFrom("message").select("message.id").where("message.bundleId", "=", bundleId)
			)
			.execute()

		// Step 2: Delete messages associated with the bundle
		await db.deleteFrom("message").where("message.bundleId", "=", bundleId).execute()

		// Step 3: Delete the bundle itself
		await db.deleteFrom("bundle").where("bundle.id", "=", bundleId).execute()
	} catch (error) {
		console.error("Failed to delete bundle", error)
	}
}
