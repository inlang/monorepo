/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export type LixDatabaseSchema = {
	file: LixFileTable;
	change: ChangeTable;
	file_internal: LixFileTable;
	change_queue: ChangeQueueTable;
	change_graph_edge: ChangeGraphEdgeTable;
	snapshot: SnapshotTable;
	label: LabelTable;

	// change set
	change_set: ChangeSetTable;
	change_set_element: ChangeSetElementTable;
	change_set_label: ChangeSetLabelTable;

	// discussion
	discussion: DiscussionTable;
	comment: CommentTable;

	// branch
	current_branch: CurrentBranchTable;
	branch: BranchTable;
	branch_change_pointer: BranchChangePointerTable;

	// change conflicts
	change_conflict: ChangeConflictTable;
	change_conflict_resolution: ChangeConflictResolutionTable;
	change_conflict_edge: ChangeConflictEdgeTable;
};

export type ChangeQueueEntry = Selectable<ChangeQueueTable>;
export type NewChangeQueueEntry = Insertable<ChangeQueueTable>;
export type ChangeQueueEntryUpdate = Updateable<ChangeQueueTable>;
type ChangeQueueTable = {
	id: Generated<number>;
	path: string;
	file_id: string;
	metadata: Record<string, any> | null;
	data: ArrayBuffer;
};

// named lix file to avoid conflict with built-in file type
export type LixFile = Selectable<LixFileTable>;
export type NewLixFile = Insertable<LixFileTable>;
export type LixFileUpdate = Updateable<LixFileTable>;
type LixFileTable = {
	id: Generated<string>;
	path: string;
	data: ArrayBuffer;
	metadata: Record<string, any> | null;
};

export type Change = Selectable<ChangeTable>;
export type NewChange = Insertable<ChangeTable>;
type ChangeTable = {
	id: Generated<string>;
	/**
	 * The entity the change refers to.
	 */
	entity_id: string;
	file_id: string;
	/**
	 * The plugin key that contributed the change.
	 *
	 * Exists to ease querying for changes by plugin,
	 * in case the user changes the plugin configuration.
	 */
	plugin_key: string;
	/**
	 * The type of change that was made.
	 *
	 * @example
	 *   - "cell" for csv cell change
	 *   - "message" for inlang message change
	 *   - "user" for a user change
	 */
	type: string;
	snapshot_id: string;
	/**
	 * The time the change was created.
	 */
	created_at: Generated<string>;
};

export type ChangeGraphEdge = Selectable<ChangeGraphEdgeTable>;
export type NewChangeGraphEdge = Insertable<ChangeGraphEdgeTable>;
type ChangeGraphEdgeTable = {
	parent_id: string;
	child_id: string;
};

export type Snapshot = Selectable<SnapshotTable>;
export type NewSnapshot = Insertable<SnapshotTable>;
type SnapshotTable = {
	id: Generated<string>;
	/**
	 * The value of the change.
	 *
	 * Lix interprets an undefined value as delete operation.
	 *
	 * @example
	 *   - For a csv cell change, the value would be the new cell value.
	 *   - For an inlang message change, the value would be the new message.
	 */
	content: Record<string, any> | null;
};

// ------ change sets ------

export type ChangeSet = Selectable<ChangeSetTable>;
export type NewChangeSet = Insertable<ChangeSetTable>;
export type ChangeSetUpdate = Updateable<ChangeSetTable>;
type ChangeSetTable = {
	id: Generated<string>;
};

export type ChangeSetElement = Selectable<ChangeSetElementTable>;
export type NewChangeSetElement = Insertable<ChangeSetElementTable>;
export type ChangeSetElementUpdate = Updateable<ChangeSetElementTable>;
type ChangeSetElementTable = {
	change_set_id: string;
	change_id: string;
};

// ------ discussions ------

export type Discussion = Selectable<DiscussionTable>;
export type NewDiscussion = Insertable<DiscussionTable>;
export type DiscussionUpdate = Updateable<DiscussionTable>;
type DiscussionTable = {
	id: Generated<string>;
	change_set_id: string;
};

export type Comment = Selectable<CommentTable>;
export type NewComment = Insertable<CommentTable>;
export type CommentUpdate = Updateable<CommentTable>;
type CommentTable = {
	id: Generated<string>;
	parent_id: string | null;
	discussion_id: string;
	created_at: Generated<string>;
	content: string;
};

// ----- tags -----

export type Label = Selectable<LabelTable>;
export type NewLabel = Insertable<LabelTable>;
export type LabelUpdate = Updateable<LabelTable>;
type LabelTable = {
	id: Generated<string>;
	name: string;
};

export type ChangeSetLabel = Selectable<ChangeSetLabelTable>;
export type NewChangeSetLabel = Insertable<ChangeSetLabelTable>;
export type ChangeSetLabelUpdate = Updateable<ChangeSetLabelTable>;
type ChangeSetLabelTable = {
	change_set_id: string;
	label_id: string;
};

// ------ branches ------

export type Branch = Selectable<BranchTable>;
export type NewBranch = Insertable<BranchTable>;
export type BranchUpdate = Updateable<BranchTable>;
type BranchTable = {
	id: Generated<string>;
	name: string | null;
};

export type BranchChangePointer = Selectable<BranchChangePointerTable>;
export type NewBranchChangePointer = Insertable<BranchChangePointerTable>;
export type BranchChangePointerUpdate = Updateable<BranchChangePointerTable>;
type BranchChangePointerTable = {
	branch_id: string;
	change_id: string;
	change_file_id: string;
	change_entity_id: string;
	change_type: string;
};

export type CurrentBranch = Selectable<CurrentBranchTable>;
export type NewCurrentBranch = Insertable<CurrentBranchTable>;
export type CurrentBranchUpdate = Updateable<CurrentBranchTable>;
type CurrentBranchTable = {
	id: string;
};

// -------- change conflicts --------

export type ChangeConflict = Selectable<ChangeConflictTable>;
export type NewChangeConflict = Insertable<ChangeConflictTable>;
export type ChangeConflictUpdate = Updateable<ChangeConflictTable>;
type ChangeConflictTable = {
	id: Generated<string>;
	/**
	 * The key is used to identify the conflict.
	 *
	 * The key should be unique for the plugin and the conflict
	 * to avoid duplicate conflict reports.
	 *
	 * @example
	 *   - `csv-row-order-changed`
	 *   - `inlang-message-bundle-foreign-key-violation`
	 */
	key: string;
};

export type ChangeConflictResolution =
	Selectable<ChangeConflictResolutionTable>;
export type NewChangeConflictResolution =
	Insertable<ChangeConflictResolutionTable>;
export type ChangeConflictResolutionUpdate =
	Updateable<ChangeConflictResolutionTable>;
type ChangeConflictResolutionTable = {
	change_conflict_id: string;
	resolved_change_id: string;
};

export type ChangeConflictEdge = Selectable<ChangeConflictEdgeTable>;
export type NewChangeConflictEdge = Insertable<ChangeConflictEdgeTable>;
export type ChangeConflictEdgeUpdate = Updateable<ChangeConflictEdgeTable>;
type ChangeConflictEdgeTable = {
	change_conflict_id: string;
	change_id: string;
};