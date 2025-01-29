import { Delta, DeltaOperation } from "quill";

export default class FigmaTextNodeToDelta {
	static convertTextNode(textNode: TextNode) {
		const textSegments = textNode.getStyledTextSegments([
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
		]);
		const deltaRaw = [] as any[];

		textSegments.forEach((segment) => {
			deltaRaw.push({
				insert: segment.characters,
				attributes: {
					bold: segment.fontName.style === "Bold" ? true : undefined,
					href: segment.hyperlink?.type === "URL" ? segment.hyperlink.value : undefined,
				},
			});
		});

		// return new Delta(deltaRaw);
	}
}
/*
type Selector = string | Node['TEXT_NODE'] | Node['ELEMENT_NODE'];
type Matcher = (node: Node, delta: Delta, scroll: ScrollBlot) => Delta;

interface ScrollBlot {

}

interface MinimumQuil {

} */
/*
export default class Converter {
  quill: MinimumQuil;
  matchers: [Selector, Matcher][];

  constructor(quill: MinimumQuil) {
    this.quill = quill;
    this.matchers = [];
  }

  convertHTML(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const container = doc.body;
    const nodeMatches = new WeakMap();
    const [elementMatchers, textMatchers] = this.prepareMatching(
      container,
      nodeMatches,
    );
    return this.traverse(
      this.quill.scroll,
      container,
      elementMatchers,
      textMatchers,
      nodeMatches,
    );
  }

  traverse(
    scroll: ScrollBlot,
    node: ChildNode,
    elementMatchers: Matcher[],
    textMatchers: Matcher[],
    nodeMatches: WeakMap<Node, Matcher[]>,
  ) {
    // Post-order
    if (node.nodeType === node.TEXT_NODE) {
      return textMatchers.reduce((delta: Delta, matcher) => {
        return matcher(node, delta, scroll);
      }, new Delta());
    }
    if (node.nodeType === node.ELEMENT_NODE) {
      return Array.from(node.childNodes || []).reduce((delta, childNode) => {
        let childrenDelta = traverse(
          scroll,
          childNode,
          elementMatchers,
          textMatchers,
          nodeMatches,
        );
        if (childNode.nodeType === node.ELEMENT_NODE) {
          childrenDelta = elementMatchers.reduce((reducedDelta, matcher) => {
            return matcher(childNode as HTMLElement, reducedDelta, scroll);
          }, childrenDelta);
          childrenDelta = (nodeMatches.get(childNode) || []).reduce(
            (reducedDelta, matcher) => {
              return matcher(childNode, reducedDelta, scroll);
            },
            childrenDelta,
          );
        }
        return delta.concat(childrenDelta);
      }, new Delta());
    }
    return new Delta();
  }

  prepareMatching(container: Element, nodeMatches: WeakMap<Node, Matcher[]>) {
    const elementMatchers: Matcher[] = [];
    const textMatchers: Matcher[] = [];
    this.matchers.forEach((pair) => {
      const [selector, matcher] = pair;
      switch (selector) {
        case Node.TEXT_NODE:
          textMatchers.push(matcher);
          break;
        case Node.ELEMENT_NODE:
          elementMatchers.push(matcher);
          break;
        default:
          Array.from(container.querySelectorAll(selector)).forEach((node) => {
            if (nodeMatches.has(node)) {
              const matches = nodeMatches.get(node);
              matches?.push(matcher);
            } else {
              nodeMatches.set(node, [matcher]);
            }
          });
          break;
      }
    });
    return [elementMatchers, textMatchers];
  }

}
*/
