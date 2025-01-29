import TextEncoding from "text-encoding";

/**
 * The filesystem interface.
 *
 * The filesystem interface is a strict subset of `node:fs/promises`
 * that is cross platform compatible (browser, node).
 *
 * Node API reference https://nodejs.org/api/fs.html#fspromisesaccesspath-mode
 */
type NodeishFilesystem = {
	writeFile(path: string, data: string | Uint8Array, options?: { mode: number }): Promise<void>;
	readFile(path: string): Promise<Uint8Array>;
	readFile(path: string, options: { encoding: "utf-8" | "binary" }): Promise<string>;
	readdir(path: string): Promise<string[]>;
	/**
	 * https://nodejs.org/api/fs.html#fspromisesmkdirpath-options
	 *
	 * Upon success, fulfills with undefined if recursive is false, or the first directory path created if recursive is true.
	 */
	mkdir(path: string, options?: { recursive: boolean }): Promise<string | undefined>;
	rm(path: string, options?: { recursive: boolean }): Promise<void>;
	rmdir(path: string): Promise<void>;
	symlink(target: string, path: string): Promise<void>;
	unlink(path: string): Promise<void>;
	readlink(path: string): Promise<string>;
	stat(path: string): Promise<NodeishStats>;
	lstat(path: string): Promise<NodeishStats>;
};

// type FileData = string | Uint8Array;

export type NodeishStats = {
	ctimeMs: number;
	mtimeMs: number;
	dev: number;
	ino: number;
	mode: number;
	uid: number;
	gid: number;
	size: number;
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
	symlinkTarget?: string;
};

class FilesystemError extends Error {
	code: string;

	path: string;

	syscall: string;

	target?: string;

	constructor(code: string, path: string, syscall: string, target?: string) {
		let message;
		switch (code) {
			case "ENOENT":
				message = `${code}: No such file or directory, ${syscall} '${path}'`;
				break;
			case "ENOTDIR":
				message = `${code}: Not a directory, ${syscall} '${path}'`;
				break;
			case "EISDIR":
				message = `${code}: Illegal operation on a directory, ${syscall} '${path}'`;
				break;
			case "ENOTEMPTY":
				message = `${code}: Directory not empty, ${syscall} '${path}'`;
				break;
			case "EEXIST":
				message = `${code}: File exists, ${syscall} '${path}' -> '${target}'`;
				break;
			case "EINVAL":
				message = `${code}: Invaid argument, ${syscall} '${path}'`;
				break;

			default:
				message = `Unknown error with code "${code}", '${syscall}' on '${path}'`;
		}
		super(message);
		this.name = "FilesystemError";
		this.code = code;
		this.path = path;
		this.syscall = syscall;
		this.target = target;
	}
}

type Inode = Uint8Array | Set<string>;

export function createNodeishMemoryFs(): NodeishFilesystem {
	// local state
	const fsMap: Map<string, Inode> = new Map();
	const fsStats: Map<string, NodeishStats> = new Map();

	// initialize the root to an empty dir
	fsMap.set("/", new Set());
	newStatEntry("/", fsStats, 1, 0o755);

	async function stat(path: Parameters<NodeishFilesystem["stat"]>[0]): Promise<NodeishStats> {
		path = normalPath(path);
		const stats: NodeishStats | undefined = fsStats.get(path);
		if (stats === undefined) throw new FilesystemError("ENOENT", path, "stat");
		if (stats.symlinkTarget) return stat(stats.symlinkTarget);
		return { ...stats };
	}

	async function lstat(path: Parameters<NodeishFilesystem["lstat"]>[0]) {
		path = normalPath(path);
		const stats: NodeishStats | undefined = fsStats.get(path);
		if (stats === undefined) throw new FilesystemError("ENOENT", path, "lstat");
		if (!stats.symlinkTarget) return stat(path);
		return { ...stats };
	}

	return {
		async writeFile(
			path: Parameters<NodeishFilesystem["writeFile"]>[0],
			data: Parameters<NodeishFilesystem["writeFile"]>[1],
			options?: Parameters<NodeishFilesystem["writeFile"]>[2],
		) {
			const encoder = new TextEncoding.TextEncoder();

			path = normalPath(path);
			const parentDir: Inode | undefined = fsMap.get(getDirname(path));

			if (!(parentDir instanceof Set)) throw new FilesystemError("ENOENT", path, "writeFile");

			if (typeof data === "string") {
				data = encoder.encode(data);
			}

			parentDir.add(getBasename(path));
			newStatEntry(path, fsStats, 0, options?.mode ?? 0o644);
			fsMap.set(path, data);
		},

		// @ts-expect-error -- we just implement the parts we need here
		// Typescript can't derive that the return type is either
		// a string or a Uint8Array based on the options.
		async readFile(
			path: Parameters<NodeishFilesystem["readFile"]>[0],
			options?: Parameters<NodeishFilesystem["readFile"]>[1],
		) {
			const decoder = new TextDecoder();

			path = normalPath(path);
			const file: Inode | undefined = fsMap.get(path);

			if (file instanceof Set) throw new FilesystemError("EISDIR", path, "readFile");
			if (file === undefined) throw new FilesystemError("ENOENT", path, "readFile");
			if (!(options?.encoding || typeof options === "string")) return file;

			return decoder.decode(file);
		},

		async readdir(path: Parameters<NodeishFilesystem["readdir"]>[0]) {
			path = normalPath(path);
			const dir: Inode | undefined = fsMap.get(path);
			if (dir instanceof Set) return [...dir.keys()];
			if (dir === undefined) throw new FilesystemError("ENOENT", path, "readdir");
			throw new FilesystemError("ENOTDIR", path, "readdir");
		},

		mkdir: async function mkdir(
			path: Parameters<NodeishFilesystem["mkdir"]>[0],
			options: Parameters<NodeishFilesystem["mkdir"]>[1],
		): Promise<string | undefined> {
			path = normalPath(path);
			const parentDir: Inode | undefined = fsMap.get(getDirname(path));

			if (typeof parentDir === "string") throw new FilesystemError("ENOTDIR", path, "mkdir");

			if (parentDir && parentDir instanceof Set) {
				parentDir.add(getBasename(path));
				newStatEntry(path, fsStats, 1, 0o755);
				fsMap.set(path, new Set());
				return path;
			}

			if (options?.recursive) {
				const firstPath = await mkdir(getDirname(path), options);
				await mkdir(path, options);
				return firstPath;
			}

			throw new FilesystemError("ENOENT", path, "mkdir");
		},

		rm: async function rm(
			path: Parameters<NodeishFilesystem["rm"]>[0],
			options: Parameters<NodeishFilesystem["rm"]>[1],
		) {
			path = normalPath(path);
			const target: Inode | undefined = fsMap.get(path);
			const parentDir: Inode | undefined = fsMap.get(getDirname(path));

			if (parentDir === undefined || target === undefined) {
				throw new FilesystemError("ENOENT", path, "rm");
			}

			if (parentDir instanceof Uint8Array) throw new FilesystemError("ENOTDIR", path, "rm");

			if (target instanceof Uint8Array) {
				parentDir.delete(getBasename(path));
				fsStats.delete(path);
				fsMap.delete(path);
				return;
			}

			if (target instanceof Set && options?.recursive) {
				await Promise.all(
					[...target.keys()].map(async (child) => {
						await rm(`${path}/${child}`, { recursive: true });
					}),
				);
				parentDir.delete(getBasename(path));
				fsStats.delete(path);
				fsMap.delete(path);
				return;
			}

			throw new FilesystemError("EISDIR", path, "rm");
		},

		async rmdir(path: Parameters<NodeishFilesystem["rmdir"]>[0]) {
			path = normalPath(path);
			const target: Inode | undefined = fsMap.get(path);
			const parentDir: Inode | undefined = fsMap.get(getDirname(path));

			if (parentDir === undefined || target === undefined)
				throw new FilesystemError("ENOENT", path, "rmdir");

			if (parentDir instanceof Uint8Array || target instanceof Uint8Array)
				throw new FilesystemError("ENOTDIR", path, "rmdir");

			if (target.size) throw new FilesystemError("ENOTEMPTY", path, "rmdir");

			parentDir.delete(getBasename(path));
			fsStats.delete(path);
			fsMap.delete(path);
		},

		async symlink(
			target: Parameters<NodeishFilesystem["symlink"]>[0],
			path: Parameters<NodeishFilesystem["symlink"]>[1],
		) {
			path = normalPath(path);
			target = target.startsWith("/") ? target : `${path}/../${target}`;
			const targetInode: Inode | undefined = fsMap.get(normalPath(target));
			const parentDir: Inode | undefined = fsMap.get(getDirname(path));

			if (fsMap.get(path)) throw new FilesystemError("EEXIST", path, "symlink", target);

			if (parentDir instanceof Uint8Array)
				throw new FilesystemError("ENOTDIR", path, "symlink", target);

			if (targetInode === undefined || parentDir === undefined)
				throw new FilesystemError("ENOENT", path, "symlink", target);

			parentDir.add(getBasename(path));
			newStatEntry(path, fsStats, 2, 0o777, target);
			fsMap.set(path, targetInode);
		},

		async unlink(path: Parameters<NodeishFilesystem["unlink"]>[0]) {
			path = normalPath(path);
			const targetStats = fsStats.get(path);
			const target: Inode | undefined = fsMap.get(path);
			const parentDir: Inode | undefined = fsMap.get(getDirname(path));

			if (parentDir === undefined || target === undefined)
				throw new FilesystemError("ENOENT", path, "unlink");

			if (parentDir instanceof Uint8Array) throw new FilesystemError("ENOTDIR", path, "unlink");

			if (targetStats?.isDirectory()) throw new FilesystemError("EISDIR", path, "unlink");

			parentDir.delete(getBasename(path));
			fsStats.delete(path);
			fsMap.delete(path);
		},
		async readlink(path: Parameters<NodeishFilesystem["readlink"]>[0]) {
			path = normalPath(path);
			const linkStats = await lstat(path);

			if (linkStats === undefined) throw new FilesystemError("ENOENT", path, "readlink");

			if (linkStats.symlinkTarget === undefined)
				throw new FilesystemError("EINVAL", path, "readlink");

			return linkStats.symlinkTarget;
		},
		stat,
		lstat,
	};
}

/**
 * Creates a new stat entry. 'kind' refers to whether the entry is for a file,
 * directory or symlink:
 * 0 = File
 * 1 = Directory
 * 2 = Symlink
 */
function newStatEntry(
	path: string,
	stats: Map<string, NodeishStats>,
	kind: number,
	modeBits: number,
	target?: string,
) {
	const cdateMs: number = Date.now();
	stats.set(normalPath(path), {
		ctimeMs: cdateMs,
		mtimeMs: cdateMs,
		dev: 0,
		ino: stats.size + 1,
		mode: (!kind ? 0o100000 : kind === 1 ? 0o040000 : 0o120000) | modeBits,
		uid: 0,
		gid: 0,
		size: -1,
		isFile: () => kind === 0,
		isDirectory: () => kind === 1,
		isSymbolicLink: () => kind === 2,
		// symlinkTarget is only for symlinks, and is not normalized
		symlinkTarget: target,
	});
}

function getDirname(path: string): string {
	return normalPath(
		path
			.split("/")
			.filter((x) => x)
			.slice(0, -1)
			.join("/") ?? path,
	);
}

function getBasename(path: string): string {
	return (
		path
			.split("/")
			.filter((x) => x)
			.at(-1) ?? path
	);
}

/**
 * Removes extraneous dots and slashes, resolves relative paths and ensures the
 * path begins and ends with '/'
 */
function normalPath(path: string): string {
	const dots = /(\/|^)(\.\/)+/g;
	const slashes = /\/+/g;

	const upreference = /(?<!\.\.)[^/]+\/\.\.\//;

	// Append '/' to the beginning and end
	path = `/${path}/`;

	// Handle the edge case where a path begins with '/..'
	path = path.replace(/^\/\.\./, "");

	// Remove extraneous '.' and '/'
	path = path.replace(dots, "/").replace(slashes, "/");

	// Resolve relative paths if they exist
	let match;

	while ((match = path.match(upreference)?.[0])) {
		path = path.replace(match, "");
	}

	return path;
}
