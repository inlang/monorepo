/**
 * Properties (and functions) of a component.
 *
 * The type omits generic LitElement functions like `renderOption` and 300
 * others.
 */
export type PropertiesOf<Component> = Omit<
	Component,
	// omit generic lit element properties and the render function
	keyof import("lit").LitElement | "render" | "handleClick"
>;
