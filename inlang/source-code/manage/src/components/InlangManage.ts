import type { TemplateResult } from "lit"
import { html } from "lit"
import { customElement, property, query } from "lit/decorators.js"
import { TwLitElement } from "../common/TwLitElement.js"
import { z } from "zod"
import "./InlangInstall"
import { createNodeishMemoryFs, openRepository } from "@lix-js/client"
import { listProjects } from "@inlang/sdk"
import { publicEnv } from "@inlang/env-variables"
import { browserAuth, getUser } from "@lix-js/client/src/browser-auth.ts"
import { tryCatch } from "@inlang/result"
import { registry } from "@inlang/marketplace-registry"
import type { MarketplaceManifest } from "../../../versioned-interfaces/marketplace-manifest/dist/interface.js"

type ManifestWithVersion = MarketplaceManifest & { version: string }

@customElement("inlang-manage")
export class InlangManage extends TwLitElement {
	@property({ type: Object })
	url: Record<string, string | undefined> = {}

	@property({ type: String })
	repoURL: string = ""

	@property({ type: Object })
	projects: Record<string, string>[] | undefined | "no-access" | "load" = "load"

	@property({ type: Object })
	modules: ManifestWithVersion[] | undefined | "empty"

	@property({ type: Object })
	user: Record<string, any> | undefined | "load" = "load"

	@query("#repo-input")
	repoInput: HTMLInputElement | undefined

	@query("project-dropdown")
	projectDropdown: NodeListOf<Element> | undefined

	async projectHandler() {
		const repo = await openRepository(
			`${publicEnv.PUBLIC_GIT_PROXY_BASE_URL}/git/${this.url.repo}`,
			{
				nodeishFs: createNodeishMemoryFs(),
			}
		)

		if (repo.errors().length > 0) {
			this.projects = "no-access"
			return
		}

		this.projects = await listProjects(repo.nodeishFs, "/")

		if (this.url.project) {
			const result = await tryCatch(async () => {
				const inlangProjectString = (await repo.nodeishFs.readFile(
					`.${this.url.project}/settings.json`,
					{
						encoding: "utf-8",
					}
				)) as string

				return inlangProjectString
			})

			if (result.error) {
				this.projects = "no-access"
				return
			}

			const inlangProject = JSON.parse(result.data)
			const modules = inlangProject.modules

			const tempModules = []
			for (const module of modules) {
				// @ts-ignore
				const registryModule = registry.find((x) => x.module === module)

				if (registryModule) {
					const response = await fetch(
						// @ts-ignore
						registryModule.module.replace("dist/index.js", `package.json`)
					)

					tempModules.push({
						...registryModule,
						// @ts-ignore
						version: (await response.json()).version,
					})
				}
			}

			this.modules = tempModules
			if (!this.modules) this.modules = "empty"
		}
	}

	/* This function generates the install link for the user based on a repo url */
	generateManageLink() {
		const url = new URL(this.repoURL)
		return `?repo=${url.host}${url.pathname.split("/").slice(0, 3).join("/")}`
	}

	/* Checks if the GitHub Repo Link is valid */
	isValidUrl = () =>
		z
			.string()
			.url()
			.regex(/github/)
			.safeParse(this.repoURL).success

	override async connectedCallback() {
		super.connectedCallback()
		if (window.location.search !== "" && window.location.pathname !== "") {
			const url = {
				path: window.location.pathname.replace("/", ""),
				...Object.fromEntries(
					window.location.search
						.slice(1)
						.split("&")
						.map((x) => x.split("="))
						.map(([key, value]) => [key, value])
				),
			}
			this.url = url
		} else {
			this.url = {
				path: window.location.pathname.replace("/", ""),
			}
		}

		this.url.repo && this.projectHandler()

		const user = await getUser().catch(() => {
			this.user = undefined
		})
		if (user) {
			this.user = user
		}
	}

	handleProjectDropdown() {
		this.projectDropdown = this.shadowRoot?.querySelectorAll(".project-dropdown")
		if (this.projectDropdown)
			// @ts-ignore
			for (const dropdown of this.projectDropdown) {
				dropdown.addEventListener("click", () => {
					dropdown.classList.toggle("active")
				})
			}
	}

	override render(): TemplateResult {
		return html` <main
			class="w-full min-h-screen flex flex-col bg-slate-50"
			@click=${() => {
				this.shadowRoot?.querySelector("#account")?.classList.add("hidden")
				this.shadowRoot?.querySelector("#projects")?.classList.add("hidden")
			}}
		>
			<header class="bg-white border-b border-slate-200 py-3.5 px-4">
				<div class="max-w-7xl mx-auto flex flex-row justify-between relative sm:static">
					<div class="flex items-center">
						<a
							href="/"
							class="flex items-center w-fit pointer-events-auto transition-opacity hover:opacity-75"
						>
							<inlang-logo size="2rem"></inlang-logo>
						</a>
						<p class="self-center text-left font-regular text-slate-400 pl-4 pr-1">/</p>
						<p class="self-center pl-2 text-left font-medium text-slate-900 truncate">Manage</p>
						${this.url.project
							? html`<div class="flex items-center flex-shrink-0">
									<p class="self-center text-left font-regular text-slate-400 pl-2 pr-1">/</p>
									<!-- Dropdown for all projects -->
									<div
										class="relative"
										x-data="{ open: false }"
										@click=${(e: Event) => {
											e.stopPropagation()
										}}
									>
										<button
											@click=${() => {
												this.shadowRoot?.querySelector("#account")?.classList.add("hidden")
												this.shadowRoot?.querySelector("#projects")?.classList.toggle("hidden")
											}}
										>
											<div
												@click=${() => {
													this.handleProjectDropdown()
												}}
												class="self-center relative text-left font-medium text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer px-2 py-1.5"
											>
												${this.url.project.split("/").at(-1)}
												${
													// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
													this.projects!.length > 1
														? html`<doc-icon
																class="inline-block translate-y-1"
																size="1.2em"
																icon="mdi:unfold-more-horizontal"
														  ></doc-icon> `
														: ""
												}
											</div>
										</button>
										<div
											@click=${(e: { stopPropagation: () => void }) => {
												e.stopPropagation()
											}}
											id="projects"
											class="hidden absolute top-12 left-0 w-auto bg-white border border-slate-200 rounded-md shadow-lg py-0.5 z-20"
										>
											${typeof this.projects === "object"
												? this.projects?.map(
														(project) =>
															html`<a
																href=${`/?repo=${this.url.repo}&project=${project.projectPath}`}
																class="flex items-center gap-1 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
															>
																${this.url.project === project.projectPath
																	? html`<doc-icon
																			class="inline-block mr-1 translate-y-0.5"
																			size="1.2em"
																			icon="mdi:check"
																	  ></doc-icon>`
																	: html`<doc-icon
																			class="inline-block mr-1 translate-y-0.5 text-transparent"
																			size="1.2em"
																			icon="mdi:check"
																	  ></doc-icon>`}
																<p class="truncate">
																	${project.projectPath?.split("/").at(-2)}/${project.projectPath
																		?.split("/")
																		.at(-1)}
																</p>
															</a>`
												  )
												: ""}
										</div>
									</div>
							  </div>`
							: ""}
					</div>
					<div class="flex items-center gap-4 flex-shrink-0">
						${this.user && this.user !== "load"
							? html`<div>
									<!-- Dropdown for account settings -->
									<div
										class="relative"
										x-data="{ open: false }"
										@click=${(e: Event) => {
											e.stopPropagation()
										}}
									>
										<button
											@click=${() => {
												this.shadowRoot?.querySelector("#projects")?.classList.add("hidden")
												this.shadowRoot?.querySelector("#account")?.classList.toggle("hidden")
											}}
										>
											<img
												class="h-8 w-8 rounded-full transition-opacity hover:opacity-70"
												src=${this.user.avatarUrl}
											/>
										</button>
										<div
											@click=${(e: { stopPropagation: () => void }) => {
												e.stopPropagation()
											}}
											id="account"
											class="hidden absolute top-12 right-0 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-0.5"
										>
											<div
												@click=${async () => {
													await browserAuth.addPermissions()
													window.location.reload()
												}}
												class="block cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
											>
												Edit Permissions
											</div>
											<div
												@click=${async () => {
													await browserAuth.logout()
													window.location.reload()
												}}
												class="block cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
											>
												Logout
											</div>
										</div>
									</div>
							  </div>`
							: ""}
					</div>
				</div>
			</header>
			${this.url.path === ""
				? html`<div
						class=${"w-full max-w-7xl h-full flex-grow mx-auto flex justify-center px-4 pb-24" +
						(!this.modules ? " items-center" : " py-16 xl:px-0")}
				  >
						${!this.url.repo
							? html`<div class="max-w-lg w-full flex flex-col items-center gap-4">
									<h1 class="font-bold text-4xl text-slate-900 text-center">Open your Repo</h1>
									<p class="text-slate-600 w-full md:w-[400px] leading-relaxed mb-4 text-center">
										To access your projects, please enter the URL of your GitHub repository.
									</p>
									<div
										disabled=${this.url.repo}
										class=${`px-1 gap-2 relative max-w-lg z-10 flex items-center w-full border bg-white rounded-lg transition-all relative ${
											this.url.repo ? "cursor-not-allowed" : ""
										} ${
											!this.isValidUrl() && this.repoURL.length > 0
												? " border-red-500 mb-8"
												: " focus-within:border-[#098DAC] border-slate-200"
										}	
					`}
									>
										<input
											id="repo-input"
											.value=${this.url.repo ? this.url.repo : this.repoURL}
											@input=${(e: InputEvent) => {
												this.repoURL = (e.target as HTMLInputElement).value
											}}
											@keydown=${(e: KeyboardEvent) => {
												if (e.key === "Enter" && this.isValidUrl()) {
													window.location.href =
														this.generateManageLink() +
														(this.url.project ? `&project=${this.url.project}` : "") +
														(this.url.module ? `&module=${this.url.module}` : "")
												}
											}}
											class=${"active:outline-0 px-2 focus:outline-0 focus:ring-0 border-0 h-12 grow placeholder:text-slate-500 placeholder:font-normal placeholder:text-base " +
											(this.url.repo ? "opacity-50 pointer-events-none " : " ") +
											(!this.isValidUrl() && this.repoURL.length > 0
												? "text-red-500"
												: "text-slate-900")}
											placeholder="https://github.com/user/example"
										/>
										<button
											@click="${() => {
												this.url.repo
													? (window.location.href = "/")
													: this.isValidUrl() &&
													  (window.location.href =
															this.generateManageLink() +
															(this.url.project ? `&project=${this.url.project}` : "") +
															(this.url.module ? `&module=${this.url.module}` : ""))
											}}"
											class="bg-white text-slate-600 border flex justify-center items-center h-10 relative rounded-md px-4 border-slate-200 transition-all duration-100 text-sm font-medium hover:bg-slate-100"
										>
											${this.url.repo ? "Edit" : "Confirm"}
										</button>
										${!this.isValidUrl() && this.repoURL.length > 0
											? html`<p class="absolute text-red-500 -bottom-5 text-xs">
													Please enter a valid GitHub repository URL.
											  </p>`
											: ""}
									</div>
							  </div>`
							: this.projects === "load"
							? html`<div class="flex flex-col gap-0.5 mt-4">
									<div class="mx-auto">
										<div class="h-12 w-12 animate-spin mb-4">
											<div
												class="h-full w-full bg-surface-50 border-[#0891b2] border-4 rounded-full"
											></div>
											<div class="h-1/2 w-1/2 absolute top-0 left-0 z-5 bg-slate-50"></div>
										</div>
									</div>
							  </div>`
							: this.projects === "no-access" && typeof this.user === "undefined"
							? html`<div class="flex flex-col gap-0.5 mt-4">
									<div
										class="py-4 px-8 w-full rounded-md bg-red-100 text-red-500 flex flex-col items-center justify-center"
									>
										<p class="mb-4 font-medium">
											You have to be logged in to access this repository.
										</p>
										<button
											@click=${async () => {
												await browserAuth.login()
												window.location.reload()
											}}
											target="_blank"
											class="bg-white text-slate-600 border flex justify-center items-center h-9 relative rounded-md px-2 border-slate-200 transition-all duration-100 text-sm font-medium hover:bg-slate-100"
										>
											Login
											<doc-icon
												class="inline-block ml-1 translate-y-0.5"
												size="1.2em"
												icon="mdi:arrow-top-right"
											></doc-icon>
										</button>
									</div>
							  </div>`
							: this.projects === "no-access" && typeof this.user === "object"
							? html`<div class="flex flex-col gap-0.5 mt-4">
									<div
										class="py-4 px-8 w-full rounded-md bg-red-100 text-red-500 flex flex-col items-center justify-center"
									>
										<p class="mb-4 font-medium">You don't have access to this repository.</p>
										<a
											href="https://github.com/apps/${publicEnv.PUBLIC_LIX_GITHUB_APP_NAME}/installations/select_target"
											target="_blank"
											class="bg-white text-slate-600 border flex justify-center items-center h-9 relative rounded-md px-2 border-slate-200 transition-all duration-100 text-sm font-medium hover:bg-slate-100"
											>Configure Permissions
											<doc-icon
												class="inline-block ml-1 translate-y-0.5"
												size="1.2em"
												icon="mdi:arrow-top-right"
											></doc-icon>
										</a>
									</div>
							  </div>`
							: !this.url.project
							? html`<div class="flex flex-col w-full max-w-lg items-center">
									<h1 class="font-bold text-4xl text-slate-900 mb-4 text-center">
										Select your project
									</h1>
									<p class="text-slate-600 w-full md:w-[400px] leading-relaxed text-center">
										Please select the project you want to manage from the list below.
									</p>
									<div class="w-full relative max-w-sm">
										<div
											class="absolute pointer-events-none h-12 bg-gradient-to-b from-slate-50 to-transparent w-full top-0"
										></div>
										<div
											class="absolute pointer-events-none h-12 bg-gradient-to-t from-slate-50 to-transparent w-full bottom-0"
										></div>
										<div class="w-full flex flex-col gap-1 max-h-96 overflow-y-scroll py-12">
											${
												// @ts-ignore
												this.projects?.map(
													(project: Record<string, any>) =>
														html`<button
															@click=${() => {
																window.location.href =
																	`/?repo=${this.url.repo}&project=${project.projectPath}` +
																	(this.url.module ? `&module=${this.url.module}` : "")
															}}
															class=${"flex gap-4 group items-center text-left p-2 text-md rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-600"}
														>
															${this.url.project === project.projectPath
																? html`<inlang-folder size="3rem"></inlang-logo>`
																: html`<inlang-folder size="3rem"></inlang-logo>`}
															${project.projectPath}
														</button>`
												)
											}
										</div>
									</div>
							  </div>`
							: this.modules
							? html`<div class="h-full w-full">
					<div class="mb-16 flex items-start justify-between gap-4">
					<div>
							<h1 class="font-bold text-4xl text-slate-900 mb-4">Manage your inlang project</h1>
							<p class="text-slate-600 w-full md:w-[400px] leading-relaxed">
								Here is a list of all modules installed in your project.
							</p>
							</div>
							<button
							class=${"bg-slate-800 text-white text-center px-4 py-2 rounded-md font-medium hover:bg-slate-900 transition-colors"}
							@click=${() => {
								window.location.href = `https://inlang.com/?repo=${this.url.repo}&project=${this.url.project}`
							}}
						>
							Install a module
						</button>
							</div>
							<div class="mb-12">
							<h2 class="text-lg font-semibold my-4">Plugins</h2>
								${
									this.modules &&
									this.modules !== "empty" &&
									this.modules?.filter((module) => module.id.includes("plugin.")).length > 0
										? html`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
												${
													// @ts-ignore
													this.modules
														?.filter((module) => module.id.includes("plugin."))
														.map(
															(module: Record<string, any>) =>
																html`<div
																	class="p-6 w-full bg-white border border-slate-200 rounded-xl flex flex-col justify-between gap-2"
																>
																	<div class="mb-4">
																		<div class="w-full flex items-center justify-between mb-4">
																			<h2 class="font-semibold">${module.displayName.en}</h2>
																			<p class="text-sm font-mono">${module.version}</p>
																		</div>
																		<p class="text-slate-500 line-clamp-2 text-sm">
																			${module.description.en}
																		</p>
																	</div>
																	<a
																		target="_blank"
																		href=${`https://inlang.com/m/${
																			// @ts-ignore
																			module.uniqueID
																		}`}
																		class="text-[#098DAC] text-sm font-medium transition-colors hover:text-[#06b6d4]"
																	>
																		More information
																		<doc-icon
																			class="inline-block ml-0.5 translate-y-0.5"
																			size="1em"
																			icon="mdi:arrow-top-right"
																		></doc-icon>
																	</a>
																</div>`
														)
												}
										  </div>`
										: html`<div
												class="py-16 border border-dashed border-slate-300 px-8 w-full rounded-md bg-slate-100 text-slate-500 flex flex-col items-center justify-center"
										  >
												<p class="mb-4 font-medium">You don't have any plugins installed.</p>
												<a
													href="https://inlang.com/c/plugins"
													target="_blank"
													class="bg-white text-slate-600 border flex justify-center items-center h-9 relative rounded-md px-2 border-slate-200 transition-all duration-100 text-sm font-medium hover:bg-slate-100"
													>Install a plugin
												</a>
										  </div>`
								}
								</div>
								<div>
							<h2 class="text-lg font-semibold my-4">Lint Rules</h2>
								${
									this.modules &&
									this.modules !== "empty" &&
									this.modules?.filter((module) => module.id.includes("messageLintRule.")).length >
										0
										? html`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
												${
													// @ts-ignore
													this.modules
														?.filter((module) => module.id.includes("messageLintRule."))
														.map(
															(module: Record<string, any>) =>
																html`<div
																	class="p-6 w-full bg-white border border-slate-200 rounded-xl flex flex-col justify-between gap-2"
																>
																	<div class="mb-4">
																		<div class="w-full flex items-center justify-between mb-4">
																			<h2 class="font-semibold">${module.displayName.en}</h2>
																			<p class="text-sm font-mono">${module.version}</p>
																		</div>
																		<p class="text-slate-500 line-clamp-2 text-sm">
																			${module.description.en}
																		</p>
																	</div>
																	<a
																		target="_blank"
																		href=${`https://inlang.com/m/${
																			// @ts-ignore
																			module.uniqueID
																		}`}
																		class="text-[#098DAC] text-sm font-medium transition-colors hover:text-[#06b6d4]"
																	>
																		More information
																		<doc-icon
																			class="inline-block ml-0.5 translate-y-0.5"
																			size="1em"
																			icon="mdi:arrow-top-right"
																		></doc-icon>
																	</a>
																</div>`
														)
												}
										  </div>`
										: html`<div
												class="py-16 border border-dashed border-slate-300 px-8 w-full rounded-md bg-slate-100 text-slate-500 flex flex-col items-center justify-center"
										  >
												<p class="mb-4 font-medium">You don't have any rules installed.</p>
												<a
													href="https://inlang.com/c/lint-rules"
													target="_blank"
													class="bg-white text-slate-600 border flex justify-center items-center h-9 relative rounded-md px-2 border-slate-200 transition-all duration-100 text-sm font-medium hover:bg-slate-100"
													>Install a lint rule
												</a>
										  </div>`
								}
								</div>
							</div>
					  </div>
					 <div class="flex-grow"></div>
					  `
							: ""}
				  </div>`
				: html`<div
						class="w-full max-w-7xl h-full flex-grow mx-auto flex justify-center px-4 pb-24"
				  >
						<inlang-install jsonURL=${JSON.stringify(this.url)}></inlang-install>
				  </div>`}
		</main>`
	}
}

@customElement("inlang-logo")
export class InlangLogo extends TwLitElement {
	@property({ type: String })
	size: string = "1rem"
	override render(): TemplateResult {
		return html`
			<svg
				xmlns="http://www.w3.org/2000/svg"
				version="1.0"
				width="${this.size}"
				height="${this.size}"
				viewBox="0 0 256.000000 256.000000"
				preserveAspectRatio="xMidYMid meet"
			>
				<metadata>Created by potrace 1.14, written by Peter Selinger 2001-2017</metadata>
				<g
					transform="translate(0.000000,256.000000) scale(0.100000,-0.100000)"
					fill="#000000"
					stroke="none"
				>
					<path
						d="M95 2546 c-41 -18 -83 -69 -90 -109 -3 -18 -4 -550 -3 -1184 3 -1145 3 -1152 24 -1179 11 -15 33 -37 48 -48 27 -21 31 -21 1206 -21 1175 0 1179 0 1206 21 15 11 37 33 48 48 21 27 21 31 21 1206 0 1175 0 1179 -21 1206 -11 15 -33 37 -48 48 -27 21 -33 21 -1194 23 -955 2 -1173 0 -1197 -11z m570 -630 c81 -34 97 -133 31 -193 -29 -27 -44 -33 -81 -33 -83 0 -135 47 -135 122 0 40 21 73 64 99 37 23 74 24 121 5z m1435 -636 l0 -580 -120 0 -120 0 0 580 0 580 120 0 120 0 0 -580z m-566 270 c63 -32 109 -89 135 -167 20 -58 21 -84 21 -373 l0 -310 -120 0 -120 0 0 278 c0 252 -2 281 -20 319 -24 55 -70 83 -134 83 -66 0 -120 -32 -146 -85 -19 -38 -20 -62 -20 -318 l0 -277 -120 0 -120 0 0 435 0 435 115 0 114 0 3 -77 c2 -58 6 -73 12 -58 27 58 79 103 151 132 17 7 66 11 115 10 68 -2 95 -7 134 -27z m-804 -415 l0 -435 -120 0 -120 0 0 435 0 435 120 0 120 0 0 -435z"
					/>
				</g>
			</svg>
		`
	}
}

@customElement("inlang-folder")
export class InlangFolder extends TwLitElement {
	@property({ type: String })
	size: string = "1rem"
	override render(): TemplateResult {
		return html`
			<svg
				width="${this.size}"
				height="100%"
				viewBox="0 0 201 138"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M1 126.403V29.0998V11.078C1 5.51208 5.51207 1 11.078 1H122.804C126.13 1 129.242 2.64088 131.12 5.38534L144.352 24.7145C146.23 27.459 149.342 29.0998 152.668 29.0998H189.963C195.529 29.0998 200.041 33.6119 200.041 39.1778V126.403C200.041 131.969 195.529 136.481 189.963 136.481H11.078C5.51208 136.481 1 131.969 1 126.403Z"
					fill="url(#paint0_linear_3071_9264)"
					stroke="white"
					stroke-width="1.67261"
				/>
				<path
					d="M1 126.403V39.1779C1 33.6119 5.51208 29.0998 11.078 29.0998H125.092C127.829 29.0998 130.448 27.9867 132.348 26.0163L153.491 4.08356C155.391 2.11314 158.01 1 160.747 1H189.963C195.529 1 200.041 5.51207 200.041 11.078V126.403C200.041 131.969 195.529 136.481 189.963 136.481H11.078C5.51208 136.481 1 131.969 1 126.403Z"
					fill="black"
					stroke="white"
					stroke-width="1.67261"
				/>
				<path
					d="M59.4499 112V68.3636H71.5521V112H59.4499ZM65.5294 62.7386C63.7302 62.7386 62.1866 62.142 60.8987 60.9489C59.6298 59.7367 58.9953 58.2879 58.9953 56.6023C58.9953 54.9356 59.6298 53.5057 60.8987 52.3125C62.1866 51.1004 63.7302 50.4943 65.5294 50.4943C67.3286 50.4943 68.8627 51.1004 70.1317 52.3125C71.4196 53.5057 72.0635 54.9356 72.0635 56.6023C72.0635 58.2879 71.4196 59.7367 70.1317 60.9489C68.8627 62.142 67.3286 62.7386 65.5294 62.7386ZM92.549 86.7727V112H80.4467V68.3636H91.9808V76.0625H92.4922C93.4581 73.5246 95.0774 71.517 97.3501 70.0398C99.6229 68.5436 102.379 67.7955 105.617 67.7955C108.647 67.7955 111.29 68.4583 113.543 69.7841C115.797 71.1098 117.549 73.0038 118.799 75.4659C120.049 77.9091 120.674 80.8258 120.674 84.2159V112H108.572V86.375C108.591 83.7045 107.909 81.6212 106.526 80.125C105.144 78.6098 103.24 77.8523 100.816 77.8523C99.1873 77.8523 97.7479 78.2027 96.4979 78.9034C95.2668 79.6042 94.3009 80.6269 93.6001 81.9716C92.9183 83.2973 92.5679 84.8977 92.549 86.7727ZM141.515 53.8182V112H129.412V53.8182H141.515Z"
					fill="white"
				/>
				<defs>
					<linearGradient
						id="paint0_linear_3071_9264"
						x1="100.52"
						y1="1"
						x2="100.52"
						y2="136.481"
						gradientUnits="userSpaceOnUse"
					>
						<stop stop-color="#3C4044" />
						<stop offset="0.199292" />
					</linearGradient>
				</defs>
			</svg>
		`
	}
}

@customElement("inlang-menu")
export class InlangMenu extends TwLitElement {
	@property({ type: Object })
	jsonURL: Record<string, string | undefined> = {}

	override render(): TemplateResult {
		return html`
			<div class="flex flex-col gap-4">
				<a
					href=${`/install?${this.jsonURL.repo ? `repo=${this.jsonURL.repo}` : ""}${
						this.jsonURL.project ? `&project=${this.jsonURL.project}` : ""
					}`}
					class="bg-slate-800 text-white text-center py-2 rounded-md font-medium hover:bg-slate-900 transition-colors"
				>
					Install a module
				</a>
				<a
					class="bg-slate-200 text-white text-center py-2 rounded-md font-medium cursor-not-allowed"
				>
					Uninstall a module
				</a>
				<a
					class="bg-slate-200 text-white text-center py-2 rounded-md font-medium cursor-not-allowed mb-4"
				>
					Update a module
				</a>
				<a
					href="https://github.com/apps/${publicEnv.PUBLIC_LIX_GITHUB_APP_NAME}/installations/select_target"
					target="_blank"
					class="text-[#098DAC] font-medium transition-colors hover:text-[#06b6d4]"									"
				>
					Edit Permissions
					<doc-icon class="inline-block ml-1 translate-y-0.5" size="1.2em" icon="mdi:arrow-top-right"></doc-icon>
				</a>
			</div>
		`
	}
}
