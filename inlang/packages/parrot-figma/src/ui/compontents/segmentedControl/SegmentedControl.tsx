import * as React from "react";
import { useEffect, useState } from "react";

import "./SegmentedControl.css";

export interface Segment {
	iconName: string;
	value: string;
	tooltip?: string;
}

type SegmentedControlProps<Type> = {
	selectedSegment: Type;
	segments: Segment[];
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	onChoose: Function;
};

export default function SegmentedControl<Type>({
	selectedSegment,
	segments,
	onChoose,
}: SegmentedControlProps<Type>) {
	const [selectedSegmentState, setSelectedSegment] = useState(selectedSegment);

	const handleSelectClick = (value: any) => {
		setSelectedSegment(value);
		onChoose(value);
	};

	useEffect(() => {
		setSelectedSegment(selectedSegment);
	}, [selectedSegment]);

	return (
		<div className="segmented-control">
			{segments.map((segment) => (
				<div
					data-tooltip-content={segment.tooltip}
					key={segment.value}
					className={`segmented-control-segment${
						segment.value === selectedSegmentState ? " selected" : ""
					}`}
					onClick={() => handleSelectClick(segment.value)}
				>
					<div className={`svg-container ${segment.iconName}`} />
				</div>
			))}
		</div>
	);
}
