import type { Message, MessageQueryApi } from "@inlang/messages"
import { ReactiveMap } from "@solid-primitives/map"
import { createEffect } from "./solid.js"

/**
 * Creates a query API for messages.
	@@ -9,41 +9,43 @@ import { createEffect } from "./solid.js"
 */
export function createReactiveQuery(messages: () => Array<Message>): MessageQueryApi {
	//let index: ReactiveMap<string, Message>
	const index = new ReactiveMap<string, Message>([])

	createEffect(() => {
		// TODO: update index
		// q: replace all entries?
		// q: just add new entries?
		// q: remove old entries?
		// setIndex(new ReactiveMap(messages().map((message) => [message.id, message])))
	})

	return {
		create: ({ data }) => {
			return index.set(data.id, data)
		},
		get: ({ where }) => {
			return structuredClone(index.get(where.id))
		},
		getAll: () => {
			return structuredClone([...index.values()])
		},
		update: ({ where, data }) => {
			const message = index.get(where.id)
			if (message === undefined) return
			index!.set(where.id, { ...message, ...data })
		},
		upsert: ({ where, data }) => {
			const message = index.get(where.id)
			if (message === undefined) {
				index.set(where.id, data)
			} else {
				index.set(where.id, { ...message, ...data })
			}
		},
		delete: ({ where }) => {
			index.delete(where.id)
		},
	}
}
