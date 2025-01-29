export default function generateGUID(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;

		const v = c === "x" ? r : (r & 3) | 8;
		return v.toString(16);
	});
}
