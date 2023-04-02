import { expect, it } from "vitest"
import { mockEnvironment } from "./mockEnvironment.js"
import { validateConfigFile } from "./validateConfigFile.js"

const env = await mockEnvironment({})

it("should error on import keywords", async () => {
	const shouldFail1 = `
    import { x } from "y"
  `
	const shouldFail2 = `
    export function defineConfig(env) {
      const shouldPass = env.$import("x")
      const butThisFails = import("x")
    }
  `
	const [, exception1] = await validateConfigFile({ file: shouldFail1, env })
	expect(exception1).toBeDefined()
	const [, exception2] = await validateConfigFile({ file: shouldFail2, env })
	expect(exception2).toBeDefined()
})
