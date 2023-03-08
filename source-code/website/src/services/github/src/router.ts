import { serverSideEnv } from "@env"
import { decryptAccessToken } from "@src/services/auth/index.server.js"
import { PATH } from "./implementation.js"
import express from "express"

/**
 * Routes for the GitHub service.
 *
 * Proxies requests and adds the authorization header.
 */
export const router = express.Router()

const env = await serverSideEnv()

// matching all routes after the path with '*'
// and proxying the request to the GitHub API
router.all(
	PATH + "*",
	// Parse & make HTTP request body available at `req.body`
	express.json(),
	async (request, response, next) => {
		try {
			const encryptedAccessToken = request.session?.encryptedAccessToken
			const decryptedAccessToken = await decryptAccessToken({
				JWE_SECRET_KEY: env.JWE_SECRET_KEY,
				jwe: encryptedAccessToken,
			})
			// slicing the path to remove the path prefix
			const res = await fetch(request.url.slice(PATH.length), {
				method: request.method,
				// @ts-ignore
				headers: {
					authorization: `Bearer ${decryptedAccessToken}`,
					"Content-Type": request.get("Content-Type"),
				},
				// fetch throws an error if a method is GET and a body is attached
				// the body comes from the express.text() middleware
				// @ts-ignore
				body:
					// need to stringify otherwise github's api returns an error
					request.method === "GET" ? undefined : JSON.stringify(request.body),
			})
			if (res.headers.get("content-type")?.includes("json")) {
				response
					.status(res.status)
					.contentType(res.headers.get("content-type")!)
					.send(await res.json())
			} else {
				response.status(res.status).send(res.body)
			}
		} catch (error) {
			console.error("ERROR in github service: ", error)
			next(error)
		}
	},
)
