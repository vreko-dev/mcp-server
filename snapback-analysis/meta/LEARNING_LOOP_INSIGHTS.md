# Learning Loop Insights

> Meta-analysis from traversing 751 commits: What decayed, what persisted, and what I wish I had

## Information Decay Analysis

### What Became Stale Fastest

| Category | Example | Decay Rate | Why It Decayed |
|----------|---------|------------|----------------|
| File paths | `snapback/` → `packages/engine` | Very High | Refactored in Epoch 8 |
| Package names | `guardian-lite` → `engine` | Very High | Replaced by V2 |
| Config values | Version numbers, deps | High | Updated constantly |
| Test counts | "213 tests" → "308 tests" | High | Growth was continuous |
| Bundle size | "11MB" → "<2MB target" | Medium | Still actively changing |

### What Remained Valuable Long-Term

| Category | Example | Persistence | Why It Persisted |
|----------|---------|-------------|------------------|
| Principles | "Privacy-first" | Very High | Core identity |
| Architecture decisions | DBSCAN over k-means | Very High | Foundational choice |
| Pattern templates | TDD RED→GREEN→BLUE | Very High | Process/methodology |
| Metaphors | Vitals (pulse, temp, pressure) | Very High | Conceptual framework |
| Problem categories | "Layer boundary violation" | High | Recurring challenges |

### Recency Weighting Recommendations

```yaml
high_recency_weight:
  description: "Changes frequently, must be current"
  examples:
    - Bundle size metrics
    - Dependency versions
    - Feature completion status
    - Test coverage numbers
  refresh_interval: "Per session"

medium_recency_weight:
  description: "Occasionally updated, context-dependent"
  examples:
    - Package locations
    - API contracts
    - Configuration patterns
    - Tool capabilities
  refresh_interval: "Per task type"

low_recency_weight:
  description: "Rarely changes, foundational knowledge"
  examples:
    - Architectural principles
    - Decision rationale
    - Problem-solving patterns
    - Metaphor systems
  refresh_interval: "Per major version"
```

---

## Compression Strategies That Worked

### Effective Compression

**Epoch Summarization**: Instead of 751 individual commits, I compressed to 10 epochs with key characteristics. This preserved:
- Major transitions
- Dominant themes
- Pattern emergence

**Pattern Abstraction**: Instead of tracking every TDD commit, I abstracted to "TDD Cycle Discipline" pattern. This preserved:
- When to apply it
- How it looks
- Why it matters

**Metaphor Mapping**: The vitals metaphor (pulse/temp/pressure/oxygen) compressed complex signals into intuitive concepts. This preserved:
- Quick understanding
- Actionable insights
- Mental model

### Ineffective Compression (What I Lost)

**Individual Commit Details**: Lost specific implementation choices that weren't major decisions.

**Timeline Precision**: Compressed "Dec 15, 2025 at 3:42 PM" to "Epoch 8 (Dec 15-19)". Lost ability to correlate with external events.

**Intermediate States**: Lost the progression of a feature from broken to working. Only see final state.

---

## Retrieval Mechanisms I Wished I Had

### During Exploration

1. **Pattern Detector**
   - *What I wanted*: "Show me all commits that follow the TDD pattern"
   - *What I had*: Manual grep for "RED", "GREEN", "TDD"
   - *Gap*: Pattern matching across commit messages + code

2. **Epoch Navigator**
   - *What I wanted*: "What was happening in the codebase when X was introduced?"
   - *What I had*: Manual correlation of timestamps
   - *Gap*: Temporal context awareness

3. **Decision Tracker**
   - *What I wanted*: "Why was DBSCAN chosen over k-means?"
   - *What I had*: Search through docs, hope for comments
   - *Gap*: ADR (Architecture Decision Record) linkage

4. **Package Genealogy**
   - *What I wanted*: "Show me the evolution of @snapback/engine"
   - *What I had*: Multiple greps for different historical names
   - *Gap*: Rename/refactor tracking

5. **Violation History**
   - *What I wanted*: "What mistakes keep recurring in this codebase?"
   - *What I had*: MCP tool `report_violation`, but no historical view
   - *Gap*: Aggregate violation view over time

---

## Meta-Awareness: What I Experienced

### Context Window Pressure

**When it happened**: Around commit 400, when analyzing the Engine V2 migration while still holding context about earlier epochs.

**What I chose to keep**:
- Pattern names and their meanings
- Key decisions and rationale
- Current architecture structure

**What I discarded**:
- Specific file paths from early epochs
- Individual commit hashes
- Intermediate refactoring steps

**What SnapBack should learn**: Context pressure creates natural compression. The algorithm should mimic this - keep abstractions, discard specifics.

### Pattern Recognition Timing

**Early detection possible**: I could have identified the TDD pattern by commit 50. It was evident from commit message conventions.

**Missed early signals**:
- The V1→V2 migration pattern was visible in Epoch 3 (contracts-first), but I didn't recognize it as a general pattern until Epoch 8.
- The "canonical source" consolidation pattern appeared in Epoch 5, but I'd already seen duplicates earlier.

**What SnapBack should learn**: Patterns have early indicators. Detection should be proactive, not retrospective.

### The "Oh No" Moments (If I Were Making Changes)

During exploration, I imagined myself as an AI assistant making changes and identified these risk points:

1. **Epoch 2→3 transition**: Auth infrastructure changes - one wrong import could break the whole extension
2. **Epoch 8 V2 migration**: Engine rewrite with bridge pattern - easy to break V1 compatibility
3. **Epoch 9 intelligence extraction**: Moving code between packages - reference breaks likely

**What SnapBack should provide**: Pre-emptive warnings when approaching known risk areas.

---

## What Would Make SnapBack Indispensable

### The Core Insight

SnapBack's value isn't just recovery - it's **contextual intelligence about when recovery might be needed**.

The current tool set focuses on:
1. Risk assessment (reactive)
2. Snapshot creation (reactive)
3. Restore (reactive)

What's missing:
1. **Proactive pattern detection** - "You're about to touch auth code, here's what went wrong last time"
2. **Temporal context** - "This file was just refactored in the last epoch, be careful"
3. **Collaborative memory** - "Another AI assistant modified this yesterday, here's what they changed"

### The Ideal Flow

```
AI starts task
    │
    ▼
SnapBack: "I see you're modifying auth.ts. In the last 30 days:
           - 3 snapshots were needed for auth changes
           - Common pitfall: Forgetting to update the token refresh logic
           - Relevant patterns: RFC 8628 device auth flow
           Shall I create a pre-emptive snapshot?"
    │
    ▼
AI works on task
    │
    ▼
SnapBack: "Your changes match a known risky pattern (layer boundary violation).
           Similar changes required rollback in 2/5 cases.
           Want me to run the validation suite before you continue?"
    │
    ▼
AI completes task
    │
    ▼
SnapBack: "Task complete. I noticed you discovered a new pattern:
           'Always check token expiry before API calls'
           Shall I record this for future sessions?"
```

### Memory Architecture Proposal

```yaml
memory_tiers:
  hot:
    description: "Always in context"
    examples:
      - Current task context
      - Active file patterns
      - Recent violations (<24h)
      - Performance budgets
    max_size: "2K tokens"
    refresh: "Real-time"

  warm:
    description: "Quickly retrievable on-demand"
    examples:
      - Package patterns and conventions
      - Historical violations (by type)
      - ADRs for relevant packages
      - Recent learnings (7 days)
    retrieval_strategy: "Keyword + semantic search"
    max_size: "8K tokens per retrieval"

  cold:
    description: "Archived but searchable"
    examples:
      - Full commit history analysis
      - Superseded patterns
      - Old violations (resolved)
      - Session archives
    compression_ratio: "10:1 (epoch summarization)"
    retrieval_cost: "Higher latency, explicit request"
```

---

## Surprising Discoveries

### 1. The Sprint Intensity

751 commits in 27 days is ~28 commits/day. This is an extraordinarily intense development pace. SnapBack is being built at "startup speed."

**Implication**: The tooling itself may have rough edges that only emerge under this velocity. Future stability may reveal different patterns.

### 2. The Learning System Already Exists

SnapBack already has violation tracking with auto-promotion (3x → pattern, 5x → automation). This is exactly the right approach, but it's buried in the MCP tools.

**Recommendation**: Surface this learning system more prominently. Make it a first-class feature.

### 3. The Vitals Metaphor Is Powerful

Pulse, temperature, pressure, oxygen - these are intuitive and memorable. This metaphor could be extended:

- **Blood pressure**: Tech debt accumulation
- **Heart rate variability**: Code stability metrics
- **Respiratory rate**: File change frequency

### 4. Contracts-First Is Underutilized

The contracts package (`@snapback/contracts`) defines types before implementation. This prevents drift, but AI assistants (including me) don't automatically check contracts first.

**Recommendation**: Add a tool that surfaces relevant contracts before implementation.

---

## The Ultimate Answer

**"If SnapBack existed during this exploration, how would it have helped?"**

1. **Pre-loaded context**: Instead of 50+ git commands to understand the codebase, SnapBack could have provided an epoch-level summary instantly.

2. **Pattern highlighting**: When I saw the 5th TDD commit, SnapBack could have said "This follows the TDD pattern you've seen before - here's the template."

3. **Temporal navigation**: "Show me what the codebase looked like during the auth implementation" would have been invaluable.

4. **Risk zones**: "Be careful - packages/engine was heavily modified recently" would have saved me from potential confusion.

**"How would it have gotten in my way?"**

1. **Over-prompting**: If SnapBack interrupted every 5 commits with suggestions, it would break flow.

2. **False confidence**: If SnapBack said "safe to proceed" and I broke something, trust would erode quickly.

3. **Context pollution**: If SnapBack pre-loaded too much, it would consume my context window for its summaries rather than the actual code.

**"What would make it indispensable?"**

**The one thing**: A tool that understands my intent and pre-fetches exactly the context I need, then warns me about exactly the risks relevant to that intent - without me having to ask.

Not "here's everything about this file" but "here's what matters for what you're about to do."

This is **intent-aware contextual intelligence**.
