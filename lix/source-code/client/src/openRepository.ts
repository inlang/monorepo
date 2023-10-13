import type { NodeishFilesystem } from "@lix-js/fs"
import type { Repository } from "./api.js"
import { transformRemote, withLazyFetching, parseLixUri, withLazyInjection } from "./helpers.js"
// @ts-ignore
import http from "./http-client.js"
import { Octokit } from "octokit"

import { createSignal, createEffect } from "./solid.js"
import {
	clone,
	listRemotes,
	status,
	statusMatrix,
	push,
	pull,
	commit,
	currentBranch,
	add,
	walk,
	log,
	TREE, 
	WORKDIR,
	STAGE, 
	readObject
} from "isomorphic-git"
import path from "path"

export async function openRepository(
	url: string,
	args: {
		nodeishFs: NodeishFilesystem
		workingDirectory?: string
		auth?: unknown // unimplemented
	}
): Promise<Repository> {
	const rawFs = args.nodeishFs

	const [errors, setErrors] = createSignal<Error[]>([])

	// the url format for lix urls is
	// https://lix.inlang.com/git/github.com/inlang/monorepo
	// proto:// lixServer / namespace / repoHost / owner / repoName
	// namespace is ignored until switching from git.inlang.com to lix.inlang.com and can eveolve in future to be used for repoType, api type or feature group
	// the url format for direct github urls without a lix server is https://github.com/inlang/examplX (only per domain-enabled git hosters will be supported, currently just gitub)
	// the url for opening a local repo allready in the fs provider is file://path/to/repo (not implemented yet)

	const { protocol, lixHost, repoHost, owner, repoName } = parseLixUri(url)

	const gitProxyUrl = lixHost ? `${protocol}//${lixHost}/git-proxy/` : ""
	const gitHubProxyUrl = lixHost ? `${protocol}//${lixHost}/github-proxy/` : ""

	const github = new Octokit({
		request: {
			fetch: (...ghArgs: any) => {
				ghArgs[0] = gitHubProxyUrl + ghArgs[0]
				if (!ghArgs[1]) {
					ghArgs[1] = {}
				}

				if (gitHubProxyUrl) {
					// required for authenticated cors requests
					ghArgs[1].credentials = "include"
				}

				// @ts-ignore
				return fetch(...ghArgs)
			},
		},
	})

	// TODO: support for url scheme to use local repo already in the fs
	const gitUrl = `https://${repoHost}/${owner}/${repoName}`

	// the directory we use for all git operations
	const dir = "/"

	let pending: Promise<void | { error: Error }> | undefined = clone({
		fs: rawFs, // withLazyFetching(rawFs, "clone"),
		// TODO lazy - we add the blob filter here
		http: withLazyInjection(http, {
			noneBlobFilter: true,
			overrideHaves: undefined,
		}),
		dir,
		corsProxy: gitProxyUrl,
		url: gitUrl,
		noCheckout: true,
		singleBranch: true,
		depth: 1,
		noTags: true,
	})
		.finally(() => {
			pending = undefined
		})
		.catch((newError: Error) => {
			setErrors((previous) => [...(previous || []), newError])
		})

	await pending

	const oidToFilePaths = {} as { [oid: string] : string[] };
    const filePathToOid = {} as { [filePath: string] : string };

	// TODO - lazy fetch use path.join 
	const gitdir = dir + '/.git';
	// TODO - lazy fetch what shall we use as ref?
	const ref = 'HEAD';

	await walk({
        fs: rawFs,
        // cache
        dir,
        gitdir,
        trees: [TREE({ ref }), WORKDIR(), STAGE()],
        map: async function(fullpath, [commit, _workdir, _stage]) {
            if (fullpath === '.') return;

            const oId = await commit?.oid();
            if (oId === undefined) {
				return;
			}
            
			filePathToOid[fullpath] = oId;
            if (oidToFilePaths[oId] === undefined) {
                oidToFilePaths[oId] = [] as string[];
            } 
            oidToFilePaths[oId]?.push(fullpath);
        }
    });
	// delay all fs and repo operations until the repo clone and checkout have finished, this is preparation for the lazy feature
	async function delayedAction({ prop, argumentsList, execute, }: { prop: string | symbol, argumentsList: any[], execute: () => any }) {
		// if (pending) {
		// 	return pending.then(execute)
		// }

		// return execute()

		if (prop !== 'readFile' || argumentsList.length === 0) {
            // forawrd all non readFiles
            return execute();
        }

        // ok we are in the readfile - check if we deal with an object
        const filePath = argumentsList[0];
        const { dir, base } = path.parse(filePath);
        const folders = dir.split(path.sep);
        // .git/objects/as/asdasdasffasfasdasdasd
        if (folders.length < 3 // TODO also check 
            // || folders[folders.length-3] // TODO check if we are in the git folder
            || folders[folders.length-2] !== 'objects' // check if we are in objects folcer
            || folders[folders.length-1]?.length !== 2 
            ) {
            // forward non objects
            return execute();
        }

        // check if file exists directly
        
        // exxtract the oid from the path and check if we can resolve the object loacly alread
        const firstTwoCharsOfHash = folders[folders.length-1];
        const oid = firstTwoCharsOfHash + base;


        // if we have an oid request we are comming from _readObject of checkout
        // checkout->_readObject internally 
        // 1. tries to resolve the oid using objects (the call we intercept here)
        // 2. tries to find it in a pack file 

        let objectExists = false;

        // this intercepts 1., checks if the object file or the pack file exists and loads them using fetch by passing all other files as have
        try {

            // console.log('trying to find hash: ' + oid + ' (files: ' + oidToFilePaths[oid]?.join() + ') locally');
            // This reads the file - while we acually only want to know if the file exists... a function that gives us the info if a file exist would be better - but the indexf file handling from ismorphic git is not exported...
            const object = await readObject({
                // we don't want to intercept calls of read Object 
                fs: rawFs, 
                oid,
                gitdir,
                format: 'deflated' // NOTE this stops early in _readObject no hashing etc
            });
            // const stats: Stats = await fs.stat(filePath); - doesn't work 
            // object file exists localy... 
            objectExists = true;
            // console.log('trying to find hash: ' + oid + ' (files: ' + oidToFilePaths[oid]?.join() + ') locally - found' );
        } catch (err) {
            // we only expect "Error NO ENTry" - rethrow on other
            if ((err as any).code !== 'ENOENT' && (err as any).code !== 'NotFoundError') {
                throw err;
            }
        }

        if (objectExists) {
            return execute();
        }

        console.log('trying to find hash: ' + oid + ' (files: ' + oidToFilePaths[oid]?.join() + ') locally - not found - fetching it' );
        try {
            
            console.time('Lazy fetching');
            await git.fetch({
                fs: fsRaw,
                gitdir,
                // this time we fetch with blobs but we skip all objects but the one that was requested by fs
                http: withLazyInjection(http, { 
                    noneBlobFilter: false, 
                    overrideHaves: Object.keys(oidToFilePaths).filter( oneOid => oneOid !== oid )
                }), // TODO use http with withFetchInjection and add blob = true
                // http: http,
                depth: 1, 
                singleBranch: true, 
                tags: false,
            });
            console.timeEnd('Lazy fetching');
        } catch (e) {
            console.log('error when trying to fetch a single file');
            throw e;
        }

        console.log('done');

        // try to resolve the object again (this checks on object and on pack file)
        // we hook into this fs again to resolve in case of a pack request since this is pretty isoltated
        // read object does two calls 
        
            
        // 
    
        return execute();
    
	}

	return {
		nodeishFs: withLazyFetching(rawFs, "app", delayedAction),

		/**
		 * Gets the git origin url of the current repository.
		 *
		 * @returns The git origin url or undefined if it could not be found.
		 */
		async listRemotes() {
			try {
				const withLazyFetchingpedFS = withLazyFetching(rawFs, "listRemotes", delayedAction)

				const remotes = await listRemotes({
					fs: withLazyFetchingpedFS,
					dir,
				})

				return remotes
			} catch (_err) {
				return undefined
			}
		},

		status(cmdArgs) {
			return status({
				fs: withLazyFetching(rawFs, "statusMatrix", delayedAction),
				dir,
				filepath: cmdArgs.filepath,
			})
		},

		statusMatrix(cmdArgs) {
			return statusMatrix({
				fs: withLazyFetching(rawFs, "statusMatrix", delayedAction),
				dir,
				filter: cmdArgs.filter,
			})
		},

		add(cmdArgs) {
			return add({
				fs: withLazyFetching(rawFs, "add", delayedAction),
				dir,
				filepath: cmdArgs.filepath,
			})
		},

		commit(cmdArgs) {
			return commit({
				fs: withLazyFetching(rawFs, "commit", delayedAction),
				dir,
				author: cmdArgs.author,
				message: cmdArgs.message,
			})
		},

		push() {
			return push({
				fs: withLazyFetching(rawFs, "push", delayedAction),
				url: gitUrl,
				corsProxy: gitProxyUrl,
				http,
				dir,
			})
		},

		pull(cmdArgs) {
			return pull({
				fs: withLazyFetching(rawFs, "pull", delayedAction),
				url: gitUrl,
				corsProxy: gitProxyUrl,
				http,
				dir,
				fastForward: cmdArgs.fastForward,
				singleBranch: cmdArgs.singleBranch,
				author: cmdArgs.author,
			})
		},

		log(cmdArgs) {
			return log({
				fs: withLazyFetching(rawFs, "log", delayedAction),
				depth: cmdArgs?.depth,
				dir,
				since: cmdArgs?.since,
			})
		},

		async mergeUpstream(cmdArgs) {
			let response
			try {
				response = await github.request("POST /repos/{owner}/{repo}/merge-upstream", {
					branch: cmdArgs.branch,
					owner,
					repo: repoName,
				})
			} catch (_err) {
				/* ignore */
			}

			return response?.data
		},

		async createFork() {
			return github.rest.repos.createFork({
				owner,
				repo: repoName,
			})
		},

		async isCollaborator(cmdArgs) {
			let response:
				| Awaited<
						ReturnType<typeof github.request<"GET /repos/{owner}/{repo}/collaborators/{username}">>
				  >
				| undefined
			try {
				response = await github.request("GET /repos/{owner}/{repo}/collaborators/{username}", {
					owner,
					repo: repoName,
					username: cmdArgs.username,
				})
			} catch (err: any) {
				/*  throws on non collaborator access, 403 on non collaborator, 401 for current user not authenticated correctly
						TODO: move to consistent error classes everywhere when hiding git api more
				*/
				if (err.status === 401) {
					// if we are logged out rethrow the error
					throw err
				}
			}

			return response?.status === 204 ? true : false
		},

		/**
		 * Parses the origin from remotes.
		 *
		 * The function ensures that the same orgin is always returned for the same repository.
		 */
		async getOrigin(): Promise<string> {
			const repo = await this
			const remotes: Array<{ remote: string; url: string }> | undefined = await repo.listRemotes()

			const origin = remotes?.find((elements) => elements.remote === "origin")
			if (origin === undefined) {
				return "unknown"
			}
			// polyfill for some editor related origin issues
			let result = origin.url
			if (result.endsWith(".git") === false) {
				result += ".git"
			}

			return transformRemote(result)
		},

		async getCurrentBranch() {
			// TODO: make stateless
			return (
				(await currentBranch({
					fs: withLazyFetching(rawFs, "getCurrentBranch", delayedAction),
					dir,
				})) || undefined
			)
		},

		errors: Object.assign(errors, {
			subscribe: (callback: (value: Error[]) => void) => {
				createEffect(() => {
					// TODO: the subscription should not send the whole array but jsut the new errors
					// const maybeLastError = errors().at(-1)
					const allErrors = errors()
					if (allErrors.length) {
						callback(allErrors)
					}
				})
			},
		}),

		/**
		 * Additional information about a repository provided by GitHub.
		 */
		async getMeta() {
			const {
				data: { name, private: isPrivate, fork: isFork, parent, owner: ownerMetaData },
			}: Awaited<ReturnType<typeof github.request<"GET /repos/{owner}/{repo}">>> =
				await github.request("GET /repos/{owner}/{repo}", {
					owner,
					repo: repoName,
				})

			return {
				name,
				isPrivate,
				isFork,
				owner: {
					name: ownerMetaData.name || undefined,
					email: ownerMetaData.email || undefined,
					login: ownerMetaData.login,
				},
				parent: parent
					? {
							url: transformRemote(parent.git_url),
							fullName: parent.full_name,
					  }
					: undefined,
			}
		},
	}
}
