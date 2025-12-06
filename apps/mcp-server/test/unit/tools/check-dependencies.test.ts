import { describe, it, expect } from "vitest";
import { checkDependencies } from "../../../src/utils/dependency-checker";
import type {
  DependencyCheckInput,
  DependencyCheckResult,
  DependencyChange,
  VulnerabilityInfo,
} from "../../../src/utils/dependency-checker";

/**
 * check-dependencies Tool Tests
 *
 * Test ID Prefix: MCP-DEPS-001-XXX
 *
 * Tests the dependency scanning tool that analyzes package.json changes:
 * - Parse package.json correctly
 * - Identify new dependencies
 * - Identify removed dependencies
 * - Flag known vulnerable packages
 * - Warn on major version changes
 * - Handle malformed package.json
 *
 * Following test_coverage.md specification.
 */

describe("checkDependencies Tool", () => {
  describe("Package.json Parsing", () => {
    // Test ID: MCP-DEPS-001-001
    it("should parse package.json correctly", async () => {
      // GIVEN: Valid package.json
      const input: DependencyCheckInput = {
        packageJsonAfter: JSON.stringify({
          name: "test-package",
          version: "1.0.0",
          dependencies: {
            "express": "^4.18.0",
            "lodash": "^4.17.21",
          },
          devDependencies: {
            "vitest": "^1.0.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should parse successfully
      expect(result).toBeDefined();
      expect(Array.isArray(result.added)).toBe(true);
      expect(Array.isArray(result.removed)).toBe(true);
      expect(Array.isArray(result.updated)).toBe(true);
      expect(Array.isArray(result.vulnerabilities)).toBe(true);
    });

    // Test ID: MCP-DEPS-001-002
    it("should handle malformed package.json gracefully", async () => {
      // GIVEN: Malformed JSON
      const input: DependencyCheckInput = {
        packageJsonAfter: "{ invalid json syntax }",
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should return error in warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toMatch(/parse|invalid|malformed/i);
    });

    // Test ID: MCP-DEPS-001-003
    it("should handle missing dependencies field", async () => {
      // GIVEN: package.json without dependencies
      const input: DependencyCheckInput = {
        packageJsonAfter: JSON.stringify({
          name: "minimal-package",
          version: "1.0.0",
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should handle gracefully
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.vulnerabilities).toHaveLength(0);
    });
  });

  describe("Dependency Change Detection", () => {
    // Test ID: MCP-DEPS-001-004
    it("should identify new dependencies", async () => {
      // GIVEN: New dependency added
      const input: DependencyCheckInput = {
        packageJsonBefore: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
          },
        }),
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
            "axios": "^1.6.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should detect new dependency
      expect(result.added.length).toBeGreaterThan(0);
      const axiosDep = result.added.find(d => d.name === "axios");
      expect(axiosDep).toBeDefined();
      expect(axiosDep?.versionAfter).toBe("^1.6.0");
      expect(axiosDep?.type).toBe("dependencies");
    });

    // Test ID: MCP-DEPS-001-005
    it("should identify removed dependencies", async () => {
      // GIVEN: Dependency removed
      const input: DependencyCheckInput = {
        packageJsonBefore: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
            "lodash": "^4.17.21",
          },
        }),
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should detect removed dependency
      expect(result.removed.length).toBeGreaterThan(0);
      const lodashDep = result.removed.find(d => d.name === "lodash");
      expect(lodashDep).toBeDefined();
      expect(lodashDep?.versionBefore).toBe("^4.17.21");
    });

    // Test ID: MCP-DEPS-001-006
    it("should detect version updates", async () => {
      // GIVEN: Version changed
      const input: DependencyCheckInput = {
        packageJsonBefore: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
          },
        }),
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.19.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should detect update
      expect(result.updated.length).toBeGreaterThan(0);
      const expressDep = result.updated.find(d => d.name === "express");
      expect(expressDep).toBeDefined();
      expect(expressDep?.versionBefore).toBe("^4.18.0");
      expect(expressDep?.versionAfter).toBe("^4.19.0");
    });
  });

  describe("Vulnerability Detection", () => {
    // Test ID: MCP-DEPS-001-007
    it("should flag known vulnerable packages", async () => {
      // GIVEN: Package with known vulnerability (lodash < 4.17.21)
      const input: DependencyCheckInput = {
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "lodash": "^4.17.19",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should flag vulnerability
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      const lodashVuln = result.vulnerabilities.find(v => v.package === "lodash");
      expect(lodashVuln).toBeDefined();
      expect(lodashVuln?.severity).toMatch(/critical|high|medium/i);
      expect(lodashVuln?.recommendation).toBeDefined();
    });

    // Test ID: MCP-DEPS-001-008
    it("should not flag secure versions", async () => {
      // GIVEN: Secure package versions
      const input: DependencyCheckInput = {
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.19.0",
            "axios": "^1.6.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should have no vulnerabilities
      expect(result.vulnerabilities).toHaveLength(0);
    });
  });

  describe("Major Version Change Detection", () => {
    // Test ID: MCP-DEPS-001-009
    it("should warn on major version changes", async () => {
      // GIVEN: Major version bump
      const input: DependencyCheckInput = {
        packageJsonBefore: JSON.stringify({
          dependencies: {
            "react": "^17.0.0",
          },
        }),
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "react": "^18.0.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should warn about major version change
      expect(result.warnings.length).toBeGreaterThan(0);
      const majorVersionWarning = result.warnings.find(w =>
        w.toLowerCase().includes("major") && w.toLowerCase().includes("react")
      );
      expect(majorVersionWarning).toBeDefined();
    });

    // Test ID: MCP-DEPS-001-010
    it("should not warn on minor/patch version changes", async () => {
      // GIVEN: Minor version bump
      const input: DependencyCheckInput = {
        packageJsonBefore: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
          },
        }),
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.19.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should not warn about minor changes
      const majorVersionWarning = result.warnings.find(w => w.toLowerCase().includes("major"));
      expect(majorVersionWarning).toBeUndefined();
    });
  });

  describe("DevDependencies vs Dependencies", () => {
    // Test ID: MCP-DEPS-001-011
    it("should differentiate between dependency types", async () => {
      // GIVEN: Mixed dependency types
      const input: DependencyCheckInput = {
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
          },
          devDependencies: {
            "vitest": "^1.0.0",
          },
          peerDependencies: {
            "react": "^18.0.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should track dependency types correctly
      const allDeps = [...result.added, ...result.updated];

      const expressDep = allDeps.find(d => d.name === "express");
      expect(expressDep?.type).toBe("dependencies");

      const vitestDep = allDeps.find(d => d.name === "vitest");
      expect(vitestDep?.type).toBe("devDependencies");

      const reactDep = allDeps.find(d => d.name === "react");
      expect(reactDep?.type).toBe("peerDependencies");
    });
  });

  describe("Edge Cases", () => {
    // Test ID: MCP-DEPS-001-012
    it("should handle empty package.json", async () => {
      // GIVEN: Empty JSON object
      const input: DependencyCheckInput = {
        packageJsonAfter: "{}",
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should handle gracefully
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    // Test ID: MCP-DEPS-001-013
    it("should handle transition from no deps to deps", async () => {
      // GIVEN: No before state
      const input: DependencyCheckInput = {
        packageJsonAfter: JSON.stringify({
          dependencies: {
            "express": "^4.18.0",
          },
        }),
      };

      // WHEN: Checking dependencies
      const result = await checkDependencies(input);

      // THEN: Should treat all as new
      expect(result.added.length).toBeGreaterThan(0);
      expect(result.removed).toHaveLength(0);
    });
  });
});
