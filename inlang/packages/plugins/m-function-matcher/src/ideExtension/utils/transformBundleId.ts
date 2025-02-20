export default function transformBundleId(messageId: string): string {
	let transformedId = messageId
		.trim()
		.replace(/[^a-zA-Z0-9\s_.]/g, "")
		.replace(/[\s.]+/g, "_");

	// Check if the transformed ID starts with a number
	if (/^[0-9]/.test(transformedId)) {
		transformedId = "_" + transformedId;
	}

	return transformedId;
}
