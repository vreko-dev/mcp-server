/**
 * Tests for PathNormalizer
 *
 * This test suite validates platform-agnostic path normalization utilities,
 * ensuring consistent path handling across Windows and Unix-like systems.
 */

import { describe, expect, it } from "vitest";
import { areEqual, getDepth, isWithin, normalize } from "../../src/utils/PathNormalizer";

describe("PathNormalizer", () => {
	describe("normalize", () => {
		it("should convert backslashes to forward slashes", () => {
			expect(normalize("C:\\Users\\test\\project")).toBe("C:/Users/test/project");
			expect(normalize("C:\\Users\\test\\")).toBe("C:/Users/test");
		});

		it("should remove trailing slashes", () => {
			expect(normalize("/home/user/project/")).toBe("/home/user/project");
			expect(normalize("/home/user/project//")).toBe("/home/user/project");
			expect(normalize("C:/Users/test/")).toBe("C:/Users/test");
		});

		it("should preserve Unix root slash", () => {
			expect(normalize("/")).toBe("/");
		});

		it("should handle already normalized paths", () => {
			expect(normalize("/home/user/project")).toBe("/home/user/project");
			expect(normalize("C:/Users/test")).toBe("C:/Users/test");
		});

		it("should handle mixed slashes", () => {
			expect(normalize("C:/Users\\test/project\\src")).toBe("C:/Users/test/project/src");
		});

		it("should handle empty path segments", () => {
			expect(normalize("/home//user///project")).toBe("/home/user/project");
		});

		it("should handle relative paths", () => {
			expect(normalize("./src/utils")).toBe("./src/utils");
			expect(normalize("../parent/folder")).toBe("../parent/folder");
		});
	});

	describe("isWithin", () => {
		describe("Unix paths", () => {
			it("should return true when child is within parent", () => {
				expect(isWithin("/home/user/project/src/index.ts", "/home/user/project")).toBe(true);
				expect(isWithin("/home/user/project/src/utils/helper.ts", "/home/user/project")).toBe(true);
			});

			it("should return false when child is not within parent", () => {
				expect(isWithin("/external/file.ts", "/home/user/project")).toBe(false);
				expect(isWithin("/home/other/project/file.ts", "/home/user/project")).toBe(false);
			});

			it("should return true when paths are equal", () => {
				expect(isWithin("/home/user/project", "/home/user/project")).toBe(true);
			});

			it("should handle trailing slashes", () => {
				expect(isWithin("/home/user/project/src/index.ts", "/home/user/project/")).toBe(true);
				expect(isWithin("/home/user/project/src/", "/home/user/project")).toBe(true);
			});

			it("should not match partial directory names", () => {
				// /home/user/project123 should NOT be within /home/user/project
				expect(isWithin("/home/user/project123/file.ts", "/home/user/project")).toBe(false);
			});
		});

		describe("Windows paths", () => {
			it("should return true when child is within parent", () => {
				expect(isWithin("C:\\Users\\test\\file.ts", "C:\\Users\\test")).toBe(true);
				expect(isWithin("C:/Users/test/project/src/file.ts", "C:/Users/test/project")).toBe(true);
			});

			it("should return false when child is not within parent", () => {
				expect(isWithin("D:\\Projects\\file.ts", "C:\\Users\\test")).toBe(false);
			});

			it("should handle mixed slashes", () => {
				expect(isWithin("C:\\Users\\test\\file.ts", "C:/Users/test")).toBe(true);
				expect(isWithin("C:/Users/test/file.ts", "C:\\Users\\test")).toBe(true);
			});
		});
	});

	describe("getDepth", () => {
		describe("Unix paths", () => {
			it("should return 1 for root", () => {
				expect(getDepth("/")).toBe(1);
			});

			it("should calculate correct depth for Unix paths", () => {
				expect(getDepth("/home")).toBe(2);
				expect(getDepth("/home/user")).toBe(3);
				expect(getDepth("/home/user/project")).toBe(4);
				expect(getDepth("/home/user/project/src/utils")).toBe(6);
			});

			it("should handle trailing slashes", () => {
				expect(getDepth("/home/user/")).toBe(3);
				expect(getDepth("/home/user//")).toBe(3);
			});
		});

		describe("Windows paths", () => {
			it("should calculate correct depth for Windows paths", () => {
				expect(getDepth("C:")).toBe(1);
				expect(getDepth("C:\\")).toBe(1);
				expect(getDepth("C:\\Users")).toBe(2);
				expect(getDepth("C:\\Users\\test")).toBe(3);
				expect(getDepth("C:\\Users\\test\\project\\src")).toBe(5);
			});

			it("should handle forward slashes on Windows", () => {
				expect(getDepth("C:/Users/test/project")).toBe(4);
			});

			it("should handle mixed slashes", () => {
				expect(getDepth("C:\\Users/test\\project")).toBe(4);
			});
		});

		describe("Relative paths", () => {
			it("should calculate depth for relative paths", () => {
				expect(getDepth("./src")).toBe(2);
				expect(getDepth("../parent")).toBe(2);
				expect(getDepth("src/utils")).toBe(2);
			});
		});
	});

	describe("areEqual", () => {
		describe("Unix paths", () => {
			it("should be case-sensitive on Unix", () => {
				expect(areEqual("/home/User/project", "/home/user/project")).toBe(false);
				expect(areEqual("/home/user/Project", "/home/user/project")).toBe(false);
			});

			it("should return true for equal Unix paths", () => {
				expect(areEqual("/home/user/project", "/home/user/project")).toBe(true);
			});

			it("should handle trailing slashes", () => {
				expect(areEqual("/home/user/project", "/home/user/project/")).toBe(true);
				expect(areEqual("/home/user/project/", "/home/user/project")).toBe(true);
			});
		});

		describe("Windows paths", () => {
			it("should be case-insensitive on Windows", () => {
				expect(areEqual("C:\\Users\\Test", "C:\\Users\\test")).toBe(true);
				expect(areEqual("c:\\users\\test", "C:\\USERS\\TEST")).toBe(true);
			});

			it("should handle mixed slashes", () => {
				expect(areEqual("C:\\Users\\test", "C:/Users/test")).toBe(true);
				expect(areEqual("C:/Users/Test", "C:\\users\\TEST")).toBe(true);
			});

			it("should return false for different Windows paths", () => {
				expect(areEqual("C:\\Users\\test", "D:\\Users\\test")).toBe(false);
				expect(areEqual("C:\\Users\\test", "C:\\Users\\other")).toBe(false);
			});
		});

		describe("Mixed path types", () => {
			it("should handle comparison between Windows and Unix paths", () => {
				// Windows path vs Unix path should not be equal
				expect(areEqual("C:\\Users\\test", "/home/user")).toBe(false);
			});
		});
	});
});
