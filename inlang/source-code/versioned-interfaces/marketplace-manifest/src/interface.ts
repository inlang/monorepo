import { Type, type Static } from "@sinclair/typebox"
import { Translatable } from "@inlang/translatable"
import { ProjectSettings } from "@inlang/project-settings"

/**
 *
 * ---------------- BASE INTERFACES ----------------
 */

const tableOfContentsStartpage = Type.Object({
	startpage: Type.Literal(true),
	path: Translatable(
		Type.TemplateLiteral("${string}.md", {
			description: "The path to the markdown file.",
		}),
	),
	slug: Type.Literal(""),
	title: Translatable(Type.String()),
})

const tableOfContentsItem = Type.Object({
	startpage: Type.Optional(Type.Literal(false)),
	path: Translatable(
		Type.TemplateLiteral("${string}/${string}.md", {
			description: "The path to the markdown file.",
		}),
	),
	slug: Type.String(),
	title: Translatable(Type.String()),
})

const MarketplaceManifestBase = Type.Object({
	$schema: Type.Optional(Type.Literal("https://inlang.com/schema/marketplace-manifest")),
	icon: Type.Optional(Type.String()),
	coverImage: Type.Optional(
		Type.String({ description: "The cover displayed in the marketplace." }),
	),
	displayName: Translatable(
		Type.String({ description: "The name which is displayed in the marketplace." }),
	),
	description: Translatable(
		Type.String({
			description: "The description which is displayed in the marketplace.",
		}),
	),
	publisherName: Type.String(),
	publisherIcon: Type.Optional(Type.String()),
	tableOfContents: Type.Array(Type.Union([tableOfContentsStartpage, tableOfContentsItem])),
	keywords: Type.Array(Type.String()),
	license: Type.Literal("Apache-2.0"),
	website: Type.Optional(
		Type.String({ description: "An optional link to the website of the marketplace item." }),
	),
})

const ModuleBase = Type.Intersect([
	MarketplaceManifestBase,
	Type.Object({
		module: ProjectSettings["allOf"][0]["properties"]["modules"]["items"],
	}),
])

/**
 * ---------------- MARKETPLACE ITEMS ----------------
 */

const App = Type.Intersect([
	MarketplaceManifestBase,
	Type.Object({
		id: Type.TemplateLiteral("app.${string}.${string}"),
	}),
])

const Library = Type.Intersect([
	MarketplaceManifestBase,
	Type.Object({
		id: Type.TemplateLiteral("library.${string}.${string}"),
	}),
])

const Plugin = Type.Intersect([
	ModuleBase,
	Type.Object({
		id: Type.TemplateLiteral("plugin.${string}.${string}"),
	}),
])

const MessageLintRule = Type.Intersect([
	ModuleBase,
	Type.Object({
		id: Type.TemplateLiteral("messageLintRule.${string}.${string}"),
	}),
])

export type MarketplaceManifest = Static<typeof MarketplaceManifest>
export const MarketplaceManifest = Type.Union([App, Library, Plugin, MessageLintRule], {
	description: "The manifest of a marketplace item.",
})
