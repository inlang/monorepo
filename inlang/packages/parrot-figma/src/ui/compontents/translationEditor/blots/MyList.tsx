import Quill from "quill";
import Scroll from "quill/blots/scroll";

const Block = Quill.import("blots/block");
const ListContainer = Quill.import("formats/list-container");

export class MyListContainer extends ListContainer {
	static tagName = ["OL", "UL"];

	static defaultTag = "OL";

	static create(value: any) {
		return document.createElement(this.getTag(value));
	}

	static getTag(val: string) {
		// Our "ql-list" values are "bullet" and "ordered"
		const map = {
			bullet: "UL",
			ordered: "OL",
		};
		return (map as any)[val] || this.defaultTag;
	}

	checkMerge() {
		// Only merge if the next list is the same type as this one
		return super.checkMerge() && this.domNode.tagName === this.next.domNode.tagName;
	}
}

class ListItem extends Block {
	static create(value: string) {
		const node = super.create() as Element;

		node.setAttribute("data-list", value);
		return node;
	}

	static formats(domNode: HTMLElement) {
		return domNode.getAttribute("data-list") || undefined;
	}

	static register() {
		Quill.register(ListContainer);
	}

	format(name: string, value: string) {
		if (name === this.statics.blotName && value) {
			this.domNode.setAttribute("data-list", value);
		} else {
			super.format(name, value);
		}
	}
}
ListItem.blotName = "list";
ListItem.tagName = "LI";

ListContainer.allowedChildren = [ListItem];
ListItem.requiredContainer = ListContainer;

export class MyListItem extends ListItem {
	static requiredContainer = MyListContainer;

	static register() {
		Quill.register(MyListContainer, true);
	}

	optimize(context: any) {
		if (
			this.statics.requiredContainer &&
			!(this.parent instanceof this.statics.requiredContainer)
		) {
			// Insert the format value (bullet, ordered) into wrap arguments
			this.wrap(this.statics.requiredContainer.blotName, MyListItem.formats(this.domNode));
		}
		super.optimize(context);
	}

	format(name: string, value: string) {
		// If the list type is different, wrap this list item in a new MyListContainer of that type
		if (name === ListItem.blotName && value !== MyListItem.formats(this.domNode)) {
			this.wrap(this.statics.requiredContainer.blotName, value);
		}
		super.format(name, value);
	}
}
