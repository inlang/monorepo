import "./App.css"
import { useState } from "react"
import { vscode } from "./utils/vscode.js"
import Editor from "./components/Editor.js"
import { BundleNested, ProjectSettings } from "@inlang/sdk"

type VscodeMessage = {
	command: "change"
	data: {
		bundle: BundleNested
		settings: ProjectSettings
	}
}

function App() {
	const [bundle, setBundle] = useState<BundleNested | undefined>(undefined)
	const [settings, setSettings] = useState<ProjectSettings | undefined>(undefined)

	vscode.onMessage((message: unknown) => {
		const typedMessage = message as VscodeMessage

		setBundle(typedMessage.data.bundle)
		setSettings(typedMessage.data.settings)
	})

	return (
		<>
			{bundle && settings ? (
				<Editor bundle={bundle} settings={settings} />
			) : (
				<p className="flex justify-center items-center h-screen text-gray-500">Loading...</p>
			)}
		</>
	)
}

export default App
