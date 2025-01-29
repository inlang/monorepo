import ejs from "ejs";
import { getVariant } from "@inlang/sdk";
import { Locale } from "../message/variants/Locale";
import MessageStoreMemory from "../message/store/MessageStoreMemory";

// Import EJS templates as strings
import androidXmlExporterTmplContent from "./templates/AndroidXmlExporter.ejs";
import appleStringsFileExporterTmplContent from "./templates/AppleStringsFileExporter.ejs";
import i18nextJsonExporterContent from "./templates/i18nextJsonExporter.ejs";

const androidXmlExporterTmpl = ejs.compile(androidXmlExporterTmplContent); // include the EJS template as a string
const appleStringsFileExporterTmpl = ejs.compile(appleStringsFileExporterTmplContent);
// const appleDictFileExporterTmpl = ejs.compile(require('./templates/AppleDictFileExporter.ejs').default);
const i18nextJsonExporter = ejs.compile(i18nextJsonExporterContent);

export default class MessageExporter {
	static export(messageStore: MessageStoreMemory, language: Locale, format: string) {
		// prepare the data needed by the templates

		const dataToPass = {
			messages: messageStore.getAllMessages(),
			locale: language,
			getVariant,
			patternToHtml: MessageStoreMemory.patternToHtml,
		};

		if (format === "apple-strings") {
			return {
				fileName: `${language}.strings`,
				fileType: "application/xml",
				content: appleStringsFileExporterTmpl(dataToPass),
			};
		}
		/* TODO #18 support export format for plurals
    if (format === 'apple-dict') {
      return {
        fileName: `${language}.dict`,
        fileType: 'application/xml',
        content: appleDictFileExporterTmpl(dataToPass),
      };
    } */

		if (format === "android-xml") {
			return {
				fileName: "strings.xml",
				fileType: "application/xml",
				content: androidXmlExporterTmpl(dataToPass),
			};
		}

		if (format === "i18next") {
			return {
				fileName: `${language}.json`,
				fileType: "application/json",
				content: i18nextJsonExporter(dataToPass),
			};
		}
		return undefined;
	}
}
