import { FileUsage } from "./FileUsage";

interface UserStorage {
	[fileId: string]: FileUsage;
}
