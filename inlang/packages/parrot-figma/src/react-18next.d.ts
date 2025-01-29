import "react-i18next";
import Strings from "./ui/localization/strings";

declare module "react-i18next" {
	// and extend them!
	interface Resources {
		translation: typeof Strings.de.translation;
	}
}
