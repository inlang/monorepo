import { Gender } from "../message/variants/Gender";
import { Plural } from "../message/variants/Plural";

export type ImportMessage = {
	name: string;
	gender: Gender;
	plural: Plural;
	tags?: string[];
	text?: string;
};
