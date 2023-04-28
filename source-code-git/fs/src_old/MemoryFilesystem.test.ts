import { test, expect, afterAll, describe } from "vitest"
import type { MemoryFilesystem } from "./schema-internal.js"

const runFsTestSuite = (name: string, tempDir: string, fs: MemoryFilesystem) => {
	describe(name, async () => {
		expect(await fs.readdir(`${tempDir}/`)).toEqual([])

		test("recursive mkdir", async () => {
			await fs.mkdir(`${tempDir}/home/user1/documents///`)
			await fs.mkdir(`${tempDir}/home/user1/../user1//downloads`)
			expect(await fs.readdir(`/${tempDir}`)).toEqual(["home"])
			expect(await fs.readdir(`/${tempDir}/home/user1/`)).toEqual(["documents", "downloads"])
		})

		test("file r/w", async () => {
			await fs.writeFile(
				`/${tempDir}/home/user1/../user1/documents/./file1/`,
				"text in the first file",
			)
			await fs.writeFile(`/${tempDir}/file2`, "text in the second file")

			expect(await fs.readdir(`/${tempDir}/home/user1/documents/`)).toEqual(["file1"])
			const dirents = await fs.readdir(tempDir)
			expect(dirents).toContain("home")
			expect(dirents).toContain("file2")
			expect(dirents).toHaveLength(2)

			expect(await fs.readFile(`${tempDir}/home/user1/./documents/././file1`)).toEqual(
				"text in the first file",
			)

			expect(await fs.readFile(`/${tempDir}/file2`)).toEqual("text in the second file")
		})

		describe("throw errors", async () => {
			test("readFile", async () => {
				await expect(async () => await fs.readFile(`/${tempDir}/home/dne`)).rejects.toThrow(
					/ENOENT/,
				)

				await expect(async () => await fs.readFile(`/${tempDir}/home/user1`)).rejects.toThrow(
					/EISDIR/,
				)
			})

			test("readdir", async () => {
				await expect(async () => await fs.readdir(`/${tempDir}/home/dne`)).rejects.toThrow(/ENOENT/)

				await expect(
					async () => await fs.readdir(`/${tempDir}/home/user1/documents/file1`),
				).rejects.toThrow(/ENOTDIR/)
			})
		})

		test("toJson", async () => {
			const fsJson = await fs.toJson({ dir: tempDir })

			expect(Object.keys(fsJson)).toHaveLength(2)

			expect(Object.keys(fsJson)).toEqual(
				expect.arrayContaining([
					expect.stringContaining(`${tempDir}/file2`),
					expect.stringContaining(`${tempDir}/home/user1/documents/file1`),
				]),
			)

			expect(Object.values(fsJson)).toEqual(
				expect.arrayContaining([
					expect.stringContaining("text in the first file"),
					expect.stringContaining("text in the second file"),
				]),
			)
		})

		test("fromJson", async () => {
			const fsJson = await fs.toJson({ dir: tempDir })
			await fs.rm(tempDir).catch((err) => {
				if (err.code !== "ENOENT") throw err
			})
			await fs.fromJson(fsJson)
			expect(await fs.toJson({ dir: tempDir })).toEqual(fsJson)
		})

		test("rm", async () => {
			await fs.rm(`${tempDir}/home/user1/documents/file1`)
			await expect(
				async () => await fs.readFile(`/${tempDir}/home/user1/documents/file1`),
			).rejects.toThrow(/ENOENT/)
			await fs.writeFile(`/${tempDir}/home/user1/documents/file1`, "text in the first file")
			await fs.rm(`/${tempDir}/home/user1`)

			await expect(async () => await fs.readdir(`/${tempDir}/home/user1`)).rejects.toThrow(/ENOENT/)

			expect(await fs.readdir(`/${tempDir}/home`)).toEqual([])
		})

		afterAll(async () => {
			if (tempDir !== "") {
				await fs.rm(tempDir)
			}
		})
	})
}

/* global process */
if (process?.versions?.node) {
	const _fs = await import("node:fs/promises")
	const join = await import("node:path").then((path) => path.join)
	const tmpdir = await import("node:os").then((os) => os.tmpdir)
	const fromNodeFs = await import("./fromNodeFs.js").then((imp) => imp.fromNodeFs)

	runFsTestSuite("node fs", await _fs.mkdtemp(join(tmpdir(), "__vitest_test-")), fromNodeFs(_fs))
}

import { createMemoryFs } from "./createMemoryFs.js"
runFsTestSuite("memory fs", "", createMemoryFs())
