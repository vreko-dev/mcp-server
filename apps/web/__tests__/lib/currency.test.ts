import { describe, expect, it } from "vitest";
import { formatCurrency } from "../../modules/shared/lib/currency.js";

describe("formatCurrency", () => {
	it("should format currency correctly", () => {
		const result = formatCurrency(1000);
		expect(result).toBe("$1,000.00");
	});
});
