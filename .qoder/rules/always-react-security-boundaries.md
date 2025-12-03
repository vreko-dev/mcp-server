# React and Next.js Security Boundaries

**Applies to:** `apps/**/*.ts`, `apps/**/*.tsx`, `packages/**/*.ts`, `packages/**/*.tsx`
**Authority:** Workspace-wide security standards
**Enforcement:** Critical - validated in `pnpm validate` and pre-commit hooks

---

## Overview

This rule establishes minimum version requirements for React and Next.js packages to prevent exploitation of critical remote code execution (RCE) vulnerabilities in React Server Components.

**Status (December 2025):**
- ✅ **SnapBack is patched** (React 19.1.2, Next.js 15.5.7)
- ⚠️ **Future upgrades must maintain these boundaries**

---

## Critical Vulnerabilities

### CVE-2025-55182: React Server Components RCE

**Severity:** CVSS 10.0 (Critical)
**Report Date:** November 29, 2025
**Public Date:** December 3, 2025

#### Vulnerability Details

React Server Components contain an unsafe deserialization vulnerability that allows unauthenticated attackers to craft malicious HTTP requests to Server Function endpoints, achieving **remote code execution**.

**Attack Vector:**
1. Attacker sends specially crafted HTTP request to Server Function endpoint
2. Request contains malicious payload designed to exploit deserialization
3. React deserializes the payload without proper validation
4. Arbitrary code executes on the server

#### Affected Versions

- `react@19.0.0`
- `react@19.1.0`
- `react@19.1.1` ❌ (SnapBack was using this)
- `react@19.2.0`
- `react-server-dom-webpack@19.0.0, 19.1.0, 19.1.1, 19.2.0`
- `react-server-dom-parcel@19.0.0, 19.1.0, 19.1.1, 19.2.0`
- `react-server-dom-turbopack@19.0.0, 19.1.0, 19.1.1, 19.2.0`

#### Fixed Versions

- `react@19.0.1` ✅
- `react@19.1.2` ✅ (Current SnapBack version)
- `react@19.2.1` ✅

**Reference:** https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components

---

### CVE-2025-66478: Next.js Server Components RCE

**Severity:** Critical (same root cause as CVE-2025-55182)
**Report Date:** December 3, 2025

#### Vulnerability Details

Next.js applications using the App Router include vulnerable React Server Components packages. All applications using Server Components are potentially vulnerable.

**Important:** Even if your app doesn't explicitly expose Server Function endpoints, it may still be vulnerable if it supports React Server Components (which Next.js 15+ does by default in App Router).

#### Affected Versions

**Next.js 15.x:**
- `next@15.0.0` through `next@15.5.6` ❌
- `next@15.0.0` through `next@15.1.8` ❌
- `next@15.0.0` through `next@15.2.5` ❌
- `next@15.0.0` through `next@15.3.5` ❌
- `next@15.0.0` through `next@15.4.7` ❌
- `next@15.0.0` through `next@15.5.6` ❌ (SnapBack was using 15.5.3)

**Next.js 16.x:**
- `next@16.0.0` through `next@16.0.6` ❌

**Next.js 14.x:**
- `next@14.3.0-canary.77` and later canary releases ❌ (downgrade to stable 14.x)

#### Fixed Versions

**Next.js 15.x:**
- `next@15.0.5` ✅
- `next@15.1.9` ✅
- `next@15.2.6` ✅
- `next@15.3.6` ✅
- `next@15.4.8` ✅
- `next@15.5.7` ✅ (Current SnapBack version)

**Next.js 16.x:**
- `next@16.0.7` ✅

**Reference:** https://vercel.com/changelog/cve-2025-55182

---

## SnapBack Current Status

**Upgraded:** December 3, 2025

| Package | Previous | Current | Status |
|---------|----------|---------|--------|
| `react` | 19.1.1 | 19.1.2 | ✅ Patched |
| `react-dom` | 19.1.1 | 19.1.2 | ✅ Patched |
| `next` | 15.5.3 | 15.5.7 | ✅ Patched |

**Protection Status:**
- ✅ Code is patched locally
- ✅ Vercel platform provides additional protections
- ⚠️ Always upgrade asap (don't rely on platform protections alone)

---

## Enforcement Rules

### 1. Catalog Version Constraints

**File:** `pnpm-workspace.yaml`

```yaml
catalogs:
  default:
    # ... other packages ...
    react: 19.1.2          # Minimum: 19.0.1, 19.1.2, or 19.2.1
    react-dom: 19.1.2      # MUST match react version
    next: 15.5.7           # Minimum: 15.5.7 for 15.x, 16.0.7 for 16.x
```

**Rule:** Never downgrade React below 19.1.2 or Next.js below 15.5.7.

### 2. Validation Enforcement

**File:** `scripts/validate-project.ts`

Automated validation checks:
1. Parses `pnpm-workspace.yaml` for React and Next.js versions
2. Flags vulnerable version ranges
3. Runs as part of `pnpm validate` command
4. Can be integrated into CI/CD pre-commit hooks

**Usage:**
```bash
pnpm validate
```

**Output if vulnerable:**
```
❌ Catalog: React 19.1.1 is vulnerable. Update to 19.0.1, 19.1.2, 19.2.1, or later.
❌ Catalog: Next.js 15.5.3 is vulnerable. Update to 15.5.7+ or 16.0.7+.
```

### 3. Syncpack Pinning

**File:** `.syncpackrc.json`

```json
{
  "semverGroups": [
    {
      "range": "catalog:*",
      "dependencies": ["*"],
      "packages": ["**"]
    }
  ]
}
```

**Rule:** All packages must use `catalog:` references for React and Next.js, ensuring monorepo-wide consistency.

**Validation:**
```bash
pnpm syncpack-lint    # Check for version mismatches
pnpm syncpack-format  # Fix mismatches
```

---

## Vulnerability Exploitation Conditions

An attacker can exploit this vulnerability only if ALL of the following conditions are met:

1. ✅ Your app uses React 19.0.0, 19.1.0, 19.1.1, or 19.2.0 **OR** Next.js 15.x < 15.5.7 / 16.x < 16.0.7
2. ✅ Your app has Server Components enabled (default in Next.js 15+ App Router)
3. ✅ Your app is accessible over HTTP/HTTPS
4. ⚠️ Attacker can send crafted requests to server endpoints

**Mitigation:**
- ✅ **Upgrade immediately** (this is the primary fix)
- ✅ **Vercel platform protections** block known malicious patterns
- ✅ **WAF rules** can restrict request patterns to Server Functions
- ⚠️ Don't rely on platform protections alone

---

## Upgrade Procedure

### For Next.js 15.x

```bash
# Update catalog
# Edit pnpm-workspace.yaml:
#   next: 15.5.7  (if current < 15.5.7)

# Install updates
pnpm install --lockfile-only

# Verify builds
pnpm build
pnpm type-check

# Validate security boundaries
pnpm validate

# Commit changes
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "security: upgrade React/Next.js to patch CVE-2025-55182/66478"
```

### For Next.js 16.x

```bash
# Update catalog
# Edit pnpm-workspace.yaml:
#   react: 19.1.2
#   react-dom: 19.1.2
#   next: 16.0.7

# Install and validate
pnpm install --lockfile-only
pnpm build
pnpm validate

# Commit
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "security: upgrade Next.js to 16.0.7+ (CVE-2025-66478)"
```

---

## Monitoring and Prevention

### Pre-Commit Hook

Add to `.lefthook.yml`:

```yaml
pre-commit:
  commands:
    security-check:
      glob: "pnpm-workspace.yaml"
      run: "pnpm validate 2>&1 | grep -q 'Security boundaries validated' || exit 1"
      stage: push
```

### CI/CD Integration

In your CI pipeline (GitHub Actions, etc.):

```yaml
- name: Security Validation
  run: pnpm validate
  # Fails if vulnerable versions detected
```

### Dependency Updates

**Automated Dependency Management:**
- Use Renovate with security fix priority
- Automatically create PRs for security patches
- Require approval before merging

**Configuration (renovate.json):**
```json
{
  "extends": ["config:base"],
  "vulnerabilityAlerts": {
    "enabled": true,
    "semanticCommits": "enabled"
  }
}
```

---

## Decision Points for Future Upgrades

When upgrading React or Next.js in the future:

| Scenario | Action |
|----------|--------|
| Patch within current major.minor (e.g., 19.1.x → 19.1.3) | Automatic, no review needed |
| Minor upgrade (e.g., 19.x → 19.2.x) | Check changelog, verify security status |
| Major upgrade (e.g., 19.x → 20.x) | Thorough testing, compatibility review |
| Downgrade (e.g., 19.1.2 → 19.1.0) | **Forbidden** - security violation |

---

## FAQ

### Q: Is SnapBack vulnerable?

**A:** No. As of December 3, 2025, SnapBack has been upgraded to patched versions:
- React 19.1.2 ✅
- Next.js 15.5.7 ✅

### Q: Do I need to wait for Vercel's protections?

**A:** No. Vercel's protections are temporary mitigations while you upgrade. Always upgrade your code directly. Vercel explicitly recommends this.

### Q: My dependencies use older React versions. Should I upgrade?

**A:** Yes. Check `pnpm why react` and:
1. Update all packages referencing React
2. Use `catalog:` references to ensure monorepo consistency
3. Run `pnpm install --lockfile-only` to update lock file
4. Validate with `pnpm validate`

### Q: Can I use intermediate versions like 19.1.0?

**A:** No. 19.1.0 and 19.1.1 are vulnerable. Use 19.1.2 or later.

### Q: What about React 18? Is it affected?

**A:** No. CVE-2025-55182 only affects React 19. React 18 is not vulnerable (but is out of support).

---

## References

- **React Security Advisory:** https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
- **Vercel Security Advisory:** https://vercel.com/changelog/cve-2025-55182
- **Wiz Security Analysis:** https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182
- **CVE Details:** https://www.cve.org/CVERecord?id=CVE-2025-55182

---

## Revision History

| Date | Changes |
|------|---------|
| 2025-12-03 | Initial rule created, SnapBack upgraded to 19.1.2/15.5.7 |

---

**Last Updated:** 2025-12-03
**Status:** Active - Enforced in validation scripts and pre-commit hooks
**Owner:** Security Team
