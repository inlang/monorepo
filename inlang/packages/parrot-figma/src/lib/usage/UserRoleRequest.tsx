import { UserFileRole } from "./UsageManager";

export interface UserRoleRequest {
	time: number;
	type: UserFileRole;
	actorId: string;
	entryType: "request" | "set" | "reject";
}
