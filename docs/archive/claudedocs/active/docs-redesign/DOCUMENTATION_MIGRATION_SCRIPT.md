# Documentation Migration Execution Script

**Quick Reference**: Step-by-step commands to reorganize SnapBack documentation
**Based on**: DOCUMENTATION_AUDIT_CATEGORIZATION.md
**Total Time**: 10-15 hours across 3 weeks

---

## Phase 1: Immediate Cleanup (Week 1)

**Time**: 2-3 hours | **Risk**: None

### Step 1.1: Delete Redundant Summaries (15 files)

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site

# Redundant summaries from root
rm ANIMATION_ENHANCEMENTS_SUMMARY.md
rm AUTH_SETUP_SUMMARY.md
rm COMMIT_SUMMARY.md
rm COMPLETE_FIX_SUMMARY.md
rm FIXES_SUMMARY.md
rm IMPLEMENTATION_SUMMARY.md
rm MIGRATION_STATUS.md
rm MIGRATION_SUMMARY.md
rm MIGRATION_TEST_PLAN.md
rm MONOREPO_FLATTENING_IMPLEMENTATION_SUMMARY.md
rm SHARED_INFRASTRUCTURE_OPTIMIZATION_PLAN.md
rm STAGED_COMMIT_SUMMARY.md
rm TDD_MONOREPO_FLATTENING_SUMMARY.md
rm TEST_REPORT.md
rm TESTING_SUMMARY.md
```

### Step 1.2: Delete Outdated Implementation Notes (12 files)

```bash
rm claudedocs/ANIMATION_INDEX.md
rm claudedocs/ANIMATION_QUICK_START.md
rm claudedocs/COMPONENT_CONSOLIDATION_COMPLETE.md
rm claudedocs/COMPONENT_IMPLEMENTATION_EXAMPLES.md
rm claudedocs/DEVICE_TRIALS_TDD_PROGRESS.md
rm claudedocs/DOCS_IMPLEMENTATION_SUMMARY.md
rm claudedocs/DOCS_REDESIGN_SUMMARY.md
rm claudedocs/MIGRATION_VERIFICATION.md
rm claudedocs/MIGRATION_WEEK1_IMPLEMENTATION.md
rm claudedocs/TDD_DEVICE_TRIALS_SUCCESS.md
rm claudedocs/UI_ENHANCEMENT_IMPLEMENTATION.md
rm claudedocs/UX_DX_IMPLEMENTATION_SUMMARY.md
```

### Step 1.3: Delete Meta/Index Documents (8 files)

```bash
rm claudedocs/INDEX.md
rm claudedocs/DOCUMENTATION_MIGRATION_README.md
rm claudedocs/DOCUMENTATION_CONSOLIDATION_GUIDE.md
rm claudedocs/CONTENT_AUDIT_SPREADSHEET.md
rm claudedocs/CONTENT_CONSOLIDATION_EXECUTION_PLAN.md
rm claudedocs/FUMADOCS_CONTENT_CONSOLIDATION_STRATEGY.md
rm claudedocs/FUMADOCS_MIGRATION_SUMMARY.md
rm claudedocs/FUMADOCS_SOURCE_CONFIG_REFERENCE.md
```

### Step 1.4: Delete Temporary Fix Reports (7 files)

```bash
rm claudedocs/FUMADOCS_BUG_REPORT.md
rm claudedocs/FUMADOCS_FIX_SUMMARY.md
rm claudedocs/FUMADOCS_PAGE_TREE_FIX.md
rm claudedocs/FUMADOCS_TURBOPACK_FIX_REPORT.md
rm claudedocs/DOCS_FOOTER_IMPLEMENTATION_GUIDE.md
rm claudedocs/DOCS_FOOTER_SOLUTION.md
rm TERMINAL_REPLACEMENT_REPORT.md
```

### Step 1.5: Create Archive Structure

```bash
mkdir -p claudedocs/archive/{bugs,fixes,implementations,progress,summaries,migrations}
```

### Step 1.6: Move to Archive (Optional - 22 files)

```bash
# Only if you want to preserve historical context
# Otherwise, delete these too

# Summaries
mv FIX_SUMMARY.md claudedocs/archive/summaries/
mv AUTH_SETUP_SUMMARY.md claudedocs/archive/summaries/
mv TESTING_IMPROVEMENTS_SUMMARY.md claudedocs/archive/summaries/

# Implementation notes
# (already deleted above - skip if deleted)
```

**Checkpoint**: You should now have 42 fewer files

---

## Phase 2: Structure Public Documentation (Week 2)

**Time**: 8-10 hours | **Risk**: Medium

### Step 2.1: Create Public Docs Directory Structure

```bash
cd apps/web/content/docs

mkdir -p guides
mkdir -p components
mkdir -p api
mkdir -p pricing
mkdir -p testing
mkdir -p contributing
```

### Step 2.2: Consolidate Animation Documentation (4 → 1)

**Create**: `apps/web/content/docs/guides/animations.mdx`

```bash
# Template structure
cat > apps/web/content/docs/guides/animations.mdx << 'EOF'
---
title: "Animation System"
description: "Comprehensive guide to SnapBack's animation components"
category: "Guides"
type: "how-to"
tags: ["animations", "ui", "components"]
updated: "2025-10-03"
---

# Animation System

## Overview
<!-- Content from ANIMATION_EXECUTIVE_SUMMARY.md -->

## Quick Start
<!-- Content from ANIMATION_QUICK_START.md -->

## Available Animations
<!-- Content from ANIMATION_INDEX.md -->

## Best Practices
<!-- Curated content -->

## Performance Considerations
<!-- Technical notes -->
EOF
```

**Delete source files after consolidation**:

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
rm claudedocs/ANIMATION_EXECUTIVE_SUMMARY.md
# (Others already deleted in Phase 1)
```

### Step 2.3: Consolidate Component Documentation (5 → 2)

**Create**:

1. `apps/web/content/docs/components/overview.mdx`
2. `apps/web/content/docs/components/library.mdx`

```bash
# Overview file
cat > apps/web/content/docs/components/overview.mdx << 'EOF'
---
title: "Component Architecture"
description: "Understanding SnapBack's component system"
category: "Components"
type: "explanation"
tags: ["components", "architecture", "design-system"]
updated: "2025-10-03"
---

# Component Architecture

## Design Principles
<!-- From COMPONENT_ARCHITECTURE_ASSESSMENT.md -->

## Component Structure
<!-- From COMPONENT_ARCHITECTURE_DIAGRAM.md -->

## Integration Patterns
<!-- Technical patterns -->
EOF

# Library reference
cat > apps/web/content/docs/components/library.mdx << 'EOF'
---
title: "Component Library"
description: "Complete reference for all SnapBack UI components"
category: "Components"
type: "reference"
tags: ["components", "ui", "reference"]
updated: "2025-10-03"
---

# Component Library

## Getting Started
<!-- From COMPONENT_LIBRARY_QUICK_START.md -->

## Component Catalog
<!-- From COMPONENT_ARCHITECTURE_ASSESSMENT.md -->

## Usage Examples
<!-- Code examples -->
EOF
```

**Delete source files**:

```bash
rm claudedocs/COMPONENT_ARCHITECTURE_ASSESSMENT.md
rm claudedocs/COMPONENT_ARCHITECTURE_DIAGRAM.md
rm claudedocs/COMPONENT_LIBRARY_QUICK_START.md
```

### Step 2.4: Move API Documentation (3 files)

```bash
# Move files
mv claudedocs/api-migration/API-REFERENCE.md apps/web/content/docs/api/reference.mdx
mv claudedocs/api-migration/MIGRATION-GUIDE.md apps/web/content/docs/guides/api-migration.mdx
mv claudedocs/api-migration/PRIVACY-SECURITY-GUIDE.md apps/web/content/docs/guides/privacy-security.mdx

# Update frontmatter in each file (add manually or via script)
```

**Add frontmatter to each**:

```yaml
---
title: "API Reference"
description: "Complete API documentation for SnapBack"
category: "API"
type: "reference"
tags: ["api", "reference", "integration"]
updated: "2025-10-03"
---
```

### Step 2.5: Move Pricing Documentation (2 files)

```bash
mv claudedocs/OPTIMIZED_PRICING_STRUCTURE.md apps/web/content/docs/pricing/structure.mdx
mv claudedocs/PRICING_FEATURE_RECOMMENDATIONS.md apps/web/content/docs/pricing/features.mdx
```

### Step 2.6: Move Extension Best Practices

```bash
mv claudedocs/VSCODE_EXTENSION_LANDING_PAGE_BEST_PRACTICES.md apps/web/content/docs/guides/extension-best-practices.mdx
```

### Step 2.7: Move Contribution Guides

```bash
mv claudedocs/DOCS_CONTENT_GUIDE.md apps/web/content/docs/contributing/content-guide.mdx
```

### Step 2.8: Split QUICK_REFERENCE.md

**Create**:

1. `apps/web/content/docs/getting-started/quick-reference.mdx` (public)
2. `claudedocs/internal/developer-quick-reference.md` (internal)

```bash
# Extract public sections (Commands, File Structure)
# Extract internal sections (Migration, Build Optimization)
# Manual editing required
```

**Checkpoint**: Public docs should be organized in `/apps/web/content/docs/`

---

## Phase 3: Structure Internal Documentation (Week 3)

**Time**: 6-8 hours | **Risk**: Low

### Step 3.1: Create ADR Directory Structure

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site/claudedocs

mkdir -p adr
mkdir -p internal/{specs,patterns,migrations,analysis,strategy,qa}
```

### Step 3.2: Convert Architecture Docs to ADRs (6 → 2)

**Create**:

1. `claudedocs/adr/001-monorepo-architecture.md`
2. `claudedocs/adr/002-package-organization.md`

```bash
# ADR 001: Monorepo Architecture
cat > claudedocs/adr/001-monorepo-architecture.md << 'EOF'
# ADR-001: Monorepo Architecture Pattern

**Status**: Accepted
**Date**: 2025-10-03
**Decision Makers**: Tech Lead, Architect
**Tags**: architecture, monorepo, turborepo

---

## Context
<!-- From ARCHITECTURE_ANALYSIS.md -->

## Decision
<!-- From ARCHITECTURE_EXECUTIVE_SUMMARY.md -->

## Consequences
<!-- From ARCHITECTURE_VISUALIZATION.md -->

## Implementation
<!-- From JOURNEY_ARCHITECTURE_SUMMARY.md -->

## References
- [Turborepo Documentation](https://turbo.build)
EOF

# ADR 002: Package Organization
cat > claudedocs/adr/002-package-organization.md << 'EOF'
# ADR-002: Package Organization Strategy

**Status**: Accepted
**Date**: 2025-10-03
**Decision Makers**: Tech Lead
**Tags**: packages, organization, dependencies

---

## Context
<!-- From PACKAGES_ARCHITECTURE_ANALYSIS.md -->

## Decision
<!-- Package structure decisions -->

## Consequences
<!-- Build implications -->
EOF
```

**Delete source files**:

```bash
rm claudedocs/ARCHITECTURE_ANALYSIS.md
rm claudedocs/ARCHITECTURE_EXECUTIVE_SUMMARY.md
rm claudedocs/ARCHITECTURE_VISUALIZATION.md
rm claudedocs/PACKAGES_ARCHITECTURE_ANALYSIS.md
rm claudedocs/JOURNEY_ARCHITECTURE_SUMMARY.md
rm claudedocs/JOURNEY_ARCHITECTURE_BUSINESS_FOCUSED.md
```

### Step 3.3: Convert Documentation Framework to ADR

**Create**: `claudedocs/adr/003-documentation-framework.md`

```bash
cat > claudedocs/adr/003-documentation-framework.md << 'EOF'
# ADR-003: Documentation Framework Selection (Fumadocs)

**Status**: Accepted
**Date**: 2025-10-03
**Decision Makers**: Frontend Lead
**Tags**: documentation, fumadocs, mdx

---

## Context
<!-- From DOCS_ARCHITECTURE_DIAGRAM.md -->

## Decision
Chose Fumadocs over alternatives (Docusaurus, Nextra)

## Consequences
<!-- From FUMADOCS_MDX_MIGRATION_ARCHITECTURE.md -->

## Migration Strategy
<!-- From DOCS_FRONTEND_ARCHITECTURE.md -->
EOF
```

**Delete source files**:

```bash
rm claudedocs/DOCS_ARCHITECTURE_DIAGRAM.md
rm claudedocs/DOCS_FRONTEND_ARCHITECTURE.md
rm claudedocs/FUMADOCS_MDX_MIGRATION_ARCHITECTURE.md
```

### Step 3.4: Create Monetization ADRs (2 files)

```bash
mv claudedocs/SNAPBACK_MONETIZATION_TDD_PLAN.md claudedocs/adr/004-monetization-architecture.md
mv claudedocs/SNAPBACK_REVENUE_FIRST_ARCHITECTURE.md claudedocs/adr/005-revenue-first-strategy.md
```

### Step 3.5: Create Technology Stack ADRs (4 files)

```bash
mv claudedocs/NEXTJS15_REACT19_SAAS_PATTERNS.md claudedocs/adr/006-saas-platform-stack.md
mv claudedocs/DEVOPS_INFRASTRUCTURE_ANALYSIS.md claudedocs/adr/007-devops-infrastructure.md
mv claudedocs/FRONTEND_ARCHITECTURE_JOURNEY_TRACKING.md claudedocs/adr/008-frontend-architecture.md
mv claudedocs/UNIFIED_COMPONENT_LIBRARY_STRATEGY.md claudedocs/adr/009-component-library.md
```

### Step 3.6: Create Journey & Migration ADRs (3 files)

```bash
mv claudedocs/USER_JOURNEY_ARCHITECTURE.md claudedocs/adr/010-user-journey.md

# Consolidate migration docs into ADR-011
cat > claudedocs/adr/011-monorepo-migration.md << 'EOF'
# ADR-011: Monorepo Migration Strategy

**Status**: Accepted
**Date**: 2025-10-03
**Decision Makers**: Tech Lead, DevOps
**Tags**: migration, monorepo, consolidation

---

## Context
<!-- From MIGRATION_REQUIREMENTS.md -->

## Decision
<!-- From MIGRATION_PLAYBOOK.md -->

## Implementation Plan
<!-- From MIGRATION_ANALYSIS_REPORT.md -->

## Execution
<!-- From COMPLETE_MIGRATION_AUDIT.md -->
EOF

# Create ADR-012
mv claudedocs/MIGRATION_TECHNICAL_PLAN.md claudedocs/adr/012-migration-implementation.md
```

**Delete consolidated files**:

```bash
rm claudedocs/MIGRATION_REQUIREMENTS.md
rm claudedocs/MIGRATION_PLAYBOOK.md
rm claudedocs/MIGRATION_ANALYSIS_REPORT.md
rm claudedocs/COMPLETE_MIGRATION_AUDIT.md
```

### Step 3.7: Create API Architecture ADRs (2 files)

```bash
mv claudedocs/api-migration/api-architecture.md claudedocs/adr/013-api-architecture.md
mv claudedocs/api-migration/architectural-assessment.md claudedocs/adr/014-api-assessment.md

# Remove empty directory
rmdir claudedocs/api-migration
```

### Step 3.8: Organize Internal Implementation Docs (12 files)

```bash
# Analysis docs
mv claudedocs/SNAPBACK_CODEBASE_AUDIT.md claudedocs/internal/codebase-audit.md
mv claudedocs/SAAS_PLATFORM_COMPREHENSIVE_ANALYSIS.md claudedocs/internal/platform-analysis.md
mv claudedocs/comprehensive-code-analysis-report.md claudedocs/internal/analysis/code-quality.md
mv claudedocs/frontend-testing-analysis.md claudedocs/internal/analysis/testing.md

# Specs
mv claudedocs/LANDING_PAGE_TECHNICAL_SPEC.md claudedocs/internal/specs/landing-page.md

# Patterns
mv claudedocs/MICROINTERACTION_PATTERN_ANALYSIS.md claudedocs/internal/patterns/microinteractions.md

# Strategy
mv claudedocs/AI_CRAWLER_STRATEGY.md claudedocs/internal/strategy/seo-ai.md

# QA
mv claudedocs/DOCS_TESTING_CHECKLIST.md claudedocs/internal/qa/docs-testing.md
```

**Checkpoint**: All ADRs created, internal docs organized

---

## Phase 4: Update Fumadocs Configuration

**Time**: 1 hour | **Risk**: Low

### Step 4.1: Update Navigation Structure

**File**: `apps/web/content/docs/meta.json`

```json
{
	"title": "Documentation",
	"pages": [
		"index",
		{
			"title": "Getting Started",
			"pages": [
				"getting-started/installation",
				"getting-started/quick-start",
				"getting-started/configuration"
			]
		},
		{
			"title": "Guides",
			"pages": [
				"guides/animations",
				"guides/api-migration",
				"guides/privacy-security",
				"guides/extension-best-practices"
			]
		},
		{
			"title": "Components",
			"pages": ["components/overview", "components/library"]
		},
		{
			"title": "API",
			"pages": ["api/reference"]
		},
		{
			"title": "Pricing",
			"pages": ["pricing/structure", "pricing/features"]
		},
		{
			"title": "Testing",
			"pages": ["testing/overview", "testing/e2e"]
		},
		{
			"title": "Contributing",
			"pages": ["contributing/content-guide", "contributing/templates"]
		}
	]
}
```

### Step 4.2: Verify All Links

```bash
# Check for broken links in MDX files
cd apps/web/content/docs
grep -r "\[.*\](.*/claudedocs/.*)" . || echo "No broken links found"

# Check for broken internal references
grep -r "](\.\./" . | grep -v "\.mdx)" || echo "All links valid"
```

### Step 4.3: Update README.md

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/README.md`

Add documentation section:

```markdown
## Documentation

### Public Documentation

-   **User Docs**: https://snapback.dev/docs
-   **Location**: `/apps/web/content/docs/`
-   **Framework**: Fumadocs + Diátaxis

### Internal Documentation

-   **ADRs**: `/claudedocs/adr/` - Architecture Decision Records
-   **Implementation Guides**: `/claudedocs/internal/`
-   **Archive**: `/claudedocs/archive/` - Historical reference only

### Contributing to Docs

See [Content Guide](apps/web/content/docs/contributing/content-guide.mdx)
```

---

## Phase 5: Validation & Cleanup

**Time**: 1-2 hours | **Risk**: None

### Step 5.1: Verify File Structure

```bash
# Expected structure
tree apps/web/content/docs -L 2
tree claudedocs/adr -L 1
tree claudedocs/internal -L 2
```

**Expected Output**:

```
apps/web/content/docs/
├── getting-started/
├── guides/
├── components/
├── api/
├── pricing/
├── testing/
└── contributing/

claudedocs/adr/
├── 001-monorepo-architecture.md
├── 002-package-organization.md
├── ...
└── 014-api-assessment.md

claudedocs/internal/
├── codebase-audit.md
├── platform-analysis.md
├── specs/
├── patterns/
├── migrations/
├── analysis/
├── strategy/
└── qa/
```

### Step 5.2: Test Documentation Build

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
pnpm --filter web dev
# Visit http://localhost:3000/docs
# Verify all pages load correctly
```

### Step 5.3: Run Link Checker

```bash
# Install link checker if needed
npm install -g markdown-link-check

# Check all public docs
find apps/web/content/docs -name "*.mdx" -exec markdown-link-check {} \;

# Check all ADRs
find claudedocs/adr -name "*.md" -exec markdown-link-check {} \;
```

### Step 5.4: Final Cleanup

```bash
# Remove any empty directories
find claudedocs -type d -empty -delete

# Verify no orphaned files
find claudedocs -maxdepth 1 -name "*.md" | grep -v "DOCUMENTATION_AUDIT_CATEGORIZATION\|DOCUMENTATION_MIGRATION_SCRIPT"
# Should return nothing except the audit files
```

---

## Quick Execution (All at Once)

If you want to execute everything in one go:

```bash
#!/bin/bash
# Save as: execute-doc-migration.sh

set -e  # Exit on error

echo "Starting documentation migration..."

# Phase 1: Delete redundant files
echo "Phase 1: Deleting redundant files..."
cd /Users/user1/WebstormProjects/SnapBack-Site

# All delete commands from Phase 1 here
# (Copy from above)

# Phase 2-5: Requires manual content merging
echo "Phase 1 complete. Phases 2-5 require manual content merging."
echo "See DOCUMENTATION_MIGRATION_SCRIPT.md for detailed steps."
```

---

## Rollback Procedure

If anything goes wrong:

```bash
# If you've committed changes
git log --oneline  # Find the commit before migration
git revert <commit-hash>..HEAD

# If you haven't committed
git checkout .  # Discard all changes
git clean -fd   # Remove untracked files

# Restore deleted files from git history
git checkout HEAD~1 -- claudedocs/
```

---

## Success Checklist

-   [ ] Phase 1: 42 files deleted
-   [ ] Phase 2: Public docs consolidated (9 files in `/apps/web/content/docs/`)
-   [ ] Phase 3: 14 ADRs created in `/claudedocs/adr/`
-   [ ] Phase 3: 12 internal docs in `/claudedocs/internal/`
-   [ ] Phase 4: Navigation updated in `meta.json`
-   [ ] Phase 5: All links verified
-   [ ] Phase 5: Documentation builds successfully
-   [ ] Phase 5: No orphaned files in `claudedocs/`

---

## Post-Migration Tasks

1. **Update CI/CD**: Add link checking to CI pipeline
2. **Setup Search**: Configure Fumadocs search indexing
3. **Add Analytics**: Track documentation usage
4. **Internal Docs Site** (Optional): Setup separate site for ADRs
5. **Monitoring**: Setup 404 monitoring for broken links

---

**Migration Script Version**: 1.0
**Last Updated**: 2025-10-03
**Estimated Total Time**: 15-20 hours
