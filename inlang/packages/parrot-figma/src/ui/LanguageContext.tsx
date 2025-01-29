import React, { useState, useContext, createContext, ReactNode } from "react";

interface LanguageContextType {
	language: string;
	changeLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
	language: navigator.language,
	changeLanguage: () => {},
});

export const useLanguageContext = (): LanguageContextType => useContext(LanguageContext);

interface Props {
	children: ReactNode;
}

export default function LanguageContextProvider({ children }: Props) {
	const [language, changeLanguage] = useState<string>("en");

	return (
		<LanguageContext.Provider value={{ language, changeLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
}
