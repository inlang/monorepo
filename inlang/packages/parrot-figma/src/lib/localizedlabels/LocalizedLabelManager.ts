import { Message } from "@inlang/sdk";
import { Locale } from "../message/variants/Locale";
import { LabelStyle, LocalizedLabel } from "./LocalizedLabel";
import ChangeEvent from "./ChangeEvent";
import VirtualTree, { VirtualTreeNode } from "./VirtualTree";
import LinksLoadedEvent from "./LinksLoadedEvent";
import TextNodeLinter from "./lint/TextNodeLinter";
import FontHelper from "./FontUtil";
import { InlangMessageStore } from "../message/store/InlangMessageStoreFigmaRoot";
import { FillinToPlaceholder as FillinsToPlaceholder } from "../message/MessageExtnesions";
import { MessageParameterValues } from "../message/MessageParameterValues";

export interface NodeSelection {
	[nodeId: string]: {
		rootFrameId: string | undefined;
		selectedNodeId: string;
		directSelection: boolean;
		isLabel: boolean;
		messageId: string | undefined;
	};
}

export interface SandboxUpdateLabelProperties {
	labelName?: string;
	messageState:
		| { type: "linked"; messageId: string; parameterValues: MessageParameterValues }
		| { type: "unlinked"; unlinkedMessage: Message; parameterValues: MessageParameterValues }
		| { type: "unmanaged"; unmanaged: boolean }
		| { type: "unset" }
		| undefined;
	language?: Locale;
	messageVersion?: number;
	variantPatternHTMLHash?: string;
	characters?: string;
	ops?: any;
	// TODO #18 selectors replace with variables
	fillinsToPlaceholder?: FillinsToPlaceholder | null;
}

export interface DeltaOp {
	start: number;
	end: number;
	attributes: {
		placeholder?: {
			name: string;
			unnamed: boolean;
			argumentPosition?: number;
			formatFn?: string;
			options?: any;
			invisibleMarkers: number;
		};
		link?: string;
		textDecoration?: TextDecoration;
		bold?: boolean;
		italic?: boolean;
		fontFamily?: string;
		indentation?: number;
		list?: string;
	};
	processed?: boolean;
	ignoreForLabelStyle?: boolean;
}

interface CachedTextNode extends TextNode {
	_cachedNode?: TextNode;
}

export const MARKER_CHARACTER = "​";
// eslint-disable-next-line no-irregular-whitespace -- this is on purpose to have a zero width space in figma
// export const MARKER_CHARACTER = 'X​';
export default class LocalizedLabelManager {
	private containerSizeThreashold = 3000;

	public proxyClassName = "LocalizedLabelManager";

	public samplesPrefix = "sample_values";

	public linkStyleDataKey = "linkstyle";

	public separator = "__";

	public variantPatternHTMLHashDataKey = "fth";

	public sampleValuesDataKey = "sv";

	public anonymMessageDataKey = "aim";

	public fillinsToPlaceholderKey = "fitp";

	public parameterValuesKey = "pv";

	public languageDataKey = "l";

	public messageUnmanagedKey = "mum";

	//  public messageVersionDataKey = 'mv';

	public messageNameDataKey = "mn";

	public messageNamePrefixKey = "mn_";

	// hash that allows detection of autorename
	public autoRenameHashKey = "arh";

	public labelIdDataKey = "olid"; // we store the orginal label id (the id of the node when the plugin changed properties the first time) to detect a copy

	private virtualTree = new VirtualTree();

	private labelToMessage = {} as {
		[nodeId: string]: string;
	};

	firstTextnodeInViewport: undefined | string;

	private refreshLabelMessageLinkCache(textNodeId: string, messageId: string | undefined) {
		const currentKey = this.labelToMessage[textNodeId];
		if (messageId === undefined || messageId === "") {
			if (currentKey) {
				this.messageStore!.messageIdToLabels[currentKey]!.delete(textNodeId);
				return currentKey;
			}
			return undefined;
		}

		if (!this.messageStore!.messageIdToLabels[messageId]) {
			this.messageStore!.messageIdToLabels[messageId] = new Set<string>();
		}
		if (this.messageStore!.messageIdToLabels[messageId].has(textNodeId)) {
			return undefined;
		}
		this.messageStore!.messageIdToLabels[messageId].add(textNodeId);
		this.labelToMessage[textNodeId] = messageId;

		// Update the messageId in the virtual tree node
		const virtualNode = this.virtualTree.getVirtualNode(textNodeId);
		if (virtualNode) {
			virtualNode.messageId = messageId;
		}

		if (currentKey) {
			if (currentKey !== messageId) {
				this.messageStore!.messageIdToLabels[currentKey]!.delete(textNodeId);
			}
			return currentKey;
		}
		return undefined;
	}

	messageStore: InlangMessageStore | undefined;

	constructor(messageStore?: InlangMessageStore) {
		if (!messageStore) {
			return;
		}

		this.messageStore = messageStore;

		figma.on("documentchange", this.forwardDocumentChanges.bind(this));

		const selectedNodeStateByUser = {} as any;
		// eslint-disable-next-line @typescript-eslint/no-this-alias -- we need to access this in the interval
		const that = this;
		setInterval(() => {
			const changeEvent = {
				documentChanges: [] as any[],
			};
			// for (const user of [figma.currentUser]) { // NOTE: activeUsers is only available in figJam :/
			// if (user?.id && user?.selection.length === 1) {
			if (figma.currentPage.selection.length === 1) {
				const activeNode = figma.currentPage.selection[0]; // figma.getNodeById(user.selection[0]);
				const user = { id: "singleUser" };
				const currentState = {
					nodeId: "",
					textSegments: [] as any[],
				};
				if (activeNode !== undefined && activeNode?.type === "TEXT") {
					currentState.nodeId = activeNode?.id;
					const unpropagatedTextSegments = activeNode.getStyledTextSegments([
						"indentation",
						"listOptions",
					]);
					for (const textSegment of unpropagatedTextSegments) {
						currentState.textSegments.push({
							indentation: textSegment.indentation,
							listOptions: textSegment.listOptions,
						});
					}

					if (
						!selectedNodeStateByUser[user.id] ||
						selectedNodeStateByUser[user.id].nodeId !== currentState.nodeId
					) {
						selectedNodeStateByUser[user.id] = currentState;
						// console.log('no change');
					} else if (
						selectedNodeStateByUser[user.id].textSegments.length !==
						currentState.textSegments.length
					) {
						// TODO change detected
						selectedNodeStateByUser[user.id] = currentState;
						changeEvent.documentChanges.push({
							id: activeNode.id,
							origin: figma.currentUser?.id === user.id ? "LOCAL" : "REMOTE",
							type: "PROPERTY_CHANGE",
							properties: ["listOptions"],

							node: activeNode,
						});
					} else {
						checkStateLoop: for (let i = 0; i < currentState.textSegments.length; i++) {
							if (
								selectedNodeStateByUser[user.id].textSegments[i].indentation !==
									currentState.textSegments[i].indentation ||
								selectedNodeStateByUser[user.id].textSegments[i].listOptions.type !==
									currentState.textSegments[i].listOptions.type
							) {
								// TODO indentation change detected
								selectedNodeStateByUser[user.id] = currentState;
								changeEvent.documentChanges.push({
									id: activeNode.id,
									origin: figma.currentUser?.id === user.id ? "LOCAL" : "REMOTE",
									type: "PROPERTY_CHANGE",
									properties: ["listOptions"],

									node: activeNode,
								});

								break checkStateLoop;
							}
						}
					}
				} else {
					// node has changed no need to keep the old ones state in memory
					delete selectedNodeStateByUser[user.id];
				}
			}
			// }

			if (changeEvent.documentChanges.length > 0) {
				// console.log('emulating event');
				that.forwardDocumentChanges(changeEvent);
			}
		}, 100);
	}

	forwardDocumentChanges(event: any) {
		const deletedIds = new Set<string>();
		const changedLabels = [] as LocalizedLabel[];
		const createdLabels = [] as LocalizedLabel[];
		const keysChanged = new Set<string>();
		for (const change of event.documentChanges) {
			switch (change.type) {
				case "CREATE": {
					if (change.node.removed) {
						// we skip changes of removed nodes
						break;
					}
					const createdNode = figma.getNodeById(change.id)!;
					if (createdNode.type === "TEXT") {
						const localizedLabel = this.toLocalizedLabelOrUndefined(createdNode as TextNode);
						if (localizedLabel) {
							this.virtualTree.addNode(createdNode, createdNode.id);
							if (localizedLabel.messageId) {
								const previousKey = this.refreshLabelMessageLinkCache(
									localizedLabel.nodeId,
									localizedLabel.messageId,
								);
								if (previousKey !== localizedLabel.messageId) {
									if (previousKey) {
										keysChanged.add(previousKey);
									}
									keysChanged.add(localizedLabel.messageId);
								}
							} else {
								const previousKey = this.refreshLabelMessageLinkCache(
									localizedLabel.nodeId,
									undefined,
								);
								if (previousKey) {
									keysChanged.add(previousKey);
								}
							}
							createdLabels.push(localizedLabel);
						}
					} else if ((createdNode as FrameNode).children) {
						// console.log(`Node created - with children ${change.id}`);
						const skipInvisibleInstanceChildrenBefore = figma.skipInvisibleInstanceChildren;
						figma.skipInvisibleInstanceChildren = true;
						const createdTextNodes = (createdNode as FrameNode).findAllWithCriteria({
							types: ["TEXT"],
						});
						for (const createdTextNode of createdTextNodes) {
							const localizedLabel = this.toLocalizedLabelOrUndefined(createdTextNode);
							if (localizedLabel) {
								this.virtualTree.addNode(createdNode, createdNode.id);
								if (localizedLabel.messageId) {
									const previousKey = this.refreshLabelMessageLinkCache(
										localizedLabel.nodeId,
										localizedLabel.messageId,
									);
									if (previousKey !== localizedLabel.messageId) {
										if (previousKey) {
											keysChanged.add(previousKey);
										}
										keysChanged.add(localizedLabel.messageId);
									}
								} else {
									const previousKey = this.refreshLabelMessageLinkCache(
										localizedLabel.nodeId,
										undefined,
									);
									if (previousKey) {
										keysChanged.add(previousKey);
									}
								}
								createdLabels.push(localizedLabel);
								// lokalizedLabel.parentIds.forEach((parentId) => frameData.refreshTriggerIds.add(parentId));
							}
						}
						figma.skipInvisibleInstanceChildren = skipInvisibleInstanceChildrenBefore;
					}
					break;
				}
				case "DELETE": {
					// in case of a deletion we propagate the deleted node id - we don't have more information
					// about this node from figma :-/ The ui layer will know what this change affects
					const deletedLeafs = this.virtualTree
						.removeBranch(change.id)
						.filter((node) => node.cacheRelevant);
					deletedLeafs.forEach((node) => {
						this.refreshLabelMessageLinkCache(node.id, undefined);
						deletedIds.add(node.id);
					});
					// console.log(`Node deleted ${change.id} leafs: ${JSON.stringify(deletedIds)}`);
					break;
				}
				case "PROPERTY_CHANGE": {
					if (change.node.removed) {
						// we skip changes of removed nodes
						break;
					}
					const changedNode = figma.getNodeById(change.id);

					if (changedNode?.type === "DOCUMENT") {
						break;
					}

					if (changedNode?.type === "PAGE") {
						break;
					}

					if (changedNode?.type === "TEXT") {
						// console.log(`Node changed - text ${changedNode.id}`);

						if (!this.virtualTree.hasNode(changedNode.id)) {
							// console.log(`Node changed - text ${changedNode.id} added to vt`);
							this.virtualTree.addNode(changedNode, changedNode.id);
						} else if (change.properties.includes("parent")) {
							// console.log(`Node changed - text ${changedNode.id} moved...`);
							this.virtualTree.moveNode(changedNode!.id, changedNode!.parent!);
						}

						const localizedLabel = this.toLocalizedLabelOrUndefined(changedNode as TextNode);
						if (localizedLabel) {
							if (localizedLabel.messageId) {
								const previousKey = this.refreshLabelMessageLinkCache(
									localizedLabel.nodeId,
									localizedLabel.messageId,
								);
								if (previousKey !== localizedLabel.messageId!) {
									if (previousKey) {
										keysChanged.add(previousKey);
									}
									keysChanged.add(localizedLabel.messageId!);
								}
							} else {
								const previousKey = this.refreshLabelMessageLinkCache(
									localizedLabel.nodeId,
									undefined,
								);
								if (previousKey) {
									keysChanged.add(previousKey);
								}
							}
							changedLabels.push(localizedLabel);
						} else {
							deletedIds.add(changedNode.id);
							this.refreshLabelMessageLinkCache(changedNode.id, undefined);
						}
					} else if ((changedNode as FrameNode).children) {
						let changedVirtualNodes = [] as VirtualTreeNode[];
						if (change.properties.includes("parent")) {
							changedVirtualNodes = this.virtualTree.moveNode(
								changedNode!.id,
								changedNode!.parent!,
							);
							// console.log(`Node changed - parent ${change.id} moved in vt affacted: ${JSON.stringify(changedVirtualNodes.length)}`);
						} else if (
							change.properties.includes("name") ||
							change.properties.includes("pluginData") ||
							change.properties.includes("visible")
						) {
							// if the name changed we have to update all childs since naming changes the key abrivation
							changedVirtualNodes = this.virtualTree.getAllNodesInBranchByRootId(changedNode!.id);
							// console.log(`Node changed - ${change.id} name in vt affacted: ${JSON.stringify(changedVirtualNodes.length)}`);
						}

						changedVirtualNodes.forEach((changedVNode) => {
							if (changedVNode.cacheRelevant) {
								const movedFigmaNode = figma.getNodeById(changedVNode.id);
								if (movedFigmaNode && movedFigmaNode.type === "TEXT") {
									const localizedLabel = this.toLocalizedLabelOrUndefined(
										movedFigmaNode as TextNode,
									);
									if (localizedLabel) {
										if (localizedLabel.messageId) {
											const previousKey = this.refreshLabelMessageLinkCache(
												localizedLabel.nodeId,
												localizedLabel.messageId,
											);
											if (previousKey !== localizedLabel.messageId) {
												if (previousKey) {
													keysChanged.add(previousKey);
												}
												keysChanged.add(localizedLabel.messageId);
											}
										} else {
											const previousKey = this.refreshLabelMessageLinkCache(
												localizedLabel.nodeId,
												undefined,
											);
											if (previousKey) {
												keysChanged.add(previousKey);
											}
										}
										changedLabels.push(localizedLabel);
										// lokalizedLabel.parentIds.forEach((parentId) => frameData.refreshTriggerIds.add(parentId));
									} else {
										deletedIds.add(movedFigmaNode.id);
										this.refreshLabelMessageLinkCache(movedFigmaNode.id, undefined);
									}
								}
							}
						});
					}

					break;
				}
				case "STYLE_CREATE":
				case "STYLE_DELETE":
				case "STYLE_PROPERTY_CHANGE":
					break;
			}
		}

		const message = {
			target: "LocalizedLabelManager",
			type: "cacheUpdate",
			deletedNodeIds: [...deletedIds],
			changedLabels: changedLabels.filter(
				(node) => !createdLabels.some((createdNode) => createdNode.nodeId === node.nodeId),
			),
			createdLabels,
			changedKeys: [...keysChanged],
		} as ChangeEvent;

		// console.log('keys changed');
		// console.log(keysChanged);
		figma.ui.postMessage(message);
	}

	async prepare() {
		await FontHelper.initialize();
	}

	async startFillupCache() {
		// we start the async process here - this will load frame by frame and intercept each load with a tick
		this.fillUpCache().catch((e) => console.log(e));
	}

	private nodeCount = 0;

	private textNodeCount = 0;

	private linkedTextNodeCount = 0;

	private numberOfAnonymousTextNodes = 0;

	private parrotTextNodesCount = 0;

	private frameCount = 0;

	async fillUpCache() {
		const start = Date.now();
		const keysLoaded = new Set<string>();
		let totalNodesProcessed = 0;

		try {
			// Start by processing the current page first
			const { currentPage } = figma;
			this.virtualTree.addNode(figma.root, figma.root.id);
			this.virtualTree.addNode(currentPage, currentPage.id, figma.root);
			const { nodesProcessed: nodesProcessedInCurrentPage, maxDepth: maxDepthInCurrentPage } =
				await this.processNodeRecursively(currentPage, figma.root, keysLoaded, 0);
			totalNodesProcessed += nodesProcessedInCurrentPage;
			console.log(
				`fillUpCache - Current page processed, processed ${nodesProcessedInCurrentPage} nodes, max depth ${maxDepthInCurrentPage}, took ${Date.now() - start}ms`,
			);

			// Now process the other pages
			const otherPages = figma.root.children.filter((page) => page.id !== currentPage.id);
			for (const page of otherPages) {
				this.virtualTree.addNode(page, page.id);
				const startPage = Date.now();
				const { nodesProcessed: nodesProcessedInPage, maxDepth: maxDepthInPage } =
					await this.processNodeRecursively(page, figma.root, keysLoaded, 0);
				totalNodesProcessed += nodesProcessedInPage;
				const endPage = Date.now();
				console.log(
					`fillUpCache - Page ${page.name} processed, processed ${nodesProcessedInPage} nodes, max depth ${maxDepthInPage}, took ${endPage - startPage}ms`,
				);
			}
			console.log(
				`fillUpCache - All pages processed, total nodes processed: ${totalNodesProcessed}, total time: ${Date.now() - start}ms`,
			);

			figma.root.setPluginData("numberOfLinkedMessages", keysLoaded.size.toString());

			figma.root.setPluginData("numberOfTextNodes", this.textNodeCount.toString());
			figma.root.setPluginData("numberOfLinkedTextNodes", this.linkedTextNodeCount.toString());
			figma.root.setPluginData(
				"numberOfAnonymousTextNodes",
				this.numberOfAnonymousTextNodes.toString(),
			);
			figma.root.setPluginData("numberOfParrotTextNodes", this.parrotTextNodesCount.toString());

			figma.root.setPluginData("loadingTime", (Date.now() - start).toString());
			figma.root.setPluginData("numberOfFrames", this.frameCount.toString());

			this.postLinksLoadedMessage(keysLoaded);
		} catch (error) {
			console.error("fillUpCache - Error:", error);
		}
	}

	async processNodeRecursively(
		node: BaseNode,
		parentNode: BaseNode,
		keysLoaded: Set<string>,
		depth: number,
	): Promise<{ nodesProcessed: number; maxDepth: number }> {
		let nodesProcessed = 0;
		let maxDepth = depth;
		// Process if the node is a Page
		const nodeType = node.type;
		if (nodeType === "PAGE") {
			this.virtualTree.addNode(node, node.id, parentNode);
			for (const child of (node as PageNode).children) {
				const exportChild = await child.exportAsync({ format: "JSON_REST_V1" });
				const result = await this.processNodeRecursively(
					(exportChild as any).document,
					node,
					keysLoaded,
					depth + 1,
				);
				nodesProcessed += result.nodesProcessed;
				maxDepth = Math.max(maxDepth, result.maxDepth);
				// Optional delay to prevent blocking
				await new Promise((resolve) => {
					setTimeout(resolve, 0);
				});
			}
		} else if (nodeType === "TEXT") {
			await this.processTextNode(node as TextNode, keysLoaded, parentNode);
			nodesProcessed += 1;
		} else if (
			nodeType === "COMPONENT" ||
			nodeType === "COMPONENT_SET" ||
			nodeType === "INSTANCE" ||
			nodeType === "FRAME" ||
			nodeType === "GROUP" ||
			nodeType === "SECTION"
		) {
			if (nodeType === "FRAME") {
				this.frameCount += 1;
			}
			this.virtualTree.addNode(node, node.id, parentNode);
			for (const child of node.children) {
				const result = await this.processNodeRecursively(child, node, keysLoaded, depth + 1);
				nodesProcessed += result.nodesProcessed;
				maxDepth = Math.max(maxDepth, result.maxDepth);
			}
		}
		return { nodesProcessed, maxDepth };
	}

	async processTextNode(textNode: CachedTextNode, keysLoaded: Set<string>, parentNode?: BaseNode) {
		const textNodeId = textNode.id;

		textNode.getPluginData = (key: string) => {
			if (!textNode._cachedNode) {
				textNode._cachedNode = figma.getNodeById(textNodeId) as TextNode | undefined;
			}

			const pluginData = textNode._cachedNode?.getPluginData(key);
			// console.log("accessig key [" + key + "] via patched method:" +pluginData)
			return pluginData as any;
		};
		this.virtualTree.addNode(textNode, textNodeId, parentNode);

		const messageId = textNode.getPluginData(this.messageNameDataKey);
		if (messageId) {
			this.linkedTextNodeCount += 1;
			const previousMessage = this.refreshLabelMessageLinkCache(textNodeId, messageId);
			if (previousMessage) {
				keysLoaded.add(previousMessage);
				this.virtualTree.addNode(textNode, textNodeId);
			}
			keysLoaded.add(messageId);
		}

		this.textNodeCount += 1;
		if (textNode.getPluginData(this.messageUnmanagedKey) === "false") {
			this.parrotTextNodesCount += 1;
			if (textNode.getPluginData(this.anonymMessageDataKey)) {
				this.numberOfAnonymousTextNodes += 1;
			}
		}

		if (this.nodeCount % 300 === 0) {
			// Optional delay to prevent blocking
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
		}
		this.nodeCount += 1;
	}

	postLinksLoadedMessage(keysLoaded: Set<string>) {
		const message = {
			target: "LocalizedLabelManager",
			type: "linksLoaded",
			keys: [...keysLoaded],
		} as LinksLoadedEvent;

		figma.ui.postMessage(message);
	}

	async getSelection() {
		const selectionEnhanced = {} as NodeSelection;

		for (const selectedNode of figma.currentPage.selection) {
			const rootFrame = this.getRootFrame(selectedNode);

			if (selectedNode.type === "TEXT") {
				const textNode = this.toLocalizedLabelOrUndefined(selectedNode as TextNode);
				// the node within the selection is a label
				selectionEnhanced[selectedNode.id] = {
					rootFrameId: rootFrame?.id,
					directSelection: true,
					isLabel: selectedNode.type === "TEXT",
					selectedNodeId: selectedNode.id,
					messageId: textNode?.messageId,
				};
			} else {
				selectionEnhanced[selectedNode.id] = {
					directSelection: true,
					isLabel: false,
					rootFrameId: rootFrame?.id,
					selectedNodeId: selectedNode.id,
					messageId: undefined,
				};

				const virtualSelectedNode = this.virtualTree.getVirtualNode(selectedNode.id);
				if (virtualSelectedNode) {
					this.virtualTree
						.getAllNodesInBranchByRootId(virtualSelectedNode.id)
						.forEach((virtualNode) => {
							if (virtualNode.type === "TEXT" && selectionEnhanced[virtualNode.id] === undefined) {
								const node = figma.getNodeById(virtualNode.id) as TextNode;
								if (node) {
									const textNode = this.toLocalizedLabelOrUndefined(
										figma.getNodeById(virtualNode.id) as TextNode,
									);
									selectionEnhanced[virtualNode.id] = {
										directSelection: false,
										isLabel: true,
										rootFrameId: rootFrame?.id,
										selectedNodeId: virtualNode.id,
										messageId: textNode?.messageId,
									};
								}
							}
						});
				}
			}
		}

		return selectionEnhanced;
	}

	/**
	 * Walks up the tree and returns the frame closest to the root node
	 *
	 * @param node the node to extract the root frame from
	 * @returns the root frame (The last parent of type frame)
	 */

	getRootFrame(node: any): FrameNode | undefined {
		if (!node.parent) {
			throw new Error("given node has no parent");
		}
		let parent = node;

		let rootFrame: FrameNode | undefined;

		while (parent) {
			const parentType = parent.type;
			if (
				(parentType === "COMPONENT" ||
					parentType === "COMPONENT_SET" ||
					parentType === "FRAME" ||
					parentType === "GROUP" ||
					parentType === "INSTANCE") &&
				parent.width < this.containerSizeThreashold
			) {
				rootFrame = parent;
			}
			parent = parent.parent;
		}

		return rootFrame;
	}

	async getById(textNodeId: string) {
		const textNode = figma.getNodeById(textNodeId) as TextNode;
		const lokalizedLabel = this.toLocalizedLabelOrUndefined(textNode);
		if (lokalizedLabel) {
			if (!this.virtualTree.hasNode(textNode.id)) {
				this.virtualTree.addNode(textNode, textNode.id);
			}
		}
		return lokalizedLabel;
	}

	async getWithMessage(messageId: string) {
		const labels = [] as LocalizedLabel[];
		const foundNodes = [] as VirtualTreeNode[];

		// Define the callback function for the traversal
		const findNodesWithMessage = (node: VirtualTreeNode) => {
			if (node.cacheRelevant && node.messageId === messageId) {
				foundNodes.push(node);
			}
		};

		// Start traversal from the root node
		this.virtualTree.traverseNode(figma.root.id, findNodesWithMessage);
		// console.log({ foundNodes });

		// Process found nodes to create LocalizedLabels
		for (const virtualNode of foundNodes) {
			const figmaNode = figma.getNodeById(virtualNode.id) as TextNode;
			const localizedLabel = this.toLocalizedLabelOrUndefined(figmaNode);

			if (localizedLabel) {
				if (!this.virtualTree.hasNode(figmaNode.id)) {
					this.virtualTree.addNode(figmaNode, figmaNode.id);
				}
				labels.push(localizedLabel);
			}
		}
		return labels;
	}

	async getFrameById(frameId: string): Promise<{
		id: string;
		name: string;
		localizedLabelsInFrame: LocalizedLabel[];
	}> {
		const frame = figma.getNodeById(frameId) as FrameNode;
		return this.getFrame(frame);
	}

	private async getFrame(frame: FrameNode): Promise<{
		id: string;
		name: string;
		localizedLabelsInFrame: LocalizedLabel[];
	}> {
		const skipInvisibleInstanceChildrenBefore = figma.skipInvisibleInstanceChildren;
		figma.skipInvisibleInstanceChildren = true;

		const frameData = {
			id: frame.id,
			name: frame.name,
			localizedLabelsInFrame: [] as LocalizedLabel[],
		};

		const textNodes = frame.findAllWithCriteria({ types: ["TEXT"] });

		for (const textNode of textNodes) {
			const lokalizedLabel = this.toLocalizedLabelOrUndefined(textNode);
			if (lokalizedLabel) {
				if (!this.virtualTree.hasNode(textNode.id)) {
					this.virtualTree.addNode(textNode, textNode.id);
				}
				frameData.localizedLabelsInFrame.push(lokalizedLabel);
				// lokalizedLabel.parentIds.forEach((parentId) => frameData.refreshTriggerIds.add(parentId));
			}
		}

		figma.skipInvisibleInstanceChildren = skipInvisibleInstanceChildrenBefore;

		return frameData;
	}

	async setLinkStyle(linkStyle: string) {
		figma.root.setPluginData(this.linkStyleDataKey, linkStyle);
	}

	async getLinkStyle() {
		const linkStyleRaw = figma.root.getPluginData(this.linkStyleDataKey);
		try {
			JSON.parse(linkStyleRaw);
			return linkStyleRaw;
		} catch (e) {
			return "";
		}
	}

	async updateFrameProperties(
		frameNodeId: string,
		properties: { language?: Locale; sampleValues?: boolean },
	) {
		const frame = figma.getNodeById(frameNodeId) as FrameNode;
		if (!frame) {
			return;
		}

		if (properties.language !== undefined) {
			frame.setPluginData(this.languageDataKey, properties.language);
		}

		if (properties.sampleValues !== undefined) {
			if (properties.sampleValues) {
				frame.setPluginData(this.sampleValuesDataKey, `${true}`);
			} else {
				frame.setPluginData(this.sampleValuesDataKey, "");
			}
		}

		// console.log((new Date()).getTime() + 'execution finished - puting result into message');
	}

	labelUpdateQueue = {} as any;

	private updateMessageReference(textNode: TextNode, messageId: string | null) {
		for (const dataKey of textNode.getPluginDataKeys()) {
			if (dataKey.startsWith(`${this.messageNamePrefixKey}_`)) {
				if (messageId === null || dataKey !== `${this.messageNamePrefixKey}_${messageId}`) {
					textNode.setPluginData(dataKey, "");
				}
			}
		}
		if (textNode.getPluginData(this.messageNameDataKey) !== messageId) {
			textNode.setPluginData(this.messageNameDataKey, "");
		}
	}

	async updateLabelProperties(nodeId: string, changedProperties: SandboxUpdateLabelProperties) {
		// setup queue for atomic label update processing
		// - if no execution is ongoing hop right in and create a queue
		// - if an execution is ongoing await the previous call
		if (this.labelUpdateQueue[nodeId]) {
			// console.log('queing update');
			await new Promise((resolver: any) => {
				// we don't resolve this promise - this is done by the excution of the current function
				this.labelUpdateQueue[nodeId].push(resolver);
			});
			// console.log('dequied');
		} else {
			// console.log('queing not needed - prepare queue for next call');
			// start a new queue
			this.labelUpdateQueue[nodeId] = [];
		}

		const textNode = figma.getNodeById(nodeId)! as TextNode;
		try {
			if (changedProperties.labelName !== undefined) {
				// console.log('setting name');
				textNode.name = changedProperties.labelName;
				textNode.autoRename = false;
				textNode.setPluginData(this.autoRenameHashKey, "");
			}

			if (changedProperties.messageState?.type === "unset") {
				this.updateMessageReference(textNode, null);
				textNode.setPluginData(this.parameterValuesKey, "");
				textNode.setPluginData(this.messageUnmanagedKey, "");
				textNode.setPluginData(this.anonymMessageDataKey, "");
				textNode.setPluginData(this.messageNameDataKey, "");
			} else if (changedProperties.messageState?.type === "unmanaged") {
				this.updateMessageReference(textNode, null);
				textNode.setPluginData(this.parameterValuesKey, "");
				textNode.setPluginData(this.messageUnmanagedKey, JSON.stringify(true));
				textNode.setPluginData(this.messageNameDataKey, "");
				textNode.setPluginData(this.anonymMessageDataKey, "");
			} else if (changedProperties.messageState?.type === "unlinked") {
				this.updateMessageReference(textNode, null);
				textNode.setPluginData(
					this.parameterValuesKey,
					JSON.stringify(changedProperties.messageState.parameterValues),
				);
				textNode.setPluginData(
					this.anonymMessageDataKey,
					JSON.stringify(changedProperties.messageState.unlinkedMessage),
				);
				textNode.setPluginData(this.messageUnmanagedKey, JSON.stringify(false));
				textNode.setPluginData(this.messageNameDataKey, "");
			} else if (changedProperties.messageState?.type === "linked") {
				this.updateMessageReference(textNode, changedProperties.messageState.messageId);
				textNode.setPluginData(
					this.parameterValuesKey,
					JSON.stringify(changedProperties.messageState.parameterValues),
				);
				textNode.setPluginData(this.messageUnmanagedKey, JSON.stringify(false));
				textNode.setPluginData(this.messageNameDataKey, changedProperties.messageState.messageId);
				textNode.setPluginData(this.anonymMessageDataKey, "");
				textNode.setPluginData(
					`${this.messageNamePrefixKey}_${changedProperties.messageState.messageId}`,
					changedProperties.messageState.messageId,
				);
			}

			// if (changedProperties.messageVersion !== undefined) {
			//   textNode.setPluginData(this.messageVersionDataKey, `${changedProperties.messageVersion}`);
			// }

			// TODO #18 selectors set variables instead
			// if (changedProperties.gender !== undefined) {
			//   textNode.setPluginData(this.messageGenderDataKey, changedProperties.gender ? changedProperties.gender : '');
			// }
			// if (changedProperties.plural !== undefined) {
			//   textNode.setPluginData(this.messagePluralDataKey, changedProperties.plural ? changedProperties.plural : '');
			// }

			if (changedProperties.language !== undefined) {
				if (changedProperties.language !== this.messageStore?.getConfigSync().refLanguage) {
					if (textNode.autoRename) {
						textNode.setPluginData(this.autoRenameHashKey, textNode.characters);
						textNode.autoRename = false;
					}
				} else if (textNode.getPluginData(this.autoRenameHashKey) === textNode.name) {
					textNode.autoRename = true;
				}
				textNode.setPluginData(
					this.languageDataKey,
					changedProperties.language ? changedProperties.language : "",
				);
			}

			if (changedProperties.fillinsToPlaceholder !== undefined) {
				textNode.setPluginData(
					this.fillinsToPlaceholderKey,
					JSON.stringify(changedProperties.fillinsToPlaceholder),
				);
			}

			// TODO think about the order - at the moment a lables characters might not get updated after fillins got set
			// NOTE: we also send the characters even if only styling has changed
			if (changedProperties.characters !== undefined) {
				try {
					await this.loadFontsForTextNodes([textNode]);
				} catch (e: any) {
					// rethrow with better error message
					e.message = `Can't update label - not all Fonts could get loaded: ${e.message}`;
					throw e;
				}

				// const textWithDecorators = this.toTextRangeObject(changedProperties.translation);

				// console.log(`setting characters from ${textNode.characters} to ${changedProperties.characters}`);

				// NOTE: when we are here and we have mixed font family we **should** have warned the user already - we go for the first one
				// TODO warn user about problematic labels
				const textNodeFontFamily =
					(textNode.fontName as FontName).family ??
					(textNode.getRangeFontName(0, 1) as FontName).family;
				const fonts = await figma.listAvailableFontsAsync();
				const fontFamilyVariants = fonts
					.filter((font: Font) => font.fontName.family === textNodeFontFamily)
					.map((font) => font.fontName);

				// check what inline style variants we find (bold, italic, bold&italic, regular)
				const fontStyleVariants = new Set<"bold" | "italic" | "bold italic" | "regular">();
				for (const rangeStyle of changedProperties.ops!) {
					if (rangeStyle.attributes?.italic && rangeStyle.attributes?.bold) {
						fontStyleVariants.add("bold italic");
					} else if (rangeStyle.attributes?.italic) {
						fontStyleVariants.add("italic");
					} else if (rangeStyle.attributes?.bold) {
						fontStyleVariants.add("bold");
					} else {
						fontStyleVariants.add("regular");
					}
				}

				// TODO check style segments when creating localized labels and warn for incompatibility
				// TODO also check for available fonts when creating the labels to disable bold/italic options for those labels that don't support it
				// TODO only load thos font variants that are needed and fail if one tries to apply them

				// find font names for style variants
				let regularFontName: FontName | undefined;
				let boldFontName: FontName | undefined;
				let italicFontName: FontName | undefined;
				let boldItalicFontName: FontName | undefined;

				if (fontStyleVariants.size > 0) {
					fontFamilyVariants.forEach((fontFamilyVariant) => {
						const styleLowerCase = fontFamilyVariant.style.toLowerCase();
						if (styleLowerCase === "regular") {
							regularFontName = fontFamilyVariant;
						}
						if (!regularFontName && styleLowerCase === "medium") {
							regularFontName = fontFamilyVariant;
						}

						if (styleLowerCase === "bold") {
							boldFontName = fontFamilyVariant;
						}

						if (styleLowerCase === "italic") {
							italicFontName = fontFamilyVariant;
						}

						if (styleLowerCase.includes("bold italic")) {
							boldItalicFontName = fontFamilyVariant;
						}
						if (
							!boldItalicFontName &&
							styleLowerCase.includes("italic") &&
							styleLowerCase.includes("bold")
						) {
							boldItalicFontName = fontFamilyVariant;
						}
					});

					if (fontStyleVariants.has("regular")) {
						if (!regularFontName) {
							throw new Error(`No regular font variant for ${textNodeFontFamily}  found `);
						}
						try {
							await figma.loadFontAsync(regularFontName);
						} catch (e: any) {
							e.message = `Could not load regular font for ${textNodeFontFamily}: ${e.message}`;
							throw e;
						}
					}

					if (fontStyleVariants.has("bold")) {
						if (!boldFontName) {
							throw new Error(`No bold font variant for ${textNodeFontFamily}  found `);
						}
						try {
							await figma.loadFontAsync(boldFontName);
						} catch (e: any) {
							e.message = `Could not load bold font for ${textNodeFontFamily}: ${e.message}`;
							throw e;
						}
					}

					if (fontStyleVariants.has("italic")) {
						if (!italicFontName) {
							throw new Error(`No italic font variant for ${textNodeFontFamily}  found `);
						}
						try {
							await figma.loadFontAsync(italicFontName);
						} catch (e: any) {
							e.message = `Could not load italic font for ${textNodeFontFamily}: ${e.message}`;
							throw e;
						}
					}

					if (fontStyleVariants.has("bold italic")) {
						if (!boldItalicFontName) {
							throw new Error(`No italic font variant for ${textNodeFontFamily}  found `);
						}
						try {
							await figma.loadFontAsync(boldItalicFontName);
						} catch (e: any) {
							e.message = `Could not load italic+bold font for ${textNodeFontFamily}: ${e.message}`;
							throw e;
						}
					}
				}

				textNode.characters = changedProperties.characters;

				for (const rangeStyle of changedProperties.ops!) {
					// debugger;

					const list = rangeStyle.attributes?.list;
					if (list === "ordered") {
						textNode.setRangeListOptions(rangeStyle.from, rangeStyle.to, { type: "ORDERED" });
					} else if (list === "bullet") {
						textNode.setRangeListOptions(rangeStyle.from, rangeStyle.to, { type: "UNORDERED" });
					} else {
						textNode.setRangeListOptions(rangeStyle.from, rangeStyle.to, { type: "NONE" });
					}

					let linkUrl = rangeStyle.attributes?.link;
					if (linkUrl && linkUrl.startsWith("/")) {
						linkUrl = this.helperDomain + linkUrl;
					}

					textNode.setRangeHyperlink(
						rangeStyle.from,
						rangeStyle.to,
						linkUrl ? { type: "URL", value: linkUrl } : null,
					);

					let decoration = "NONE" as TextDecoration;
					if (rangeStyle.attributes?.textDecoration === "UNDERLINE") {
						decoration = "UNDERLINE";
					} else if (rangeStyle.attributes?.textDecoration === "STRIKETHROUGH") {
						decoration = "STRIKETHROUGH";
					}

					textNode.setRangeTextDecoration(rangeStyle.from, rangeStyle.to, decoration);

					// console.log(`Processing: ${textNode.characters.length} ${rangeStyle.to} ${textNode.characters} ${changedProperties.characters}`);

					// check if we should apply styles at all... is bold/italic/regular swiched once? otherwise keep the orginal label
					if (!rangeStyle.attributes?.bold && !rangeStyle.attributes?.italic) {
						if (rangeStyle.from === 0 && rangeStyle.to === textNode.characters.length) {
							if (
								textNode.fontName === boldItalicFontName ||
								textNode.fontName === boldFontName ||
								textNode.fontName === italicFontName
							) {
								textNode.setRangeFontName(rangeStyle.from, rangeStyle.to, regularFontName!);
							}
						} else {
							textNode.setRangeFontName(rangeStyle.from, rangeStyle.to, regularFontName!);
						}
					} else if (!rangeStyle.attributes?.bold && rangeStyle.attributes?.italic) {
						textNode.setRangeFontName(rangeStyle.from, rangeStyle.to, italicFontName!);
					} else if (rangeStyle.attributes?.bold && !rangeStyle.attributes?.italic) {
						textNode.setRangeFontName(rangeStyle.from, rangeStyle.to, boldFontName!);
					} else if (rangeStyle.attributes?.bold && rangeStyle.attributes?.italic) {
						textNode.setRangeFontName(rangeStyle.from, rangeStyle.to, boldItalicFontName!);
					}
				}

				textNode.setPluginData(
					this.variantPatternHTMLHashDataKey,
					changedProperties.variantPatternHTMLHash ? changedProperties.variantPatternHTMLHash : "",
				);
			}
		} finally {
			// allow this function to return sucessfully before we start the next update in the queue
			setTimeout(() => {
				const nextUpdateResolver = this.labelUpdateQueue[nodeId].shift();
				if (nextUpdateResolver) {
					nextUpdateResolver();
				} else {
					delete this.labelUpdateQueue[nodeId];
				}
			}, 1);
		}

		return this.toLocalizedLabelOrUndefined(textNode)!;
	}

	async commitUndo() {
		return figma.commitUndo();
	}

	async fixLabelLints(textNodeId: string, lintsToFix: string[]) {
		const textNode = figma.getNodeById(textNodeId)! as TextNode;
		await this.loadFontsForTextNodes([textNode]);
		const linter = new TextNodeLinter();
		linter.fix(textNode, lintsToFix);
	}

	private async loadFontsForTextNodes(textNodes: TextNode[]) {
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

	private extractKeyName(name: string) {
		// regex extracts the first word starting with at least three characters
		const nameParts = name.match(/[a-zA-Z]{3}[a-zA-Z0-9\-_]*/);
		if (nameParts) {
			return nameParts[0].toLowerCase();
		}
		return "";
	}

	helperDomain = "https://relativeUrl";

	private toLocalizedLabelOrUndefined(node: TextNode): LocalizedLabel | undefined {
		let derivable = true;

		if (node.autoRename) {
			derivable = false;
		}

		// we skip nodes that are not visible
		if (!node.visible) {
			return;
		}

		let derivedName = this.extractKeyName(node.name);
		derivable = false;

		if (derivable && derivedName === "") {
			derivable = false;
		}

		let page: PageNode | null = null;
		let rootFrame: FrameNode | null = null;
		const parentIds = [] as string[];

		let { x } = node;
		let { y } = node;
		let parent = node.parent as any;
		while (parent) {
			// we skip nodes where one of the parent nodes is invisible
			if (parent.visible === false) {
				return;
			}

			const parentType = parent.type;

			if (
				(parentType === "COMPONENT" ||
					parentType === "COMPONENT_SET" ||
					parentType === "FRAME" ||
					parentType === "GROUP" ||
					parentType === "INSTANCE") &&
				parent.width < this.containerSizeThreashold
			) {
				rootFrame = parent as FrameNode;
			} else if (parentType === "PAGE") {
				page = parent as PageNode;
			}

			if (
				parentType !== "GROUP" &&
				parentType !== "PAGE" &&
				parent.parent &&
				parent.parent.type !== "PAGE"
			) {
				x += parent.x;
				y += parent.y;
			}

			// 1/4 of the time...
			parentIds.push(parent.id);

			parent = parent.parent;
		}

		if (!page || !rootFrame) {
			return;
		}

		derivedName = this.extractKeyName(rootFrame.name) + this.separator + derivedName;

		// 1562ms -> 1071ms ~ 1/4
		const labelText = node.characters;

		const fillins =
			node.getPluginData(this.fillinsToPlaceholderKey) === ""
				? {}
				: JSON.parse(node.getPluginData(this.fillinsToPlaceholderKey));
		const parameterValues =
			node.getPluginData(this.parameterValuesKey) === ""
				? {}
				: JSON.parse(node.getPluginData(this.parameterValuesKey));
		const tokenizedTextResult = this.extractDeltaOpsAndLabelStyles(node, fillins);

		if (labelText.length === 1 && !/[0-9a-zA-Z\n\s]/.test(labelText)) {
			return;
		}

		// get plugin 1192ms -> 938ms

		const unmanaged = node.getPluginData(this.messageUnmanagedKey) === "true";
		const messageId =
			node.getPluginData(this.messageNameDataKey) === ""
				? undefined
				: node.getPluginData(this.messageNameDataKey);
		const rootFrameLanguage =
			rootFrame.getPluginData(this.languageDataKey) === ""
				? // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain -- used to fix the type the type if the plugin data key is set we expect a refLanguage
					this.messageStore?.getConfigSync()!.refLanguage!
				: (rootFrame.getPluginData(this.languageDataKey) as Locale);

		const language =
			node.getPluginData(this.languageDataKey) === ""
				? rootFrameLanguage
				: (node.getPluginData(this.languageDataKey) as Locale);

		const variantPatternHTMLHash =
			node.getPluginData(this.variantPatternHTMLHashDataKey) !== ""
				? node.getPluginData(this.variantPatternHTMLHashDataKey)
				: undefined;
		const unlinkedMessage =
			node.getPluginData(this.anonymMessageDataKey) !== ""
				? JSON.parse(node.getPluginData(this.anonymMessageDataKey))
				: undefined;

		return {
			pageId: page.id,
			pageName: page.name,
			rootFrameId: rootFrame.id,
			rootFrameName: rootFrame.name,
			rootFrameLanguage,
			language,
			variantPatternHTMLHash,
			nodeId: node.id,
			name: node.name,
			height: node.height,
			width: node.width,
			x,
			y,
			messageId,
			unmanaged,
			parameterValues,
			fillinsToPlaceholder: fillins,
			derivedKey: derivable ? derivedName : undefined,
			characters: labelText,
			ops: tokenizedTextResult.deltaOps,
			matchingLabelLints: tokenizedTextResult.matchingLabelLints,
			labelStyle: tokenizedTextResult.labelStyle,
			unlinkedMessage,
		};
	}

	// tries to find the fillins in the characters set to map them to placeholders
	private getPlaceholderDeltaOps(characters: string, fillins: FillinsToPlaceholder) {
		const placeholderDeltaOps = [] as DeltaOp[];

		const fillinValues = Object.keys(fillins);

		for (let i = fillinValues.length - 1; i >= 0; i--) {
			const fillinValue = fillinValues[i];
			const placeholder = fillins[fillinValue]!;

			let matchIndex = 0;
			while (matchIndex !== -1) {
				matchIndex = characters.indexOf(fillinValue, matchIndex);

				if (matchIndex !== -1) {
					const start = matchIndex;
					const end = matchIndex + `${fillinValue}`.length;

					// ensure no conflict with previous match
					if (placeholderDeltaOps.find((op) => op.start < end && start < op.end) === undefined) {
						placeholderDeltaOps.push({
							start,
							end,
							attributes: {
								placeholder: {
									name: placeholder.name,
									unnamed: !placeholder.named,
									argumentPosition: placeholder.specifiedArgumentPosition,
									formatFn: placeholder.formatFunctionName,
									options: placeholder.options,
									invisibleMarkers: fillinValue.split(MARKER_CHARACTER).length,
								},
							},
						});
					}
					matchIndex += 1;
				}
			}
		}
		return placeholderDeltaOps.sort((op1, op2) => op1.start - op2.start);
	}

	private textSegmentFields = [
		"fontSize",
		"fontName",
		"fontWeight",
		"textDecoration",
		"textCase",
		"lineHeight",
		"letterSpacing",
		"fills",
		"textStyleId",
		"fillStyleId",
		"listOptions",
		"indentation",
		"hyperlink",
	];

	private supportedInlineFields = [
		"textDecoration",
		"hyperlink",
		"fontName", // 'listOptions', 'indentation',
	];

	private getTextStyleDeltaOps(node: TextNode) {
		// if (matchingRules.length > 0) {
		//   console.log(`MATCHING RULES: ${matchingRules.join(', ')}`);
		//   console.log('auto fixing...');

		//   this.loadFontsForTextNodes([node]).then(() => {
		//     linter.fix(node, matchingRules);
		//   })
		// } else {
		//   console.log('MATCHIGN RULES: NONE');
		// }

		const textStyleDeltaOps = [] as DeltaOp[];
		const textSegments = node.getStyledTextSegments([
			"indentation",
			"listOptions",
			"fontName",
			"textDecoration",
			"hyperlink",
		]);

		textSegments.forEach((textSegment) => {
			// if the node has one stile (non mixed) its not inline styling - ignore it
			const italic =
				node.fontName !== figma.mixed
					? undefined
					: textSegment.fontName.style.toLowerCase().includes("italic");
			const weightName = textSegment.fontName.style.replace("italic", "").replace(" ", "");
			const bold =
				node.fontName !== figma.mixed ? undefined : weightName.toLowerCase().includes("bold");
			const textDecoration =
				node.textDecoration !== figma.mixed || textSegment.textDecoration === "NONE"
					? undefined
					: textSegment.textDecoration;

			let linkUrl =
				textSegment.hyperlink?.type === "URL" ? textSegment.hyperlink?.value : undefined;
			if (linkUrl && textSegment.hyperlink?.value.startsWith(this.helperDomain)) {
				linkUrl = textSegment.hyperlink.value.substring(this.helperDomain.length);
			}

			const attributes = {
				textDecoration,
				bold: bold ? true : undefined,
				italic: italic ? true : undefined,
				link: linkUrl,
				indentation: textSegment.indentation,
			} as any;

			// let listType = undefined as undefined | 'bullet' | 'ordered';
			if (textSegment.listOptions.type === "ORDERED") {
				attributes.list = "ordered";
			}

			if (textSegment.listOptions.type === "UNORDERED") {
				attributes.list = "bullet";
			}

			textStyleDeltaOps.push({
				start: textSegment.start,
				end: textSegment.end,
				attributes,
			});
		});

		return textStyleDeltaOps;
	}

	private getDeltaOps(node: TextNode, fillins: FillinsToPlaceholder) {
		const deltaOps = [] as DeltaOp[];
		const textStyleDeltaOps = this.getTextStyleDeltaOps(node);
		const placehodlderDeltaOps = this.getPlaceholderDeltaOps(node.characters, fillins);

		// merge textsegments and placeholder segments
		for (const textStyleDeltaOp of textStyleDeltaOps) {
			// console.log('processing:');
			// console.log(textStyleDeltaOp);

			for (let i = 0; i < placehodlderDeltaOps.length; i++) {
				const placehodlderDeltaOp = placehodlderDeltaOps[i];
				if (!placehodlderDeltaOps[i].processed) {
					if (
						textStyleDeltaOp.start === placehodlderDeltaOp.start &&
						textStyleDeltaOp.end === placehodlderDeltaOp.end
					) {
						// style delta and placeholder match
						// - add placeholder to textStyleOp and push the whole textStyleOp
						textStyleDeltaOp.attributes.placeholder = placehodlderDeltaOp.attributes.placeholder;
						deltaOps.push(textStyleDeltaOp);
						placehodlderDeltaOp.processed = true;
						textStyleDeltaOp.processed = true;
					} else if (
						textStyleDeltaOp.start === placehodlderDeltaOp.start &&
						textStyleDeltaOp.end >
							placehodlderDeltaOp.end -
								placehodlderDeltaOp.attributes.placeholder!.invisibleMarkers &&
						textStyleDeltaOp.end < placehodlderDeltaOp.end
					) {
						// style delta only formats the placeholder - but its end sits within the invisible markers
						// - no split needed but set end to the end of the text marker
						textStyleDeltaOp.attributes.placeholder = placehodlderDeltaOp.attributes.placeholder;
						textStyleDeltaOp.end = placehodlderDeltaOp.end;
						textStyleDeltaOp.processed = true;
						placehodlderDeltaOp.processed = true;
						deltaOps.push(textStyleDeltaOp);
					} else if (
						textStyleDeltaOp.start >= placehodlderDeltaOp.start &&
						textStyleDeltaOp.end <= placehodlderDeltaOp.end
					) {
						// Segment starts and ends within the placeholder but don't cover it completly (previous cases)
						// - we ignore this style
						textStyleDeltaOp.processed = true;
					} else if (
						textStyleDeltaOp.start < placehodlderDeltaOp.start &&
						textStyleDeltaOp.end >=
							placehodlderDeltaOp.end - placehodlderDeltaOp.attributes.placeholder!.invisibleMarkers
					) {
						// start is before the placeholder and it covers it completly split it and move start
						// - push delta before the placeholder
						deltaOps.push({
							start: textStyleDeltaOp.start,
							end: placehodlderDeltaOp.start,
							attributes: {
								...textStyleDeltaOp.attributes,
							},
						});
						// push delta covering the placeholder
						deltaOps.push({
							start: placehodlderDeltaOp.start,
							end: placehodlderDeltaOp.end,
							attributes: {
								...textStyleDeltaOp.attributes,
								...placehodlderDeltaOp.attributes,
							},
						});
						// placeholder is processed
						placehodlderDeltaOp.processed = true;
						// textStyleDeltaOp only if it ends with the placeholder
						if (textStyleDeltaOp.end <= placehodlderDeltaOp.end) {
							textStyleDeltaOp.processed = true;
						} else {
							textStyleDeltaOp.start = placehodlderDeltaOp.end;
						}

						if (!(textStyleDeltaOp.start < textStyleDeltaOp.end)) {
							throw new Error("textStyleDeltaOp.start < textStyleDeltaOp.end");
						}
					} else if (
						textStyleDeltaOp.start < placehodlderDeltaOp.start &&
						textStyleDeltaOp.end >= placehodlderDeltaOp.start &&
						textStyleDeltaOp.end <
							placehodlderDeltaOp.end - placehodlderDeltaOp.attributes.placeholder!.invisibleMarkers
					) {
						// start falls before a placeholder but it ends within it -> move end to the beginng
						// - we cant process it yet since its bounds may be changed by later placeholder
						textStyleDeltaOp.end = placehodlderDeltaOp.start;
						deltaOps.push({
							start: textStyleDeltaOp.start,
							end: textStyleDeltaOp.end,
							attributes: {
								...textStyleDeltaOp.attributes,
							},
						});
						// placeholder is processed
						textStyleDeltaOp.processed = true;
					} else if (
						textStyleDeltaOp.start >= placehodlderDeltaOp.start &&
						textStyleDeltaOp.start <
							placehodlderDeltaOp.end - placehodlderDeltaOp.attributes.placeholder!.invisibleMarkers
					) {
						// start falls into a placeholder - move it to the end of the placeholder
						// - we cant process it yet since its bounds may be changed by later placeholder
						textStyleDeltaOp.start = placehodlderDeltaOp.end;
					} else if (
						textStyleDeltaOp.end > placehodlderDeltaOp.start &&
						textStyleDeltaOp.end <
							placehodlderDeltaOp.end - placehodlderDeltaOp.attributes.placeholder!.invisibleMarkers
					) {
						// end falls into hello within helloXXX of the placeholder move it to the start
						textStyleDeltaOp.end = placehodlderDeltaOp.start;

						textStyleDeltaOp.processed = true;
						if (textStyleDeltaOp.end < textStyleDeltaOp.start) {
							// still a legal rang - add it finaly
							deltaOps.push(textStyleDeltaOp);
						}
					}
				}
			}

			if (!textStyleDeltaOp.processed) {
				if (!(textStyleDeltaOp.start < textStyleDeltaOp.end)) {
					throw new Error("textStyleDeltaOp.start < textStyleDeltaOp.end");
				}

				deltaOps.push(textStyleDeltaOp);
			}
		}

		const uncoveredPlaceholderOps = placehodlderDeltaOps.filter(
			(placehodlderDeltaOp) => !placehodlderDeltaOp.processed,
		);
		for (const uncoveredPlaceholderOp of uncoveredPlaceholderOps) {
			uncoveredPlaceholderOp.ignoreForLabelStyle = true;
			deltaOps.push(uncoveredPlaceholderOp);
		}

		return deltaOps.sort((op1, op2) => op1.start - op2.start);
	}

	private extractDeltaOpsAndLabelStyles(
		node: TextNode,
		fillins: FillinsToPlaceholder,
	): {
		matchingLabelLints: string[];
		deltaOps: any[];
		labelStyle: LabelStyle /* , allowedFormats: string[] */;
	} {
		const fontFamilies = new Set<string>();

		const labelStyle = {
			fontFamily: null,
			bold: null,
			italic: null,
			textDecoration: null,
		} as LabelStyle;

		const deltaOps = this.getDeltaOps(node, fillins);

		const linter = new TextNodeLinter();
		const matchingLabelLints = linter.lint(node);

		// get label styles
		for (const deltaOp of deltaOps) {
			if (deltaOp.ignoreForLabelStyle) {
				// ignoring placeholders not wrapped by styles

				continue;
			}
			if (deltaOp.attributes.fontFamily) {
				fontFamilies.add(deltaOp.attributes.fontFamily);
				// console.log('adding font fimily: ' + deltaOp.attributes.fontFamily);
			}

			labelStyle.bold =
				labelStyle.bold !== null && labelStyle.bold !== deltaOp.attributes.bold
					? "MIXED"
					: deltaOp.attributes.bold;
			labelStyle.italic =
				labelStyle.italic !== null && labelStyle.italic !== deltaOp.attributes.italic
					? "MIXED"
					: deltaOp.attributes.italic;
			labelStyle.textDecoration =
				labelStyle.textDecoration !== null &&
				labelStyle.textDecoration !== deltaOp.attributes.textDecoration
					? "MIXED"
					: deltaOp.attributes.textDecoration;
			labelStyle.fontFamily =
				labelStyle.fontFamily !== null && labelStyle.fontFamily !== deltaOp.attributes.fontFamily
					? "MIXED"
					: deltaOp.attributes.fontFamily;
		}

		// reset unmixed label stlyes
		for (const deltaOp of deltaOps) {
			deltaOp.attributes.bold = labelStyle.bold !== "MIXED" ? undefined : deltaOp.attributes.bold;
			deltaOp.attributes.italic =
				labelStyle.italic !== "MIXED" ? undefined : deltaOp.attributes.italic;
			deltaOp.attributes.textDecoration =
				labelStyle.textDecoration !== "MIXED" ? undefined : deltaOp.attributes.textDecoration;
			deltaOp.attributes.fontFamily =
				labelStyle.fontFamily !== "MIXED" ? undefined : deltaOp.attributes.fontFamily;
		}

		return {
			matchingLabelLints,
			// if we have no style changes within the label we don't handle styling
			deltaOps, // : deltaOps.length > 1 ? deltaOps : [],
			labelStyle,
		};
	}

	getPluginData(key: string) {
		return "";
	}
}
