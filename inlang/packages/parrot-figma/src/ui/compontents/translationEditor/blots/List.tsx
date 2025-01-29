import Parchment from "parchment";
import Quill from "quill";
import Scroll from "quill/blots/scroll";

const Block = Quill.import("blots/block");
const Container = Quill.import("blots/container");

class ListItem extends Block {
	static formats(domNode: HTMLElement) {
		return domNode.tagName === this.tagName ? undefined : super.formats(domNode);
	}

	format(name: string, value: string) {
		console.log(`list item format to: ${name} with value ${value}`);
		if (name === List.blotName && !value) {
			this.replaceWith(Parchment.create(this.statics.scope), null);
		} else if (name === this.statics.blotName && value) {
			this.domNode.setAttribute("data-list", value);
		} else {
			super.format(name, value);
		}
	}

	remove() {
		if (this.prev == null && this.next == null) {
			this.parent.remove();
		} else {
			super.remove();
		}
	}

	replaceWith(name: any, value: any) {
		this.parent.isolate(this.offset(this.parent), this.length());
		if (name === this.parent.statics.blotName) {
			this.parent.replaceWith(name, value);
			return this;
		}
		this.parent.unwrap();
		return super.replaceWith(name, value);
	}
}
ListItem.blotName = "list-item";
ListItem.tagName = "LI";

class List extends Container {
	static create(value: string) {
		const tagName = value === "ordered" ? "OL" : "UL";
		const node = super.create(tagName);
		if (value === "checked" || value === "unchecked") {
			node.setAttribute("data-checked", value === "checked");
		}
		return node;
	}

	static formats(domNode: HTMLElement) {
		if (domNode.tagName === "OL") return "ordered";
		if (domNode.tagName === "UL") {
			if (domNode.hasAttribute("data-checked")) {
				return domNode.getAttribute("data-checked") === "true" ? "checked" : "unchecked";
			}
			return "bullet";
		}
		return undefined;
	}

	constructor(scroll: Scroll, domNode: HTMLElement) {
		super(scroll, domNode);
		const listEventHandler = (e: any) => {
			if (e.target.parentNode !== domNode) return;
			const format = this.statics.formats(domNode);
			const blot = Parchment.find(e.target);
			if (format === "checked") {
				(blot as any).format("list", "unchecked");
			} else if (format === "unchecked") {
				(blot as any).format("list", "checked");
			}
		};

		domNode.addEventListener("touchstart", listEventHandler);
		domNode.addEventListener("mousedown", listEventHandler);
	}

	format(name: string, value: any) {
		if (this.children.length > 0) {
			this.children.tail.format(name, value);
		}
	}

	formats() {
		// We don't inherit from FormatBlot
		return { [this.statics.blotName]: this.statics.formats(this.domNode) };
	}

	insertBefore(blot: any, ref: any) {
		if (blot instanceof ListItem) {
			super.insertBefore(blot, ref);
		} else {
			const index = ref == null ? this.length() : ref.offset(this);
			const after = this.split(index);

			if (after.parent) {
				after.parent.insertBefore(blot, after);
			} else {
				super.insertBefore(blot, ref);
			}
		}
	}

	optimize(context: any) {
		super.optimize(context);
		const { next } = this;
		if (
			next != null &&
			next.prev === this &&
			next.statics.blotName === this.statics.blotName &&
			next.domNode.tagName === this.domNode.tagName &&
			next.domNode.getAttribute("data-checked") === this.domNode.getAttribute("data-checked")
		) {
			next.moveChildren(this);
			next.remove();
		}
	}

	replace(target: any) {
		if (target.statics.blotName !== this.statics.blotName) {
			const item = Parchment.create(this.statics.defaultChild);
			target.moveChildren(item);
			this.appendChild(item);
		}
		super.replace(target);
	}
}
List.blotName = "list";
List.scope = Parchment.Scope.BLOCK_BLOT;
List.tagName = ["OL", "UL"];
List.defaultChild = ListItem;
List.allowedChildren = [ListItem];

export { ListItem, List as default };
