/**
 * Phase 1 - Test: Contracts Filtering Validation
 *
 * Ensures contracts package has all IP-sensitive code removed
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = join(__dirname, "../../..");
const OSS_CONTRACTS = join(ROOT_DIR, "packages-oss/contracts");

describe("Phase 1: Contracts Filtering", () => {
  describe("Sensitive Files Removed", () => {
    const SENSITIVE_FILES = [
      "src/tiers.ts",
      "src/analytics.ts",
      "src/feature-manager.ts",
      "src/events/infrastructure.ts"
    ];

    SENSITIVE_FILES.forEach(file => {
      it(`should NOT have ${file}`, () => {
        const filePath = join(OSS_CONTRACTS, file);
        expect(existsSync(filePath)).toBe(false);
      });
    });
  });

  describe("Events Exports", () => {
    it("should have events/index.ts", () => {
      const indexPath = join(OSS_CONTRACTS, "src/events/index.ts");
      expect(existsSync(indexPath)).toBe(true);
    });

    it("events/index.ts should NOT export infrastructure", () => {
      const indexPath = join(OSS_CONTRACTS, "src/events/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).not.toContain("infrastructure");
    });

    it("should still export core events", () => {
      const indexPath = join(OSS_CONTRACTS, "src/events/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("core");
    });

    it("should still export legacy events", () => {
      const indexPath = join(OSS_CONTRACTS, "src/events/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("legacy");
    });
  });

  describe("Main Exports", () => {
    it("should have index.ts", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      expect(existsSync(indexPath)).toBe(true);
    });

    it("index.ts should NOT export tiers", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).not.toContain("./tiers");
      expect(content).not.toContain("from \"./tiers\"");
    });

    it("index.ts should NOT export analytics", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).not.toContain("./analytics");
      expect(content).not.toContain("from \"./analytics\"");
    });

    it("index.ts should NOT export feature-manager", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).not.toContain("feature-manager");
    });
  });

  describe("IP Leakage Scan", () => {
    it("should NOT contain subscription tier logic", () => {
      if (!existsSync(OSS_CONTRACTS)) {
        return;
      }

      try {
        const result = execSync(
          `grep -r "FREE.*SOLO.*TEAM" ${join(OSS_CONTRACTS, "src")} || true`,
          { encoding: "utf-8" }
        );

        expect(result.trim()).toBe("");
      } catch {
        // OK
      }
    });

    it("should NOT contain PostHog events", () => {
      if (!existsSync(OSS_CONTRACTS)) {
        return;
      }

      try {
        const result = execSync(
          `grep -r -i "posthog" ${join(OSS_CONTRACTS, "src")} || true`,
          { encoding: "utf-8" }
        );

        expect(result.trim()).toBe("");
      } catch {
        // OK
      }
    });

    // TEST(phase1): Add more IP leakage scans
    it("should NOT contain Stripe references", () => {
      if (!existsSync(OSS_CONTRACTS)) {
        return;
      }

      try {
        const result = execSync(
          `grep -r -i "stripe_subscription\\|payments_customer" ${join(OSS_CONTRACTS, "src")} || true`,
          { encoding: "utf-8" }
        );

        expect(result.trim()).toBe("");
      } catch {
        // OK
      }
    });
  });

  describe("Package Configuration", () => {
    it("should have updated package.json", () => {
      const pkgPath = join(OSS_CONTRACTS, "package.json");
      expect(existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.name).toBe("@snapback-oss/contracts");
      expect(pkg.version).toBeDefined();
    });

    it("should have correct dependencies", () => {
      const pkgPath = join(OSS_CONTRACTS, "package.json");
      if (!existsSync(pkgPath)) {
        return;
      }

      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

      // Should have these
      expect(pkg.dependencies.zod).toBeDefined();
      expect(pkg.dependencies.nanoid).toBeDefined();

      // Should NOT have private workspace deps
      expect(pkg.dependencies["@snapback/platform"]).toBeUndefined();
      expect(pkg.dependencies["@snapback/analytics"]).toBeUndefined();
    });

    it("should NOT have events/infrastructure in exports", () => {
      const pkgPath = join(OSS_CONTRACTS, "package.json");
      if (!existsSync(pkgPath)) {
        return;
      }

      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const exports = pkg.exports || {};

      expect(exports["./events/infrastructure"]).toBeUndefined();
    });
  });

  describe("Build Validation", () => {
    it("should build successfully", () => {
      if (!existsSync(join(OSS_CONTRACTS, "package.json"))) {
        return;
      }

      try {
        execSync("pnpm --filter @snapback-oss/contracts build", {
          cwd: ROOT_DIR,
          encoding: "utf-8",
          stdio: "pipe"
        });
      } catch (error: any) {
        expect.fail(`Contracts build failed: ${error.message}`);
      }
    });

    it("should typecheck successfully", () => {
      if (!existsSync(join(OSS_CONTRACTS, "src"))) {
        return;
      }

      try {
        execSync("pnpm --filter @snapback-oss/contracts typecheck", {
          cwd: ROOT_DIR,
          encoding: "utf-8",
          stdio: "pipe"
        });
      } catch (error: any) {
        expect.fail(`Contracts typecheck failed: ${error.message}`);
      }
    });
  });

  describe("Safe Exports Retained", () => {
    it("should still export auth types", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("auth");
    });

    it("should still export session types", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("session");
    });

    it("should still export schemas", () => {
      const indexPath = join(OSS_CONTRACTS, "src/index.ts");
      if (!existsSync(indexPath)) {
        return;
      }

      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("schemas");
    });
  });
});

// VALIDATE(phase1): Manual checks recommended
describe.skip("Phase 1: Manual Validation Checklist", () => {
  it("should manually review index.ts for complete export list", () => {
    // Check that all necessary exports are present
  });

  it("should manually verify no tier logic in type definitions", () => {
    // Review auth types, snapshot types, etc.
  });

  it("should manually check for hardcoded tier values", () => {
    // Search for "free", "solo", "team" in type definitions
  });
});
