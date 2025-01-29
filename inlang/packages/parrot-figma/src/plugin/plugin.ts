// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html". d

eval('console.log("I am comming from an eval...")')

import { AsyncFunctionProxy } from "../lib/rpc/AsyncFunctionProxy";
import MigrationManager from "../lib/migrations/MigrationManager";

import FigmaUtil from "../shared/FigmaUtil";
import FigmaHelper from "../shared/FigmaHelper";
import { WindowManagerSandbox, WindowMode } from "../lib/windowManager/WindowManagerSandbox";
import LocalizedLabelManager from "../lib/localizedlabels/LocalizedLabelManager"; // TODO change this to a config when implemented
import { InlangMessageStore } from "../lib/message/store/InlangMessageStoreFigmaRoot";
import UserManager from "../lib/usage/UsageManager";
import TranslatorMachine from "../lib/translationprovider/TranslatorMachine";
import ParrotApi from "../lib/api/Parrot";
import Monitoring from "../lib/monitoring/MonitoringProxy";
import FeatureFlags from "../lib/featureflags/FeatureFlags";

const figmaRemote = new FigmaUtil();

const featureFlags = figmaRemote.getFeatureFlagsSync();
FeatureFlags.setFeatureflags(featureFlags);

const fileConfigured = figmaRemote.getRootPluginDataSync("fileSetupCompleted") !== "";
const introShownToUser = true;

figma.root.setRelaunchData({ open: "Let Your Design Speak all Languages" });

const migrationManager = new MigrationManager(figmaRemote);
migrationManager.migrate();

console.log('I AM STILL RUNNING - I AM STILL RUNNING -I AM STILL RUNNING -I AM STILL RUNNING2')
// @ts-expect-error -- url is global
console.log('url:' + url)

WindowManagerSandbox.init(
	{
		// @ts-expect-error -- url is global
		uiUrl: url,
		bottomSheet: {
			height: 200,
		},
		introWindowSize: {
			centerHeight: 488,
			height: 364,
			width: 415,
		},
		windowSize: {
			width: 800,
			height: 600,
		},
		windowMode: WindowMode.IntroWindow,
	},
	!fileConfigured || !introShownToUser ? WindowMode.IntroWindow : undefined,
);

const asyncFunctionProxy = new AsyncFunctionProxy(
	"SandboxAsyncFunctionProxy",
	(data: any) => {
		figma.ui.postMessage(data);
	},
	figma.ui,
);

asyncFunctionProxy.registerInstance(figmaRemote);

const parrotApi = new ParrotApi(process.env.PARROT_API_KEY as string);

const translationMachine = new TranslatorMachine(parrotApi);
asyncFunctionProxy.registerInstance(translationMachine);

const usageManager = new UserManager(false);
asyncFunctionProxy.registerInstance(usageManager);

const inlangMessageStore = new InlangMessageStore(false);
asyncFunctionProxy.registerInstance(inlangMessageStore);

const remoteLocalizedLabelManager = new LocalizedLabelManager(inlangMessageStore);
asyncFunctionProxy.registerInstance(remoteLocalizedLabelManager);

const figmaHelper = new FigmaHelper(figma);
asyncFunctionProxy.registerInstance(figmaHelper);

const monitoring = new Monitoring();
asyncFunctionProxy.proxyAsyncMethods(monitoring);

figma.on("selectionchange", () => {
	figma.ui.postMessage({
		type: "event",
		name: "selectionchange",
	});
});

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => {
	switch (msg.type) {
		case "undo":
			console.log("undo forwarded");
			figma.triggerUndo();
			break;
	}
	/* if (asyncFunctionProxy.onMessage(payload)) {
    return
  } */

	// Make sure to close the plugin when you're done. Otherwise the plugin will
	// keep running, which shows the cancel button at the bottom of the screen.
	// figma.closePlugin();
};
