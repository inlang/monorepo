import * as React from "react";
import { Placeholder } from "../../../lib/message/Placeholder";

// placeholder editor should be able to:
// - change the name of a placeholder
//   - how do we propagate this to 1. the messages 2. the labels
// - change the decimal places for floating points
//     - this would be a translation wide config? in theory mixed precision could be on purpose
// - change the argument position for the placeholder
//     - this might affect multiple placeholders but the labels should not need to rerender
// - allow to define fillin for a placeholder
//        - in case of the key editor it should allow to set the default fillin
//        - in case of the label it should allow to override the default fillin

// ≡ parameter name | filin value

//     quantity   | 5 / n_likes                     <- defines the quanitty of the given value if not set by a parameter
// ≡ T first_name | Nils    |    | [ ]              <- Text value
// ≡ # n_likes    | 400     |    | [x]              <- Integer/Decimal value
// ≡ % weight     | 82.5    | 1  | [ ]              <- Float with decimal precision

// ^ handle to sort the parameter order
//   ^ symbol for the type T = Text, # = integer, % = float TBD: changable?
//     ^ name of the placeholder
//                  ^ fillin for the given placeholder
//                            ^ format in case of decimal (might differ from placeholder usage to usage)
//                                  ^ radio select to choose which one defines the quantity

type PlaceholderEditorListItemProps = {
	placeholder: Placeholder;
	fillin: string | number;
	onValueChange: (placeholderName: string, value: string) => void;
};

export default function PlaceholderEditorListItem({
	placeholder,
	fillin,
	onValueChange,
}: PlaceholderEditorListItemProps) {
	return (
		<>
			<div />
			<div>
				{/* { placeholder.type === 's' && 'T'}
        { placeholder.type === 'f' && '%'}
        { placeholder.type === 'd' && '#'} */}
			</div>
			<div>{placeholder.name}</div>
			<div>
				<input
					type="text"
					spellCheck="false"
					dir="auto"
					defaultValue={fillin}
					onChange={(e) => {
						onValueChange(placeholder.name, e.target.value);
						/* onSearchChange(e.target.value);

            setRenderEntries(100); */
					}}
				/>
			</div>
			<div>{/* { placeholder.type === 'f' && placeholder.decimalPlaces} */}</div>
		</>
	);
}
