/**
 * Showcased repositories that are using inlang.
 *
 * If you want to showcase your repository, edit the following
 * list and add your repository below.
 */
export const repositories: Repositories = [
	{
		owner: "inlang",
		repository: "example",
		description: "Example repository that showcases inlang.",
	},
	{
		owner: "AppFlowy-IO",
		repository: "AppFlowy",
		description:
			"AppFlowy is an open-source alternative to Notion. You are in charge of your data and customizations. Built with Flutter and Rust.",
	},
	{
		owner: "osmosis-labs",
		repository: "osmosis-frontend",
		description: "Web interface for Osmosis Zone",
	},
	{
		owner: "allinurl",
		repository: "goaccess",
		description: "GoAccess is a real-time web log analyzer and interactive viewer",
	},
	{
		owner: "jazzband",
		repository: "djangorestframework-simplejwt",
		description: "A JSON Web Token authentication plugin for the Django REST Framework.",
	},
	{
		owner: "knadh",
		repository: "listmonk",
		description:
			"High performance, self-hosted, newsletter and mailing list manager with a modern dashboard. Single binary app.",
	},
	{
		owner: "humbertogontijo",
		repository: "homeassistant-roborock",
		description:
			"Roborock integration for Home Assistant. This integration uses your devices from the Roborock App.",
	},
	{
		owner: "blakeblackshear",
		repository: "frigate-hass-integration",
		description: "Frigate integration for Home Assistant",
	},
	{
		owner: "erskingardner",
		repository: "nostr-how",
		description:
			"Nostr is a simple, open protocol that enables truly censorship-resistant and global value-for-value publishing on the web.",
	},
]

type Repositories = Array<{
	owner: string
	repository: string
	description: string
}>
