import { Locale } from "./variants/Locale";

export interface MessageStoreUI {
	getBaseLanugage(): Locale | undefined;
}
