export interface MessageParameterValues {
	[parameterName: string]: { type: "string"; value: string; default?: boolean }; // TODO #19 variables - add other types | { type: 'number', value: number, default?: boolean }
}
