import { describe, expect, it } from "vitest";
import transformBundleId from "./transformBundleId.js";

describe("transformBundleId function", () => {
	it("should trim the message id", () => {
		expect(transformBundleId(" hello-world ")).toEqual("helloworld");
	});

	it("should remove special characters", () => {
		expect(transformBundleId("hello-^%#@$world")).toEqual("helloworld");
		expect(transformBundleId("hello_world!")).toEqual("hello_world");
		expect(transformBundleId("hello-^%#@$world!@#$%^&*()")).toEqual(
			"helloworld"
		);
	});

	it("should replace multiple spaces with underscores", () => {
		expect(transformBundleId("hello world")).toEqual("hello_world");
		expect(transformBundleId("hello  world   message")).toEqual(
			"hello_world_message"
		);
	});

	it("should replace multiple dots with underscores", () => {
		expect(transformBundleId("hello.world")).toEqual("hello_world");
		expect(transformBundleId("hello..world")).toEqual("hello_world");
		expect(transformBundleId("hello.world.message")).toEqual(
			"hello_world_message"
		);
	});

	it("should preserve text case", () => {
		expect(transformBundleId("helloWorld")).toEqual("helloWorld");
		expect(transformBundleId("HelloWorld")).toEqual("HelloWorld");
		expect(transformBundleId("HELLO_WORLD")).toEqual("HELLO_WORLD");
	});

	it("should prepend an underscore if the transformed ID starts with a number", () => {
		expect(transformBundleId("1 helloWorld")).toEqual("_1_helloWorld");
		expect(transformBundleId("1HelloWorld")).toEqual("_1HelloWorld");
		expect(transformBundleId("12345.5 HELLO_WORLD")).toEqual(
			"_12345_5_HELLO_WORLD"
		);
	});
});
