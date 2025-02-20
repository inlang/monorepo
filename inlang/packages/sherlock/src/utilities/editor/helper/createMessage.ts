/**
 * Delete a single variant.
 *
 * @param db - The Kysely database instance.
 * @param message - The message to create.
 */

import type { InlangDatabaseSchema, Message } from "@inlang/sdk"
import type { Kysely } from "kysely"
import { msg } from "../../messages/msg.js"
import { CONFIGURATION } from "../../../configuration.js"

export const createMessage = async ({
	db,
	message,
}: {
	db: Kysely<InlangDatabaseSchema>
	message: Message
}) => {
	try {
		// Insert the message
		await db.insertInto("message").values(message).execute()

		await db
			.insertInto("variant")
			.values({
				messageId: message.id!,
			})
			.execute()
	} catch (error) {
		console.error("Failed to create message", error)
		msg(`Failed to create message. ${String(error)}`, "error")
	}

	CONFIGURATION.EVENTS.ON_DID_EDIT_MESSAGE.fire()
	CONFIGURATION.EVENTS.ON_DID_EDITOR_VIEW_CHANGE.fire()
}
