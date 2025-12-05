/**
 * Dependency Checker Utility
 *
 * Analyzes package.json changes for dependency vulnerabilities and breaking changes.
 * Used by MCP Server check-dependencies tool.
 *
 * @module dependency-checker
 *
 * Features:
 * - Detects added, removed, and updated dependencies
 * - Flags known vulnerable packages
 * - Warns on major version changes (breaking changes)
 * - Supports dependencies, devDependencies, and peerDependencies
 *
 * @example
 * ```typescript
 * const result = await checkDependencies({
 *   packageJsonBefore: oldPackageJson,
 *   packageJsonAfter: newPackageJson
 * });
 *
 * if (result.vulnerabilities.length > 0) {
 *   console.error("Vulnerabilities detected!", result.vulnerabilities);
 * }
 * ```
 */

export interface DependencyCheckInput {
  packageJsonBefore?: string;
  packageJsonAfter: string;
}

export interface DependencyCheckResult {
  added: DependencyChange[];
  removed: DependencyChange[];
  updated: DependencyChange[];
  vulnerabilities: VulnerabilityInfo[];
  warnings: string[];
}

export interface DependencyChange {
  name: string;
  versionBefore?: string;
  versionAfter?: string;
  type: "dependencies" | "devDependencies" | "peerDependencies";
}

export interface VulnerabilityInfo {
  package: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Known vulnerable packages (subset for demo)
 * In production, this would query a vulnerability database
 */
const KNOWN_VULNERABILITIES: Record<string, {
  affectedVersions: string;
  severity: VulnerabilityInfo["severity"];
  description: string;
  recommendation: string;
}> = {
  "lodash": {
    affectedVersions: "<4.17.21",
    severity: "high",
    description: "Prototype pollution vulnerability in lodash",
    recommendation: "Upgrade to lodash@4.17.21 or higher",
  },
  "minimist": {
    affectedVersions: "<1.2.6",
    severity: "medium",
    description: "Prototype pollution in minimist",
    recommendation: "Upgrade to minimist@1.2.6 or higher",
  },
  "node-fetch": {
    affectedVersions: "<2.6.7",
    severity: "high",
    description: "Information disclosure vulnerability",
    recommendation: "Upgrade to node-fetch@2.6.7 or higher",
  },
};

/**
 * Check dependencies for changes and vulnerabilities
 */
export async function checkDependencies(
  input: DependencyCheckInput
): Promise<DependencyCheckResult> {
  const result: DependencyCheckResult = {
    added: [],
    removed: [],
    updated: [],
    vulnerabilities: [],
    warnings: [],
  };

  // Parse package.json files
  let packageBefore: PackageJson = {};
  let packageAfter: PackageJson;

  try {
    packageAfter = JSON.parse(input.packageJsonAfter);
  } catch (error) {
    result.warnings.push("Failed to parse package.json: Invalid JSON format");
    return result;
  }

  if (input.packageJsonBefore) {
    try {
      packageBefore = JSON.parse(input.packageJsonBefore);
    } catch (error) {
      result.warnings.push("Failed to parse previous package.json");
    }
  }

  // Analyze each dependency type
  const depTypes: Array<keyof PackageJson> = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];

  for (const depType of depTypes) {
    const before = packageBefore[depType] || {};
    const after = packageAfter[depType] || {};

    // Detect changes
    const changes = compareDependencies(before, after, depType);
    result.added.push(...changes.added);
    result.removed.push(...changes.removed);
    result.updated.push(...changes.updated);

    // Check for vulnerabilities in current dependencies
    const vulns = checkVulnerabilities(after);
    result.vulnerabilities.push(...vulns);

    // Check for major version changes
    const majorWarnings = detectMajorVersionChanges(changes.updated);
    result.warnings.push(...majorWarnings);
  }

  return result;
}

/**
 * Compare before/after dependencies
 */
function compareDependencies(
  before: Record<string, string>,
  after: Record<string, string>,
  type: DependencyChange["type"]
): {
  added: DependencyChange[];
  removed: DependencyChange[];
  updated: DependencyChange[];
} {
  const added: DependencyChange[] = [];
  const removed: DependencyChange[] = [];
  const updated: DependencyChange[] = [];

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));

  // Detect additions
  for (const name of afterKeys) {
    if (!beforeKeys.has(name)) {
      added.push({
        name,
        versionAfter: after[name],
        type,
      });
    }
  }

  // Detect removals
  for (const name of beforeKeys) {
    if (!afterKeys.has(name)) {
      removed.push({
        name,
        versionBefore: before[name],
        type,
      });
    }
  }

  // Detect updates
  for (const name of afterKeys) {
    if (beforeKeys.has(name) && before[name] !== after[name]) {
      updated.push({
        name,
        versionBefore: before[name],
        versionAfter: after[name],
        type,
      });
    }
  }

  return { added, removed, updated };
}

/**
 * Check for known vulnerabilities
 */
function checkVulnerabilities(
  dependencies: Record<string, string>
): VulnerabilityInfo[] {
  const vulnerabilities: VulnerabilityInfo[] = [];

  for (const [pkgName, version] of Object.entries(dependencies)) {
    const vuln = KNOWN_VULNERABILITIES[pkgName];
    if (!vuln) continue;

    // Simple version check (in production, use semver library)
    if (isVulnerableVersion(version, vuln.affectedVersions)) {
      vulnerabilities.push({
        package: pkgName,
        severity: vuln.severity,
        description: vuln.description,
        recommendation: vuln.recommendation,
      });
    }
  }

  return vulnerabilities;
}

/**
 * Check if version is vulnerable
 * Simplified version check (in production, use semver)
 */
function isVulnerableVersion(version: string, affectedVersions: string): boolean {
  // Remove semver prefixes
  const cleanVersion = version.replace(/^[\^~]/, "");

  // Parse affected versions (e.g., "<4.17.21")
  if (affectedVersions.startsWith("<")) {
    const threshold = affectedVersions.substring(1);
    return compareVersions(cleanVersion, threshold) < 0;
  }

  return false;
}

/**
 * Simple version comparison
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;

    if (aNum < bNum) return -1;
    if (aNum > bNum) return 1;
  }

  return 0;
}

/**
 * Detect major version changes
 */
function detectMajorVersionChanges(
  updates: DependencyChange[]
): string[] {
  const warnings: string[] = [];

  for (const dep of updates) {
    if (!dep.versionBefore || !dep.versionAfter) continue;

    const majorBefore = extractMajorVersion(dep.versionBefore);
    const majorAfter = extractMajorVersion(dep.versionAfter);

    if (majorBefore !== majorAfter && majorAfter > majorBefore) {
      const warning = `Major version change detected for ${dep.name}: ${dep.versionBefore} → ${dep.versionAfter}. Review breaking changes.`;
      warnings.push(warning);
    }
  }

  return warnings;
}

/**
 * Extract major version number
 */
function extractMajorVersion(version: string): number {
  const cleaned = version.replace(/^[\^~]/, "");
  const parts = cleaned.split(".");
  return Number.parseInt(parts[0], 10) || 0;
}
