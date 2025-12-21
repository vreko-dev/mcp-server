# SnapBack AI Dev Resources

This directory contains specifications, designs, and implementation guides for SnapBack development.

## Directory Structure

```
resources/
├── extension-ux/          # VS Code extension UI/UX specifications
│   ├── EXTENSION_UX_SPEC.md    # Master UX specification
│   ├── QUICK_REFERENCE.md      # Implementation cheat sheet
│   └── README.md
│
├── vitals/                # Workspace Vitals system
│   ├── VITALS_INSTRUCTIONS.md  # Implementation guide
│   ├── workspace_vitals_design.md
│   ├── vitals_implementation.ts
│   ├── migrate_2_vitals.md
│   └── README.md
│
└── [standalone docs]      # Various implementation guides
```

## Key Documents by Topic

### Extension UI/UX
| Document | Purpose |
|----------|---------|
| `extension-ux/EXTENSION_UX_SPEC.md` | **Master spec** - All UI components, tree view, status bar, notifications |
| `extension-ux/QUICK_REFERENCE.md` | Copy-paste code snippets for implementation |

### Intelligence Layer
| Document | Purpose |
|----------|---------|
| `vitals/VITALS_INSTRUCTIONS.md` | Workspace health sensing implementation |
| `vitals/workspace_vitals_design.md` | Conceptual design and rationale |
| `snapback_inteligence_im.md` | Intelligence package overview |
| `unified_context_system.md` | Context retrieval architecture |

### Testing & Quality
| Document | Purpose |
|----------|---------|
| `testing_coverage.md` | Test strategy and coverage requirements |

### Architecture
| Document | Purpose |
|----------|---------|
| `package_consolidation.md` | Package structure decisions |
| `lib_implementation.md` | Library implementation patterns |
| `post_engine_fix.md` | Engine refactoring notes |

### Business
| Document | Purpose |
|----------|---------|
| `snapback_market_audit_12-10.md` | Market analysis and positioning |

## Implementation Priority

### Phase 1: Foundation (Current Sprint)
1. **Extension UX Restructure** → `extension-ux/EXTENSION_UX_SPEC.md`
   - Tree view toolbar actions
   - Activity section (event-first)
   - Status bar state machine

### Phase 2: Vitals
2. **Workspace Vitals** → `vitals/VITALS_INSTRUCTIONS.md`
   - PulseTracker + PressureGauge
   - Temperature + Oxygen
   - Integration with AutoDecisionEngine

### Phase 3: Polish
3. **File decorations, notifications, commands**
4. **Pioneer program UI integration**

## Related Project Files

Also see `/mnt/project/` for audit documents:
- `extension-audit.md` - Technical deep dive
- `web-portal-evaluation.md` - Dashboard specs
- `mcp-audit.md` - MCP server review
- `testing-assessment.md` - Test coverage analysis

## Quick Links

**For AI pair programmers:** Start with `extension-ux/EXTENSION_UX_SPEC.md` for any UI work.

**For vitals implementation:** Start with `vitals/VITALS_INSTRUCTIONS.md`.

**For testing:** Start with `testing_coverage.md`.

---

*Last updated: December 2024*
