# AI Developer Utilities

This directory contains consolidated documentation and prompts designed to guide coding agents in following best practices.

## 📂 Directory Structure

```
ai_dev_utils/
├── README.md                          # This file
├── TDD_AGENT_PROMPT.md               # Comprehensive TDD prompt for coding agents
├── TDD_CORE.md                       # Core TDD rules and requirements
├── feedback/                          # 🆕 Feature completion & violation tracking
│   ├── COMPLETION_TRACKER.md         # Central tracker for completed features ⭐
│   ├── README.md                     # Feedback system guide
│   └── violation-template.md         # Template for violation reports
├── state/                             # Current task status
│   ├── current-task.json             # Active task tracking
│   └── ... other state files
└── testing_docs/                      # Source testing documents (12 files)
    ├── testing_blueprint.md           # Definitive testing reference (844 lines)
    ├── code-review-standards.md       # Testing standards & code review (2,295 lines)
    ├── test-infrastructure-patterns.md # @snapback/testing package docs (958 lines)
    ├── high_roi_test_strategy.md      # Contract & trust chain tests (820 lines)
    ├── testing-strategy.md            # Coverage targets & quality gates (351 lines)
    ├── e2e-guide.md                   # Playwright E2E testing (220 lines)
    ├── TESTING.md                     # Root testing guide with MSW (441 lines)
    ├── testing-cleanup.md             # Quality improvement strategy (698 lines)
    ├── TDD_QUICK_REFERENCE.md         # Web app TDD workflow (496 lines)
    ├── vscode-testing-guide.md        # VS Code extension testing (293 lines)
    ├── quality-assurance.md           # QA guide with quality gates (274 lines)
    └── snapback-testing-architecture.md # 5-layer testing strategy (1,477 lines)
```

## 📋 Feedback System - Track Completions & Violations

**NEW:** The `feedback/` directory provides a centralized tracking system for monitoring feature completions and violations.

**Quick Links:**
- 📊 **[COMPLETION_TRACKER.md](feedback/COMPLETION_TRACKER.md)** - See what's been completed
- 📝 **[violation-template.md](feedback/violation-template.md)** - Report violations and issues
- ℹ️ **[feedback/README.md](feedback/README.md)** - How to use the feedback system

**Current Status:**
- ✅ **FeedbackManager** - COMPLETE (35/35 tests passing)
- ✅ **Auth Infrastructure** - VERIFIED
- ✅ **Vitest Setup** - VERIFIED

**Usage:**
1. Add completed features to `COMPLETION_TRACKER.md`
2. Report violations using `violation-template.md`
3. Keep `current-task.json` synchronized with active work

---

## 🎯 Primary Resource: TDD_AGENT_PROMPT.md

**Purpose:** A comprehensive, zero-tolerance prompt that ensures coding agents perform thorough TDD red-green-refactor without shortcuts.

**Key Features:**
- ✅ Mandatory TDD red-green-refactor workflow
- ✅ Zero tolerance for placeholder tests, TODOs, or useless tests
- ✅ 4-path coverage model (Happy/Sad/Edge/Error)
- ✅ Meaningful assertion patterns (5 categories)
- ✅ Deterministic test infrastructure
- ✅ Quality gates enforcement (pre-commit, pre-push, CI/CD)
- ✅ Contract and trust chain testing patterns
- ✅ IP-safety requirements for Open Core packages
- ✅ Comprehensive examples (good vs bad)

**When to Use:**
- Include in context when requesting test implementation
- Reference when enforcing testing standards
- Use as basis for code review feedback
- Provide to new team members as testing standard

**Enforcement:** Multi-layered quality gates ensure violations are caught at:
1. **Static Analysis** - ESLint rules catch forbidden patterns
2. **Git Hooks** - Pre-commit/pre-push hooks enforce standards
3. **CI/CD** - Automated checks prevent merging non-compliant code
4. **Code Review** - Manual verification checklist

## 📖 Source Documentation

The `testing_docs/` directory contains the original 12 testing documents (~9,000 lines) that were synthesized into the TDD agent prompt:

### Core Documents
1. **testing_blueprint.md** - System-specific test scenarios (185 total tests)
2. **code-review-standards.md** - Comprehensive standards with MSW integration
3. **test-infrastructure-patterns.md** - Deterministic testing utilities

### Strategy Documents
4. **high_roi_test_strategy.md** - Contract/trust chain tests (prevent 80% of bugs)
5. **testing-strategy.md** - Coverage targets and zero flakiness tolerance
6. **testing-cleanup.md** - Test quality improvement and 4-path coverage model

### Platform-Specific Guides
7. **TDD_QUICK_REFERENCE.md** - Web app TDD with Testing Library
8. **vscode-testing-guide.md** - VS Code extension testing (Vitest/Mocha)
9. **e2e-guide.md** - Playwright E2E testing patterns

### Quality Assurance
10. **quality-assurance.md** - P0 quality gates and release criteria
11. **TESTING.md** - Root-level guide with MSW v2 configuration
12. **snapback-testing-architecture.md** - 5-layer testing architecture (1000+ tests)

## 🔄 Maintenance

**Last Updated:** 2025-12-08

**Update Process:**
1. When testing standards change, update source documents in their original locations
2. Copy updated documents to `ai_dev_utils/testing_docs/`
3. Regenerate `TDD_AGENT_PROMPT.md` using sequential thinking synthesis
4. Update this README with change summary

**Verification:**
```bash
# Verify all source documents are present
ls -1 ai_dev_utils/testing_docs/ | wc -l  # Should be 12 files

# Verify TDD prompt is comprehensive
wc -l ai_dev_utils/TDD_AGENT_PROMPT.md    # Should be ~1,200 lines
```

## 🎓 Usage Examples

### For Coding Agents
```
Include the following file in your context:
ai_dev_utils/TDD_AGENT_PROMPT.md

Follow ALL rules in this document when implementing features.
Zero tolerance for violations.
```

### For Code Review
```
Verify PR against checklist in:
ai_dev_utils/TDD_AGENT_PROMPT.md (Verification Checklist section)
```

### For Testing Infrastructure
```
Reference implementations in:
ai_dev_utils/testing_docs/test-infrastructure-patterns.md
```

## 📊 Statistics

- **Total Source Lines:** ~9,000 lines across 12 documents
- **Synthesized Prompt:** 1,176 lines
- **Compression Ratio:** 7.6x (distilled to most critical patterns)
- **Coverage:** Universal TDD principles + platform-specific patterns
- **Examples:** 50+ code examples (good vs bad patterns)

## 🚀 Future Additions

This directory will be expanded to consolidate other types of documentation:
- Architecture patterns
- API design guidelines
- Security best practices
- Performance optimization guides
- Deployment procedures

**Status:** Testing documentation complete ✅
