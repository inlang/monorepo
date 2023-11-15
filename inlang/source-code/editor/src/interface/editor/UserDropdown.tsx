import { onSignOut } from "#src/services/auth/index.js"
import { Switch, Match } from "solid-js"
import { showToast } from "../components/Toast.jsx"
import { telemetryBrowser } from "@inlang/telemetry"
import { useLocalStorage } from "#src/services/local-storage/index.js"
import IconSignOut from "~icons/material-symbols/logout-rounded"
import IconExpand from "~icons/material-symbols/expand-more-rounded"

/**
 * Dropdown with user information and actions.
 */
function UserDropdown() {
	const [localStorage, setLocalStorage] = useLocalStorage()

	async function handleSignOut() {
		try {
			await onSignOut({ setLocalStorage })
			showToast({
				title: "Signed out",
				variant: "success",
			})
			// https://posthog.com/docs/integrate/client/js#reset-after-logout
			telemetryBrowser.reset()
		} catch (error) {
			showToast({
				title: "Error",
				variant: "danger",
				// @ts-ignore
				message: error?.message,
			})
		}
	}

	return (
		<>
			<Switch>
				<Match when={localStorage.user}>
					<sl-dropdown>
						<div slot="trigger" class="flex items-center cursor-pointer">
							<img
								src={localStorage.user?.avatarUrl}
								alt="user avatar"
								class="w-6 h-6 rounded-full"
							/>
							<div class="w-5 h-5 opacity-50">
								<IconExpand />
							</div>
						</div>
						<sl-menu>
							<div class="px-7 py-2 bg-surface-1 text-on-surface">
								<p>Signed in as</p>
								<p class="font-medium">{localStorage.user?.username}</p>
							</div>
							<sl-menu-item onClick={handleSignOut}>
								<IconSignOut
									// @ts-ignore
									slot="prefix"
								/>
								Sign out
							</sl-menu-item>
						</sl-menu>
					</sl-dropdown>
				</Match>
			</Switch>
		</>
	)
}

export default UserDropdown
