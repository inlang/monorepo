import { describe, expect, test } from "vitest"
import { parse } from "acorn"
import {
	wrapVariableDeclaration,
	insertAst,
	WrapWithCallExpressionError,
	InsertAstError,
} from "./ast.js"
import { generate } from "astring"
import type { ArrowFunctionExpression, Program } from "estree"
import type { Options } from "acorn"

const acornOptions = {
	ecmaVersion: 2020,
	sourceType: "module",
} as Options

describe("ast - wrapVariableDeclaration", () => {
	test("Wraps a simple arrow function declaration", async () => {
		const input = `
            export const load = () => {
                return { data: true }
            }
        `
		const expected = `
            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const inputAst = parse(input, acornOptions) as unknown as Program
		const [resultAst] = wrapVariableDeclaration(inputAst, "load", "wrapFn")
		const expectedAst = parse(expected, acornOptions) as unknown as Program
		const expectedCode = generate(expectedAst)
		const resultCode = generate(resultAst!)
		expect(resultCode).toEqual(expectedCode)
	})

	test("Return exception for nonexistent declarator", () => {
		const input = `
            export const load = () => {
                return { data: true }
            }
        `
		// TODO: find a fully ESTree compatible parser and remove the below typecasts
		const inputAst = parse(input, acornOptions) as unknown as Program
		const [, exception] = wrapVariableDeclaration(inputAst, "blue", "wrapFn")
		expect(exception).toBeInstanceOf(WrapWithCallExpressionError)
	})

	test("Doesn't manipulate inputs", async () => {
		const input = `
            export const load = () => {
                return { data: true }
            }
        `
		const inputAst = parse(input, acornOptions) as unknown as Program
		const inputAstClone = structuredClone(inputAst)
		wrapVariableDeclaration(inputAst, "load", "wrapFn")
		expect(inputAst).toEqual(inputAstClone)
	})
})

describe("ast - insertAst", () => {
	test("Inserts a simple import statement, before", async () => {
		const insertion = `
            import { wrapFn } from 'some/path'
        `
		const source = `
            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const expected = `
            import { wrapFn } from 'some/path'

            export const load = wrapFn(() => {
            return { data: true }
            })
        `
		const insertionAst = parse(insertion, acornOptions) as unknown as Program
		const sourceAst = parse(source, acornOptions) as unknown as Program
		const expectedAst = parse(expected, acornOptions) as unknown as Program
		const [resultAst] = insertAst(sourceAst, insertionAst.body[0]!, {
			before: ["body", "0"],
		})
		const expectedCode = generate(expectedAst)
		const resultCode = generate(resultAst!)
		expect(resultCode).toEqual(expectedCode)
	})

	test("Inserts a load function, after", async () => {
		const insertion = `
            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const source = `
            import { wrapFn } from 'some/path'
        `
		const expected = `
            import { wrapFn } from 'some/path'

            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const insertionAst = parse(insertion, acornOptions) as unknown as Program
		const sourceAst = parse(source, acornOptions) as unknown as Program
		const expectedAst = parse(expected, acornOptions) as unknown as Program
		const [resultAst] = insertAst(sourceAst, insertionAst.body[0]!, {
			after: ["body", "0"],
		})
		const expectedCode = generate(expectedAst)
		const resultCode = generate(resultAst!)
		expect(resultCode).toEqual(expectedCode)
	})

	test("Inserts code into wrap fn, before", async () => {
		const source = `
            import { wrapFn } from 'some/path'

            export const load = wrapFn()
        `
		const expected = `
            import { wrapFn } from 'some/path'

            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const insertionAst = {
			type: "ArrowFunctionExpression",
			id: undefined,
			expression: false,
			generator: false,
			async: false,
			params: [],
			body: {
				type: "BlockStatement",
				body: [
					{
						type: "ReturnStatement",
						argument: {
							type: "ObjectExpression",
							properties: [
								{
									type: "Property",
									method: false,
									shorthand: false,
									computed: false,
									key: {
										type: "Identifier",
										name: "data",
									},
									value: {
										type: "Literal",
										value: true,
										raw: "true",
									},
									kind: "init",
								},
							],
						},
					},
				],
			},
		} as ArrowFunctionExpression
		const sourceAst = parse(source, acornOptions) as unknown as Program
		const expectedAst = parse(expected, acornOptions) as unknown as Program
		const [resultAst] = insertAst(sourceAst, insertionAst, {
			before: ["body", "1", "declaration", "declarations", "0", "init", "arguments", "0"],
		})
		const expectedCode = generate(expectedAst)
		const resultCode = generate(resultAst!)
		expect(resultCode).toEqual(expectedCode)
	})

	test("Only multiples of two are allowed for positional information", async () => {
		const insertion = `
            import { wrapFn } from 'some/path'
        `
		const source = `
            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const insertionAst = parse(insertion, acornOptions) as unknown as Program
		const sourceAst = parse(source, acornOptions) as unknown as Program
		const [, exception] = insertAst(sourceAst, insertionAst.body[0]!, {
			before: ["body", "0", "fake"],
		})
		expect(exception).toBeInstanceOf(InsertAstError)

		const [, exception2] = insertAst(sourceAst, insertionAst.body[0]!, {
			after: ["body", "0", "fake"],
		})
		expect(exception2).toBeInstanceOf(InsertAstError)
	})

	test("Return exception for unreachable path", async () => {
		const insertion = `
            import { wrapFn } from 'some/path'
        `
		const source = `
            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const insertionAst = parse(insertion, acornOptions) as unknown as Program
		const sourceAst = parse(source, acornOptions) as unknown as Program
		const [, exception] = insertAst(sourceAst, insertionAst.body[0]!, {
			before: ["body", "0", "fake", "path", "here"],
		})
		expect(exception).toBeInstanceOf(InsertAstError)
	})

	test("Doesn't manipulate inputs", async () => {
		const insertion = `
            import { wrapFn } from 'some/path'
        `
		const source = `
            export const load = wrapFn(() => {
                return { data: true }
            })
        `
		const insertionAst = parse(insertion, acornOptions) as unknown as Program
		const insertionAstClone = structuredClone(insertionAst)
		const sourceAst = parse(source, acornOptions) as unknown as Program
		const sourceAstClone = structuredClone(sourceAst)
		insertAst(sourceAst, insertionAst.body[0]!, { before: ["body", "0"] })
		expect(sourceAst).toEqual(sourceAstClone)
		expect(insertionAst).toEqual(insertionAstClone)
	})
})
