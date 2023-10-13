import { registry } from "@inlang/marketplace-registry"
import { convert } from "@inlang/markdown"
import type { PageContext } from "#src/renderer/types.js"
import type { PageProps } from "./index.page.jsx"
import type { MarketplaceManifest } from "@inlang/marketplace-manifest"
import { redirect } from "vite-plugin-ssr/abort"

export async function onBeforeRender(pageContext: PageContext) {
	const item = registry.find(
		(item: any) => item.id === pageContext.routeParams.id
	) as MarketplaceManifest

	if (!item) {
		console.error("Item not found")
		throw redirect("/marketplace/404")
	}

	const text = await (
		await fetch(typeof item.readme === "object" ? item.readme.en : item.readme)
	).text()
	const markdown = await convert(text)

	return {
		pageContext: {
			pageProps: {
				markdown: markdown,
				manifest: item,
			} satisfies PageProps,
		},
	}
}
