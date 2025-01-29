import * as React from "react";
import { MessageExtension } from "../../../lib/message/MessageExtnesions";
import { PlaceholderView } from "./PlaceholderView";
import PlaceholderBlot from "./blots/PlaceholderBlot";
import PlaceholderHelper from "../../../lib/message/PlaceholderUtil";

type TranslationViewProps = {
	match: { start: number; length: number } | undefined;
	text: string;
};

export default function TranslationView({ match, text }: TranslationViewProps) {
	const result = [];
	const placeholderMatches = PlaceholderHelper.extractPlaceholdersFromPatterHTML(text);
	const fixedPosition = 3; // TODO #8 source this from the keys parameters instead
	let lastEnd = 0;
	let placeHolderIndex = 0;
	for (const placeholderMatch of placeholderMatches) {
		const { specifiedArgumentPosition } = placeholderMatch.placeholder;
		const paramsRendered = (
			<React.Fragment key={placeholderMatch.placeholder.name + placeHolderIndex}>
				{text.substring(lastEnd, placeholderMatch.start)}
				<PlaceholderView
					name={placeholderMatch.placeholder.name}
					specifiedArgumentPositon={specifiedArgumentPosition}
					derivedArgumentPosition={fixedPosition}
					fillIn="TODO"
				/>
			</React.Fragment>
		);
		placeHolderIndex += 1;

		result.push(paramsRendered);
		lastEnd = placeholderMatch.start + placeholderMatch.length;

		// we do not mask if the cursor is placed within a placeholder
	}

	// eslint-disable-next-line no-constant-condition, no-constant-binary-expression -- todo check if this is needed with latest quill
	if (false && result.length > 0) {
		result.push(<>{text.substring(lastEnd)}</>);
		return <>{result.map((el) => el)}</>;
	}

	// if (match !== undefined) {
	//   return (
	//     <>
	//       {text.substring(0, match.start)}
	//       <mark className="match">{text.substring(match.start, match.start + match.length)}</mark>
	//       {text.substring(match.start + match.length)}
	//     </>
	//   );
	// }

	//
	//
	let htmlRepresentation = text;
	// TODO #23 updating the reder view
	htmlRepresentation = htmlRepresentation
		.split("\n")
		.map((content, index, array) => {
			// eslint-disable-next-line no-constant-condition, no-constant-binary-expression -- todo check if this is needed with latest quill
			if (false && index === array.length - 1 && content === "") {
				return "";
			}
			if (content === "") {
				return "<p><br></p>";
			}
			return `<p>${content}</p>`;
		})
		.join("");
	return <span dangerouslySetInnerHTML={{ __html: htmlRepresentation }} />;
}
