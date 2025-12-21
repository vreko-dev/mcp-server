# CLI UX Enhancement Implementation Plan

## Overview

This document provides the roadmap for enhancing the SnapBack CLI with professional-grade UX patterns. The goal is to create a CLI experience that makes users **instantly enjoy** using it while supporting both entry-level and expert developers.

## Design Philosophy

### Core Principles

1. **Progressive Disclosure**: Entry users get prompts and guidance; experts use flags and piping
2. **Invisible Until Needed**: Quiet by default, loud when it matters
3. **Screenshot-Worthy Moments**: Support the Pioneer Program's "save stories" with visually compelling output
4. **Dual Output Mode**: Human-friendly by default, machine-friendly with `--json`

### SnapBack-Specific Patterns

| Pattern | Implementation |
|---------|----------------|
| "Save Story" | Boxen-rendered celebration when SnapBack prevents a disaster |
| Risk Visibility | Tabular signal display with severity indicators |
| Pre-commit Trust | Real-time progress during batch analysis |
| Git-Native | Analyze staged files, not entire directories |

---

## Spec Index

| Spec ID | Name | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| [CLI-UX-001](./01-boxen-integration.spec.md) | Boxen Integration | P1 | 2h | Draft |
| [CLI-UX-002](./02-execa-integration.spec.md) | Execa Integration | P1 | 1h | Draft |
| [CLI-UX-003](./03-cli-table3-integration.spec.md) | CLI-Table3 Integration | P2 | 2h | Draft |
| [CLI-UX-004](./04-log-update-integration.spec.md) | Log-Update Integration | P2 | 1h | Draft |

**Total Estimated Effort**: 6 hours

---

## Implementation Order

### Phase 1: Critical Path (3 hours)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Execa (CLI-UX-002)         │  Fix broken check command  │
│     └── Git staged files       │  [P1 - Demo Critical]      │
├─────────────────────────────────────────────────────────────┤
│  2. Boxen (CLI-UX-001)         │  Visual polish for demo    │
│     └── Success/error boxes    │  [P1 - Demo Critical]      │
└─────────────────────────────────────────────────────────────┘
```

**Why this order:**
- Execa fixes the `check` command's fundamental behavior (analyzing wrong files)
- Boxen provides immediate visual polish for all command outputs
- Both are demo-critical

### Phase 2: Polish (3 hours)

```
┌─────────────────────────────────────────────────────────────┐
│  3. CLI-Table3 (CLI-UX-003)    │  Professional data display │
│     └── Risk signal tables     │  [P2 - Demo Polish]        │
├─────────────────────────────────────────────────────────────┤
│  4. Log-Update (CLI-UX-004)    │  Real-time feedback       │
│     └── Batch progress         │  [P2 - Demo Polish]        │
└─────────────────────────────────────────────────────────────┘
```

**Why this order:**
- CLI-Table3 builds on boxen for cohesive visual language
- Log-Update enhances the fixed check command

---

## Dependency Map

```
                    ┌──────────────┐
                    │ CLI-UX-002   │
                    │ (execa)      │
                    │ Git Client   │
                    └──────┬───────┘
                           │
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ CLI-UX-001   │    │ CLI-UX-003   │    │ CLI-UX-004   │
│ (boxen)      │◄───│ (cli-table3) │    │ (log-update) │
│ Visual Boxes │    │ Data Tables  │    │ Progress     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ check cmd    │
                    │ analyze cmd  │
                    │ list cmd     │
                    │ snapshot cmd │
                    └──────────────┘
```

---

## Package Changes Summary

### Dependencies to Add

```json
{
  "dependencies": {
    "boxen": "^8.0.1",
    "cli-table3": "^0.6.5",
    "execa": "^9.5.2",
    "log-update": "^6.1.0"
  }
}
```

### Estimated Bundle Impact

| Package | Size | Notes |
|---------|------|-------|
| boxen | ~45KB | Includes string-width, etc. |
| cli-table3 | ~35KB | Minimal deps |
| execa | ~25KB | Modern ESM, tree-shakeable |
| log-update | ~8KB | Very lightweight |
| **Total** | ~113KB | Well under any concerns |

---

## New File Structure

```
apps/cli/
├── src/
│   ├── index.ts              # Updated with new UX
│   ├── services/
│   │   ├── api-client.ts     # Existing
│   │   └── git-client.ts     # NEW: Git operations
│   └── utils/
│       ├── display.ts        # NEW: Boxen wrappers
│       ├── tables.ts         # NEW: Table renderers
│       └── progress.ts       # NEW: Progress tracking
└── test/
    ├── services/
    │   └── git-client.test.ts    # NEW
    └── utils/
        ├── display.test.ts       # NEW
        ├── tables.test.ts        # NEW
        └── progress.test.ts      # NEW
```

---

## Command UX Matrix

| Command | Boxen | Tables | Progress | Git | Notes |
|---------|-------|--------|----------|-----|-------|
| `analyze` | ✅ High-risk warning | ✅ Signal table | ❌ | ❌ | Single file |
| `check` | ✅ Summary | ✅ File summary | ✅ Per-file | ✅ Staged only | Batch operation |
| `snapshot` | ✅ Success box | ❌ | ⚡ Large sets | ❌ | Simple feedback |
| `list` | ❌ | ✅ Snapshot table | ❌ | ❌ | Data display |
| `interactive` | ✅ Welcome | ❌ | ❌ | ❌ | Guided mode |

---

## Testing Strategy

### Per-Spec Tests

Each spec defines its own test plan following the 4-path coverage requirement:
1. **Happy path**: Normal operation
2. **Sad path**: Expected failures (no git, no files, etc.)
3. **Edge cases**: Long paths, special characters, empty inputs
4. **Error cases**: Unexpected failures, timeouts

### Integration Tests

After all specs are implemented:

```typescript
// test/integration/cli-ux.integration.test.ts

describe('CLI UX Integration', () => {
  it('should display boxed success after creating snapshot', async () => { ... });
  it('should show progress during batch check', async () => { ... });
  it('should render risk signals in table format', async () => { ... });
  it('should only analyze staged files', async () => { ... });
});
```

### Visual Regression

Use snapshot tests to catch visual regressions:

```typescript
expect(createRiskSignalTable(signals)).toMatchSnapshot();
expect(displayBox('content', { type: 'success' })).toMatchSnapshot();
```

---

## Rollback Plan

Each enhancement is isolated and can be reverted independently:

1. **Boxen**: Revert to `console.log(chalk.green(...))` 
2. **Execa**: Revert to `getAllFiles()` with `--all` as default
3. **CLI-Table3**: Revert to `console.table()`
4. **Log-Update**: Revert to static `ora` spinners

Feature flags are not needed as these are additive enhancements.

---

## Success Metrics

### Demo Readiness

- [ ] `snapback check` analyzes staged files only ✅
- [ ] Success/error states are visually distinct ✅
- [ ] Risk signals are scannable in table format ✅
- [ ] Long operations show real-time progress ✅

### Quality Gates

- [ ] All unit tests pass (80%+ coverage on new code)
- [ ] Integration tests pass
- [ ] No TypeScript errors
- [ ] Bundle size impact < 150KB total
- [ ] Commands work in CI/CD (non-TTY)

---

## Open Items

1. **Conf integration**: Should we persist user preferences (verbosity, color scheme)?
   - Deferred to future spec

2. **Shell completion**: Auto-complete for commands and options
   - Deferred - consider oclif migration later

3. **Adaptive verbosity**: Adjust output based on user behavior over time
   - Future enhancement mentioned in the reference document

---

## Next Steps

1. **Review Specs**: Team review of all four specs
2. **Approve Order**: Confirm Phase 1 → Phase 2 order
3. **Begin Implementation**: Start with CLI-UX-002 (execa)
4. **Iterate**: Complete each spec with tests before moving to next

---

## References

- [SnapBack CLI Source](../src/index.ts)
- [CLI Best Practices Document](./cli-best-practices.md) *(to be created)*
- [SnapBack Architecture Docs](/mnt/project/snapback-comprehensive-architecture.md)
