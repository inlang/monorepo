import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Strings from "./strings";

i18n.use(initReactI18next).init({
	resources: Strings,
	lng: "en",
	fallbackLng: "en",
});

export default i18n;
