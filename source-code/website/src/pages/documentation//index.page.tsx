import { For, Show } from "solid-js"
import { Layout as RootLayout } from "@src/pages/Layout.jsx"
import { Markdown, parseMarkdown } from "@src/services/markdown/index.js"
import type { ProcessedTableOfContents } from "./index.page.server.jsx"
import { currentPageContext } from "@src/renderer/state.js"
import { Callout } from "@src/services/markdown/src/tags/Callout.jsx"
import type SlDetails from "@shoelace-style/shoelace/dist/components/details/details.js"
import { Meta, Title } from "@solidjs/meta"

/**
 * The page props are undefined if an error occurred during parsing of the markdown.
 */
export type PageProps = {
	processedTableOfContents: ProcessedTableOfContents
	markdown: Awaited<ReturnType<typeof parseMarkdown>>
}

export function Page(props: PageProps) {
	let mobileDetailMenu: SlDetails | undefined

	return (
		<>
			{/* frontmatter is undefined on first client side nav  */}
			<Title>{props.markdown?.frontmatter?.title}</Title>
			<Meta name="description" content={props.markdown?.frontmatter?.description} />
			<RootLayout>
				{/* important: the responsive breakpoints must align throughout the markup! */}
				<div class="flex flex-col grow md:grid md:grid-cols-4 gap-10 w-full">
					{/* desktop navbar */}
					{/* 
					hacking the left margins to apply bg-surface-2 with 100rem 
				    (tested on an ultrawide monitor, works!) 
				*/}
					<nav class="hidden md:block -ml-[100rem] pl-[100rem] bg-surface-2 py-4 pr-8">
						{/* `Show` is a hotfix when client side rendering loaded this page
						 * filteredTableContents is not available on the client.
						 */}
						<Show when={props.processedTableOfContents}>
							<NavbarCommon {...props} />
						</Show>
					</nav>
					{/* Mobile navbar */}
					<nav class="block md:hidden overflow-y-auto overflow-auto min-w-full pt-5">
						<sl-details ref={mobileDetailMenu}>
							<h3 slot="summary" class="font-medium">
								Menu
							</h3>
							{/* `Show` is a hotfix when client side rendering loaded this page
							 * filteredTableContents is not available on the client.
							 */}
							<Show when={props.processedTableOfContents}>
								<NavbarCommon {...props} onLinkClick={() => mobileDetailMenu?.hide()} />
							</Show>
						</sl-details>
					</nav>
					<Show
						when={props.markdown?.renderableTree}
						fallback={<p class="text-danger">{props.markdown?.error}</p>}
					>
						{/* 
					rendering on the website is broken due to relative paths and 
					the escaping of html. it is better to show the RFC's on the website
					and refer to github for the rendered version than to not show them at all. 
				*/}
						<div class="w-full justify-self-center md:p-6 md:col-span-3">
							<Show when={currentPageContext.urlParsed.pathname.includes("rfc")}>
								<Callout variant="warning">
									<p>
										The rendering of RFCs on the website might be broken.{" "}
										<a href="https://github.com/inlang/inlang/tree/main/rfcs" target="_blank">
											Read the RFC on GitHub instead.
										</a>
									</p>
								</Callout>
							</Show>
							<div
								// change the col-span to 2 if a right side nav bar should be rendered
								class="w-full justify-self-center md:col-span-3"
							>
								<Markdown renderableTree={props.markdown.renderableTree!} />
							</div>
						</div>
					</Show>
				</div>
			</RootLayout>
		</>
	)
}

function NavbarCommon(props: {
	processedTableOfContents: PageProps["processedTableOfContents"]
	onLinkClick?: () => void
}) {
	return (
		<ul role="list" class="divide-y divide-outline w-full">
			<For each={Object.keys(props.processedTableOfContents)}>
				{(section) => (
					<li class="py-3">
						<h2 class="font-bold text-on-surface pb-3">{section}</h2>
						<ul class="space-y-1.5" role="list">
							<For
								each={
									props.processedTableOfContents[
										section as keyof typeof props.processedTableOfContents
									]
								}
							>
								{(document) => (
									<li>
										<a
											onClick={props.onLinkClick}
											class="block w-full font-medium link link-primary"
											classList={{
												"text-primary":
													document.frontmatter.href === currentPageContext.urlParsed.pathname,
												"text-on-surface-variant":
													document.frontmatter.href !== currentPageContext.urlParsed.pathname,
											}}
											href={document.frontmatter.href}
										>
											{document.frontmatter.title}
										</a>
									</li>
								)}
							</For>
						</ul>
					</li>
				)}
			</For>
		</ul>
	)
}
