import React, { useMemo } from "react";
import * as Diff from "diff";

type DiffStyles = {
	added: React.CSSProperties;
	removed: React.CSSProperties;
	default: React.CSSProperties;
};

const defaultStyle: DiffStyles = {
	added: {
		backgroundColor: "lightgreen",
	},
	removed: {
		backgroundColor: "salmon",
	},
	default: {},
};

type StringDiffProps = {
	oldValue: string;
	newValue: string;
	styles?: DiffStyles;
	className?: string;
	component?: React.ElementType;
};

export default function StringDiff({
	oldValue,
	newValue,
	styles = defaultStyle,
	className,
	component: Component = "div",
}: StringDiffProps) {
	const result = useMemo(() => {
		const diff = Diff.diffChars(oldValue, newValue);
		return diff.map((part, index) => {
			let style = styles.default as React.CSSProperties;
			if (part.added) {
				style = styles.added;
			} else if (part.removed) {
				style = styles.removed;
			}

			return (
				<span key={index} style={style}>
					{part.value}
				</span>
			);
		});
	}, [oldValue, newValue]);
	return <Component className={className}>{result}</Component>;
}
