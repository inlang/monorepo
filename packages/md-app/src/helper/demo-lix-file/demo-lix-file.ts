import {
	fileQueueSettled,
	Lix,
	newLixFile,
	openLixInMemory,
	toBlob,
} from "@lix-js/sdk";

export async function lixMdDemoFile(): Promise<{ blob: Blob; id: string }> {
	const lix = await openLixInMemory({
		blob: await newLixFile(),
		providePlugins: [
			// mdPlugin
		],
	});

	const id = await lix.db
		.selectFrom("key_value")
		.where("key", "=", "lix_id")
		.select("value")
		.executeTakeFirstOrThrow();

	await setupMdDemo(lix);
	await fileQueueSettled({ lix });

	return { blob: await toBlob({ lix }), id: id.value };
}

export const setupMdDemo = async (lix: Lix) => {
	// Load a demo md file and save it to OPFS
	const file = await lix.db
		.insertInto("file")
		.values({
			path: "/demo.md",
			data: new TextEncoder().encode(`# Playground
A rich-text editor with AI capabilities. Try the **AI commands** or use Cmd+J to open the AI menu.
<br>`),
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return file;
};
