import type { Storage } from "./storage/storage.js";
import { route as newRouteV1 } from "./routes/new-v1.js";
import { route as pushRouteV1 } from "./routes/push-v1.js";
import { route as pullRouteV1 } from "./routes/pull-v1.js";
import { route as getRouteV1 } from "./routes/get-v1.js";

export type LixServerApiHandler = (request: Request) => Promise<Response>;

export type LixServerApiHandlerContext = {
	request: Request;
	storage: Storage;
	params?: Record<string, string | undefined>;
};

export type LixServerApiHandlerRoute = (
	context: LixServerApiHandlerContext
) => Promise<Response>;

/**
 * The handler for the lix server protocol.
 *
 * @example
 *   Usage with a server framework.
 *
 *   ```ts
 * 	 // any server framework goes
 *   // here, like express, polka, etc.
 *   // frameworks that do not use
 *   // web standard Request and Response
 *   // objects will need to be mapped.
 *   const app = new Hono();
 *
 *   const lsaHandler = createServerApiHandler({ storage });
 *
 *   app.use('/lsp/*', async (req) => {
 *      await lsaHandler(req);
 *   });
 *   ```
 *
 * @example
 *   Testing the handler.
 *
 *   ```ts
 *   const lsaHandler = createServerApiHandler({ storage });
 *   const request = new Request('/lsp/new', {
 *     method: 'POST',
 *     body: new Blob(['...']),
 *   });
 *
 *   const response = await lsaHandler(request);
 *
 *   expect(response).to(...);
 *   ```
 */
export async function createServerApiHandler(args: {
	storage: Storage;
}): Promise<LixServerApiHandler> {
	const context = { storage: args.storage };

	return async (request) => {
		try {
			const path = new URL(request.url).pathname;
			if (path === "/lsa/get-v1") {
				return getRouteV1({ ...context, request });
			}
			if (path === "/lsa/new-v1") {
				return newRouteV1({ ...context, request });
			}
			if (path === "/lsa/push-v1") {
				return pushRouteV1({ ...context, request });
			}
			if (path === "/lsa/pull-v1") {
				return pullRouteV1({ ...context, request });
			}

			return Response.error();
		} catch (error) {
			console.error(error);
			return new Response(error as string, {
				status: 500,
			});
		}
	};
}