# Workflow 8: Doc Hygiene

**Purpose:** Keep documentation accurate, remove stale docs, prevent context poisoning
**Entry:** Periodic review OR triggered by stale doc detection
**Exit:** Clean, verified documentation

---

## Why This Matters

Outdated documentation:
- **Poisons LLM context** - Agent follows wrong patterns
- **Wastes time** - Developers chase phantom features
- **Creates bugs** - Implementation doesn't match docs
- **Erodes trust** - "Don't trust the docs"

---

## Doc Freshness Standard

Every doc should have a header:

```yaml
---
last_verified: 2025-12-16
verified_by: agent | human | [name]
next_review: 2026-01-16
status: active | stale | archived | deprecated
---
```

### Status Definitions

| Status | Meaning | Action |
|--------|---------|--------|
| `active` | Current and accurate | Keep loading |
| `stale` | May be outdated, needs review | Review before using |
| `archived` | Historical reference only | Move to `_archive/` |
| `deprecated` | Superseded by other doc | Delete or archive |

---

## Stale Detection Triggers

### Automatic Triggers

1. **Age-based** - Doc not updated in 30+ days
2. **Code change** - Related code changed but doc didn't
3. **Reference failure** - Doc references non-existent file/function
4. **Conflict** - Two docs contradict each other

### Manual Triggers

1. Agent encounters incorrect information
2. Developer reports outdated content
3. Periodic review (monthly)

---

## Step 1: Inventory Docs

```bash
# List all markdown files with age
find ai_dev_utils -name "*.md" -exec ls -la {} \; | sort -k6,7

# Find docs older than 30 days
find ai_dev_utils -name "*.md" -mtime +30

# Check for missing freshness headers
grep -L "last_verified:" ai_dev_utils/**/*.md
```

---

## Step 2: Verify Accuracy

For each doc, check:

### Code References

```bash
# Extract file references from doc
grep -oE 'apps/[^`\s]+|packages/[^`\s]+' [DOC_FILE]

# Verify each reference exists
for file in $(grep -oE 'apps/[^`\s]+' [DOC_FILE]); do
  [ -f "$file" ] || echo "MISSING: $file"
done
```

### Function/Class References

```bash
# Extract function names
grep -oE '[A-Z][a-zA-Z]+\(' [DOC_FILE] | sort -u

# Verify they exist in codebase
for func in $(grep -oE '[A-Z][a-zA-Z]+\(' [DOC_FILE] | tr -d '(' | sort -u); do
  grep -rq "$func" apps/ packages/ || echo "MISSING: $func"
done
```

### Pattern Accuracy

Compare documented patterns against actual implementation:

```bash
# If doc says "use X pattern"
# Verify codebase actually uses X pattern
grep -rn "[PATTERN]" apps/ packages/
```

---

## Step 3: Classify Each Doc

| Finding | Classification | Action |
|---------|---------------|--------|
| Accurate, current | `active` | Update `last_verified` |
| Minor updates needed | `active` | Fix and update header |
| Major rewrite needed | `stale` | Schedule rewrite |
| No longer relevant | `deprecated` | Mark for archive |
| Historical only | `archived` | Move to `_archive/` |
| Contradicts other docs | `conflict` | Resolve, consolidate |

---

## Step 4: Take Action

### Update Active Docs

```yaml
---
last_verified: 2025-12-16
verified_by: agent
next_review: 2026-01-16
status: active
---
```

### Fix Stale Docs

1. Update incorrect information
2. Remove references to non-existent code
3. Align with current implementation
4. Update header

### Archive Outdated Docs

```bash
# Move to archive
mv ai_dev_utils/[OUTDATED_DOC].md ai_dev_utils/_archive/

# Or for project-specific docs
mv ai_dev_utils/CONSOLIDATED_*.md ai_dev_utils/_archive/
```

### Delete Deprecated Docs

Only after confirming:
- No other docs reference it
- Information exists elsewhere
- Not needed for historical context

---

## Step 5: Record Changes

### Update learnings.jsonl

```bash
./ai_dev_utils/scripts/learn.sh "stale_doc" "[doc_name]" "[what_was_wrong]" "doc-hygiene-[date]"
```

### Log Summary

```yaml
doc_hygiene:
  date: "2025-12-16"
  docs_reviewed: [NUMBER]
  
  results:
    active_verified: [NUMBER]
    updated: [NUMBER]
    archived: [NUMBER]
    deleted: [NUMBER]
    
  issues_found:
    - doc: "[DOC_NAME]"
      issue: "[DESCRIPTION]"
      resolution: "[ACTION_TAKEN]"
      
  next_review: "2026-01-16"
```

---

## Consolidation Opportunities

### Signs of Needed Consolidation

- Multiple docs covering same topic
- Contradictory information
- Overlapping content
- Reader confusion

### Consolidation Process

1. Identify overlapping docs
2. Create single authoritative doc
3. Archive or delete redundant docs
4. Update all references

---

## Prevention: Good Doc Practices

1. **Always add freshness header** to new docs
2. **Update docs with code changes** - Same PR
3. **Single source of truth** - One doc per topic
4. **Reference, don't copy** - Link to canonical sources
5. **Review monthly** - Add to calendar

---

## Files to Check in ai_dev_utils

### Keep Active (verify regularly)

- `ROUTER.md` - Entry point
- `workflows/*.md` - Core workflows
- `phases/*.md` - TDD phases
- `patterns/*.md` - Code patterns
- `feedback/learnings.jsonl` - Machine learnings

### Archive Candidates

- `CONSOLIDATED_*.md` - Project-specific
- `v1_rollout/` - Project-specific
- `v1_update/` - Project-specific
- `testing_docs/` - Synthesized into workflows

### Delete Candidates

- Duplicate content
- Superseded docs
- Empty or placeholder docs

---

**Last Verified:** 2025-12-16
**Status:** active
