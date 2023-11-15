import { registry } from "@inlang/marketplace-registry"
import { convert } from "@inlang/markdown"
import type { PageContext } from "#src/renderer/types.js"
import type { PageProps } from "./index.page.jsx"
import type { MarketplaceManifest } from "@inlang/marketplace-manifest"
import fs from "node:fs/promises"
import { redirect } from "vike/abort"

const repositoryRoot = import.meta.url.slice(0, import.meta.url.lastIndexOf("inlang/source-code"))

export async function onBeforeRender(pageContext: PageContext) {
	const item = registry.find(
		(item: any) => item.uniqueID === pageContext.routeParams.uid
	) as MarketplaceManifest & { uniqueID: string }

	if (!item) throw redirect("/m/404")

	if (item.id.replaceAll(".", "-").toLowerCase() !== pageContext.routeParams.id?.toLowerCase()) {
		throw redirect(`/m/${item.uniqueID}/${item.id.replaceAll(".", "-").toLowerCase()}`)
	}

	const readme = () => {
		return typeof item.readme === "object" ? item.readme.en : item.readme
	}

	const text = await (readme().includes("http")
		? (await fetch(readme())).text()
		: await fs.readFile(new URL(readme(), repositoryRoot), "utf-8"))

	const markdown = await convert(text)

	const recommends = item.recommends
		? registry.filter((i: any) => {
				for (const recommend of item.recommends!) {
					if (recommend.replace("m/", "") === i.uniqueID) return true
				}
				return false
		  })
		: undefined

	return {
		pageContext: {
			pageProps: {
				markdown: markdown,
				manifest: item,
				recommends: recommends,
			} satisfies PageProps,
		},
	}
}
