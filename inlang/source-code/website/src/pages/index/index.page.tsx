import { LandingPageLayout as RootLayout } from "../Layout.jsx"
import { Meta, Title } from "@solidjs/meta"
import { createSignal } from "solid-js"
import Hero from "./sections/01-hero/index.jsx"
import Marketplace from "./sections/03-marketplace/index.jsx"
import Lix from "./sections/02-lix/index.jsx"

export type PageProps = {
	markdown: string
}

export function Page() {
	const [darkmode, setDarkmode] = createSignal(true)
	const [transparent, setTransparent] = createSignal(true)

	if (typeof window !== "undefined") {
		window.addEventListener("scroll", () => {
			if (window.scrollY > 2500) {
				setDarkmode(false)
			} else {
				setDarkmode(true)
			}

			if (window.scrollY > 50) {
				setTransparent(false)
			} else {
				setTransparent(true)
			}
		})
	}

	return (
		<>
			<Title>Globalization infrastructure for software</Title>
			<Meta
				name="description"
				content="inlang's ecosystem makes adapting your application to different markets easy."
			/>
			<Meta name="og:image" content="/images/inlang-social-image.jpg" />
			<RootLayout landingpage darkmode={darkmode()} transparent={transparent()}>
				<div>
					<Hero />
					<Lix />
					<Marketplace />
					{/* <QualityChecks /> */}
				</div>
			</RootLayout>
		</>
	)
}
