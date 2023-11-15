import { Meta, Title } from "@solidjs/meta"
import { NewsletterForm } from "#src/interface/components/NewsletterForm.jsx"
import MarketplaceLayout from "#src/interface/marketplace/MarketplaceLayout.jsx"
import * as m from "#src/paraglide/messages.js"

export type PageProps = {
	markdown: string
}

export function Page() {
	return (
		<>
			<Title>inlang's Newsletter</Title>
			<Meta
				name="description"
				content="inlang's ecosystem makes adapting your application to different markets easy."
			/>
			<Meta name="og:image" content="/images/inlang-social-image.jpg" />
			<Meta name="robots" content="noindex" />
			<MarketplaceLayout>
				<div class="relative max-w-screen-xl w-full mx-auto">
					<div class="w-full flex md:pt-12 flex-col gap-16">
						<div class="w-full flex flex-col gap-6 h-full mx-auto justify-center max-w-lg mt-32 mb-8 px-6 relative z-10">
							<h1 class="text-[40px] text-center leading-tight md:text-5xl font-bold text-surface-900 tracking-tight">
								{m.newsletter_subscribe_title()}
							</h1>
							<p class="text-lg text-surface-600 leading-relaxed mx-auto text-center">
								{m.newsletter_subscribe_description()}
							</p>
						</div>
						<div class="w-full h-96 relative">
							<div class="flex flex-col w-full h-full justify-end items-center px-8">
								<div class="h-full w-[2px] bg-gradient-to-t from-surface-100 to-hover-primary relative z-0">
									<div class="w-full flex justify-center h-full z-3">
										<div class="text-hover-primary bg-[#FFF] z-10 flex justify-center items-center text-center mx-auto p-8 rounded-2xl bg-white border-2 border-hover-primary absolute max-w-[90vw] -top-8">
											<NewsletterForm />
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</MarketplaceLayout>
		</>
	)
}
