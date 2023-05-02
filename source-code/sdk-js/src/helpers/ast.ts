import type { Node } from "estree"
import type { Result } from "@inlang/core/utilities"
import { walk as jsWalk, type SyncHandler } from "estree-walker"
import { walk as svelteWalk } from "svelte/compiler"
import type { Ast } from "../../../../node_modules/svelte/types/compiler/interfaces.js"
import { types } from "recast"
import { parseModule } from "magicast"

export class FindAstError extends Error {
	readonly #id = "FindAstException"
}

type SyncHandlerParams = Parameters<SyncHandler>

type FindAstConditionParameter<N extends types.namedTypes.Node | Node> = {
	node?: N | null
	parent?: types.namedTypes.Node | Node | null
	key?: SyncHandlerParams[2]
	index?: SyncHandlerParams[3]
}

type FindAstCondition<N extends types.namedTypes.Node | Node> = (
	parameter: FindAstConditionParameter<N>,
) => boolean

export type NodeInfoMapEntry<P extends Node | types.namedTypes.Node | null> = {
	parent: P
	key: P extends null ? undefined | null : keyof P
	index: number | null | undefined
	runOnNode: boolean
}

export type NodeInfoMap<P extends Node | types.namedTypes.Node | null> = Map<
	Node | types.namedTypes.Node,
	NodeInfoMapEntry<P>
>

export type RunOn<N extends types.namedTypes.Node | Node, T> = (
	node: FindAstConditionParameter<N>["node"],
) => ((meta: NodeInfoMap<types.namedTypes.Node | Node | null>) => T) | undefined

type FindAst<T> = <W extends types.namedTypes.Node | Node | Ast>(
	walker: typeof jsWalk,
) => (
	sourceAst: W,
	matchers: [
		FindAstCondition<types.namedTypes.Node | Node>,
		...FindAstCondition<types.namedTypes.Node | Node>[],
	],
	runOn: RunOn<types.namedTypes.Node | Node, T>,
) => Result<T[], FindAstError>
// Insert element only if all ancestors match matchers
// find a nodes parent where the node matches and where all ancestors match
// Create a map for matchingNodes: Map<Node, matchedCount>
//

// TODO: rework error handling
const findAst = (<W>(walker: typeof jsWalk) =>
	(sourceAst: W, matchers, runOn) => {
		const matchCount = new Map<Node, number>()
		const matches: Node[] = []
		const nodeInfoMap: NodeInfoMap<Node | types.namedTypes.Node | null> = new Map()
		// Find matching node, the corresponding parent and insertionPoint
		walker(sourceAst as Node, {
			enter(node, parent, key, index) {
				nodeInfoMap.set(node, {
					parent,
					key: key as keyof typeof parent,
					index,
					runOnNode: runOn(node) !== undefined,
				})
				const matchCountAncestor = !parent ? 0 : matchCount.get(parent) ?? 0
				if (matchCountAncestor < matchers.length) {
					const matcher = matchers[matchCountAncestor]
					const isMatching = matcher ? matcher({ node, parent, key, index }) : false
					if (isMatching) {
						matchCount.set(node, matchCountAncestor + 1)
						if (matchCountAncestor === matchers.length - 1) matches.push(node)
					}
				} else this.skip()
			},
		})
		if (matches.length === 0)
			return [
				undefined,
				new Error("Can't find path in ast matching the passed matchers") as FindAstError,
			]
		const runResults = []
		for (const match of matches) {
			const matchPath: (Node | types.namedTypes.Node)[] = []
			let currentNode: Node | types.namedTypes.Node | null | undefined = match
			while (currentNode) {
				matchPath.splice(0, 0, currentNode)
				currentNode = nodeInfoMap.get(currentNode)?.parent
			}
			// matchpath needs to contain one node that isInsertionRefNode
			const runOnNode = matchPath.find((node) => nodeInfoMap.get(node)?.runOnNode)
			const fn = runOn(runOnNode)
			if (!runOnNode)
				return [undefined, new Error("Can't find specified insertion point") as FindAstError]
			if (fn) runResults.push(fn(nodeInfoMap))
		}

		return [runResults, undefined]
	}) satisfies FindAst<any>

export const findAstJs = findAst<types.namedTypes.Node | Node>(jsWalk)

export const findAstSvelte = findAst<Ast>(svelteWalk)

const n = types.namedTypes

const loadMatchers: Parameters<typeof findAstJs>[1] = [
	({ node }) => n.ExportNamedDeclaration.check(node),
	({ node }) => n.VariableDeclaration.check(node),
	({ node }) => n.VariableDeclarator.check(node),
	({ node }) => n.Identifier.check(node) && node.name === "load",
]

export const findLoadDeclaration = (ast: types.namedTypes.Node | Node) =>
	(findAstJs(ast, loadMatchers, (node) =>
		n.VariableDeclarator.check(node)
			? (meta) => {
					return { node, meta }
			  }
			: undefined,
	)[0] as {
		node: types.namedTypes.VariableDeclarator
	}[]) ?? []

const emptyLoadFunction = `export const load = async () => {};`
export const emptyLoadExportNodes = () =>
	(parseModule(emptyLoadFunction).$ast as types.namedTypes.Program).body

export const inlangSdkJsStores = ["i", "language"]
