export interface Placeholder {
	// name of the placeholder - always preferred to have one but can also get derived as some imports do only provide position
	name: string;

	// false if no name provided - this allows to distinct names derived by postion from real names
	named: boolean;

	// if defined the position to provide the argument at when using printf for example
	specifiedArgumentPosition: undefined | number;
	// the argument position derived by analyzing all variants
	//  derivedArgumentPosition: undefined | number,
	// formatting function like :number :datetime or custom function
	formatFunctionName?: string;
	// options utilized by formatting function like Date formating pattern or number format
	options?: Record<string, string>;
}
