import * as React from "react";

type MatchViewProps = {
	match: { start: number; length: number } | undefined;
	text: string;
};

export default function MatchView({ match, text }: MatchViewProps) {
	if (match !== undefined) {
		return (
			<>
				{text.substring(0, match.start)}
				<mark className="match">{text.substring(match.start, match.start + match.length)}</mark>
				{text.substring(match.start + match.length)}
			</>
		);
	}
	return <span>{text}</span>;
}
