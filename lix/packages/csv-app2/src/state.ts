/* eslint-disable @typescript-eslint/ban-ts-comment */
import { merge, openLixInMemory } from "@lix-js/sdk";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import Papa from "papaparse";
// import { jsonObjectFrom } from "kysely/helpers/sqlite";
import { isInSimulatedCurrentBranch } from "@lix-js/sdk";
import { plugin } from "./csv-plugin.js";
import { getOriginPrivateDirectory } from "native-file-system-adapter";

export const selectedProjectPathAtom = atomWithStorage<string | undefined>(
	"selected-project-path",
	undefined,
	createJSONStorage(),
	{ getOnInit: true }
);

export const authorNameAtom = atomWithStorage<string | undefined>(
	"author-name",
	undefined,
	createJSONStorage(),
	{ getOnInit: true }
);

export const editorSelectionAtom = atom<{ row: string; col: string } | null>(
	null
);

let safeProjectToOpfsInterval: number;

/**
 * Force reload the project.
 *
 * Search for `setReloadProject` to see where this atom is set.
 */
export const forceReloadProjectAtom = atom<
	ReturnType<typeof Date.now> | undefined
>(undefined);

export const projectAtom = atom(async (get) => {
	// listen to forceReloadProjectAtom to reload the project
	// workaround for https://github.com/opral/lix-sdk/issues/47
	get(forceReloadProjectAtom);

	if (safeProjectToOpfsInterval) {
		// TODO refactor - use timeout instead of interval
		clearInterval(safeProjectToOpfsInterval);
	}

	try {
		const fallbackPath = get(selectedProjectPathAtom);
		const rootHandle = await getOriginPrivateDirectory();
		console.log("Check for available projects");

		const urlParams = new URLSearchParams(window.location.search);
		const project_id = urlParams.get("project");
		if (!project_id) return undefined;

		let path: undefined | string = undefined;

		for await (const entry of rootHandle.keys()) {
			if (!(entry as string).includes("___")) {
				// skip all files in opfs that don't have the separator yet
				continue;
			}
			const [entry_project_id] = entry.split("___");

			if (project_id === entry_project_id) {
				path = entry;
			}
		}

		if (!path) {
			// we don't have the project locally yet - try to fetch it from remote
			const projectBlobFromRemote = await (
				await fetch("https://monorepo-6hl2.onrender.com/lix-file/" + project_id)
			).arrayBuffer();

			const serverLix = await openLixInMemory({
				blob: new Blob([projectBlobFromRemote]),
				providePlugins: [plugin],
			});

			return undefined;
		}
		const fileHandle = await rootHandle.getFileHandle(path);
		const file = await fileHandle.getFile();
		const project = await openLixInMemory({
			blob: file,
			providePlugins: [plugin],
		});
		const projectMetaRaw = new TextDecoder().decode(
			(
				await project.db
					.selectFrom("file")
					.where("path", "=", "/project_meta")
					.select("data")
					.executeTakeFirstOrThrow()
			).data
		);

		projectMetaRaw;
		// @ts-ignore
		// safeProjectToOpfsInterval = setInterval(
		const syncLixFile = async () => {
			const file = await project.toBlob();
			const writable = await fileHandle.createWritable();

			const checkIfExists = await fetch(
				"https://monorepo-6hl2.onrender.com/lix-file/" + projectId
			);

			console.log("projectId: ", projectId);
			console.log("response state: ", checkIfExists.ok);

			if (checkIfExists.ok) {
				// the file does exist remotely - trigger sync
				const response = await fetch(
					"https://monorepo-6hl2.onrender.com/lix-file/" + projectId,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/octet-stream",
						},
						body: file,
					}
				);

				if (!response.ok) {
					throw new Error("Network response was not ok " + response.statusText);
				}

				const content = await response.arrayBuffer();

				const serverLix = await openLixInMemory({
					blob: new Blob([content]),
					providePlugins: [plugin],
				});

				console.log("serverLix", serverLix);

				await merge({
					sourceLix: serverLix,
					targetLix: project,
				});
			}
			// TODO make url configurable

			// return response.json(); // Or .text() depending on the response format

			// TODO post to server and merge response
			// const serverMergeResult = postLixFile(file)
			// lix.merge({source: serverMergeResult, target: localState})
			// const mergedState = = await project.toBlob();
			// await writable.write(mergedState);

			await writable.write(await project.toBlob());
			await writable.close();

			setTimeout(syncLixFile, 2000);
		};

		syncLixFile();
		// }, 2000);

		return project;
	} catch (e) {
		console.error(e);
		return undefined;
	}
});

// export const settingsAtom = atom(async (get) => {
// 	get(withPollingAtom);
// 	const project = await get(projectAtom);
// 	// assuming that the project is always defined when the settings are read
// 	if (!project) return undefined as unknown as ProjectSettings;
// 	return await project?.settings.get();
// });

/**
 * Ugly ass workaround to get polled derived state.
 *
 * Search where the atom is set (likely in the layout/root component).
 */
export const withPollingAtom = atom(Date.now());

export const csvDataAtom = atom(async (get) => {
	get(withPollingAtom);
	const project = await get(projectAtom);
	if (!project) return [];

	const csvFile = await project.db
		.selectFrom("file")
		.select("data")
		.where("path", "=", "/data.csv")
		.executeTakeFirst();
	if (!csvFile) return [];
	return Papa.parse(new TextDecoder().decode(csvFile.data), {
		header: true,
		skipEmptyLines: true,
	}).data as [{ [key: string]: string }];
});

export const uniqueColumnAtom = atom(async (get) => {
	get(withPollingAtom);
	const project = await get(projectAtom);
	if (!project) return [];

	const result = await project.db
		.selectFrom("file")
		.select("metadata")
		.where("path", "=", "/data.csv")
		.executeTakeFirst();
	if (!result) return undefined;
	// @ts-ignore
	const uniqueColumn = result.metadata.unique_column;
	if (!uniqueColumn) return undefined;
	return uniqueColumn;
});

// export const committedChangesAtom = atom(async (get) => {
// 	get(withPollingAtom);
// 	const project = await get(projectAtom);
// 	if (!project) return [];
// 	const result = await project.lix.db
// 		.selectFrom("change")
// 		.select((eb) => [
// 			"change.id",
// 			"change.commit_id",
// 			"change.file_id",
// 			"change.operation",
// 			"change.type",
// 			"change.value",
// 			jsonObjectFrom(
// 				eb
// 					.selectFrom("commit")
// 					.select([
// 						"commit.id",
// 						"commit.author",
// 						"commit.description",
// 						"commit.created_at",
// 					])
// 					.whereRef("change.commit_id", "=", "commit.id")
// 			).as("commit"),
// 		])
// 		.where("commit_id", "is not", null)
// 		// TODO remove after sequence concept on lix
// 		// https://linear.app/opral/issue/LIX-126/branching
// 		.where(isInSimulatedCurrentBranch)
// 		.innerJoin("commit", "commit.id", "change.commit_id")
// 		.orderBy("commit.created_at desc")
// 		.execute();

// 	return result;
// });

export const pendingChangesAtom = atom(async (get) => {
	get(withPollingAtom);
	const project = await get(projectAtom);
	if (!project) return [];
	const result = await project.db
		.selectFrom("change")
		.selectAll()
		.where("commit_id", "is", null)
		// TODO remove after sequence concept on lix
		// https://linear.app/opral/issue/LIX-126/branching
		.where(isInSimulatedCurrentBranch)
		.execute();
	//console.log(result);
	// @ts-expect-error
	window.lix = projectAtom;
	return result;
});

// export const unresolvedConflictsAtom = atom(async (get) => {
// 	get(withPollingAtom);
// 	const project = await get(projectAtom);
// 	if (!project) return [];
// 	const result = await project.lix.db
// 		.selectFrom("conflict")
// 		.where("resolved_with_change_id", "is", null)
// 		.selectAll()
// 		.execute();

// 	//console.log(result);
// 	return result;
// });

/**
 * Get all conflicting changes.
 *
 * @example
 *   const [conflictingChanges] = useAtom(conflictingChangesAtom);
 *   conflictingChanges.find((change) => change.id === id);
 */
// export const conflictingChangesAtom = atom(async (get) => {
// 	get(withPollingAtom);
// 	const project = await get(projectAtom);
// 	const unresolvedConflicts = await get(unresolvedConflictsAtom);
// 	if (!project) return [];
// 	const result: Set<Change> = new Set();

// 	for (const conflict of unresolvedConflicts) {
// 		const change = await project.lix.db
// 			.selectFrom("change")
// 			.selectAll()
// 			.where("id", "=", conflict.change_id)
// 			.executeTakeFirstOrThrow();
// 		const conflicting = await project.lix.db
// 			.selectFrom("change")
// 			.selectAll()
// 			.where("id", "=", conflict.conflicting_change_id)
// 			.executeTakeFirstOrThrow();
// 		result.add(change);
// 		result.add(conflicting);
// 	}
// 	return [...result];
// });

export const commitsAtom = atom(async (get) => {
	get(withPollingAtom);
	const project = await get(projectAtom);
	if (!project) return [];
	return await project.db
		.selectFrom("commit")
		.selectAll()
		.orderBy("commit.created_at desc")
		.execute();
});

// @ts-ignore
const humanFileSize = (bytes, si = false, dp = 1) => {
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh) {
		return bytes + " B";
	}

	const units = si
		? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
		: ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
	let u = -1;
	const r = 10 ** dp;

	do {
		bytes /= thresh;
		++u;
	} while (
		Math.round(Math.abs(bytes) * r) / r >= thresh &&
		u < units.length - 1
	);

	return bytes.toFixed(dp) + " " + units[u];
};

//@ts-ignore
const getDirectoryEntriesRecursive = async (relativePath = ".") => {
	// @ts-ignore
	const directoryHandle = await navigator.storage.getDirectory();
	const fileHandles = [];
	const directoryHandles = [];

	// Get an iterator of the files and folders in the directory.
	// @ts-ignore
	const directoryIterator = directoryHandle.values();
	const directoryEntryPromises = [];
	for await (const handle of directoryIterator) {
		const nestedPath = `${relativePath}/${handle.name}`;
		if (handle.kind === "file") {
			// @ts-ignore
			fileHandles.push({ handle, nestedPath });
			directoryEntryPromises.push(
				// @ts-ignore
				handle.getFile().then((file) => {
					return {
						name: handle.name,
						file,
						size: humanFileSize(file.size),
						relativePath: nestedPath,
						handle,
					};
				})
			);
		} else if (handle.kind === "directory") {
			// @ts-ignore
			directoryHandles.push({ handle, nestedPath });
			directoryEntryPromises.push(
				// @ts-ignore
				(async () => {
					return {
						name: handle.name,
						// @ts-ignore
						file,
						// @ts-ignore
						size: humanFileSize(file.size),
						relativePath: nestedPath,
						// @ts-ignore
						entries: await getDirectoryEntriesRecursive(handle, nestedPath),
						handle,
					};
				})()
			);
		}
	}
	return await Promise.all(directoryEntryPromises);
};

// //@ts-ignore
// window.databases = await getDirectoryEntriesRecursive();

//@ts-ignore
window.deleteAll = async () => {
	clearInterval(safeProjectToOpfsInterval);
	const databases = await getDirectoryEntriesRecursive();
	for (const database of databases) {
		await database.handle.remove();
	}
};