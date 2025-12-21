Ah, this reframes everything. You want the **learning system itself** to be the product feature, not just internal tooling.

## The Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SNAPBACK LEARNS YOU                                  │
│                                                                              │
│   Global (User Level)                   Per-Workspace                        │
│   ───────────────────                   ─────────────                        │
│   ~/.snapback/                          .snapback/                           │
│                                                                              │
│   • Preferred stack (Next.js, pnpm)     • This project's architecture       │
│   • Coding style (tabs vs spaces)       • Critical files for THIS codebase  │
│   • Communication preferences           • Local patterns & conventions       │
│   • Common patterns across projects     • Team-specific rules               │
│   • Tool preferences (Cursor/Claude)    • Framework-specific protection     │
│                                                                              │
│   "User always uses TypeScript"         "This project uses Drizzle"         │
│   "User prefers concise responses"      "Auth is in src/lib/auth/"          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   CONSISTENT DX FROM DAY 1    │
                    │                               │
                    │   MCP tools already know:     │
                    │   • How to talk to this user  │
                    │   • What they care about      │
                    │   • Their tech preferences    │
                    │   • Their protection style    │
                    └───────────────────────────────┘
```

## Architecture: Learning at Two Levels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                          │
│                                                                              │
│   GLOBAL LEARNING                        WORKSPACE LEARNING                  │
│   (Server-side, user profile)            (Server-side, per workspace)        │
│                                                                              │
│   snap login                             snap init                           │
│       │                                      │                               │
│       ▼                                      ▼                               │
│   ┌──────────────┐                      ┌──────────────┐                    │
│   │ User Profile │                      │  Workspace   │                    │
│   │              │                      │   Profile    │                    │
│   │ • Stack prefs│                      │              │                    │
│   │ • Style      │◄─── aggregated ──────│ • Framework  │                    │
│   │ • Patterns   │     learnings        │ • Structure  │                    │
│   │ • Defaults   │                      │ • Patterns   │                    │
│   └──────────────┘                      └──────────────┘                    │
│          │                                     │                             │
│          └──────────────┬──────────────────────┘                             │
│                         │                                                    │
│                         ▼                                                    │
│              ┌─────────────────────┐                                        │
│              │  MCP Tool Context   │                                        │
│              │                     │                                        │
│              │  Every tool call    │                                        │
│              │  receives:          │                                        │
│              │  • User preferences │                                        │
│              │  • Workspace context│                                        │
│              │  • Learned patterns │                                        │
│              └─────────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema: User Learning

```sql
-- ============================================================
-- USER PROFILE & PREFERENCES (Global Learning)
-- ============================================================

-- Learned user preferences (aggregated across all workspaces)
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,

  -- Detected preferences (learned over time)
  preferences JSONB DEFAULT '{}',
  /*
    {
      "stack": {
        "languages": ["typescript", "python"],
        "frameworks": ["nextjs", "fastapi"],
        "packageManagers": ["pnpm"],
        "testing": ["vitest", "playwright"],
        "confidence": 0.85
      },
      "style": {
        "formatting": "prettier",
        "semicolons": false,
        "quotes": "single",
        "indentation": "tabs"
      },
      "communication": {
        "verbosity": "concise",      -- concise | detailed | balanced
        "codeComments": "minimal",   -- minimal | moderate | extensive
        "explanationStyle": "examples"  -- examples | theory | both
      },
      "protection": {
        "defaultLevel": "standard",
        "autoSnapshot": true,
        "snapshotFrequency": "on-ai-edit"
      }
    }
  */

  -- Patterns seen across workspaces
  cross_workspace_patterns JSONB DEFAULT '[]',
  /*
    [
      { "pattern": "always uses src/ directory", "confidence": 0.9, "count": 12 },
      { "pattern": "prefers named exports", "confidence": 0.8, "count": 8 },
      { "pattern": "uses path aliases (@/)", "confidence": 0.95, "count": 15 }
    ]
  */

  -- Learning metadata
  workspaces_analyzed INTEGER DEFAULT 0,
  total_snapshots INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  learning_version INTEGER DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- User preference history (for learning trends)
CREATE TABLE user_preference_signals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- What we observed
  signal_type TEXT NOT NULL,  -- 'stack' | 'style' | 'behavior' | 'protection'
  signal_key TEXT NOT NULL,   -- 'uses_typescript' | 'prefers_pnpm'
  signal_value TEXT,
  confidence REAL DEFAULT 0.5,

  -- Source
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  source TEXT NOT NULL,       -- 'vitals' | 'behavior' | 'explicit' | 'inferred'

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pref_signals_user ON user_preference_signals(user_id);
CREATE INDEX idx_pref_signals_type ON user_preference_signals(signal_type, signal_key);


-- ============================================================
-- WORKSPACE LEARNING (Per-Codebase)
-- ============================================================

-- Already have workspaces table, add learning fields
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS
  learned_patterns JSONB DEFAULT '{}';
  /*
    {
      "architecture": {
        "srcStructure": "feature-based",  -- feature-based | layer-based | flat
        "entryPoints": ["src/index.ts", "src/app/page.tsx"],
        "configLocation": "root"
      },
      "conventions": {
        "componentStyle": "functional",
        "stateManagement": "zustand",
        "apiPattern": "trpc"
      },
      "criticalPaths": [
        "src/lib/auth/",
        "src/db/schema/",
        "prisma/"
      ],
      "teamPatterns": [
        { "pattern": "feature flags in src/flags/", "confidence": 0.9 }
      ]
    }
  */

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS
  learning_version INTEGER DEFAULT 1;


-- ============================================================
-- CROSS-WORKSPACE PATTERN AGGREGATION
-- ============================================================

-- Patterns that appear across multiple workspaces = strong signal
CREATE TABLE aggregated_patterns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- The pattern
  pattern_type TEXT NOT NULL,  -- 'directory_structure' | 'naming' | 'tooling' | 'workflow'
  pattern_key TEXT NOT NULL,
  pattern_value TEXT,

  -- Aggregation stats
  occurrence_count INTEGER DEFAULT 1,
  workspace_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),

  -- Confidence increases with repetition
  confidence REAL DEFAULT 0.5,

  -- Promoted to preference after threshold
  promoted_to_preference BOOLEAN DEFAULT false,
  promoted_at TIMESTAMP,

  UNIQUE(user_id, pattern_type, pattern_key)
);

CREATE INDEX idx_agg_patterns_user ON aggregated_patterns(user_id);
CREATE INDEX idx_agg_patterns_confidence ON aggregated_patterns(confidence DESC);
```

## How Learning Happens

```typescript
// Server-side learning engine

interface LearningEngine {

  /**
   * Called after every workspace init
   * Extracts signals from vitals
   */
  async learnFromVitals(userId: string, workspaceId: string, vitals: ProcessedVitals) {
    const signals: PreferenceSignal[] = [];

    // Stack detection
    if (vitals.framework) {
      signals.push({
        type: 'stack',
        key: 'framework',
        value: vitals.framework.name,
        confidence: vitals.framework.confidence,
        source: 'vitals'
      });
    }

    if (vitals.packageManager) {
      signals.push({
        type: 'stack',
        key: 'package_manager',
        value: vitals.packageManager.name,
        confidence: 0.95,  // High confidence - explicit choice
        source: 'vitals'
      });
    }

    if (vitals.typescript?.enabled) {
      signals.push({
        type: 'stack',
        key: 'typescript',
        value: 'true',
        confidence: 0.95,
        source: 'vitals'
      });

      if (vitals.typescript.strict) {
        signals.push({
          type: 'style',
          key: 'typescript_strict',
          value: 'true',
          confidence: 0.9,
          source: 'vitals'
        });
      }
    }

    // Record signals
    await this.recordSignals(userId, workspaceId, signals);

    // Aggregate across workspaces
    await this.aggregatePatterns(userId);

    // Update user profile
    await this.updateUserProfile(userId);
  }

  /**
   * Called after behavior observations
   */
  async learnFromBehavior(userId: string, event: BehaviorEvent) {
    // E.g., user always protects .env files → preference
    // E.g., user frequently rolls back config changes → suggest higher protection
  }

  /**
   * Aggregate patterns across workspaces
   * Repeated patterns become preferences
   */
  async aggregatePatterns(userId: string) {
    const signals = await db.query(`
      SELECT signal_type, signal_key, signal_value,
             COUNT(DISTINCT workspace_id) as workspace_count,
             AVG(confidence) as avg_confidence
      FROM user_preference_signals
      WHERE user_id = $1
      GROUP BY signal_type, signal_key, signal_value
      HAVING COUNT(DISTINCT workspace_id) >= 2
    `, [userId]);

    for (const signal of signals) {
      await db.upsert('aggregated_patterns', {
        userId,
        patternType: signal.signal_type,
        patternKey: signal.signal_key,
        patternValue: signal.signal_value,
        workspaceCount: signal.workspace_count,
        confidence: calculateConfidence(signal),
      });
    }
  }

  /**
   * Promote high-confidence patterns to user preferences
   */
  async updateUserProfile(userId: string) {
    const patterns = await db.query(`
      SELECT * FROM aggregated_patterns
      WHERE user_id = $1 AND confidence >= 0.7
      ORDER BY confidence DESC
    `, [userId]);

    const preferences = buildPreferencesFromPatterns(patterns);

    await db.update('user_profiles', {
      userId,
      preferences,
      updatedAt: new Date(),
    });
  }
}
```

## MCP Context Enrichment

```typescript
// When MCP tool is called, context includes learned preferences

async function executeToolWithContext(
  userId: string,
  workspaceId: string,
  tool: string,
  args: unknown
) {
  // Fetch learned context
  const [userProfile, workspace] = await Promise.all([
    db.get('user_profiles', userId),
    db.get('workspaces', workspaceId),
  ]);

  // Build enriched context
  const context = {
    // User-level (global)
    user: {
      preferences: userProfile.preferences,
      patterns: userProfile.cross_workspace_patterns,
      tier: userProfile.tier,
    },

    // Workspace-level
    workspace: {
      framework: workspace.framework,
      patterns: workspace.learned_patterns,
      protectedFiles: workspace.protected_files,
    },

    // Combined intelligence
    guidance: generateGuidance(userProfile, workspace),
  };

  // Tool execution with full context
  return await handlers[tool](context, args);
}

function generateGuidance(user: UserProfile, workspace: Workspace): Guidance {
  return {
    // Communication style
    responseStyle: user.preferences.communication?.verbosity || 'balanced',

    // Technical context
    assumeStack: {
      typescript: user.preferences.stack?.languages?.includes('typescript'),
      framework: workspace.framework?.name || user.preferences.stack?.frameworks?.[0],
    },

    // Protection recommendations
    protectionDefaults: {
      level: user.preferences.protection?.defaultLevel || 'standard',
      autoSnapshot: user.preferences.protection?.autoSnapshot ?? true,
    },

    // Workspace-specific
    criticalPaths: workspace.learned_patterns?.criticalPaths || [],
  };
}
```

## CLI Flow with Learning

```bash
# First workspace - learns initial preferences
$ snap init

✓ Logged in as qwynn@example.com

Scanning workspace...
✓ Detected: Next.js 14 + TypeScript + pnpm + Drizzle

📚 Learning your preferences...
   • Added: TypeScript (strict mode)
   • Added: pnpm as package manager
   • Added: Next.js App Router
   • Added: Drizzle ORM

✓ SnapBack initialized!


# Second workspace - already knows you
$ cd ../other-project
$ snap init

✓ Logged in as qwynn@example.com

Scanning workspace...
✓ Detected: Express + TypeScript + pnpm

📚 Recognized patterns:
   • TypeScript (you use this in 2/2 projects)
   • pnpm (you use this in 2/2 projects)

🆕 New for this workspace:
   • Express (backend framework)
   • PostgreSQL with Prisma

✓ SnapBack initialized!


# By third workspace, MCP tools have rich context
# When AI calls analyze_risk, it knows:
# - You're a TypeScript developer
# - You prefer pnpm
# - You use strict mode
# - Your projects tend to have src/ structure
```

## Most Efficient Path

Given this vision, here's what I'd recommend:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION ORDER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CORE CLI (Week 1)                                                        │
│     ├── snap login/logout/whoami                                             │
│     ├── snap init (with learning hooks)                                      │
│     └── snap status                                                          │
│                                                                              │
│  2. SERVER LEARNING (Week 1-2)                                               │
│     ├── user_profiles table + API                                            │
│     ├── Learning engine (learnFromVitals)                                    │
│     └── Pattern aggregation                                                  │
│                                                                              │
│  3. THIN MCP (Week 2)                                                        │
│     ├── Proxy implementation                                                 │
│     └── Context enrichment with learned prefs                                │
│                                                                              │
│  4. ai_dev_utils MIGRATION (Week 2-3)                                        │
│     ├── You switch to using snap CLI                                         │
│     ├── Internal patterns stay as markdown                                   │
│     └── codebase:* tools become snap dev:* (optional)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The internal pair programmer patterns become the seed data for your own user profile.** You're user #1, and your learnings bootstrap your preferences.

Does this align with what you're envisioning?
