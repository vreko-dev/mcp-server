# Link Standardization Guide

**Last Updated**: 2025-12-06
**Purpose**: Maintain consistent, SEO-friendly links across SnapBack ecosystem

## 🎯 Primary Ecosystem URLs (Always Use These)

### Main Properties
| Domain | Purpose | URL |
|--------|---------|-----|
| **snapback.dev** | Marketing site | https://snapback.dev |
| **docs.snapback.dev** | Documentation | https://docs.snapback.dev |
| **console.snapback.dev** | Web app/dashboard | https://console.snapback.dev |
| **api.snapback.dev** | API service | https://api.snapback.dev |

### GitHub (Canonical Monorepo)
| Purpose | URL |
|---------|-----|
| **Main Repository** | https://github.com/snapback-dev/snapback.dev |
| **Issues** | https://github.com/snapback-dev/snapback.dev/issues |
| **Discussions** | https://github.com/snapback-dev/snapback.dev/discussions |
| **Contributing** | https://github.com/snapback-dev/snapback.dev/blob/main/CONTRIBUTING.md |

---

## 📦 Public NPM Packages

All public packages are published under `@snapback-oss/*` or `@snapback/*` namespace.

### Package Links Format
```
https://www.npmjs.com/package/@NAMESPACE/PACKAGE_NAME
```

### Public Packages (Community)
| Package | URL |
|---------|-----|
| **@snapback-oss/sdk** | https://www.npmjs.com/package/@snapback-oss/sdk |
| **@snapback-oss/contracts** | https://www.npmjs.com/package/@snapback-oss/contracts |
| **@snapback-oss/infrastructure** | https://www.npmjs.com/package/@snapback-oss/infrastructure |
| **@snapback-oss/events** | https://www.npmjs.com/package/@snapback-oss/events |
| **@snapback-oss/config** | https://www.npmjs.com/package/@snapback-oss/config |

### Public Packages (Platform Tools)
| Package | URL |
|---------|-----|
| **@snapback/mcp-server** | https://www.npmjs.com/package/@snapback/mcp-server |

---

## 📚 Documentation Links

### Internal Docs Site
```
https://docs.snapback.dev/PATH
```

**Common Paths:**
- API Reference: `https://docs.snapback.dev/api`
- SDK Guide: `https://docs.snapback.dev/api/sdk`
- Contributing: `https://docs.snapback.dev/contributing`
- MCP Server: `https://docs.snapback.dev/integrations/mcp`
- Security: `https://docs.snapback.dev/security`

### For Quick Start / Getting Started
```
https://docs.snapback.dev/quick-start
```

---

## ✅ Link Usage Rules (For SEO)

### DO ✅
- Use **snapback-dev** organization for ALL GitHub links
- Point issues/discussions to **canonical monorepo** (not individual packages)
- Use **docs.snapback.dev** for all documentation links
- Link npm packages to **www.npmjs.com** (official npm registry)
- Include full HTTPS protocol (`https://`, not `http://`)

### DON'T ❌
- Mix `Marcelle-Labs` and `snapback-dev` orgs in same project
- Link to old/deprecated `github.com/snapback/*` repos
- Use relative documentation links in public-facing content
- Point to different issue trackers for different packages
- Use shortened URLs or link shorteners in documentation

---

## 🔗 Template for README Files

Use this link section in README.md files:

```markdown
## Resources

- **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- **GitHub**: [snapback-dev/snapback.dev](https://github.com/snapback-dev/snapback.dev)
- **NPM**: [@PACKAGE_NAME](https://www.npmjs.com/package/@PACKAGE_NAME)
- **Issues**: [GitHub Issues](https://github.com/snapback-dev/snapback.dev/issues)
- **Discussions**: [GitHub Discussions](https://github.com/snapback-dev/snapback.dev/discussions)
```

---

## 🚀 SEO Impact

### Why Standardization Matters

1. **Link Authority** - All links point to single authoritative source = better SEO ranking
2. **Organic Traffic** - Consolidated issues/discussions = more engagement signals
3. **Trust Signals** - Consistent branding across ecosystem = higher credibility
4. **Click-Through Rates** - Users find what they need faster = better UX

### Metrics to Track

- Referral traffic from GitHub (Issues, Discussions)
- Organic search ranking for "SnapBack SDK", "SnapBack docs"
- npm package download stats
- Docs site bounce rate (should be low)

---

## 📋 Link Audit Checklist

Run this before merging code changes:

```bash
# Check for old GitHub links
grep -r "github.com/snapback/" --include="*.md" --include="*.ts" --include="*.tsx" .

# Check for mixed orgs
grep -r "Marcelle-Labs\|snapback-dev" --include="*.md" --include="*.ts" --include="*.tsx" . | sort | uniq -c

# Check for documentation links pointing to old locations
grep -r "snapback.dev/docs\|snapback\.dev/api" --include="*.md" --include="*.tsx" .

# Check package.json repository fields
find packages*/*/package.json -exec grep -l "repository" {} \;
```

---

## 🔄 Migration Path (If Changing Links)

If you need to change ecosystem domains:

1. **Add redirects first** (on old domain)
2. **Update docs** (point to new URLs)
3. **Update package.json** (repository field)
4. **Update README** files
5. **Wait 24-48 hours** for search engines to re-crawl
6. **Monitor** referral traffic and rankings

---

## 📞 Enforcement

These links are automatically validated by:
- Pre-commit hooks (lint-staged)
- CI/CD pipeline (GitHub Actions)
- SEO automation scripts

If you see link inconsistencies, please file an issue at:
**https://github.com/snapback-dev/snapback.dev/issues**

---

## Last Reviewed

- **Date**: 2025-12-06
- **By**: Version Management Task
- **Status**: ✅ All links standardized and validated
