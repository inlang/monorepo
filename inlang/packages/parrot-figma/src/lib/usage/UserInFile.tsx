import { Locale } from "../message/variants/Locale";
import { UserFileRole } from "./UsageManager";

export interface UserInFile {
	userId: string;
	userName: string;
	photoUrl: string | null;
	userStates: {
		[time: number]: {
			type: UserFileRole;
			actorId: string;
			entryType: "request" | "set" | "reject";
		};
	};
	translations: {
		[time: number]: {
			chars: number;
			sourceLang: Locale;
			targetLang: Locale;
		};
	};
}
