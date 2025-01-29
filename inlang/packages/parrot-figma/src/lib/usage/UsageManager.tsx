// TODO #32 use the local storage for now - information will be sourced by the backend later

import { FileUsage } from "./FileUsage";
import { UserRoleRequest } from "./UserRoleRequest";
import generateGUID from "./generateGUID";
import mergeDeep from "./mergeDeep";

export interface PluginUser {
	userId: string;
	name: string;
	photoUrl: string | null;
	userRole: UserFileRole;
	openUserRoleRequest: UserRoleRequest | undefined;
	// permissions
}

// TODO #32

export enum UserFileRole {
	owner = "owner",
	designer = "designer",
	developer = "developer",
	inactive = "inactive", // TODO #32 remove inactive and introduce seat property it with parrot seat (Free/Collab)
	none = "none",
}

const UserRoleUtils = {
	compare: (
		type: UserFileRole | undefined,
		comparetToType: UserFileRole | undefined,
	): 1 | 0 | -1 => {
		if (type === comparetToType) {
			return 0;
		}
		switch (type) {
			case UserFileRole.owner:
				if (
					comparetToType === UserFileRole.designer ||
					comparetToType === UserFileRole.developer ||
					comparetToType === UserFileRole.inactive ||
					comparetToType === undefined
				) {
					return 1;
				}
				break;
			case UserFileRole.designer:
				if (
					comparetToType === UserFileRole.developer ||
					comparetToType === UserFileRole.inactive ||
					comparetToType === undefined
				) {
					return 1;
				}
				break;
			case UserFileRole.developer:
				if (comparetToType === UserFileRole.inactive || comparetToType === undefined) {
					return 1;
				}
				break;
			case UserFileRole.inactive:
				if (comparetToType === undefined) {
					return 1;
				}
				break;
			default:
				break;
		}
		return -1;
	},
};

const clientStorageKeyPrefix = "userStorage_";
const fileStorageKey = "fileStorage";

export default class UserManager {
	public proxyClassName = "UserManager";

	state: FileUsage;

	localStorageStateIntegrated: Promise<void>;

	rootNodeId: string;

	currentUserId: string;

	autoApplyUserRole = true;

	constructor(asProxy: boolean) {
		if (asProxy) {
			this.state = {} as FileUsage;
			this.localStorageStateIntegrated = {} as Promise<void>;
			this.rootNodeId = "";
			this.currentUserId = "";
			return;
		}
		this.currentUserId = figma.currentUser!.id!;
		const fileState = UserManager.loadFileStateFromRoot();
		this.state = fileState;

		// load the state from local storage as well to merge it in
		this.localStorageStateIntegrated = (async () => {
			const localStorageState = await UserManager.loadFileStateFromLocalStorage(fileState.fileId);
			this.state = UserManager.mergeStates(localStorageState, fileState);
			// we don't have to await the local storage state to be integrated - becaus we are currently integrating it ;-)
			await this.propagateState(false);
		})();

		this.rootNodeId = figma.root.id;

		figma.on("documentchange", (event: any) => {
			for (const change of event.documentChanges) {
				if (
					change.id === this.rootNodeId &&
					change === "PROPERTY_CHANGE" &&
					change.properties.includes("pluginData")
				) {
					const newFileState = UserManager.loadFileStateFromRoot();
					this.state = UserManager.mergeStates(this.state, newFileState);

					// we don't have to wait for the propagation here since we only update the local state
					this.propagateState();
				}
			}
		});
	}

	static loadFileStateFromRoot(): FileUsage {
		const fileStateRaw = figma.root.getPluginData(fileStorageKey);
		if (fileStateRaw !== "") {
			const rootFileState = JSON.parse(fileStateRaw) as FileUsage;
			console.log(`Filestate found2 - FileId: ${rootFileState}`);
			return rootFileState;
		}
		const newFileId = generateGUID();
		console.log(`File seen by the plugin the first time - returning with new ID ${newFileId}`);
		return {
			fileId: generateGUID(),
			usersInFile: {},
		};
	}

	static async loadFileStateFromLocalStorage(fileId: string): Promise<FileUsage> {
		const userLocalState = await figma.clientStorage.getAsync(clientStorageKeyPrefix + fileId);
		if (userLocalState) {
			return userLocalState as FileUsage;
		}
		return {
			fileId,
			usersInFile: {},
		};
	}

	private static mergeStates(localState: FileUsage, fileState: FileUsage) {
		if (!localState.fileId) {
			return fileState;
		}

		if (localState.fileId !== fileState.fileId) {
			throw new Error("file id differs");
		}

		return mergeDeep(localState, fileState) as FileUsage;
	}

	async propagateState(awaitLocalStateIntegrated = true) {
		if (awaitLocalStateIntegrated) {
			await this.localStorageStateIntegrated;
		}

		// merge two states together
		const currentFileStateRaw = figma.root.getPluginData(fileStorageKey);

		// write files state to root documents root node
		const newFileStateRaw = JSON.stringify(this.state);
		if (currentFileStateRaw !== newFileStateRaw) {
			figma.root.setPluginData(fileStorageKey, newFileStateRaw);

			const message = {
				target: "UsageManager",
				type: "change",
			} as any;

			// console.log('keys changed');
			// console.log(keysChanged);
			figma.ui.postMessage(message);
		}

		// write user state to localState
		await figma.clientStorage.setAsync(clientStorageKeyPrefix + this.state.fileId, this.state);
	}

	async requestUserRoleForCurrentUser(userRole: UserFileRole): Promise<PluginUser> {
		this.requestUserRole(userRole, this.currentUserId);
		return this.getCurrentUser();
	}

	requestUserRole(userRole: UserFileRole, forUser: string): PluginUser | undefined {
		if (Object.keys(this.state.usersInFile).length === 0) {
			if (userRole === UserFileRole.designer) {
				// the first desinger becomse the owner of the file
				this.state.usersInFile[forUser] = {
					userId: forUser,
					userName: figma.currentUser!.name,
					photoUrl: figma.currentUser!.photoUrl,

					userStates: {
						[Date.now()]: {
							type: UserFileRole.owner,
							actorId: forUser,
							entryType: "set",
						},
					},
					translations: {},
				};
				this.propagateState();
				return this.getUser(forUser);
			}
			// dev users cant init the file
			return undefined;
		}

		const currentUserRole = this.getUserRole(forUser);
		const currentOpenUserRoleRequest = this.getOpenUserRoleRequest(forUser);

		if (UserRoleUtils.compare(currentUserRole, userRole) > -1) {
			// current role is higher
			return this.getUser(forUser);
		}

		if (UserRoleUtils.compare(currentOpenUserRoleRequest?.type, userRole) > -1) {
			// role or higher role already requested
			return this.getUser(forUser);
		}

		if (this.state.usersInFile[forUser] === undefined) {
			this.state.usersInFile[forUser] = {
				userId: forUser,
				userName: figma.currentUser!.name,
				photoUrl: figma.currentUser!.photoUrl,
				userStates: {},
				translations: {},
			};
		}

		// TODO #32 check if role is available now
		this.state.usersInFile[forUser].userStates[Date.now()] = {
			type: userRole,
			actorId: forUser,
			entryType: "request",
		};
		this.propagateState();

		if (
			userRole !== UserFileRole.owner &&
			this.autoApplyUserRole /* in the beta we auto apply requested roles */
		) {
			setTimeout(() => this.setUserRole(userRole, forUser, "plugin"), 1);
		}

		return this.getUser(forUser);
	}

	async setUserRole(userRole: UserFileRole, forUser: string, actor: string): Promise<boolean> {
		// TODO #32 check user limit
		console.log(`setting user role to ${userRole}`);
		this.state.usersInFile[forUser].userStates[Date.now()] = {
			type: userRole,
			actorId: actor,
			entryType: "set",
		};
		this.propagateState();
		return true;
	}

	getOpenUserRoleRequest(userId: string) {
		return this.findMostRecentUserRoleStateWithEntryType("request", userId);
	}

	async getCurrentUser(): Promise<PluginUser> {
		const currentUserPersisted = this.getUser(this.currentUserId);
		if (currentUserPersisted !== undefined) {
			return currentUserPersisted;
		}
		return {
			userId: this.currentUserId,
			name: figma.currentUser!.name,
			photoUrl: figma.currentUser!.photoUrl!,
			userRole: this.getUserRole(this.currentUserId) ?? UserFileRole.none,
			openUserRoleRequest: this.getOpenUserRoleRequest(this.currentUserId),
		};
	}

	getUser(userId: string): PluginUser | undefined {
		const userObj = this.state.usersInFile[userId];
		if (userObj === undefined) {
			return undefined;
		}

		return {
			userId: userObj.userId,
			name: userObj.userName,
			photoUrl: userObj.photoUrl,
			userRole: this.getUserRole(userId) ?? UserFileRole.none,
			openUserRoleRequest: this.getOpenUserRoleRequest(userId),
		};
	}

	getUserRole(userId: string) {
		return this.findMostRecentUserRoleStateWithEntryType("set", userId)?.type;
	}

	findMostRecentUserRoleStateWithEntryType(
		entryType: "request" | "set",
		userId: string,
	): UserRoleRequest | undefined {
		if (!this.state.usersInFile[userId]) {
			return undefined;
		}
		const times = Object.keys(this.state.usersInFile[userId].userStates)
			.map(Number)
			.sort((a, b) => b - a); // Get the sorted array of timestamps in descending order

		for (const time of times) {
			const entry = this.state.usersInFile[userId].userStates[time];
			if (entryType === "request" && entry.entryType === "set") {
				// request was revoked by setting the type to current state
				return undefined;
			}
			if (entry.entryType === entryType) {
				return {
					time,
					...entry,
				};
			}
		}

		return undefined; // Return null if no entry with 'request' entryType is found
	}

	async getUsers() {
		const users = [] as PluginUser[];
		for (const [userId, userObj] of Object.entries(this.state.usersInFile)) {
			users.push({
				userId,
				name: userObj.userName,
				photoUrl: userObj.photoUrl,
				userRole: this.getUserRole(userId) ?? UserFileRole.none,
				openUserRoleRequest: this.getOpenUserRoleRequest(userId),
			});
		}
		return users;
	}

	async getUsageStatistics() {
		const usageStatistcs = [] as FileUsage[];
		const localStorageKeys = await figma.clientStorage.keysAsync();
		for (const localStorageKey of localStorageKeys) {
			if (localStorageKey.startsWith(clientStorageKeyPrefix)) {
				const userLocalState = (await figma.clientStorage.getAsync(localStorageKey)) as FileUsage;
				if (userLocalState) {
					usageStatistcs.push(userLocalState);
				}
			}
		}
		return usageStatistcs;
	}
	/*
  async checkFeature(feature: string) {
    switch (feature) {
      case 'collaboration':
        // (more than one user) at least like by user
        break;
      case 'export':
        // at least one user like
        break;
      case 'permissionmanagement':
        break;
      case 'devmode':
        break;
      default:
        break;
    }
  } */
}
/*
const Features = {
  'colaboration':
} */

/*
usage:

client storage cumulates the information and syncs into files open for the file

// file global property
file: {
    fileID: GUID
    users: {
        userId: {
            currentRole: owner|designer|dev
            states: {
                1231234123: { requestRole: owner|designer|dev }
                1231234124: { receivedRole: owner|designer|dev }
            },
            usage: {
                123124123: {role: owner|designer, characters: 30, from: 'de', to: 'en'},
            }
        }
    }
}

// users local storage
user: {
    files: {
        fileID(GUID): {
            userId: {
                currentRole: owner|designer|dev
                states: {
                    1231234123: { requestRole: owner|designer|dev }
                    1231234124: { receivedRole: owner|designer|dev }
                }
                usage: {
                    123124123: {role: owner|designer, characters: 30, from: 'de', to: 'en'},
                }
            }
        }
    }
}

// methods:
getCurrentUsers() {
    this.getUsers();
}

requestRole(role) {
    // check if role is available
    // if role is available return role
    //   - update role
    //   - return role
}

getRole(user) {
    // return the current role and the currently requested role if any
}

syncState(user) {
    if (user !== currentUser) {
        // throw
    }
    // TODO #32  meger states and store it in the user and in the file
    // TODO #32 merge usage for the current file and store it in the user and in the file
    // TODO #32 uverride users role with the one found in the file
}
*/
