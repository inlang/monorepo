import Quill from "quill";

const Inline = Quill.import("blots/inline");

export default class BoldBlot extends Inline {}
BoldBlot.blotName = "bold";
BoldBlot.tagName = "strong";
Quill.register(BoldBlot, true);
