import generateGUID from "../lib/usage/generateGUID";
import { WindowManagerSandbox, WindowMode } from "../lib/windowManager/WindowManagerSandbox";

interface MigrationReport {
	version: string;
	message: string;
	reportedToSentry: boolean;
}

/**
 * Figma api wrapper that simplifies varios task.
 * All public async functions only accept and return primitives and can be proxied between sandbox and iframe
 */
export default class FigmaUtil {
	public proxyClassName = "FigmaUtil";

	private getFileKey(): string {
		let fileKey = figma.root.getPluginData("uniqFileKey");
		if (!fileKey) {
			fileKey = `${Math.floor(Math.random() * 100)}`;
			figma.root.setPluginData("uniqFileKey", fileKey);
		}

		return fileKey;
	}

	public async getFeatureFlags() {
		return this.getFeatureFlagsSync();
	}

	public getFeatureFlagsSync() {
		const featureFlagsRaw = this.getRootPluginDataSync("prt_ftf");
		if (featureFlagsRaw) {
			const featureFlags = JSON.parse(featureFlagsRaw);
			return featureFlags;
		}
		return {};
	}

	public async setRootPluginData(key: string, value: string) {
		this.setRootPluginDataSync(key, value);
	}

	public setRootPluginDataSync(key: string, value: string) {
		figma.root.setPluginData(key, value);
	}

	public async getRootPluginData(key: string): Promise<string> {
		return this.getRootPluginDataSync(key);
	}

	public getRootPluginDataSync(key: string): string {
		return figma.root.getPluginData(key);
	}

	public async addMigrationReport(version: string, message: string) {
		const reports = this.getReports();
		reports[version] = { version, message, reportedToSentry: false } as MigrationReport;

		figma.root.setPluginData("migrationReport", JSON.stringify(reports));
	}

	public getReports() {
		const reportsRaw = figma.root.getPluginData("migrationReport");
		let reports = {} as { [version: string]: MigrationReport };
		if (reportsRaw !== "") {
			reports = JSON.parse(reportsRaw) as { [version: string]: MigrationReport };
		}
		return reports;
	}

	public async getReportsAsync() {
		return this.getReports();
	}

	async updateReport(updatedReport: MigrationReport) {
		const reports = this.getReports();
		reports[updatedReport.version] = updatedReport;
		figma.root.setPluginData("migrationReport", JSON.stringify(reports));
	}

	async notify(message: string) {
		figma.notify(message);
	}

	async notifyError(message: string) {
		figma.notify(message, {
			timeout: 3000,
			error: true,
		});
	}

	async getUserId() {
		return figma.currentUser?.id;
	}

	async getInlangFileId() {
		const fileId = figma.root.getPluginData("inlang-file-id");
		if (fileId !== "") {
			return fileId;
		}
		const newFileId = generateGUID();
		figma.root.setPluginData("inlang-file-id", newFileId);
		return newFileId;
	}

	async getImageFromFrame(nodeId: string, settings: ExportSettings) {
		const node = figma.getNodeById(nodeId) as TextNode;
		const imageAsUint8Array = await node.exportAsync(settings);
		return imageAsUint8Array;
	}

	// async drawKeyFrame(frameNodeId: string, name: string, localizedLabelsInFrame: LocalizedLabel[]) {
	//   const frame = figma.getNodeById(frameNodeId);
	//   const MARGIN = 50;

	//   let keyFrame: FrameNode | null = null;
	//   /* if (frame.getPluginData('keyFrameId')) {
	//       let oldFrame = figma.getNodeById(frame.getPluginData('keyFrameId')) as FrameNode | null
	//       if (oldFrame) {
	//           oldFrame.remove()
	//       }
	//   } */

	//   keyFrame = figma.createFrame();
	//   keyFrame.name = 'Localized Keys';

	//   // frame.setPluginData('keyFrameId', keyFrame.id);

	//   const frameFrame = frame as FrameNode;

	//   keyFrame.x = frameFrame.x - MARGIN;
	//   keyFrame.y = frameFrame.y - MARGIN;

	//   keyFrame.fills = [{
	//     type: 'SOLID',
	//     visible: false,
	//     color: { r: 200 / 255, g: 200 / 255, b: 200 / 255 },
	//   }];

	//   let fontToLoad = null;

	//   const containerRatio = 2; // (frame as FrameNode).height / (frame as FrameNode).width;

	//   const sortedNodes = localizedLabelsInFrame.sort((a, b) => Math.hypot(a.x, a.y * containerRatio) - Math.hypot(b.x, b.y * containerRatio));

	//   let maxRight = 0;
	//   let maxBottom = (frame as FrameNode).height;
	//   let i = 0;
	//   for (const nodeWithKey of sortedNodes) {
	//     if (nodeWithKey.messageLinkState !== MessageLinkState.Linked) {
	//       // eslint-disable-next-line no-continue
	//       continue;
	//     }

	//     const textNode = figma.createText();

	//     textNode.y = MARGIN + (40 * i);
	//     textNode.x = frameFrame.width + MARGIN + MARGIN;

	//     if (!fontToLoad) {
	//       fontToLoad = textNode.fontName as FontName;

	//       // Load the font in the text node before setting the characters
	//       // eslint-disable-next-line no-await-in-loop
	//       await figma.loadFontAsync(fontToLoad);
	//     }

	//     // Set bigger font size and red color
	//     textNode.fontSize = 18;
	//     textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
	//     textNode.characters = nodeWithKey.messageId!;

	//     maxRight = Math.max(textNode.x + textNode.width, maxRight);
	//     maxBottom = Math.max(textNode.y + textNode.height, maxBottom);

	//     keyFrame.appendChild(textNode);

	//     // Move to (50, 50)
	//     const x1 = nodeWithKey.x + (nodeWithKey.width / 2) + MARGIN;
	//     const y1 = nodeWithKey.y + MARGIN;

	//     const x2 = textNode.x - 5;
	//     const y2 = textNode.y + (textNode.height / 2);

	//     const leftTop = {
	//       x: x1 < x2 ? x1 : x2,
	//       y: y1 < y2 ? y1 : y2,
	//     };

	//     const rightBottom = {
	//       x: x1 > x2 ? x1 : x2,
	//       y: y1 > y2 ? y1 : y2,
	//     };

	//     const width = rightBottom.x - leftTop.x;
	//     const height = rightBottom.y - leftTop.y;

	//     const length = Math.sqrt(width ** 2 + height ** 2);

	//     const line = figma.createLine();
	//     line.x = x1;
	//     line.y = y1;
	//     line.name = nodeWithKey.messageId!;

	//     // Make line 200px long
	//     line.resize(length, 0);

	//     // 4px thick red line with arrows at each end
	//     line.strokeWeight = 1;
	//     line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
	//     line.dashPattern = [2, 2];

	//     const width2 = x2 - x1;
	//     const height2 = y2 - y1;

	//     line.rotation = -Math.atan2(height2, width2) * 180 / Math.PI;

	//     keyFrame.appendChild(line);

	//     i++;
	//   }

	//   keyFrame.resize(maxRight + MARGIN, maxBottom + MARGIN);

	//   const fills: Paint[] = [{
	//     type: 'SOLID',
	//     color: { r: 200 / 255, g: 200 / 255, b: 200 / 255 },
	//     opacity: 0.28,
	//   }];

	//   // draw a semi transparent box around the original frame
	//   const rectLeft = figma.createRectangle();
	//   rectLeft.x = 0;
	//   rectLeft.y = 0;
	//   rectLeft.resize(MARGIN, maxBottom + MARGIN);
	//   rectLeft.fills = fills;

	//   keyFrame.insertChild(0, rectLeft);

	//   const rectRight = figma.createRectangle();
	//   rectRight.x = frameFrame.width + MARGIN;
	//   rectRight.y = 0;
	//   rectRight.resize(maxRight - MARGIN - frameFrame.width, maxBottom + MARGIN);
	//   rectRight.fills = fills;
	//   keyFrame.insertChild(0, rectRight);

	//   const rectTop = figma.createRectangle();
	//   rectTop.x = MARGIN;
	//   rectTop.y = 0;
	//   rectTop.resize(frameFrame.width, MARGIN - 30);
	//   rectTop.fills = fills;
	//   keyFrame.insertChild(0, rectTop);

	//   const rectBottom = figma.createRectangle();
	//   rectBottom.x = MARGIN;
	//   rectBottom.y = frameFrame.height + MARGIN;
	//   rectBottom.resize(frameFrame.width, maxBottom - frameFrame.height + MARGIN);
	//   rectBottom.fills = fills;
	//   keyFrame.insertChild(0, rectBottom);
	// }

	async getLocalFileConfig(key: string) {
		const fileKey = this.getFileKey();
		const value = await figma.clientStorage.getAsync(`${fileKey}__${key}`);

		// console.log(`${fileKey}__${key} - ${value} GET LOCALFILE`);
		return value !== "" ? value : undefined;
	}

	async setLocalFileConfig(key: string, value: any) {
		const fileKey = this.getFileKey();
		// console.log(`${fileKey}__${key} - ${value} SET LOCALFILE`);
		return figma.clientStorage.setAsync(`${fileKey}__${key}`, value);
	}

	async ensureZoomLevelShowsNode(nodeId: string) {
		const nodeToScrollAndZoomIntoView = figma.getNodeById(nodeId) as SceneNode;

		const viewportRect = figma.viewport.bounds;
		const virtualViewportRect = { ...viewportRect };
		const nodeRect = nodeToScrollAndZoomIntoView.absoluteBoundingBox!;

		const zoomMarginLeft = 60; // we add another 30 for the ruler
		const zoomMarginRight = 30;

		const zoomMarginTop = 60; // we add another 30 for the ruler
		const zoomMarginBottom = 30;

		const normalizedViewportWidth = virtualViewportRect.width * figma.viewport.zoom;
		const requiredZoomForWidth =
			normalizedViewportWidth / (nodeRect.width + zoomMarginLeft + zoomMarginRight);
		const normalizedViewportHeight = virtualViewportRect.height * figma.viewport.zoom;
		const requiredZoomForHeight =
			normalizedViewportHeight / (nodeRect.height + zoomMarginTop + zoomMarginBottom);
		const zoomFactor = Math.min(
			requiredZoomForWidth,
			Math.min(requiredZoomForHeight, figma.viewport.zoom),
		);

		if (zoomFactor !== figma.viewport.zoom) {
			figma.viewport.zoom = zoomFactor;
		}
	}

	async scrollIntoViewIfNeeded(nodeId: string, select: boolean) {
		await this.ensureZoomLevelShowsNode(nodeId);

		// console.log('scrollIntoViewIfNeeded');
		const nodeToScrollAndZoomIntoView = figma.getNodeById(nodeId) as SceneNode;
		const nodeRect = nodeToScrollAndZoomIntoView.absoluteBoundingBox!;

		const nodeCenterX = nodeRect.x + nodeRect.width / 2;
		const nodeCenterY = nodeRect.y + nodeRect.height / 2;

		const viewportRect = figma.viewport.bounds;
		const virtualViewportRect = { ...viewportRect };
		const heightCorrection =
			WindowManagerSandbox.instance!.currentWindowMode === WindowMode.Window
				? (WindowManagerSandbox.instance!.bottomSheetHeight +
						WindowManagerSandbox.instance!.toolbarHeight) /
					figma.viewport.zoom
				: 0;
		virtualViewportRect.height -= heightCorrection;
		// console.log(nodeRect);
		// console.log(viewportRect);

		if (select) {
			await this.selectNodes([nodeId]);
		}

		const center = { ...figma.viewport.center };
		const zoomMarginLeft = 60 / figma.viewport.zoom; // we add another 30 for the ruler
		const zoomMarginRight = 30 / figma.viewport.zoom;

		const zoomMarginTop = 60 / figma.viewport.zoom; // we add another 30 for the ruler
		const zoomMarginBottom = 30 / figma.viewport.zoom;
		if (nodeRect) {
			if (nodeRect.x < virtualViewportRect.x) {
				// node left to the viewport
				center.x =
					nodeCenterX + virtualViewportRect.width / 2 - nodeRect.width / 2 - zoomMarginLeft;
			} else if (nodeRect.x + nodeRect.width > virtualViewportRect.x + virtualViewportRect.width) {
				// node right to the viewoport
				center.x =
					nodeCenterX - virtualViewportRect.width / 2 + nodeRect.width / 2 + zoomMarginRight;
			}

			if (nodeRect.y < virtualViewportRect.y) {
				// node above of the viewport
				center.y = nodeCenterY + viewportRect.height / 2 - nodeRect.height / 2 - zoomMarginTop;
			} else if (
				nodeRect.y + nodeRect.height >
				virtualViewportRect.y + virtualViewportRect.height
			) {
				// node below the viewport
				center.y =
					nodeCenterY -
					viewportRect.height / 2 +
					nodeRect.height / 2 +
					zoomMarginBottom +
					heightCorrection; // + nodeRect.height + zoomMargin + heightCorrection;
			}
		}

		figma.viewport.center = center;

		if (select) {
			await this.selectNodes([nodeId]);
		}
	}

	async getSelectedNodeIds() {
		return figma.currentPage.selection.map((node) => node.id);
	}

	async selectNodes(nodeIds: string[]) {
		const nodesToSelect = [] as SceneNode[];

		for (const nodeId of nodeIds) {
			const node = figma.getNodeById(nodeId) as SceneNode;
			if (!node) {
				console.log(`WARNING: node with id ${nodeId} not found in select nodes`);
				continue;
			}
			nodesToSelect.push(node);
		}

		if (nodesToSelect.length > 0) {
			figma.currentPage.selection = nodesToSelect;
		}
	}

	async scrollAndZoomNodesIntoView(nodeIds: string[]) {
		const nodesToSelect = [] as SceneNode[];

		for (const nodeId of nodeIds) {
			const node = figma.getNodeById(nodeId) as SceneNode;
			if (!node) {
				console.log(`WARNING: node with id ${nodeId} not found in select nodes`);
				continue;
			}
			nodesToSelect.push(node);
		}

		if (nodesToSelect.length > 0) {
			figma.viewport.scrollAndZoomIntoView(nodesToSelect);
		}
	}

	async loadFontsForNodesWithId(textNodeIds: string[]) {
		await this.loadFontForTextNodes(
			textNodeIds.map((textNodeId) => figma.getNodeById(textNodeId)! as TextNode),
		);
	}

	private async loadFontForTextNodes(textNodes: TextNode[]) {
		const fontsToLoad = [] as FontName[];
		for (const textNode of textNodes) {
			this.getFonts(textNode, fontsToLoad);
		}
		await this.loadFonts(fontsToLoad);
	}

	private async loadFonts(fontArray = [] as FontName[]) {
		await Promise.all(fontArray.map(figma.loadFontAsync));
	}

	private getFonts(textNode: TextNode, fontArray = [] as FontName[]) {
		if (textNode.characters.length === 0) {
			if (
				!fontArray.find(
					(font) =>
						font.family === (textNode.fontName as FontName).family &&
						font.style === (textNode.fontName as FontName).style,
				)
			) {
				fontArray.push(textNode.fontName as FontName);
			}
		} else {
			const fontsToLoad = textNode.getRangeAllFontNames(0, textNode.characters.length);
			for (const fontToLoad of fontsToLoad) {
				if (
					!fontArray.find(
						(font) =>
							font.family === (fontToLoad as FontName).family &&
							font.style === (fontToLoad as FontName).style,
					)
				) {
					fontArray.push(fontToLoad as FontName);
				}
			}
		}
	}
}
