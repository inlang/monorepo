// import React, { useState, useContext } from "react";
import LocalizedStrings from "react-localization";
import strings from "./strings";
import { useLanguageContext } from "../LanguageContext";

export default function useTranslation() {
	const { language } = useLanguageContext();
	const translation = new LocalizedStrings(strings);

	translation.setLanguage(language);
	return translation;
}
