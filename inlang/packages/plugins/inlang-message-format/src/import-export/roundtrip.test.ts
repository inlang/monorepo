import { expect, test } from "vitest";
import { importFiles } from "./importFiles.js";
import {
  Declaration,
  type Bundle,
  type Message,
  type Pattern,
  type Variant,
} from "@inlang/sdk";
import { exportFiles } from "./exportFiles.js";

test("it handles single variants without expressions", async () => {
	const imported = await runImportFiles({
		some_happy_cat: "Read more about Lix",
	});
	expect(await runExportFilesParsed(imported)).toMatchObject({
		some_happy_cat: "Read more about Lix",
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(1);

	expect(imported.bundles[0]?.id).toStrictEqual("some_happy_cat");
	expect(imported.bundles[0]?.declarations).toStrictEqual([]);

	expect(imported.messages[0]?.selectors).toStrictEqual([]);

	expect(imported.variants[0]?.matches).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "Read more about Lix" },
	]);
});

test("it handles variable expressions in patterns", async () => {
	const imported = await runImportFiles({
		some_happy_cat:
			"Used by {count} devs, {numDesigners} designers and translators",
	});
	expect(await runExportFilesParsed(imported)).toMatchObject({
		some_happy_cat:
			"Used by {count} devs, {numDesigners} designers and translators",
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(1);

	expect(imported.bundles[0]?.id).toStrictEqual("some_happy_cat");
	expect(imported.bundles[0]?.declarations).toStrictEqual([
		{ type: "input-variable", name: "count" },
		{ type: "input-variable", name: "numDesigners" },
	] satisfies Declaration[]);

	expect(imported.messages[0]?.selectors).toStrictEqual([]);

	expect(imported.variants[0]?.matches).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "Used by " },
		{
			type: "expression",
			arg: { type: "variable-reference", name: "count" },
		},
		{
			type: "text",
			value: " devs, ",
		},
		{
			type: "expression",
			arg: { type: "variable-reference", name: "numDesigners" },
		},
		{
			type: "text",
			value: " designers and translators",
		},
	] satisfies Pattern);
});

test("it adds the $schema property", async () => {
	const imported = await runImportFiles({
		key: "value",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		$schema: "https://inlang.com/schema/inlang-message-format",
		key: "value",
	});
});

test("it handles detecting and adding selectors and declarations for multi variant messages", async () => {
	const imported = await runImportFiles({
		some_happy_cat: {
			match: {
				"platform=android, userGender=male":
					"{username} has to download the app on his phone from the Google Play Store.",
				"platform=ios, userGender=female":
					"{username} has to download the app on her iPhone from the App Store.",
				"platform=*, userGender=*": "The person has to download the app.",
			},
		},
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual(
		expect.objectContaining({
			some_happy_cat: {
				declarations: ["input platform", "input userGender", "input username"],
				selectors: ["platform", "userGender"],
				match: {
					"platform=android, userGender=male":
						"{username} has to download the app on his phone from the Google Play Store.",
					"platform=ios, userGender=female":
						"{username} has to download the app on her iPhone from the App Store.",
					"platform=*, userGender=*": "The person has to download the app.",
				},
			},
		})
	);

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(3);

	expect(imported.bundles[0]?.id).toStrictEqual("some_happy_cat");
	expect(imported.bundles[0]?.declarations).toStrictEqual(
		expect.arrayContaining([
			{ type: "input-variable", name: "username" },
			{ type: "input-variable", name: "platform" },
			{ type: "input-variable", name: "userGender" },
		] satisfies Declaration[])
	);

	expect(imported.messages[0]?.selectors).toStrictEqual(
		expect.arrayContaining([
			{ type: "variable-reference", name: "platform" },
			{ type: "variable-reference", name: "userGender" },
		] satisfies Message["selectors"])
	);
	expect(imported.messages[0]?.bundleId).toStrictEqual("some_happy_cat");

	expect(imported.variants[0]).toStrictEqual(
		expect.objectContaining({
			matches: [
				{ type: "literal-match", key: "platform", value: "android" },
				{ type: "literal-match", key: "userGender", value: "male" },
			],
			pattern: [
				{
					type: "expression",
					arg: { type: "variable-reference", name: "username" },
				},
				{
					type: "text",
					value:
						" has to download the app on his phone from the Google Play Store.",
				},
			],
		} satisfies Partial<Variant>)
	);
	expect(imported.variants[1]).toStrictEqual(
		expect.objectContaining({
			matches: [
				{ type: "literal-match", key: "platform", value: "ios" },
				{ type: "literal-match", key: "userGender", value: "female" },
			],
			pattern: [
				{
					type: "expression",
					arg: { type: "variable-reference", name: "username" },
				},
				{
					type: "text",
					value: " has to download the app on her iPhone from the App Store.",
				},
			],
		} satisfies Partial<Variant>)
	);
	expect(imported.variants[2]).toStrictEqual(
		expect.objectContaining({
			matches: [
				{ type: "catchall-match", key: "platform" },
				{ type: "catchall-match", key: "userGender" },
			],
			pattern: [{ type: "text", value: "The person has to download the app." }],
		} satisfies Partial<Variant>)
	);
});

test("variants with a plural function are parsed correctly", async () => {
	const imported = await runImportFiles({
		some_happy_cat: {
			declarations: ["input count", "local countPlural = count: plural"],
			selectors: ["countPlural"],
			match: {
				"countPlural=one": "There is one cat.",
				"countPlural=other": "There are many cats.",
			},
		},
	});
	expect(await runExportFilesParsed(imported)).toMatchObject({
		some_happy_cat: {
			declarations: ["input count", "local countPlural = count: plural"],
			selectors: ["countPlural"],
			match: {
				"countPlural=one": "There is one cat.",
				"countPlural=other": "There are many cats.",
			},
		},
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(2);

	expect(imported.bundles[0]?.id).toStrictEqual("some_happy_cat");
	expect(imported.bundles[0]?.declarations).toStrictEqual(
		expect.arrayContaining([
			{ type: "input-variable", name: "count" },
			{
				type: "local-variable",
				name: "countPlural",
				value: {
					type: "expression",
					arg: {
						name: "count",
						type: "variable-reference",
					},
					annotation: {
						type: "function-reference",
						name: "plural",
						options: [],
					},
				},
			},
		] satisfies Declaration[])
	);

	expect(imported.messages[0]?.selectors).toStrictEqual(
		expect.arrayContaining([
			{ type: "variable-reference", name: "countPlural" },
		] satisfies Message["selectors"])
	);
	expect(imported.messages[0]?.bundleId).toStrictEqual("some_happy_cat");

	expect(imported.variants[0]).toStrictEqual(
		expect.objectContaining({
			matches: [{ type: "literal-match", key: "countPlural", value: "one" }],
			pattern: [{ type: "text", value: "There is one cat." }],
		} satisfies Partial<Variant>)
	);
	expect(imported.variants[1]).toStrictEqual(
		expect.objectContaining({
			matches: [{ type: "literal-match", key: "countPlural", value: "other" }],
			pattern: [{ type: "text", value: "There are many cats." }],
		} satisfies Partial<Variant>)
	);
});

test("roundtrip with new variants that have been created by apps", async () => {
	const imported1 = await runImportFiles({
		some_happy_cat: "Read more about Lix",
	});

	// simulating adding a new bundle, message, and variant
	imported1.bundles.push({
		id: "green_box_atari",
		declarations: [],
	});

	imported1.messages.push({
		id: "0j299j-3si02j0j4=s02-3js2",
		bundleId: "green_box_atari",
		selectors: [],
		locale: "en",
	});

	imported1.variants.push({
		id: "929s",
		matches: [],
		messageId: "0j299j-3si02j0j4=s02-3js2",
		pattern: [{ type: "text", value: "New variant" }],
	});

	// export after adding the bundle, messages, variants
	const exported1 = await runExportFiles(imported1);

	const imported2 = await runImportFiles(
		JSON.parse(new TextDecoder().decode(exported1[0]?.content))
	);

	const exported2 = await runExportFiles(imported2);

	expect(imported2.bundles).toStrictEqual([
		expect.objectContaining({
			id: "some_happy_cat",
		}),
		expect.objectContaining({
			id: "green_box_atari",
		}),
	]);

	expect(exported2).toStrictEqual(exported1);
});

test("handles inputs of a bundle even if one message doesn't use all inputs", async () => {
	const imported = await importFiles({
		settings: {} as any,
		files: [
			{
				locale: "en",
				content: new TextEncoder().encode(
					JSON.stringify({
						blue_horse_shoe: "Hello {username}! Welcome in {placename}.",
					})
				),
			},
			{
				locale: "de",
				content: new TextEncoder().encode(
					JSON.stringify({
						blue_horse_shoe: "Willkommen {username}!.",
					})
				),
			},
		],
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(2);
	expect(imported.variants).lengthOf(2);

	expect(imported.bundles[0]?.declarations).toStrictEqual([
		{ type: "input-variable", name: "username" },
		{ type: "input-variable", name: "placename" },
	]);

	const exported = await runExportFiles(imported);

	expect(
		JSON.parse(new TextDecoder().decode(exported[0]?.content))
	).toMatchObject({
		blue_horse_shoe: "Hello {username}! Welcome in {placename}.",
	});

	expect(
		JSON.parse(new TextDecoder().decode(exported[1]?.content))
	).toMatchObject({
		blue_horse_shoe: "Willkommen {username}!.",
	});
});

test("it handles multiple files for the same locale", async () => {
  const imported = await importFiles({
    settings: {} as any,
    files: [
      {
        locale: "en",
        content: new TextEncoder().encode(
          JSON.stringify({
            some_happy_cat: "Read more about Lix",
            one_happy_dog: "This explains itself",
          })
        ),
      },
      {
        locale: "en",
        content: new TextEncoder().encode(
          JSON.stringify({
            some_happy_cat: "Read more about Lix",
            one_happy_dog: "Read more about Inlang",
          })
        ),
      },
    ],
  });
  expect(await runExportFilesParsed(imported)).toMatchObject({
    some_happy_cat: "Read more about Lix",
    one_happy_dog: "Read more about Inlang",
  });

  expect(imported.bundles).lengthOf(2);
  expect(imported.messages).lengthOf(4);
  expect(imported.variants).lengthOf(4);

  expect(imported.bundles[0]?.id).toStrictEqual("some_happy_cat");
  expect(imported.bundles[0]?.declarations).toStrictEqual([]);
  expect(imported.bundles[1]?.id).toStrictEqual("one_happy_dog");
  expect(imported.bundles[1]?.declarations).toStrictEqual([]);

  expect(imported.messages[0]?.selectors).toStrictEqual([]);
  expect(imported.messages[1]?.selectors).toStrictEqual([]);
  expect(imported.messages[2]?.selectors).toStrictEqual([]);
  expect(imported.messages[3]?.selectors).toStrictEqual([]);

  expect(imported.variants[0]?.matches).toStrictEqual([]);
  expect(imported.variants[0]?.pattern).toStrictEqual([
    { type: "text", value: "Read more about Lix" },
  ]);
  expect(imported.variants[1]?.matches).toStrictEqual([]);
  expect(imported.variants[1]?.pattern).toStrictEqual([
    { type: "text", value: "This explains itself" },
  ]);
  expect(imported.variants[2]?.matches).toStrictEqual([]);
  expect(imported.variants[2]?.pattern).toStrictEqual([
    { type: "text", value: "Read more about Lix" },
  ]);
  expect(imported.variants[3]?.matches).toStrictEqual([]);
  expect(imported.variants[3]?.pattern).toStrictEqual([
    { type: "text", value: "Read more about Inlang" },
  ]);
});

// convenience wrapper for less testing code
function runImportFiles(json: Record<string, any>) {
  return importFiles({
    settings: {} as any,
    files: [
      {
        locale: "en",
        content: new TextEncoder().encode(JSON.stringify(json)),
      },
    ],
  });
}

// convenience wrapper for less testing code
async function runExportFiles(
  imported: Awaited<ReturnType<typeof importFiles>>
) {
  // add ids which are undefined from the import
  for (const message of imported.messages) {
    if (message.id === undefined) {
      message.id =
        imported.messages.find(
          (m) => m.bundleId === message.bundleId && m.locale === message.locale
        )?.id ?? `${Math.random() * 1000}`;
    }
  }
  for (const variant of imported.variants) {
    if (variant.id === undefined) {
      // @ts-expect-error - variant is an VariantImport
      variant.id = `${Math.random() * 1000}`;
    }
    if (variant.messageId === undefined) {
      // @ts-expect-error - variant is an VariantImport
      variant.messageId = imported.messages.find(
        (m: any) =>
          m.bundleId === variant.messageBundleId &&
          m.locale === variant.messageLocale
      )?.id;
    }
  }

  const exported = await exportFiles({
    settings: {} as any,
    bundles: imported.bundles as Bundle[],
    messages: imported.messages as Message[],
    variants: imported.variants as Variant[],
  });
  return exported;
}

// convenience wrapper for less testing code
async function runExportFilesParsed(imported: any) {
  const exported = await runExportFiles(imported);
  return JSON.parse(new TextDecoder().decode(exported[0]?.content));
}
