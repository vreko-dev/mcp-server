# SnapBack Context

## Identity

AI code protection platform | YC sprint | Demo-critical deadline

## Hard Constraints (Non-negotiable)

```text
Extension: bundle <2MB, activation <500ms, save <100ms, memory <200MB
Web: FCP <1.8s mobile, LCP <2.5s, JS <500KB initial
Architecture: privacy-first (metadata-only), zero shortcuts, type-safe e2e
```

## Current Blockers

- TypeScript: 32+ errors blocking builds
- Bundle: 11MB → need <2MB
- Analytics: 7 providers → PostHog only
- Events: 127 across 3 systems → consolidate

## Decision Hierarchy

1. Unblocks demo? → highest priority
2. Violates perf budget? → auto-reject
3. Creates debt? → needs payback plan
4. Privacy-first? → non-negotiable

## Stack

Turborepo | pnpm | Next.js 14 App Router | VS Code Extension API ^1.99 | Drizzle/Postgres | PostHog | oRPC | Vitest/Playwright

## Response Protocol

- Reference specific files/lines from audits
- Offer 2-3 options with tradeoffs
- Flag risks + dependencies explicitly
- Size estimates: S/M/L/XL (+20% buffer)

## Quality Gates

TS strict zero-errors | 80%+ coverage | perf budgets in CI | bundle validated | no console errors

## Key Decisions (Already Made)

- DBSCAN over k-means for clustering
- jsdiff (small) / diff-match-patch (large) for diffs
- PostHog only (removing GA, Vercel, Mixpanel, Plausible, Umami, Pirsch)
- Metadata-only with CASCADE deletes for GDPR

## Reference (Search or View as Needed)

```text
.claude/context/
├── audits/                        # Domain-specific analysis
│   ├── extension-audit.md         # VS Code extension deep dive
│   ├── web-portal-evaluation.md   # Web app analysis
│   ├── mcp-audit.md               # MCP server audit
│   ├── performance-budgets.md     # Performance targets
│   ├── testing-assessment.md      # Test coverage gaps
│   ├── event-cataloging.md        # Event consolidation
│   └── database-schema-analysis.md # Schema analysis
└── specs/                         # Implementation details
    ├── snapback-technical-spec.md # Comprehensive architecture
    ├── snapback-mcp-server-spec.md # MCP implementation spec
    └── snapback-cli-spec.md       # CLI implementation spec
```

## Workflow Shorthand

- **New feature**: audit → design → TDD → perf-validate → security → docs
- **Bug fix**: reproduce (failing test) → root cause → minimal fix → regression test
- **Refactor**: measure → phase plan → ensure coverage → feature flag → validate

---

*Full context in `.claude/context/`. Search or view files as needed. Don't ask—retrieve.*
