import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/eventBus";

describe("EventBus", () => {
	type TestEvents = {
		"test:event": { value: string };
		"test:number": { count: number };
	};

	it("should register and emit events", () => {
		const bus = new EventBus<TestEvents>();
		const handler = vi.fn();

		bus.on("test:event", handler);
		bus.emit("test:event", { value: "hello" });

		expect(handler).toHaveBeenCalledWith({ value: "hello" });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should handle multiple handlers for the same event", () => {
		const bus = new EventBus<TestEvents>();
		const handler1 = vi.fn();
		const handler2 = vi.fn();

		bus.on("test:event", handler1);
		bus.on("test:event", handler2);
		bus.emit("test:event", { value: "world" });

		expect(handler1).toHaveBeenCalledWith({ value: "world" });
		expect(handler2).toHaveBeenCalledWith({ value: "world" });
		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
	});

	it("should handle different event types", () => {
		const bus = new EventBus<TestEvents>();
		const stringHandler = vi.fn();
		const numberHandler = vi.fn();

		bus.on("test:event", stringHandler);
		bus.on("test:number", numberHandler);

		bus.emit("test:event", { value: "test" });
		bus.emit("test:number", { count: 42 });

		expect(stringHandler).toHaveBeenCalledWith({ value: "test" });
		expect(numberHandler).toHaveBeenCalledWith({ count: 42 });
		expect(stringHandler).toHaveBeenCalledTimes(1);
		expect(numberHandler).toHaveBeenCalledTimes(1);
	});

	it("should allow unsubscribing from events", () => {
		const bus = new EventBus<TestEvents>();
		const handler = vi.fn();

		const unsubscribe = bus.on("test:event", handler);
		bus.emit("test:event", { value: "before" });

		unsubscribe();
		bus.emit("test:event", { value: "after" });

		expect(handler).toHaveBeenCalledWith({ value: "before" });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should not fail when emitting to events with no handlers", () => {
		const bus = new EventBus<TestEvents>();

		expect(() => {
			bus.emit("test:event", { value: "no handlers" });
		}).not.toThrow();
	});
});
