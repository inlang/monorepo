import * as mixpanel from "mixpanel-figma";
import posthog from "posthog-js";
import * as pjs from "../../../package.json";
import FigmaUtil from "../../shared/FigmaUtil";

export function track(name: string, opts = {}) {
	posthog.capture(`PARROT ${name}`, opts);
}

export function identify(figmaUserId: string) {
	if (figmaUserId) {
		posthog.identify(figmaUserId, {
			// USER_ID: userId,
			FIGMA_USER_ID: figmaUserId,
			// NAME: name,
			version: pjs.version,
		});
	}
}

export async function identifyProject(args: {
	projectId: string;
	properties: Record<string, any>;
	figmaRemote: FigmaUtil;
}) {
	if (typeof process.env.PUBLIC_POSTHOG_TOKEN === "undefined") return;
	await args.figmaRemote.setRootPluginData("projectId", args.projectId);
	try {
		posthog.group("project", args.projectId, {
			name: args.projectId,
		});
	} catch (e) {
		// TODO implement sentry logging
		// do not console.log and avoid exposing internal errors to the user
	}
}

// TODO Update user data
export function setUserData(data: { [key: string]: any }) {
	if (process.env.MIXPANEL_ACCESS_TOKEN && "people" in mixpanel) {
		mixpanel.people.set(data);
	} else {
		console.log(`would set user property to ${JSON.stringify(data)}`);
	}
}

export function initializeAnalytics() {
	//   if (process.env.MIXPANEL_ACCESS_TOKEN) {
	//     mixpanel.init(process.env.MIXPANEL_ACCESS_TOKEN, {
	//       disable_cookie: true,
	//       disable_persistence: true,
	//       api_host: 'https://api-eu.mixpanel.com',
	//     });
	//   }
	posthog.init(process.env.PUBLIC_POSTHOG_TOKEN ?? "", {
		api_host:
			process.env.ENVIRONMENT === "production"
				? "https://telemetry.inlang.com"
				: "http://localhost:4006",
	});
}

export async function captureLoadProjectEvent(figmaRemote: FigmaUtil) {
	const projectId = await figmaRemote.getRootPluginData("projectId");
	const inlangProjectSettings = await figmaRemote.getRootPluginData("inlangProjectSettings");

	const numberOfMessages = Number(await figmaRemote.getRootPluginData("numberOfMessages")); // all messages in message tab
	const numberOfLinkedMessages = Number(
		await figmaRemote.getRootPluginData("numberOfLinkedMessages"),
	); // all messages in message tab linked to a TextNode
	const numberOfUnlinkedMessages = numberOfMessages - numberOfLinkedMessages; // numberOfMessages - numberOfLinkedMessages (imported but not linked)
	// numberOfAnonymousMessages = numberOfAnonymousTextNodes (unique to each TextNode)
	const numberOfAnonymousMessages = Number(
		await figmaRemote.getRootPluginData("numberOfAnonymousTextNodes"),
	); // anonymous messages attached to a TextNode (not shown in message tab)
	const numberOfParrotMessages = numberOfLinkedMessages + numberOfAnonymousMessages; // all messages (anonymous or not) attached to a TextNode (relevant threshold)

	const numberOfTextNodes = Number(await figmaRemote.getRootPluginData("numberOfTextNodes")); // all TextNodes in the document
	const numberOfLinkedTextNodes = Number(
		await figmaRemote.getRootPluginData("numberOfLinkedTextNodes"),
	); // TextNodes with messages attached
	const numberOfUnlinkedTextNodes = numberOfTextNodes - numberOfLinkedTextNodes; // numberOfTextNodes - numberOfLinkedTextNodes
	const numberOfAnonymousTextNodes = numberOfAnonymousMessages; // TextNodes with anonymous messages attached (not shown in message tab)
	const numberOfParrotTextNodes = Number(
		await figmaRemote.getRootPluginData("numberOfParrotTextNodes"),
	); // TextNodes with messages (anonymous or not) attached

	const loadingTime = Number(await figmaRemote.getRootPluginData("loadingTime"));
	const numberOfFrames = Number(await figmaRemote.getRootPluginData("numberOfFrames"));

	// console.log('numberOfMessages:', numberOfMessages);
	// console.log('numberOfLinkedMessages:', numberOfLinkedMessages);
	// console.log('numberOfUnlinkedMessages:', numberOfUnlinkedMessages);
	// console.log('numberOfAnonymousMessages:', numberOfAnonymousMessages);
	// console.log('numberOfParrotMessages:', numberOfParrotMessages);

	// console.log('numberOfTextNodes:', numberOfTextNodes);
	// console.log('numberOfLinkedTextNodes:', numberOfLinkedTextNodes);
	// console.log('numberOfUnlinkedTextNodes:', numberOfUnlinkedTextNodes);
	// console.log('numberOfAnonymousTextNodes:', numberOfAnonymousTextNodes);
	// console.log('numberOfParrotTextNodes:', numberOfParrotTextNodes);

	// console.log('loadingTime:', loadingTime);
	// console.log('numberOfFrames:', numberOfFrames);

	if (projectId && inlangProjectSettings) {
		posthog.capture("SDK loaded project", {
			projectId,
			appId: "app.parrot.figmaPlugin",
			settings: JSON.parse(inlangProjectSettings),
			numberOfParrotMessages: Number(numberOfParrotMessages),
		});
	}

	if (projectId && inlangProjectSettings) {
		posthog.capture("PARROT loaded project", {
			projectId,
			settings: JSON.parse(inlangProjectSettings),
			messages: {
				numberOfMessages,
				numberOfLinkedMessages,
				numberOfUnlinkedMessages,
				numberOfAnonymousMessages,
				numberOfParrotMessages,
			},
			textNodes: {
				numberOfTextNodes,
				numberOfLinkedTextNodes,
				numberOfUnlinkedTextNodes,
				numberOfAnonymousTextNodes,
				numberOfParrotTextNodes,
			},
			loadingTime,
			numberOfFrames,
		});
	}
}
