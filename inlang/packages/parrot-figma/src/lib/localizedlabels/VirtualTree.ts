export class VirtualTreeNode {
	public id: string;

	public type: string;

	public parent: VirtualTreeNode | null;

	public children: VirtualTreeNode[];

	public cacheRelevant: boolean;

	public messageId: string | undefined = undefined;

	constructor(baseNode: BaseNode, nodeId: string) {
		this.id = nodeId;
		this.type = baseNode.type;
		this.cacheRelevant = this.type === "TEXT";
		if (this.type === "TEXT" && baseNode.getPluginData("mn") !== "")
			this.messageId = baseNode.getPluginData("mn");
		this.parent = null;
		this.children = [];
	}
}

export default class VirtualTree {
	private lookupTable: Map<string, VirtualTreeNode>;

	constructor() {
		this.lookupTable = new Map();
	}

	public hasNode(id: string) {
		return this.lookupTable.get(id) !== undefined;
	}

	public getVirtualNode(id: string) {
		return this.lookupTable.get(id);
	}

	public addNode(node: BaseNode, nodeId: string, parentNode?: BaseNode): VirtualTreeNode {
		let virtualNode = this.getVirtualNode(nodeId);
		if (virtualNode) {
			return virtualNode;
		}

		virtualNode = new VirtualTreeNode(node, nodeId);
		this.lookupTable.set(virtualNode.id, virtualNode);

		const parent = parentNode !== undefined ? parentNode : node.parent;
		const parentId = parent?.id;
		let virtualParent = parentId ? this.lookupTable.get(parentId) : undefined;

		if (parentId && parent) {
			if (virtualParent === undefined) {
				virtualParent = this.addNode(parent, parentId);
			}

			virtualNode.parent = virtualParent;
			virtualParent.children.push(virtualNode);
		}

		return virtualNode;
	}

	public removeBranch(rootIdentifier: string): VirtualTreeNode[] {
		const rootNode = this.lookupTable.get(rootIdentifier);
		if (!rootNode) {
			return [];
		}
		return this.traverseAndDelete(rootNode);
	}

	private traverseAndDelete(node: VirtualTreeNode): VirtualTreeNode[] {
		let deletedNodes = [node] as VirtualTreeNode[];

		for (const child of node.children) {
			deletedNodes = deletedNodes.concat(this.traverseAndDelete(child));
			this.lookupTable.delete(child.id);
		}
		// if parent has no children - remove parent as well!

		node.parent!.children = node.parent!.children.filter((child) => child !== node);
		if (node.parent?.children.length === 0) {
			this.lookupTable.delete(node.parent.id);
		}

		this.lookupTable.delete(node.id);
		return deletedNodes;
	}

	public moveNode(identifier: string, newParent: BaseNode): VirtualTreeNode[] {
		const virtualNode = this.lookupTable.get(identifier);
		if (virtualNode === undefined) {
			//  console.log('VirtualTree: NOTING TO MOVE');
			return [];
		}
		const parentId = newParent.id;
		let virtualParent = parentId ? this.lookupTable.get(parentId) : undefined;

		if (virtualParent === undefined) {
			virtualParent = this.addNode(newParent, parentId);
		}

		virtualNode.parent!.children = virtualNode.parent!.children.filter(
			(child) => child !== virtualNode,
		);

		if (virtualNode.parent!.children.length === 0) {
			// console.log('VirtualTree: NO NEED OF PARENT - removing cache');
			this.lookupTable.delete(virtualNode.parent!.id);
		}

		virtualNode.parent = virtualParent;
		virtualParent.children.push(virtualNode);

		return this.getAllNodesInBranch(virtualNode);
	}

	public getAllNodesInBranchByRootId(id: string): VirtualTreeNode[] {
		const virtualNode = this.lookupTable.get(id);
		if (virtualNode === undefined) {
			// console.log('VirtualTree: no node to get branch from');
			return [];
		}

		return this.getAllNodesInBranch(virtualNode);
	}

	private getAllNodesInBranch(node: VirtualTreeNode): VirtualTreeNode[] {
		let nodesInBranch = [node];

		for (const child of node.children) {
			nodesInBranch = nodesInBranch.concat(this.getAllNodesInBranch(child));
		}
		// console.log(`VirtualTree: found nodesInBranch ${nodesInBranch.length}`);
		return nodesInBranch;
	}

	// Recursive node traversal function
	public traverseNode(nodeId: string, callback: (node: VirtualTreeNode) => void) {
		const node = this.lookupTable.get(nodeId);

		if (!node) {
			console.warn(`Node with ID ${nodeId} not found in the tree.`);
			return;
		}

		// Optimized traversal function
		const traverse = (currentNode: VirtualTreeNode) => {
			// Perform the operation on the current node
			callback(currentNode);

			const { children } = currentNode;
			if (!children || children.length === 0) {
				return;
			}

			// Iterate over children with a for loop
			for (let i = 0; i < children.length; i += 1) {
				traverse(children[i]);
			}
		};

		// Start traversal from the node
		traverse(node);
	}
}
