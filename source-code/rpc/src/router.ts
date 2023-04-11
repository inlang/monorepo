import express from "express"
import bodyParser from "body-parser"
import { rpcHandler } from "typed-rpc/lib/express.js"
import { allRpcs } from "./functions/index.js"
import { route } from "./client.js"

export const router = express.Router()

// some rpcs can be quite large
router.use(bodyParser.json({ limit: "50mb" }))

router.use(route, rpcHandler(allRpcs))
