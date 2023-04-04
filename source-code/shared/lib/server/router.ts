import express from "express"
import { openaiService } from "../openai/router.js"
import { telemetryService } from "../telemetry/router.js"
/**
 * Entry point for all services that require a server.
 *
 * @example
 *   const app = express()
 *   app.use(inlangServices)
 */
export const router = express.Router()

router.use(openaiService)
router.use(telemetryService)
