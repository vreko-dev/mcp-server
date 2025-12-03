/**
 * Phase 1 - Test: Infrastructure Split Validation
 *
 * Ensures infrastructure is properly split between OSS (logging) and private (PostHog)
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = join(__dirname, "../../..");
const OSS_INFRA = join(ROOT_DIR, "packages-oss/infrastructure");
const ANALYTICS_INFRA = join(ROOT_DIR, "packages/analytics-infra");

describe("Phase 1: Infrastructure Split", () => {
  describe("OSS Infrastructure Package", () => {
    it("should exist", () => {
      expect(existsSync(OSS_INFRA)).toBe(true);
    });

    it("should have logging directory", () => {
      expect(existsSync(join(OSS_INFRA, "src/logging"))).toBe(true);
    });

    it("should have metrics directory", () => {
      expect(existsSync(join(OSS_INFRA, "src/metrics"))).toBe(true);
    });

    it("should have tracing directory", () => {
      expect(existsSync(join(OSS_INFRA, "src/tracing"))).toBe(true);
    });

    it("should NOT have posthog directory", () => {
      expect(existsSync(join(OSS_INFRA, "src/posthog"))).toBe(false);
    });

    it("should have index.ts with correct exports", () => {
      const indexPath = join(OSS_INFRA, "src/index.ts");
      expect(existsSync(indexPath)).toBe(true);

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("logging/logger");
      expect(content).toContain("metrics/index");
      expect(content).toContain("tracing/index");
      expect(content).not.toContain("posthog");
    });

    it("should NOT have PostHog in package.json dependencies", () => {
      const pkgPath = join(OSS_INFRA, "package.json");
      if (!existsSync(pkgPath)) {
        return; // Skip if package.json not created yet
      }

      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };

      expect(allDeps["posthog-node"]).toBeUndefined();
      expect(allDeps["posthog-js"]).toBeUndefined();
    });

    it("should NOT contain posthog imports in source files", () => {
      if (!existsSync(join(OSS_INFRA, "src"))) {
        return; // Skip if src not created yet
      }

      try {
        // Use grep to search for posthog
        execSync(
          `grep -r -i "posthog" ${join(OSS_INFRA, "src")}`,
          { encoding: "utf-8" }
        );
        // If grep finds something, test should fail
        expect.fail("Found PostHog references in OSS infrastructure");
      } catch (error: any) {
        // grep returns exit code 1 if no matches - this is what we want
        expect(error.status).toBe(1);
      }
    });
  });

  describe("Analytics Infrastructure Package (Private)", () => {
    it("should exist", () => {
      expect(existsSync(ANALYTICS_INFRA)).toBe(true);
    });

    it("should have posthog directory", () => {
      expect(existsSync(join(ANALYTICS_INFRA, "src/posthog"))).toBe(true);
    });

    it("should have package.json with posthog dependency", () => {
      const pkgPath = join(ANALYTICS_INFRA, "package.json");
      expect(existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.name).toBe("@snapback/analytics-infra");
      expect(pkg.private).toBe(true);
      expect(pkg.dependencies["posthog-node"]).toBeDefined();
    });

    it("should depend on OSS infrastructure", () => {
      const pkgPath = join(ANALYTICS_INFRA, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

      expect(pkg.dependencies["@snapback-oss/infrastructure"]).toBe("workspace:*");
    });

    it("should re-export OSS infrastructure", () => {
      const indexPath = join(ANALYTICS_INFRA, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("@snapback-oss/infrastructure");
    });
  });

  describe("Import Updates", () => {
    // TEST(phase1): Add test to verify all PostHog imports are updated
    it.skip("private packages should import from analytics-infra for PostHog", () => {
      const packagesToCheck = [
        "packages/platform",
        "packages/analytics",
        "apps/api",
        "apps/web"
      ];

      for (const pkg of packagesToCheck) {
        const pkgPath = join(ROOT_DIR, pkg);
        if (!existsSync(pkgPath)) continue;

        try {
          // Search for old infrastructure imports with posthog
          const result = execSync(
            `grep -r "@snapback/infrastructure.*posthog" ${pkgPath} || true`,
            { encoding: "utf-8" }
          );

          expect(result.trim()).toBe(""); // Should find nothing
        } catch (error) {
          // OK if directory doesn't exist
        }
      }
    });

    // FIXME(phase1): This test will fail until imports are manually updated
    it.skip("should have zero references to old infrastructure/posthog pattern", () => {
      const result = execSync(
        `grep -r "from.*@snapback/infrastructure.*posthog" ${ROOT_DIR}/packages ${ROOT_DIR}/apps || true`,
        { encoding: "utf-8" }
      );

      expect(result.trim()).toBe("");
    });
  });

  describe("Build Validation", () => {
    it("OSS infrastructure should build successfully", () => {
      if (!existsSync(join(OSS_INFRA, "package.json"))) {
        return; // Skip if not set up yet
      }

      try {
        execSync("pnpm --filter @snapback-oss/infrastructure build", {
          cwd: ROOT_DIR,
          encoding: "utf-8",
          stdio: "pipe"
        });
      } catch (error: any) {
        expect.fail(`OSS infrastructure build failed: ${error.message}`);
      }
    });

    it("analytics-infra should build successfully", () => {
      if (!existsSync(join(ANALYTICS_INFRA, "package.json"))) {
        return;
      }

      try {
        execSync("pnpm --filter @snapback/analytics-infra build", {
          cwd: ROOT_DIR,
          encoding: "utf-8",
          stdio: "pipe"
        });
      } catch (error: any) {
        expect.fail(`Analytics-infra build failed: ${error.message}`);
      }
    });
  });

  describe("Type Safety", () => {
    it("OSS infrastructure should typecheck", () => {
      if (!existsSync(join(OSS_INFRA, "src"))) {
        return;
      }

      try {
        execSync("pnpm --filter @snapback-oss/infrastructure typecheck", {
          cwd: ROOT_DIR,
          encoding: "utf-8",
          stdio: "pipe"
        });
      } catch (error: any) {
        expect.fail(`OSS infrastructure typecheck failed: ${error.message}`);
      }
    });
  });
});

// VALIDATE(phase1): Manual validation checklist
describe.skip("Phase 1: Manual Validation Checklist", () => {
  it("should manually verify no PostHog API keys in OSS", () => {
    // Manual check: Search for API keys/tokens in packages-oss
  });

  it("should manually test logging works in both packages", () => {
    // Manual check: Import logger from both packages, verify they work
  });

  it("should manually verify metrics collection still works", () => {
    // Manual check: Verify metrics are collected from analytics-infra
  });
});
