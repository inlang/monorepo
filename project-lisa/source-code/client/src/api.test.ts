import { describe, it, expect, beforeAll } from "vitest"
import { open, createNodeishMemoryFs } from "./index.js"

// - loading multiple repositories is possible
// - loading a local repository is possible: const localRepository = await load("/bar.git", { fs: nodeFs })
// - loading a remote repository is possible
// - uses lisa.dev which acts as a proxy to github.com. Legacy git hosts don't support
// - all features we need like lazy fetching, auth, etc.

describe("main workflow", () => {
	let repository: ReturnType<typeof open>
	it("opens a repo url without error and without blocking io", async () => {
		// fix normalization of .git
		repository = open("github.com/inlang/example", {
			nodeishFs: createNodeishMemoryFs(),
		})
	})

	let file
	it("file is lazy fetched upon first access", async () => {
		file = await repository.nodeishFs.readFile("./inlang.config.js", { encoding: "utf-8" })
	})

	it("modifying the file", async () => {
		file += "\n// bar"
		await repository.nodeishFs.writeFile("./inlang.config.js", file)
	})

	it("can commit local modifications to the repo", async () => {
		const statusPre = await repository.status({ filepath: "inlang.config.js" })

		expect(statusPre).toBe("*modified")

		await repository.add({ filepath: "inlang.config.js" })
		await repository.commit({
			author: { name: "tests", email: "test@inlang.dev" },
			message: "test changes commit",
		})

		const statusPost = await repository.status({ filepath: "inlang.config.js" })

		expect(statusPost).toBe("unmodified")
	})

	it("exposes proper origin", async () => {
		const gitOrigin = await repository.getOrigin()
		expect(gitOrigin).toBe("github.com/inlang/example.git")
	})

	it("exposes current branch", async () => {
		const branch = await repository.getCurrentBranch()
		expect(branch).toBe("main")
	})

	it("exposes remotes", async () => {
		const remotes = await repository.listRemotes()
		expect(remotes).toEqual([
			{
				remote: "origin",
				url: "https://github.com/inlang/example",
			},
		])
	})

	it("exposes log", async () => {
		// TODO: do we want lazy history?
		const log = await repository.log({ depth: 1 })

		// TODO: migrate to exact object validation when we have the git proxy and can test local frozen repos
		expect(log.length).toBe(1)
		expect(log[0].oid).toBeTypeOf("string")
		expect(log[0].commit.message).toBeTypeOf("string")
	})

	it.todo("returns collaborator information", async () => {
		// currently would only test 1:1 the github api, enable this when we have lisa server auth
		const isCollaborator1 = await repository.isCollaborator({ username: "IamnotACollaborator" })
		expect(isCollaborator1).toBe(false)

		const isCollaborator2 = await repository.isCollaborator({ username: "lucidNTR" })
		expect(isCollaborator2).toBe(true)
	})

	it.todo("exposes metadata for repo", async () => {
		const metadata = await repository.getMeta()
		expect(metadata).toBe("main")
	})

	it.todo("allows pushing back to git origin", async () => {
		await repository.push()
	})
})
