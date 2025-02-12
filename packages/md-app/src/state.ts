import {
	Version,
	openLixInMemory,
	Account,
	switchAccount,
	Lix,
} from "@lix-js/sdk";
import { atom } from "jotai";
import { getOriginPrivateDirectory } from "native-file-system-adapter";
import { saveLixToOpfs } from "./helper/saveLixToOpfs.ts";
import {
	lixMdDemoFile,
	setupMdDemo,
} from "./helper/demo-lix-file/demo-lix-file.ts";
import { plugin as mdPlugin } from "@lix-js/plugin-md";

export const fileIdSearchParamsAtom = atom((get) => {
	get(withPollingAtom);
	const searchParams = new URL(window.location.href).searchParams;
	return searchParams.get("f") || undefined;
});

export const lixIdSearchParamsAtom = atom((get) => {
	get(withPollingAtom);
	const searchParams = new URL(window.location.href).searchParams;
	return searchParams.get("l") || undefined;
});

export const discussionSearchParamsAtom = atom(async (get) => {
	get(withPollingAtom);
	const searchParams = new URL(window.location.href).searchParams;
	return searchParams.get("d");
});

export const availableLixFilesInOpfsAtom = atom(async (get) => {
	get(withPollingAtom);

	const rootHandle = await getOriginPrivateDirectory();
	const availableLixFiles: string[] = [];
	for await (const [name, handle] of rootHandle) {
		if (handle.kind === "file" && name.endsWith(".lix")) {
			availableLixFiles.push(handle.name);
		}
	}
	return availableLixFiles;
});

export const lixAtom = atom(async (get) => {
	const lixIdSearchParam = get(lixIdSearchParamsAtom);

	const rootHandle = await getOriginPrivateDirectory();

	let lixBlob: Blob;

	if (lixIdSearchParam) {
		// try reading the lix file from OPFS
		try {
			const fileHandle = await rootHandle.getFileHandle(
				`${lixIdSearchParam}.lix`
			);
			const file = await fileHandle.getFile();
			lixBlob = new Blob([await file.arrayBuffer()]);
		} catch {
			// Try server if lix doesn't exist in OPFS
			try {
				const response = await fetch(
					new Request(
						import.meta.env.PROD
							? "https://lix.host/lsa/get-v1"
							: "http://localhost:3000/lsa/get-v1",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({ lix_id: lixIdSearchParam }),
						}
					)
				);
				if (response.ok) {
					const blob = await response.blob();
					const lix = await openLixInMemory({
						blob,
						providePlugins: [mdPlugin],
					});
					await saveLixToOpfs({ lix });
					return lix;
				}
			} catch (error) {
				console.error("Failed to fetch from server:", error);
			}
		}
	} else {
		const availableLixFiles: FileSystemHandle[] = [];
		for await (const [name, handle] of rootHandle) {
			if (handle.kind === "file" && name.endsWith(".lix")) {
				availableLixFiles.push(handle);
			}
		}
		// naively pick the first lix file
		if (availableLixFiles.length > 0) {
			const fileHandle = await rootHandle.getFileHandle(
				availableLixFiles[0].name
			);
			const file = await fileHandle.getFile();
			lixBlob = new Blob([await file.arrayBuffer()]);
		} else {
			const demoLix = await lixMdDemoFile();
			lixBlob = demoLix.blob;
		}
	}

	let lix: Lix;
	const storedActiveAccount = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);

	try {
		if (storedActiveAccount) {
			lix = await openLixInMemory({
				blob: lixBlob!,
				providePlugins: [mdPlugin],
				account: JSON.parse(storedActiveAccount),
			});
		} else {
			lix = await openLixInMemory({
				blob: lixBlob!,
				providePlugins: [mdPlugin],
			});
		}
	} catch {
		// https://linear.app/opral/issue/INBOX-199/fix-loading-lix-file-if-schema-changed
		// CLEAR OPFS. The lix file is likely corrupted.
		for await (const entry of rootHandle.values()) {
			if (entry.kind === "file") {
				await rootHandle.removeEntry(entry.name);
			}
		}
		window.location.reload();
		// tricksing the TS typechecker. This will never be reached.
		lix = {} as any;
	}

	const lixId = await lix.db
		.selectFrom("key_value")
		.where("key", "=", "lix_id")
		.select("value")
		.executeTakeFirstOrThrow();

	if (storedActiveAccount) {
		const activeAccount = JSON.parse(storedActiveAccount);
		await switchActiveAccount(lix, activeAccount);
	}

	// TODO use env varibale
	// const serverUrl = import.meta.env.PROD
	// ? "https://lix.host"
	// : "http://localhost:3000";
	const serverUrl = import.meta.env.PROD
		? "https://lix.host"
		: "http://localhost:3000";

	await lix.db
		.insertInto("key_value")
		.values({
			key: "lix_server_url",
			value: serverUrl,
		})
		.onConflict((oc) => oc.doUpdateSet({ value: serverUrl }))
		.execute();

	// Check if there is a file in lix
	let file = await lix.db.selectFrom("file").selectAll().executeTakeFirst();
	if (!file) file = await setupMdDemo(lix);
	if (!get(fileIdSearchParamsAtom)) {
		// Set the file ID as searchParams
		const url = new URL(window.location.href);
		url.searchParams.set("f", file.id);
		window.history.replaceState({}, "", url.toString());
	}

	await saveLixToOpfs({ lix });

	// mismatch in id, load correct url
	if (lixId.value !== lixIdSearchParam) {
		const url = new URL(window.location.href);
		url.searchParams.set("l", lixId.value);
		// need to use window.location because react router complains otherwise
		window.location.href = url.toString();
	}

	return lix;
});

/**
 * Ugly ass workaround to get polled derived state.
 *
 * Search where the atom is set (likely in the layout/root component).
 */
export const withPollingAtom = atom(Date.now());

export const currentVersionAtom = atom<Promise<Version | null>>(async (get) => {
	get(withPollingAtom);
	const lix = await get(lixAtom);
	if (!lix) return null;

	const currentVersion = await lix.db
		.selectFrom("current_version")
		.innerJoin("version", "version.id", "current_version.id")
		.selectAll("version")
		.executeTakeFirstOrThrow();

	return currentVersion;
});

export const existingVersionsAtom = atom(async (get) => {
	get(withPollingAtom);
	const lix = await get(lixAtom);
	if (!lix) return [];

	return await lix.db.selectFrom("version").selectAll().execute();
});

export const filesAtom = atom(async (get) => {
	get(withPollingAtom);
	const lix = await get(lixAtom);
	if (!lix) return [];
	return await lix.db.selectFrom("file").selectAll().execute();
});

export const activeAccountAtom = atom(async (get) => {
	get(withPollingAtom);
	const lix = await get(lixAtom);

	return await lix.db
		.selectFrom("active_account")
		.selectAll("active_account")
		// assuming only one account active at a time
		.executeTakeFirstOrThrow();
});

export const accountsAtom = atom(async (get) => {
	get(withPollingAtom);
	const lix = await get(lixAtom);
	if (!lix) return [];
	const accounts = await lix.db.selectFrom("account").selectAll().execute();
	return accounts;
});

const ACTIVE_ACCOUNT_STORAGE_KEY = "active_account";

// Helper function to switch active account
export const switchActiveAccount = async (lix: Lix, account: Account) => {
	await lix.db.transaction().execute(async (trx) => {
		// in case the user switched the lix and this lix does not have
		// the account yet, then insert it.
		await trx
			.insertInto("account")
			.values(account)
			.onConflict((oc) => oc.doNothing())
			.execute();

		// switch the active account
		await switchAccount({ lix: { ...lix, db: trx }, to: [account] });
	});
	localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
};

export const isSyncingAtom = atom(async (get) => {
	get(withPollingAtom);
	const lix = await get(lixAtom);

	const sync = await lix.db
		.selectFrom("key_value")
		.where("key", "=", "lix_sync")
		.select("value")
		.executeTakeFirst();

	if (sync?.value === "true") {
		return true;
	} else {
		return false;
	}
});
