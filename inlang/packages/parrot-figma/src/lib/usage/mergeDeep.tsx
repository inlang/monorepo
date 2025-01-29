/**
 * Performs a deep merge of `source` into `target`.
 * Mutates `target` only but not its objects and arrays.
 *
 * @author inspired by [jhildenbiddle](https://stackoverflow.com/a/48218209).
 */
export default function mergeDeep(target: any, source: any) {
	const isObject = (obj: any) => obj && typeof obj === "object";

	if (!isObject(target) || !isObject(source)) {
		return source;
	}

	Object.keys(source).forEach((key) => {
		const targetValue = target[key];
		const sourceValue = source[key];

		if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
			target[key] = targetValue.concat(sourceValue);
		} else if (isObject(targetValue) && isObject(sourceValue)) {
			target[key] = mergeDeep({ ...targetValue }, sourceValue);
		} else {
			target[key] = sourceValue;
		}
	});

	return target;
}
