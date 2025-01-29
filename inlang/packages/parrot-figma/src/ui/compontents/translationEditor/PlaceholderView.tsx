import * as React from "react";

export type PlaceholderViewProps = {
	name: string;
	specifiedArgumentPositon?: number;
	derivedArgumentPosition: number;
	decimalPlaces?: number;
	selected?: boolean;
	fillIn?: string;
};

export function PlaceholderView({
	name,
	specifiedArgumentPositon,
	decimalPlaces,
	derivedArgumentPosition,
	selected,
	fillIn,
}: PlaceholderViewProps) {
	return (
		<span className={`placholder-container ${selected ? "selected" : ""}`}>
			<span className="placholder-placeholder-type">{name}</span>
			{specifiedArgumentPositon !== undefined &&
				specifiedArgumentPositon !== derivedArgumentPosition && (
					<span
						className="placholder-argument-position placholder-argument-position-missmatch"
						data-tooltip-content={`Specified Position conflicts with postion ${derivedArgumentPosition}`}
					>
						{specifiedArgumentPositon}
					</span>
				)}
			{specifiedArgumentPositon !== undefined &&
				specifiedArgumentPositon === derivedArgumentPosition && (
					<span
						className="placholder-argument-position placholder-argument-position-match"
						data-tooltip-content="Argument Position"
					>
						{specifiedArgumentPositon}
					</span>
				)}
			{/*
      {type === PlaceholderType.float && decimalPlaces === undefined && (
      <>
        <span className="placholder-placeholder-type-spacer">:</span>
        <span className="placholder-placeholder-type" data-tooltip-content={`Placholder will expect a float as an argument. (example: ${Math.PI}`}>f</span>
      </>
      )}
      {type === PlaceholderType.float && decimalPlaces !== undefined && (
      <>
        <span className="placholder-placeholder-type-spacer">:</span>
        <span className="placholder-placeholder-type" data-tooltip-content={`Placholder will expect a float as an argument. It will be printed with ${decimalPlaces} places. (example: ${Math.PI.toFixed(decimalPlaces)}`}>{`f${decimalPlaces ? `.${decimalPlaces}` : ''}`}</span>
      </>
      )}
      {type === PlaceholderType.integer && (
      <>
        <span className="placholder-placeholder-type-spacer">:</span>
        <span className="placholder-placeholder-type">d</span>
      </>
      )} */}
		</span>
	);
}
