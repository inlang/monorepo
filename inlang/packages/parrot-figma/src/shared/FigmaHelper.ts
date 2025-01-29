import LocalizedLabelManager from "../lib/localizedlabels/LocalizedLabelManager";
import { MessageLinkState } from "../lib/localizedlabels/LocalizedLabel";

const defaultLinkStyleKey = "defaultLinkStyle";

export default class FigmaHelper {
	public proxyClassName = "FigmaHelper";

	figma: PluginAPI | undefined;

	constructor(figma?: PluginAPI) {
		this.figma = figma;
	}

	async toggleKeyFrame(frameNodeId: string) {
		const frame = figma.getNodeById(frameNodeId);
		if (!frame) {
			return;
		}
		/*
          let showSamleValues = frame.getPluginData(FigmaLocaliziationKeyHelper.sampleValuesDataKey) == '' ? false : true;

          console.log('[' +frame.getPluginData(FigmaLocaliziationKeyHelper.sampleValuesDataKey) +']');
          if (showSamleValues) {
            console.log("showSamleValues true - setting it to none"  );
            frame.setPluginData(FigmaLocaliziationKeyHelper.sampleValuesDataKey, '');
          } else {
            console.log("showSamleValues false - setting it to true"  );
            frame.setPluginData(FigmaLocaliziationKeyHelper.sampleValuesDataKey, 'true');
          }
          */
		// this.drawKeyFrame(frame);
		await this.updateFrame(frame);
	}

	// async drawKeyFrame(frameNodeId: string, labelManager: LocalizedLabelManager) {

	//       const frame = figma.getNodeById(frameNodeId);
	//       const MARGIN = 50;

	//       let translatedFrame = await labelManager.getFrameById(frameNodeId);

	//       let keyFrame: FrameNode | null = null
	//       /*if (frame.getPluginData('keyFrameId')) {
	//           let oldFrame = figma.getNodeById(frame.getPluginData('keyFrameId')) as FrameNode | null
	//           if (oldFrame) {
	//               oldFrame.remove()
	//           }
	//       }*/

	//       keyFrame = figma.createFrame();
	//       keyFrame.name = "Localized Keys"

	//       // frame.setPluginData('keyFrameId', keyFrame.id);

	//       let frameFrame = frame as FrameNode

	//       keyFrame.x = frameFrame.x - MARGIN
	//       keyFrame.y = frameFrame.y - MARGIN

	//       keyFrame.fills = [{
	//           type: 'SOLID',
	//           visible: false,
	//           color: { r: 200 / 255, g: 200 / 255, b: 200 / 255 },
	//       }];

	//       let fontToLoad = null;

	//       let maxRight = 0;
	//       let maxBottom = (frame as FrameNode).height;
	//       let i = 0;

	//       for (let nodeWithKey of translatedFrame.localizedLabelsInFrame) {

	//           if (nodeWithKey.messageLinkState !== MessageLinkState.Linked) {
	//             continue;
	//           }

	//           let textNode = figma.createText()

	//           textNode.y = MARGIN + (40 * i);
	//           textNode.x = frameFrame.width + MARGIN + MARGIN;

	//           if (!fontToLoad) {
	//               fontToLoad = textNode.fontName as FontName

	//               // Load the font in the text node before setting the characters
	//               await figma.loadFontAsync(fontToLoad);
	//           }

	//           // Set bigger font size and red color
	//           textNode.fontSize = 18
	//           textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
	//           textNode.characters = nodeWithKey.messageId!;

	//           maxRight = Math.max(textNode.x + textNode.width, maxRight);
	//           maxBottom = Math.max(textNode.y + textNode.height, maxBottom);

	//           keyFrame.appendChild(textNode);

	//           // Move to (50, 50)
	//           const x1 = nodeWithKey.x + (nodeWithKey.width / 2) + MARGIN;
	//           const y1 = nodeWithKey.y + MARGIN;

	//           const x2 = textNode.x - 5;
	//           const y2 = textNode.y + (textNode.height / 2);

	//           let leftTop = {
	//               x: x1 < x2 ? x1 : x2,
	//               y: y1 < y2 ? y1 : y2,
	//           }

	//           let rightBottom = {
	//               x: x1 > x2 ? x1 : x2,
	//               y: y1 > y2 ? y1 : y2,
	//           }

	//           const width = rightBottom.x - leftTop.x;
	//           const height = rightBottom.y - leftTop.y;

	//           const length = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2))

	//           let line = figma.createLine();
	//           line.x = x1;
	//           line.y = y1;
	//           line.name = nodeWithKey.messageId!

	//           // Make line 200px long
	//           line.resize(length, 0);

	//           // 4px thick red line with arrows at each end
	//           line.strokeWeight = 1
	//           line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
	//           line.dashPattern = [2, 2]

	//           const width2 = x2 - x1;
	//           const height2 = y2 - y1;

	//           line.rotation = -Math.atan2(height2, width2) * 180 / Math.PI;

	//           keyFrame.appendChild(line);

	//           i++;
	//       }

	//       keyFrame.resize(maxRight + MARGIN, maxBottom + MARGIN);

	//       const fills: Paint[] = [{
	//           type: 'SOLID',
	//           color: { r: 200 / 255, g: 200 / 255, b: 200 / 255 },
	//           opacity: 0.28
	//       }];

	//       // draw a semi transparent box around the original frame
	//       const rectLeft = figma.createRectangle();
	//       rectLeft.x = 0
	//       rectLeft.y = 0
	//       rectLeft.resize(MARGIN, maxBottom + MARGIN)
	//       rectLeft.fills = fills;

	//       keyFrame.insertChild(0, rectLeft);

	//       const rectRight = figma.createRectangle();
	//       rectRight.x = frameFrame.width + MARGIN;
	//       rectRight.y = 0
	//       rectRight.resize(maxRight - MARGIN - frameFrame.width, maxBottom + MARGIN)
	//       rectRight.fills = fills;
	//       keyFrame.insertChild(0, rectRight);

	//       const rectTop = figma.createRectangle();
	//       rectTop.x = MARGIN
	//       rectTop.y = 0
	//       rectTop.resize(frameFrame.width, MARGIN - 30)
	//       rectTop.fills = fills;
	//       keyFrame.insertChild(0, rectTop);

	//       const rectBottom = figma.createRectangle();
	//       rectBottom.x = MARGIN
	//       rectBottom.y = frameFrame.height + MARGIN;
	//       rectBottom.resize(frameFrame.width, maxBottom - frameFrame.height + MARGIN)
	//       rectBottom.fills = fills;
	//       keyFrame.insertChild(0, rectBottom);

	// }

	async updateFrame(frame: BaseNode) {
		/*
        console.log('updateFrame extractAllKeysFromChildMixin')
        let nodesWithKeys = FigmaLocaliziationHelper.extractAllKeysFromChildMixin(frame as ChildrenMixin, [])
        let language = frame.getPluginData(FigmaLocaliziationHelper.languageDataKey) == '' ? 'none' : frame.getPluginData(FigmaLocaliziationHelper.languageDataKey);

        let useSampleValues = frame.getPluginData(FigmaLocaliziationHelper.sampleValuesDataKey) == '' ? false : true;

        await (new FigmaUtil()).loadFontsForNodesWithId(nodesWithKeys.map(nodeWithKey => nodeWithKey.nodeId));

        for (let nodeWithKey of nodesWithKeys) {

            if (language === 'none') {
                break;
            }

            this.messageStore!.enrichLocalizationState(nodeWithKey, language as Language);
            let textNodeId = nodeWithKey.nodeId;

            if (language == 'keys') {
                await this.updateTextNode(textNodeId, nodeWithKey.key, undefined, true);
            } else {

                let textNode = figma.getNodeById(textNodeId)! as TextNode;
                let pluralId = textNode.getPluginData('pluralId') === '' ? Plural.Other : textNode.getPluginData('pluralId');

                let selectedPlural = nodeWithKey.translataions?.[pluralId]
                if (selectedPlural && selectedPlural.translation && selectedPlural.translationFilled ) {
                    let text = selectedPlural.translation
                    if (useSampleValues) {
                        text = selectedPlural.translationFilled
                    }
                    await this.updateTextNode(textNodeId, text, pluralId, true);
                }

            }
        }
        console.log((new Date()).getTime()+' updateFrame done')
        */
	}
}
