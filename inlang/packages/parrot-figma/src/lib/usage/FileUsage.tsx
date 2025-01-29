import { UserInFile } from "./UserInFile";

export interface FileUsage {
	fileId: string;
	usersInFile: {
		[userID: string]: UserInFile;
	};
}
