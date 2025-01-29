import { LocalizedLabel } from "./LocalizedLabel";

export default interface ChangeEvent {
	target: "LocalizedLabelManager";
	type: "cacheUpdate";
	deletedNodeIds: string[];
	changedLabels: LocalizedLabel[];
	createdLabels: LocalizedLabel[];
	changedKeys: string[];
}
