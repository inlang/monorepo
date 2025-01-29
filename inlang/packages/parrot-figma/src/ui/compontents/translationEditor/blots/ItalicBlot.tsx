import Quill from "quill";

const Inline = Quill.import("blots/inline");

export default class ItalicBlot extends Inline {}
ItalicBlot.blotName = "italic";
ItalicBlot.tagName = "em";
Quill.register(ItalicBlot, true);
