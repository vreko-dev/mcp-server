import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils"; // Import dependent utility

describe("Sanity Check", () => {
  it("should pass", () => {
    expect(true).toBe(true);
    expect(cn("a", "b")).toBe("a b");
  });
});
