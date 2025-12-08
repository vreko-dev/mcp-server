## SnapBack Tier-Gating Implementation Specification

**Version**: 1.0
**Status**: Implementation Ready
**Last Updated**: December 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Feature Registry](#feature-registry)
4. [Server-Side Enforcement](#server-side-enforcement)
5. [Rate Limiting](#rate-limiting)
6. [Client Integration](#client-integration)
7. [MCP Tool Gating](#mcp-tool-gating)
8. [CLI Gating](#cli-gating)
9. [Upgrade Flow](#upgrade-flow)
10. [Testing Strategy](#testing-strategy)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TIER-GATING ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  CLIENT LAYER (No IP, No Enforcement Logic)                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                             │   │
│  │  Extension          CLI              MCP Server         Dashboard          │   │
│  │  ┌─────────┐       ┌─────────┐      ┌─────────┐       ┌─────────┐         │   │
│  │  │ Feature │       │ Feature │      │ Feature │       │ Feature │         │   │
│  │  │ Client  │       │ Client  │      │ Client  │       │ Client  │         │   │
│  │  └────┬────┘       └────┬────┘      └────┬────┘       └────┬────┘         │   │
│  │       │                 │                │                 │               │   │
│  └───────┼─────────────────┼────────────────┼─────────────────┼───────────────┘   │
│          │                 │                │                 │                   │
│          └─────────────────┴────────┬───────┴─────────────────┘                   │
│                                     │                                              │
│                                     ▼                                              │
│  SERVER LAYER (All Enforcement Here)                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                             │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │   │
│  │  │   Auth      │───▶│   Tier      │───▶│  Feature    │                    │   │
│  │  │ Middleware  │    │  Resolver   │    │   Gate      │                    │   │
│  │  └─────────────┘    └─────────────┘    └──────┬──────┘                    │   │
│  │                                               │                            │   │
│  │                           ┌───────────────────┼───────────────────┐        │   │
│  │                           │                   │                   │        │   │
│  │                           ▼                   ▼                   ▼        │   │
│  │                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │                    │    Rate     │    │  Feature    │    │   Usage     │  │   │
│  │                    │   Limiter   │    │  Executor   │    │  Tracker    │  │   │
│  │                    └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  │                                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  DATA LAYER                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL              Redis                   PostHog                    │   │
│  │  ├─ subscriptions        ├─ rate_limits          ├─ usage_events           │   │
│  │  ├─ usage_tracking       ├─ tier_cache           └─ upgrade_funnels        │   │
│  │  └─ feature_overrides    └─ feature_flags                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### Core Tables

```typescript
// packages/platform/src/db/schema/snapback/tiers.ts

import { pgTable, pgEnum, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from '../postgres';

// ============================================
// Enums
// ============================================

export const tierEnum = pgEnum('tier', ['free', 'pro', 'team', 'enterprise']);
export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'yearly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'paused',
]);

// ============================================
// Subscriptions
// ============================================

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Owner (user or org)
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  orgId: text('org_id').references(() => organization.id, { onDelete: 'cascade' }),

  // Tier info
  tier: tierEnum('tier').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('active'),

  // Billing
  billingInterval: billingIntervalEnum('billing_interval'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),

  // External provider
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),

  // Seats (for team/enterprise)
  seatCount: integer('seat_count').default(1),
  seatLimit: integer('seat_limit').default(1),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// Usage Tracking (for rate limits)
// ============================================

export const usageTracking = pgTable('usage_tracking', {
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Owner
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  orgId: text('org_id').references(() => organization.id, { onDelete: 'cascade' }),

  // Usage period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Counters (reset each period)
  aiDetectionCount: integer('ai_detection_count').default(0),
  vulnerabilityScanCount: integer('vulnerability_scan_count').default(0),
  apiCallCount: integer('api_call_count').default(0),
  cloudStorageBytes: integer('cloud_storage_bytes').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Composite index for fast lookups
// CREATE INDEX idx_usage_tracking_owner_period ON usage_tracking(user_id, period_start);
// CREATE INDEX idx_usage_tracking_org_period ON usage_tracking(org_id, period_start);

// ============================================
// Feature Overrides (for granular control)
// ============================================

export const featureOverrides = pgTable('feature_overrides', {
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Owner
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  orgId: text('org_id').references(() => organization.id, { onDelete: 'cascade' }),

  // Override
  featureId: text('feature_id').notNull(),
  enabled: boolean('enabled').notNull(),

  // Optional limit override
  limitOverride: integer('limit_override'),

  // Reason for override
  reason: text('reason'), // "Beta tester", "Enterprise deal", etc.

  // Expiration
  expiresAt: timestamp('expires_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// Upgrade Events (for analytics)
// ============================================

export const upgradeEvents = pgTable('upgrade_events', {
  id: text('id').primaryKey().$defaultFn(() => createId()),

  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),

  // What triggered it
  triggerFeature: text('trigger_feature').notNull(), // e.g., "ai_detection"
  triggerContext: text('trigger_context'), // e.g., "limit_reached"
  triggerSource: text('trigger_source'), // e.g., "extension", "cli", "dashboard"

  // Outcome
  outcome: text('outcome'), // "upgraded", "dismissed", "later"

  // From/To
  fromTier: tierEnum('from_tier'),
  toTier: tierEnum('to_tier'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Relations

```typescript
// packages/platform/src/db/schema/snapback/tiers.relations.ts

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, {
    fields: [subscriptions.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [subscriptions.orgId],
    references: [organization.id],
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(user, {
    fields: [usageTracking.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [usageTracking.orgId],
    references: [organization.id],
  }),
}));
```

---

## 3. Feature Registry

### Feature Definitions

```typescript
// packages/contracts/src/tiers/features.ts

import { z } from 'zod';

// ============================================
// Feature Categories
// ============================================

export const FeatureCategory = z.enum([
  'protection',      // Core snapshot/restore
  'ai_detection',    // AI pattern detection
  'scan',            // Code scanning
  'cloud',           // Cloud sync/backup
  'integration',     // CLI, MCP, CI/CD
  'analytics',       // Dashboard, trends
  'team',            // Collaboration
]);

// ============================================
// Feature Definition Schema
// ============================================

export const FeatureDefinition = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: FeatureCategory,

  // Tier availability
  tiers: z.object({
    free: z.union([z.boolean(), z.number()]),      // true, false, or limit
    pro: z.union([z.boolean(), z.number()]),
    team: z.union([z.boolean(), z.number()]),
    enterprise: z.union([z.boolean(), z.number()]),
  }),

  // Rate limiting (if applicable)
  rateLimit: z.object({
    window: z.enum(['minute', 'hour', 'day', 'month']),
    limits: z.object({
      free: z.number(),
      pro: z.number(),
      team: z.number(),
      enterprise: z.number(),
    }),
  }).optional(),

  // IP protection level
  ipProtection: z.enum(['none', 'server_only', 'compiled']),

  // Upgrade prompt config
  upgradePrompt: z.object({
    title: z.string(),
    description: z.string(),
    cta: z.string(),
  }).optional(),
});

export type FeatureDefinition = z.infer<typeof FeatureDefinition>;
export type Tier = 'free' | 'pro' | 'team' | 'enterprise';

// ============================================
// Feature Registry
// ============================================

export const FEATURES: Record<string, FeatureDefinition> = {
  // ─────────────────────────────────────────
  // PROTECTION (Core - Free Forever)
  // ─────────────────────────────────────────
  'protection.auto_snapshot': {
    id: 'protection.auto_snapshot',
    name: 'Automatic Snapshots',
    description: 'Create snapshots automatically on file save',
    category: 'protection',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'protection.manual_snapshot': {
    id: 'protection.manual_snapshot',
    name: 'Manual Snapshots',
    description: 'Create snapshots on demand',
    category: 'protection',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'protection.restore': {
    id: 'protection.restore',
    name: 'Snapshot Restore',
    description: 'Restore files from any snapshot',
    category: 'protection',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'protection.levels': {
    id: 'protection.levels',
    name: 'Protection Levels',
    description: 'Configure Watch, Warn, Block per file pattern',
    category: 'protection',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'protection.session_grouping_basic': {
    id: 'protection.session_grouping_basic',
    name: 'Basic Session Grouping',
    description: 'Group snapshots by time window',
    category: 'protection',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'protection.session_grouping_smart': {
    id: 'protection.session_grouping_smart',
    name: 'Smart Session Grouping',
    description: 'DBSCAN clustering for intelligent change grouping',
    category: 'protection',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
    upgradePrompt: {
      title: 'Intelligent Change Grouping',
      description: 'SnapBack Pro automatically groups related changes so you can restore entire features, not just individual saves.',
      cta: 'Upgrade to Pro',
    },
  },

  'protection.rollback_validation': {
    id: 'protection.rollback_validation',
    name: 'Rollback Safety Validation',
    description: 'Analyze rollback safety before restoring',
    category: 'protection',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
    upgradePrompt: {
      title: 'Safe Rollbacks',
      description: 'Know before you restore: SnapBack Pro analyzes dependencies and warns about potential breaking changes.',
      cta: 'Upgrade to Pro',
    },
  },

  // ─────────────────────────────────────────
  // AI DETECTION (IP Protected)
  // ─────────────────────────────────────────
  'ai.detection': {
    id: 'ai.detection',
    name: 'AI Detection',
    description: 'Detect AI-generated code changes',
    category: 'ai_detection',
    tiers: { free: 50, pro: true, team: true, enterprise: true }, // 50/day free
    rateLimit: {
      window: 'day',
      limits: { free: 50, pro: 10000, team: 50000, enterprise: -1 }, // -1 = unlimited
    },
    ipProtection: 'server_only',
    upgradePrompt: {
      title: 'AI Detection Limit Reached',
      description: "You've analyzed 50 files today. Upgrade for unlimited AI detection.",
      cta: 'Upgrade to Pro',
    },
  },

  'ai.tool_identification': {
    id: 'ai.tool_identification',
    name: 'AI Tool Identification',
    description: 'Identify which AI tool generated code (Cursor, Copilot, Claude)',
    category: 'ai_detection',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
    upgradePrompt: {
      title: 'Know Your AI',
      description: 'Pro identifies which AI tool generated each change—Cursor, Copilot, or Claude.',
      cta: 'Upgrade to Pro',
    },
  },

  'ai.confidence_scoring': {
    id: 'ai.confidence_scoring',
    name: 'AI Confidence Scoring',
    description: 'Get confidence scores for AI detection',
    category: 'ai_detection',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
  },

  'ai.burst_detection': {
    id: 'ai.burst_detection',
    name: 'AI Burst Detection',
    description: 'Detect rapid AI-assisted editing sessions',
    category: 'ai_detection',
    tiers: { free: 'basic', pro: 'advanced', team: 'advanced', enterprise: 'advanced' },
    ipProtection: 'server_only',
  },

  'ai.pattern_explanation': {
    id: 'ai.pattern_explanation',
    name: 'AI Pattern Explanations',
    description: 'Understand why code was flagged as AI-generated',
    category: 'ai_detection',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
  },

  // ─────────────────────────────────────────
  // SCAN (Mixed - Open + Protected Rules)
  // ─────────────────────────────────────────
  'scan.instant': {
    id: 'scan.instant',
    name: 'Instant Scan',
    description: 'Quick scan on save (<50ms)',
    category: 'scan',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none', // Open rules only for free
  },

  'scan.workspace': {
    id: 'scan.workspace',
    name: 'Workspace Scan',
    description: 'Full workspace code analysis',
    category: 'scan',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none', // But protected rules require API
  },

  'scan.rules.open': {
    id: 'scan.rules.open',
    name: 'Open Scan Rules',
    description: 'Basic linting, formatting, imports',
    category: 'scan',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'scan.rules.protected': {
    id: 'scan.rules.protected',
    name: 'Protected Scan Rules',
    description: 'AI patterns, consistency, vibe code detection',
    category: 'scan',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
    upgradePrompt: {
      title: 'Smart Code Analysis',
      description: 'Pro includes AI pattern detection, naming consistency scoring, and "vibe code" smell detection.',
      cta: 'Upgrade to Pro',
    },
  },

  'scan.vulnerability': {
    id: 'scan.vulnerability',
    name: 'Vulnerability Scanning',
    description: 'CVE database lookup and security analysis',
    category: 'scan',
    tiers: { free: 10, pro: true, team: true, enterprise: true }, // 10/day free
    rateLimit: {
      window: 'day',
      limits: { free: 10, pro: 1000, team: 5000, enterprise: -1 },
    },
    ipProtection: 'server_only',
  },

  'scan.quick_fix': {
    id: 'scan.quick_fix',
    name: 'Quick Fixes',
    description: 'One-click fixes for detected issues',
    category: 'scan',
    tiers: { free: 'open_only', pro: true, team: true, enterprise: true },
    ipProtection: 'none', // Open rules = local, protected rules = server
  },

  'scan.history': {
    id: 'scan.history',
    name: 'Scan History',
    description: 'Historical scan results and trends',
    category: 'scan',
    tiers: { free: false, pro: 90, team: -1, enterprise: -1 }, // 90 days, unlimited
    ipProtection: 'server_only',
  },

  // ─────────────────────────────────────────
  // CLOUD (Pro Feature)
  // ─────────────────────────────────────────
  'cloud.backup': {
    id: 'cloud.backup',
    name: 'Cloud Snapshot Backup',
    description: 'Sync snapshots to secure cloud storage',
    category: 'cloud',
    tiers: {
      free: false,
      pro: 10 * 1024 * 1024 * 1024,     // 10GB
      team: 100 * 1024 * 1024 * 1024,    // 100GB
      enterprise: -1,                      // Unlimited
    },
    ipProtection: 'none', // Storage, not IP
    upgradePrompt: {
      title: 'Never Lose a Snapshot',
      description: 'Cloud backup keeps your snapshots safe across devices. 10GB included with Pro.',
      cta: 'Upgrade to Pro',
    },
  },

  'cloud.sync': {
    id: 'cloud.sync',
    name: 'Cross-Device Sync',
    description: 'Access snapshots from any device',
    category: 'cloud',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'cloud.sharing': {
    id: 'cloud.sharing',
    name: 'Snapshot Sharing',
    description: 'Share snapshots via link',
    category: 'cloud',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  // ─────────────────────────────────────────
  // INTEGRATIONS
  // ─────────────────────────────────────────
  'integration.extension': {
    id: 'integration.extension',
    name: 'VS Code Extension',
    description: 'Full VS Code extension access',
    category: 'integration',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'integration.cli_basic': {
    id: 'integration.cli_basic',
    name: 'CLI Basic Commands',
    description: 'Snapshot, restore, list commands',
    category: 'integration',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'integration.cli_cicd': {
    id: 'integration.cli_cicd',
    name: 'CLI CI/CD Integration',
    description: 'CI/CD pipeline integration, SARIF output',
    category: 'integration',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
    upgradePrompt: {
      title: 'Automate Quality Gates',
      description: 'Add SnapBack to your CI/CD pipeline. Catch AI issues before they hit production.',
      cta: 'Upgrade to Pro',
    },
  },

  'integration.mcp_basic': {
    id: 'integration.mcp_basic',
    name: 'MCP Basic Tools',
    description: 'analyze_risk (basic), check_dependencies, catalog',
    category: 'integration',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'integration.mcp_advanced': {
    id: 'integration.mcp_advanced',
    name: 'MCP Advanced Tools',
    description: 'Checkpoint tools, explain, fix',
    category: 'integration',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
    upgradePrompt: {
      title: 'AI Assistant Superpowers',
      description: 'Let your AI assistant create checkpoints, explain issues, and apply fixes automatically.',
      cta: 'Upgrade to Pro',
    },
  },

  'integration.github_action': {
    id: 'integration.github_action',
    name: 'GitHub Action',
    description: 'Official GitHub Action for PR checks',
    category: 'integration',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'integration.api': {
    id: 'integration.api',
    name: 'API Access',
    description: 'Direct API access for custom integrations',
    category: 'integration',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    rateLimit: {
      window: 'minute',
      limits: { free: 0, pro: 100, team: 500, enterprise: 2000 },
    },
    ipProtection: 'none',
  },

  'integration.webhooks': {
    id: 'integration.webhooks',
    name: 'Webhooks',
    description: 'Receive events via webhook',
    category: 'integration',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  // ─────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────
  'analytics.dashboard': {
    id: 'analytics.dashboard',
    name: 'Dashboard Access',
    description: 'Access to web dashboard',
    category: 'analytics',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'analytics.metrics_basic': {
    id: 'analytics.metrics_basic',
    name: 'Basic Metrics',
    description: 'Snapshot count, recovery count',
    category: 'analytics',
    tiers: { free: true, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'analytics.metrics_ai': {
    id: 'analytics.metrics_ai',
    name: 'AI Detection Metrics',
    description: 'AI detection rates and patterns',
    category: 'analytics',
    tiers: { free: 'basic', pro: 'full', team: 'full', enterprise: 'full' },
    ipProtection: 'server_only',
  },

  'analytics.health_score': {
    id: 'analytics.health_score',
    name: 'Code Health Score',
    description: 'Aggregated code health scoring',
    category: 'analytics',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
  },

  'analytics.trends': {
    id: 'analytics.trends',
    name: 'Trend Analysis',
    description: 'Historical trends and insights',
    category: 'analytics',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'server_only',
  },

  'analytics.export': {
    id: 'analytics.export',
    name: 'Report Export',
    description: 'Export analytics reports',
    category: 'analytics',
    tiers: { free: false, pro: true, team: true, enterprise: true },
    ipProtection: 'none',
  },

  // ─────────────────────────────────────────
  // TEAM
  // ─────────────────────────────────────────
  'team.workspace': {
    id: 'team.workspace',
    name: 'Team Workspace',
    description: 'Shared team workspace',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'team.policies': {
    id: 'team.policies',
    name: 'Shared Policies',
    description: 'Team-wide protection policies',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'team.members': {
    id: 'team.members',
    name: 'Member Management',
    description: 'Add and manage team members',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'team.roles': {
    id: 'team.roles',
    name: 'Role-Based Access',
    description: 'Admin, member, viewer roles',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'team.audit_logs': {
    id: 'team.audit_logs',
    name: 'Audit Logs',
    description: 'Team activity audit trail',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'team.sso': {
    id: 'team.sso',
    name: 'SSO Integration',
    description: 'SAML/OIDC single sign-on',
    category: 'team',
    tiers: { free: false, pro: false, team: false, enterprise: true },
    ipProtection: 'none',
  },

  'team.retention_custom': {
    id: 'team.retention_custom',
    name: 'Custom Retention Policies',
    description: 'Configure data retention per policy',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },

  'team.support_priority': {
    id: 'team.support_priority',
    name: 'Priority Support',
    description: 'Priority support with SLA',
    category: 'team',
    tiers: { free: false, pro: false, team: true, enterprise: true },
    ipProtection: 'none',
  },
} as const;

// ============================================
// Helper Types
// ============================================

export type FeatureId = keyof typeof FEATURES;

export function getFeature(id: FeatureId): FeatureDefinition {
  return FEATURES[id];
}

export function isFeatureAvailable(id: FeatureId, tier: Tier): boolean {
  const feature = FEATURES[id];
  const tierValue = feature.tiers[tier];

  if (typeof tierValue === 'boolean') {
    return tierValue;
  }

  // If it's a number, feature is available (with limit)
  if (typeof tierValue === 'number') {
    return tierValue > 0 || tierValue === -1; // -1 = unlimited
  }

  // String values like 'basic' or 'advanced' mean available
  return tierValue !== false;
}

export function getFeatureLimit(id: FeatureId, tier: Tier): number | null {
  const feature = FEATURES[id];
  const tierValue = feature.tiers[tier];

  if (typeof tierValue === 'number') {
    return tierValue === -1 ? null : tierValue; // null = unlimited
  }

  return null;
}
```

---

## 4. Server-Side Enforcement

### Tier Resolver Service

```typescript
// packages/api/modules/tiers/services/TierResolver.ts

import { db } from '@snapback/platform';
import { redis } from '@snapback/infrastructure';
import { subscriptions, featureOverrides, usageTracking } from '@snapback/platform/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface TierContext {
  tier: Tier;
  userId: string;
  orgId?: string;

  // Resolved limits
  limits: Record<string, number | null>;

  // Current usage
  usage: Record<string, number>;

  // Feature overrides
  overrides: Record<string, boolean>;
}

export class TierResolver {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Resolve complete tier context for a user
   * This is the SINGLE SOURCE OF TRUTH for tier checking
   */
  async resolve(userId: string): Promise<TierContext> {
    // Check cache first
    const cacheKey = `tier:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    const tier: Tier = subscription?.tier ?? 'free';
    const orgId = subscription?.orgId ?? undefined;

    // Get feature overrides
    const overridesList = await db.query.featureOverrides.findMany({
      where: and(
        eq(featureOverrides.userId, userId),
        // Not expired
        or(
          isNull(featureOverrides.expiresAt),
          gte(featureOverrides.expiresAt, new Date())
        )
      ),
    });

    const overrides: Record<string, boolean> = {};
    for (const override of overridesList) {
      overrides[override.featureId] = override.enabled;
    }

    // Get current usage
    const currentPeriod = this.getCurrentPeriod();
    const usageRecord = await db.query.usageTracking.findFirst({
      where: and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.periodStart, currentPeriod.start),
        lte(usageTracking.periodEnd, currentPeriod.end)
      ),
    });

    const usage: Record<string, number> = {
      ai_detection: usageRecord?.aiDetectionCount ?? 0,
      vulnerability_scan: usageRecord?.vulnerabilityScanCount ?? 0,
      api_calls: usageRecord?.apiCallCount ?? 0,
      cloud_storage_bytes: usageRecord?.cloudStorageBytes ?? 0,
    };

    // Build limits from features
    const limits: Record<string, number | null> = {};
    for (const [featureId, feature] of Object.entries(FEATURES)) {
      const limit = getFeatureLimit(featureId as FeatureId, tier);
      if (limit !== null) {
        limits[featureId] = limit;
      }
    }

    const context: TierContext = {
      tier,
      userId,
      orgId,
      limits,
      usage,
      overrides,
    };

    // Cache result
    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(context));

    return context;
  }

  /**
   * Check if a specific feature is available
   */
  async checkFeature(
    userId: string,
    featureId: FeatureId
  ): Promise<FeatureCheckResult> {
    const context = await this.resolve(userId);

    // Check override first
    if (context.overrides[featureId] !== undefined) {
      return {
        allowed: context.overrides[featureId],
        reason: context.overrides[featureId] ? 'override_enabled' : 'override_disabled',
      };
    }

    const feature = FEATURES[featureId];
    const available = isFeatureAvailable(featureId, context.tier);

    if (!available) {
      return {
        allowed: false,
        reason: 'tier_restricted',
        requiredTier: this.getMinimumTier(featureId),
        upgradePrompt: feature.upgradePrompt,
      };
    }

    // Check rate limit if applicable
    const limit = context.limits[featureId];
    if (limit !== null && limit !== undefined) {
      const usageKey = this.getUsageKey(featureId);
      const currentUsage = context.usage[usageKey] ?? 0;

      if (currentUsage >= limit) {
        return {
          allowed: false,
          reason: 'limit_reached',
          limit,
          usage: currentUsage,
          resetAt: this.getResetTime(feature.rateLimit?.window ?? 'day'),
          upgradePrompt: feature.upgradePrompt,
        };
      }
    }

    return { allowed: true, reason: 'allowed' };
  }

  /**
   * Increment usage counter (call after successful feature use)
   */
  async incrementUsage(userId: string, featureId: FeatureId): Promise<void> {
    const feature = FEATURES[featureId];
    if (!feature.rateLimit) return;

    const usageKey = this.getUsageKey(featureId);
    const currentPeriod = this.getCurrentPeriod();

    await db.insert(usageTracking)
      .values({
        userId,
        periodStart: currentPeriod.start,
        periodEnd: currentPeriod.end,
        [usageKey]: 1,
      })
      .onConflictDoUpdate({
        target: [usageTracking.userId, usageTracking.periodStart],
        set: {
          [usageKey]: sql`${usageTracking[usageKey]} + 1`,
          updatedAt: new Date(),
        },
      });

    // Invalidate cache
    await redis.del(`tier:${userId}`);
  }

  private getCurrentPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private getUsageKey(featureId: FeatureId): string {
    const mapping: Record<string, string> = {
      'ai.detection': 'ai_detection',
      'scan.vulnerability': 'vulnerability_scan',
      'integration.api': 'api_calls',
    };
    return mapping[featureId] ?? featureId.replace('.', '_');
  }

  private getMinimumTier(featureId: FeatureId): Tier {
    const feature = FEATURES[featureId];
    if (feature.tiers.free) return 'free';
    if (feature.tiers.pro) return 'pro';
    if (feature.tiers.team) return 'team';
    return 'enterprise';
  }

  private getResetTime(window: string): Date {
    const now = new Date();
    switch (window) {
      case 'minute':
        return new Date(now.getTime() + 60 * 1000);
      case 'hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      case 'month':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

export interface FeatureCheckResult {
  allowed: boolean;
  reason: 'allowed' | 'tier_restricted' | 'limit_reached' | 'override_enabled' | 'override_disabled';
  requiredTier?: Tier;
  limit?: number;
  usage?: number;
  resetAt?: Date;
  upgradePrompt?: {
    title: string;
    description: string;
    cta: string;
  };
}
```

### Feature Gate Middleware

```typescript
// packages/api/middleware/featureGate.ts

import { TRPCError } from '@trpc/server';
import { TierResolver, FeatureCheckResult } from '../modules/tiers/services/TierResolver';

const tierResolver = new TierResolver();

/**
 * Create a feature-gated procedure
 * Use this to protect any API endpoint
 */
export function requireFeature(featureId: FeatureId) {
  return async function featureGate({ ctx, next }: MiddlewareParams) {
    const result = await tierResolver.checkFeature(ctx.user.id, featureId);

    if (!result.allowed) {
      // Track upgrade opportunity
      await trackUpgradeOpportunity(ctx.user.id, featureId, result);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: getErrorMessage(result),
        cause: {
          type: 'FEATURE_GATED',
          featureId,
          ...result,
        },
      });
    }

    // Proceed with request
    const response = await next();

    // Increment usage after successful execution
    await tierResolver.incrementUsage(ctx.user.id, featureId);

    return response;
  };
}

/**
 * Create a procedure with tiered behavior
 * For features that work differently per tier (not just on/off)
 */
export function withTierContext() {
  return async function tierContext({ ctx, next }: MiddlewareParams) {
    const tierContext = await tierResolver.resolve(ctx.user.id);

    return next({
      ctx: {
        ...ctx,
        tier: tierContext,
      },
    });
  };
}

function getErrorMessage(result: FeatureCheckResult): string {
  switch (result.reason) {
    case 'tier_restricted':
      return `This feature requires ${result.requiredTier} tier`;
    case 'limit_reached':
      return `You've reached your limit (${result.usage}/${result.limit}). Resets ${result.resetAt?.toISOString()}`;
    default:
      return 'Feature not available';
  }
}

async function trackUpgradeOpportunity(
  userId: string,
  featureId: FeatureId,
  result: FeatureCheckResult
): Promise<void> {
  await db.insert(upgradeEvents).values({
    userId,
    triggerFeature: featureId,
    triggerContext: result.reason,
    triggerSource: 'api',
    outcome: 'shown', // Will be updated if they upgrade
  });

  // Also track in PostHog for funnel analysis
  await posthog.capture({
    distinctId: userId,
    event: 'upgrade_prompt_triggered',
    properties: {
      feature_id: featureId,
      reason: result.reason,
      current_tier: result.requiredTier,
    },
  });
}
```

### Protected Procedures Examples

```typescript
// packages/api/modules/scan/procedures/analyze-patterns.ts

import { protectedProcedure } from '../../trpc';
import { requireFeature, withTierContext } from '../../middleware/featureGate';
import { z } from 'zod';

// Fully gated - Pro only
export const analyzeAIPatterns = protectedProcedure
  .use(requireFeature('ai.detection'))
  .input(z.object({
    files: z.array(z.object({
      hash: z.string(),
      extension: z.string(),
      metrics: z.object({
        lines: z.number(),
        changeVelocity: z.number(),
      }),
    })),
  }))
  .mutation(async ({ input, ctx }) => {
    // IP-protected analysis runs here
    const results = await aiDetectionEngine.analyze(input.files);

    return {
      findings: results,
    };
  });

// Tiered behavior - different results per tier
export const scanWorkspace = protectedProcedure
  .use(withTierContext())
  .input(z.object({
    includeProtectedRules: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const rules = getOpenRules(); // Always included

    // Add protected rules only for Pro+
    if (input.includeProtectedRules && ctx.tier.tier !== 'free') {
      rules.push(...getProtectedRules());
    }

    const results = await scanEngine.scan({ rules });

    // Track usage if protected rules were used
    if (input.includeProtectedRules && ctx.tier.tier !== 'free') {
      await tierResolver.incrementUsage(ctx.user.id, 'scan.rules.protected');
    }

    return {
      findings: results,
      rulesUsed: rules.map(r => r.id),
      tier: ctx.tier.tier,
    };
  });

// Rate-limited feature
export const checkVulnerabilities = protectedProcedure
  .use(requireFeature('scan.vulnerability'))
  .input(z.object({
    dependencies: z.array(z.object({
      name: z.string(),
      version: z.string(),
    })),
  }))
  .mutation(async ({ input, ctx }) => {
    const vulnerabilities = await vulnerabilityDB.check(input.dependencies);

    return { vulnerabilities };
  });
```

---

## 5. Rate Limiting

### Redis-Based Rate Limiter

```typescript
// packages/api/services/RateLimiter.ts

import { redis } from '@snapback/infrastructure';

export interface RateLimitConfig {
  window: 'minute' | 'hour' | 'day' | 'month';
  limits: Record<Tier, number>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

export class RateLimiter {
  /**
   * Check and consume rate limit
   * Returns result even if blocked (for response headers)
   */
  async check(
    userId: string,
    featureId: string,
    config: RateLimitConfig,
    tier: Tier
  ): Promise<RateLimitResult> {
    const limit = config.limits[tier];

    // Unlimited
    if (limit === -1) {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        resetAt: new Date(0),
      };
    }

    const windowMs = this.getWindowMs(config.window);
    const key = `ratelimit:${featureId}:${userId}:${this.getWindowKey(config.window)}`;

    // Use Redis MULTI for atomic check-and-increment
    const multi = redis.multi();
    multi.incr(key);
    multi.pttl(key);

    const [count, ttl] = await multi.exec() as [number, number];

    // Set expiry on first request
    if (ttl === -1) {
      await redis.pexpire(key, windowMs);
    }

    const remaining = Math.max(0, limit - count);
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : windowMs));

    return {
      allowed: count <= limit,
      remaining,
      limit,
      resetAt,
    };
  }

  /**
   * Get current usage without consuming
   */
  async getUsage(
    userId: string,
    featureId: string,
    config: RateLimitConfig
  ): Promise<number> {
    const key = `ratelimit:${featureId}:${userId}:${this.getWindowKey(config.window)}`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  private getWindowMs(window: string): number {
    switch (window) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private getWindowKey(window: string): string {
    const now = new Date();
    switch (window) {
      case 'minute':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      case 'hour':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      case 'day':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      case 'month':
        return `${now.getFullYear()}-${now.getMonth()}`;
      default:
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    }
  }
}
```

---

## 6. Client Integration

### Extension Tier Client

```typescript
// apps/vscode/src/tiers/TierClient.ts

import * as vscode from 'vscode';
import { SnapBackAPI } from '../api/client';

export interface ClientTierContext {
  tier: Tier;
  features: Record<string, FeatureAvailability>;
}

export interface FeatureAvailability {
  available: boolean;
  limit?: number;
  usage?: number;
  resetAt?: string;
}

export class TierClient {
  private context: ClientTierContext | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(private api: SnapBackAPI) {}

  /**
   * Get current tier context (cached)
   */
  async getContext(): Promise<ClientTierContext> {
    if (!this.context) {
      await this.refresh();
    }
    return this.context!;
  }

  /**
   * Refresh tier context from server
   */
  async refresh(): Promise<void> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await this.api.getTierContext();
        this.context = response;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Check if feature is available locally (fast, cached)
   * Use this for UI decisions
   */
  isFeatureAvailable(featureId: string): boolean {
    if (!this.context) return false;
    return this.context.features[featureId]?.available ?? false;
  }

  /**
   * Get remaining quota for a feature
   */
  getRemainingQuota(featureId: string): number | null {
    if (!this.context) return null;
    const feature = this.context.features[featureId];
    if (!feature?.limit) return null;
    return feature.limit - (feature.usage ?? 0);
  }

  /**
   * Handle feature gate error from API
   * Shows appropriate UI and returns false
   */
  async handleFeatureGated(
    featureId: string,
    error: FeatureGatedError
  ): Promise<boolean> {
    // Refresh context (might be stale)
    await this.refresh();

    // Show upgrade prompt
    const action = await vscode.window.showInformationMessage(
      error.upgradePrompt?.description ?? `This feature requires ${error.requiredTier}`,
      error.upgradePrompt?.cta ?? 'Upgrade',
      'Later'
    );

    if (action === (error.upgradePrompt?.cta ?? 'Upgrade')) {
      // Open upgrade page
      vscode.env.openExternal(
        vscode.Uri.parse(`https://snapback.dev/upgrade?feature=${featureId}`)
      );
    }

    return false;
  }

  /**
   * Execute feature with automatic gating
   * Use this for any tier-dependent operation
   */
  async executeFeature<T>(
    featureId: string,
    executor: () => Promise<T>,
    options: { silent?: boolean } = {}
  ): Promise<T | null> {
    // Quick local check first
    if (!this.isFeatureAvailable(featureId)) {
      if (!options.silent) {
        await this.showUpgradePrompt(featureId);
      }
      return null;
    }

    try {
      return await executor();
    } catch (error) {
      if (isFeatureGatedError(error)) {
        if (!options.silent) {
          await this.handleFeatureGated(featureId, error);
        }
        return null;
      }
      throw error;
    }
  }

  private async showUpgradePrompt(featureId: string): Promise<void> {
    const feature = FEATURES[featureId];
    if (!feature?.upgradePrompt) return;

    const action = await vscode.window.showInformationMessage(
      feature.upgradePrompt.description,
      feature.upgradePrompt.cta,
      'Later'
    );

    if (action === feature.upgradePrompt.cta) {
      vscode.env.openExternal(
        vscode.Uri.parse(`https://snapback.dev/upgrade?feature=${featureId}`)
      );
    }
  }
}

// Type guard for feature gated errors
function isFeatureGatedError(error: unknown): error is FeatureGatedError {
  return (
    error instanceof Error &&
    'cause' in error &&
    (error as any).cause?.type === 'FEATURE_GATED'
  );
}

interface FeatureGatedError extends Error {
  cause: {
    type: 'FEATURE_GATED';
    featureId: string;
    requiredTier?: Tier;
    upgradePrompt?: {
      title: string;
      description: string;
      cta: string;
    };
  };
}
```

### Extension Feature Usage

```typescript
// apps/vscode/src/scan/ScanOrchestrator.ts

import { TierClient } from '../tiers/TierClient';

export class ScanOrchestrator {
  constructor(
    private tierClient: TierClient,
    private api: SnapBackAPI
  ) {}

  /**
   * Smart scan that respects tier limits
   */
  async scan(options: ScanOptions): Promise<ScanReport> {
    const context = await this.tierClient.getContext();

    // Always run open rules (free)
    const localFindings = await this.runOpenRules(options);

    // Try protected rules if available
    const protectedFindings = await this.tierClient.executeFeature(
      'scan.rules.protected',
      () => this.api.scanWithProtectedRules(options),
      { silent: options.silent }
    );

    // Try AI detection if available
    const aiFindings = await this.tierClient.executeFeature(
      'ai.detection',
      () => this.api.analyzeAIPatterns(options),
      { silent: options.silent }
    );

    // Merge all findings
    return {
      findings: [
        ...localFindings,
        ...(protectedFindings?.findings ?? []),
        ...(aiFindings?.findings ?? []),
      ],
      tier: context.tier,
      usedFeatures: {
        openRules: true,
        protectedRules: !!protectedFindings,
        aiDetection: !!aiFindings,
      },
    };
  }

  /**
   * AI detection with quota awareness
   */
  async detectAI(files: FileInfo[]): Promise<AIDetectionResult | null> {
    // Check quota before potentially wasting an API call
    const remaining = this.tierClient.getRemainingQuota('ai.detection');

    if (remaining !== null && remaining < files.length) {
      // Show quota warning
      const action = await vscode.window.showWarningMessage(
        `You have ${remaining} AI detections remaining today. This scan would use ${files.length}.`,
        'Scan Anyway',
        'Upgrade for Unlimited',
        'Cancel'
      );

      if (action === 'Cancel') return null;
      if (action === 'Upgrade for Unlimited') {
        vscode.env.openExternal(vscode.Uri.parse('https://snapback.dev/upgrade'));
        return null;
      }

      // Scan anyway - let server enforce actual limit
    }

    return this.tierClient.executeFeature(
      'ai.detection',
      () => this.api.analyzeAIPatterns({ files })
    );
  }
}
```

---

## 7. MCP Tool Gating

### MCP Tool Definitions with Tiers

```typescript
// apps/mcp-server/src/tools/index.ts

import { z } from 'zod';
import { TierResolver } from './TierResolver';

const tierResolver = new TierResolver();

export const tools = {
  // ─────────────────────────────────────────
  // FREE TOOLS
  // ─────────────────────────────────────────

  'snapback.check_dependencies': {
    tier: 'free',
    description: 'Check for dependency-related risks when package.json changes',
    inputSchema: z.object({
      packageJson: z.string(),
    }),
    async execute(input: unknown, context: MCPContext) {
      // Runs locally, no tier check needed
      return await dependencyAnalyzer.analyze(input.packageJson);
    },
  },

  'snapback.analyze_risk': {
    tier: 'free', // But behavior differs by tier
    description: 'Analyze code changes for potential risks',
    inputSchema: z.object({
      diff: z.string(),
      context: z.object({
        filePath: z.string(),
      }).optional(),
    }),
    async execute(input: unknown, context: MCPContext) {
      const tierContext = await tierResolver.resolve(context.apiKey);

      // Basic analysis for free
      const basicResult = await localRiskAnalyzer.analyze(input.diff);

      // Enhanced analysis for Pro+
      if (tierContext.tier !== 'free') {
        const enhanced = await context.api.analyzeRiskEnhanced(input);
        return {
          ...basicResult,
          ...enhanced,
          aiConfidence: enhanced.aiConfidence,
          detailedRecommendations: enhanced.recommendations,
        };
      }

      return basicResult;
    },
  },

  'snapback.scan_workspace': {
    tier: 'free', // But protected rules require Pro
    description: 'Scan the current workspace for code quality issues',
    inputSchema: z.object({
      focus: z.enum(['all', 'security', 'ai-patterns', 'dependencies', 'consistency']).optional(),
    }),
    async execute(input: unknown, context: MCPContext) {
      const tierContext = await tierResolver.resolve(context.apiKey);

      // Determine which rules to run
      const rules = ['open']; // Always include open rules

      if (tierContext.tier !== 'free') {
        if (input.focus === 'ai-patterns' || input.focus === 'all') {
          rules.push('ai-patterns');
        }
        if (input.focus === 'consistency' || input.focus === 'all') {
          rules.push('consistency');
        }
      }

      const result = await context.invokeExtension('snapback.scan', {
        rules,
        focus: input.focus,
      });

      // Add tier context to response for AI to understand
      return {
        ...result,
        tierInfo: {
          currentTier: tierContext.tier,
          rulesUsed: rules,
          additionalRulesAvailable: tierContext.tier === 'free'
            ? ['ai-patterns', 'consistency', 'vulnerability']
            : [],
        },
      };
    },
  },

  'catalog.list_tools': {
    tier: 'free',
    description: 'List available tools from connected external MCP servers',
    inputSchema: z.object({}),
    async execute(input: unknown, context: MCPContext) {
      return await mcpClientManager.getToolCatalog();
    },
  },

  'ctx7.resolve-library-id': {
    tier: 'free',
    description: 'Resolve a library name into a Context7-compatible library ID',
    inputSchema: z.object({
      libraryName: z.string(),
    }),
    async execute(input: unknown, context: MCPContext) {
      return await context7Service.resolveLibraryId(input.libraryName);
    },
  },

  'ctx7.get-library-docs': {
    tier: 'free',
    description: 'Fetch documentation for a library',
    inputSchema: z.object({
      libraryId: z.string(),
    }),
    async execute(input: unknown, context: MCPContext) {
      return await context7Service.getLibraryDocs(input.libraryId);
    },
  },

  // ─────────────────────────────────────────
  // PRO TOOLS
  // ─────────────────────────────────────────

  'snapback.create_checkpoint': {
    tier: 'pro',
    featureId: 'integration.mcp_advanced',
    description: 'Create a code checkpoint (snapshot) before making risky changes',
    inputSchema: z.object({
      name: z.string(),
      files: z.array(z.string()),
    }),
    async execute(input: unknown, context: MCPContext) {
      // Tier check happens in wrapper
      const result = await context.invokeExtension('snapback.createSnapshot', {
        name: input.name,
        files: input.files,
        trigger: 'mcp',
      });

      return {
        success: true,
        checkpointId: result.id,
        message: `Created checkpoint "${input.name}" with ${input.files.length} files`,
      };
    },
  },

  'snapback.list_checkpoints': {
    tier: 'pro',
    featureId: 'integration.mcp_advanced',
    description: 'List all available code checkpoints for restoration',
    inputSchema: z.object({
      limit: z.number().optional().default(10),
    }),
    async execute(input: unknown, context: MCPContext) {
      const snapshots = await context.invokeExtension('snapback.listSnapshots', {
        limit: input.limit,
      });

      return {
        checkpoints: snapshots.map(s => ({
          id: s.id,
          name: s.name,
          createdAt: s.timestamp,
          fileCount: Object.keys(s.files).length,
          trigger: s.trigger,
        })),
      };
    },
  },

  'snapback.restore_checkpoint': {
    tier: 'pro',
    featureId: 'integration.mcp_advanced',
    description: 'Restore code from a previously created checkpoint',
    inputSchema: z.object({
      checkpointId: z.string(),
      dryRun: z.boolean().optional().default(true),
    }),
    async execute(input: unknown, context: MCPContext) {
      if (input.dryRun) {
        const snapshot = await context.invokeExtension('snapback.getSnapshot', {
          id: input.checkpointId,
        });

        return {
          dryRun: true,
          wouldRestore: Object.keys(snapshot.files),
          checkpoint: {
            id: snapshot.id,
            name: snapshot.name,
            createdAt: snapshot.timestamp,
          },
        };
      }

      await context.invokeExtension('snapback.restore', {
        snapshotId: input.checkpointId,
      });

      return {
        success: true,
        message: `Restored checkpoint ${input.checkpointId}`,
      };
    },
  },

  'snapback.explain_finding': {
    tier: 'pro',
    featureId: 'integration.mcp_advanced',
    description: 'Get detailed explanation of a scan finding with fix suggestions',
    inputSchema: z.object({
      findingId: z.string(),
    }),
    async execute(input: unknown, context: MCPContext) {
      // This calls the IP-protected API
      return await context.api.explainFinding(input.findingId);
    },
  },

  'snapback.fix_finding': {
    tier: 'pro',
    featureId: 'integration.mcp_advanced',
    description: 'Apply an automated fix for a scan finding',
    inputSchema: z.object({
      findingId: z.string(),
      dryRun: z.boolean().optional().default(true),
    }),
    async execute(input: unknown, context: MCPContext) {
      const fix = await context.api.generateFix(input.findingId);

      if (input.dryRun) {
        return {
          dryRun: true,
          proposedFix: fix.diff,
          confidence: fix.confidence,
        };
      }

      await context.invokeExtension('snapback.applyFix', { fix });

      return {
        success: true,
        applied: fix.diff,
      };
    },
  },
};

// Tool registration with tier enforcement
export function registerTools(server: MCPServer) {
  for (const [name, tool] of Object.entries(tools)) {
    server.registerTool(name, {
      description: tool.description,
      inputSchema: tool.inputSchema,
      handler: async (input, context) => {
        // Check tier if tool requires it
        if (tool.tier !== 'free') {
          const check = await tierResolver.checkFeature(
            context.apiKey,
            tool.featureId ?? `integration.mcp_${tool.tier}`
          );

          if (!check.allowed) {
            return {
              error: {
                type: 'FEATURE_GATED',
                message: `This tool requires ${tool.tier} tier`,
                upgradeUrl: `https://snapback.dev/upgrade?feature=mcp_${tool.tier}`,
              },
            };
          }
        }

        return await tool.execute(input, context);
      },
    });
  }
}
```

---

## 8. CLI Gating

### CLI Feature Checks

```typescript
// apps/cli/src/commands/scan.ts

import { Command } from 'commander';
import { TierClient } from '../tiers/TierClient';
import { ScanEngine } from '@snapback/scanner';

const tierClient = new TierClient();

export const scanCommand = new Command('scan')
  .description('Scan codebase for issues')
  .option('-f, --format <format>', 'Output format: json, table, sarif, github', 'table')
  .option('--fail-on <severity>', 'Exit 1 if findings >= severity', 'error')
  .option('--ci', 'CI mode (requires Pro)')
  .option('--ai-detection', 'Include AI pattern detection (requires Pro)')
  .action(async (options) => {
    // Check API key
    const apiKey = process.env.SNAPBACK_API_KEY;

    // ─────────────────────────────────────────
    // TIER CHECKS
    // ─────────────────────────────────────────

    // CI mode requires Pro
    if (options.ci) {
      const allowed = await tierClient.checkFeature('integration.cli_cicd', apiKey);
      if (!allowed.allowed) {
        console.error('❌ CI mode requires Pro tier');
        console.error(`   ${allowed.upgradePrompt?.description}`);
        console.error(`   Upgrade: https://snapback.dev/upgrade?feature=cli_cicd`);
        process.exit(1);
      }
    }

    // AI detection may be rate-limited
    if (options.aiDetection) {
      const allowed = await tierClient.checkFeature('ai.detection', apiKey);
      if (!allowed.allowed) {
        if (allowed.reason === 'limit_reached') {
          console.error(`❌ AI detection limit reached (${allowed.usage}/${allowed.limit})`);
          console.error(`   Resets: ${allowed.resetAt}`);
        } else {
          console.error('❌ AI detection requires Pro tier');
        }
        console.error(`   Upgrade: https://snapback.dev/upgrade?feature=ai_detection`);
        process.exit(1);
      }
    }

    // ─────────────────────────────────────────
    // RUN SCAN
    // ─────────────────────────────────────────

    const engine = new ScanEngine({
      workspaceRoot: process.cwd(),
      apiKey,
    });

    const context = await tierClient.getContext(apiKey);

    const report = await engine.scan({
      includeOpenRules: true,
      includeProtectedRules: context.tier !== 'free',
      includeAIDetection: options.aiDetection && context.tier !== 'free',
    });

    // ─────────────────────────────────────────
    // OUTPUT
    // ─────────────────────────────────────────

    // SARIF format (for GitHub Security tab) - Pro only
    if (options.format === 'sarif') {
      if (context.tier === 'free') {
        console.error('❌ SARIF output requires Pro tier');
        process.exit(1);
      }
      console.log(JSON.stringify(toSARIF(report), null, 2));
      return;
    }

    // GitHub Actions format - Pro only
    if (options.format === 'github') {
      if (context.tier === 'free') {
        console.error('❌ GitHub Actions format requires Pro tier');
        process.exit(1);
      }
      report.findings.forEach(f => {
        console.log(`::${f.severity} file=${f.file},line=${f.line}::${f.message}`);
      });
      return;
    }

    // Standard output (all tiers)
    printTable(report.findings);

    // Show tier info
    if (context.tier === 'free') {
      console.log('\n💡 Upgrade to Pro for:');
      console.log('   • AI pattern detection');
      console.log('   • CI/CD integration');
      console.log('   • SARIF & GitHub Actions output');
      console.log('   https://snapback.dev/upgrade');
    }

    // Exit code
    const maxSeverity = getMaxSeverity(report.findings);
    if (shouldFail(maxSeverity, options.failOn)) {
      process.exit(1);
    }
  });
```

---

## 9. Upgrade Flow

### Upgrade Event Tracking

```typescript
// packages/api/modules/tiers/procedures/upgrade.ts

export const trackUpgradeIntent = protectedProcedure
  .input(z.object({
    source: z.enum(['extension', 'cli', 'mcp', 'dashboard']),
    triggerFeature: z.string(),
    triggerContext: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Record upgrade intent
    await db.insert(upgradeEvents).values({
      userId: ctx.user.id,
      triggerFeature: input.triggerFeature,
      triggerContext: input.triggerContext,
      triggerSource: input.source,
      outcome: 'intent',
      fromTier: ctx.tier.tier,
    });

    // Track in PostHog for funnel
    await posthog.capture({
      distinctId: ctx.anonymousId,
      event: 'upgrade_intent',
      properties: {
        source: input.source,
        trigger_feature: input.triggerFeature,
        from_tier: ctx.tier.tier,
      },
    });

    // Return checkout URL
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: ctx.subscription?.stripeCustomerId,
      mode: 'subscription',
      line_items: [{
        price: STRIPE_PRICES[input.source === 'extension' ? 'pro_monthly' : 'pro_yearly'],
        quantity: 1,
      }],
      success_url: `https://snapback.dev/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://snapback.dev/upgrade/cancel`,
      metadata: {
        userId: ctx.user.id,
        source: input.source,
        triggerFeature: input.triggerFeature,
      },
    });

    return {
      checkoutUrl: checkoutSession.url,
    };
  });

export const confirmUpgrade = protectedProcedure
  .input(z.object({
    sessionId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Verify checkout session
    const session = await stripe.checkout.sessions.retrieve(input.sessionId);

    if (session.payment_status !== 'paid') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment not completed' });
    }

    // Update subscription
    await db.update(subscriptions)
      .set({
        tier: 'pro',
        status: 'active',
        stripeSubscriptionId: session.subscription as string,
        currentPeriodStart: new Date(session.created * 1000),
        currentPeriodEnd: new Date((session.created + 30 * 24 * 60 * 60) * 1000),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, ctx.user.id));

    // Update upgrade event
    await db.update(upgradeEvents)
      .set({
        outcome: 'upgraded',
        toTier: 'pro',
      })
      .where(and(
        eq(upgradeEvents.userId, ctx.user.id),
        eq(upgradeEvents.outcome, 'intent')
      ));

    // Invalidate tier cache
    await redis.del(`tier:${ctx.user.id}`);

    // Track success
    await posthog.capture({
      distinctId: ctx.anonymousId,
      event: 'upgrade_completed',
      properties: {
        from_tier: 'free',
        to_tier: 'pro',
        source: session.metadata?.source,
      },
    });

    return {
      success: true,
      tier: 'pro',
    };
  });
```

### Extension Upgrade Flow

```typescript
// apps/vscode/src/tiers/UpgradeFlow.ts

export class UpgradeFlow {
  constructor(
    private api: SnapBackAPI,
    private tierClient: TierClient
  ) {}

  /**
   * Show upgrade prompt with context
   */
  async promptUpgrade(
    featureId: string,
    context?: { reason?: string; usage?: number; limit?: number }
  ): Promise<boolean> {
    const feature = FEATURES[featureId];

    let message = feature?.upgradePrompt?.description ??
      `This feature requires a higher tier`;

    if (context?.reason === 'limit_reached') {
      message = `You've used ${context.usage}/${context.limit} today. ${message}`;
    }

    const action = await vscode.window.showInformationMessage(
      message,
      { modal: false },
      'Upgrade Now',
      'Learn More',
      'Later'
    );

    if (action === 'Upgrade Now') {
      await this.startUpgrade(featureId);
      return true;
    }

    if (action === 'Learn More') {
      vscode.env.openExternal(
        vscode.Uri.parse(`https://snapback.dev/features/${featureId}`)
      );
    }

    return false;
  }

  /**
   * Start upgrade flow
   */
  async startUpgrade(triggerFeature: string): Promise<void> {
    // Track intent
    const { checkoutUrl } = await this.api.trackUpgradeIntent({
      source: 'extension',
      triggerFeature,
    });

    // Open checkout in browser
    await vscode.env.openExternal(vscode.Uri.parse(checkoutUrl));

    // Show waiting message
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Waiting for upgrade completion...',
      cancellable: true,
    }, async (progress, token) => {
      // Poll for upgrade completion
      const maxWait = 5 * 60 * 1000; // 5 minutes
      const pollInterval = 3000; // 3 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait && !token.isCancellationRequested) {
        await new Promise(r => setTimeout(r, pollInterval));

        await this.tierClient.refresh();
        const context = await this.tierClient.getContext();

        if (context.tier !== 'free') {
          vscode.window.showInformationMessage(
            '🎉 Welcome to SnapBack Pro! All features are now unlocked.'
          );
          return;
        }
      }
    });
  }
}
```

---

## 10. Testing Strategy

### Tier Testing Utilities

```typescript
// packages/testing/src/tiers.ts

import { TierResolver } from '@snapback/api/modules/tiers';

/**
 * Create a mock user with specific tier
 */
export async function createMockUser(tier: Tier): Promise<TestUser> {
  const user = await db.insert(user).values({
    id: createId(),
    email: `test-${tier}@example.com`,
    name: `Test ${tier} User`,
  }).returning();

  await db.insert(subscriptions).values({
    userId: user[0].id,
    tier,
    status: 'active',
  });

  return {
    id: user[0].id,
    tier,
    cleanup: async () => {
      await db.delete(user).where(eq(user.id, user[0].id));
    },
  };
}

/**
 * Test feature availability across tiers
 */
export function testFeatureAvailability(
  featureId: FeatureId,
  expectedAvailability: Record<Tier, boolean>
) {
  describe(`Feature: ${featureId}`, () => {
    for (const [tier, expected] of Object.entries(expectedAvailability)) {
      it(`should ${expected ? 'be' : 'not be'} available for ${tier}`, async () => {
        const user = await createMockUser(tier as Tier);
        const resolver = new TierResolver();

        const result = await resolver.checkFeature(user.id, featureId);

        expect(result.allowed).toBe(expected);

        await user.cleanup();
      });
    }
  });
}

/**
 * Test rate limiting
 */
export async function testRateLimit(
  featureId: FeatureId,
  tier: Tier,
  expectedLimit: number
) {
  const user = await createMockUser(tier);
  const resolver = new TierResolver();

  // Use up the limit
  for (let i = 0; i < expectedLimit; i++) {
    const result = await resolver.checkFeature(user.id, featureId);
    expect(result.allowed).toBe(true);
    await resolver.incrementUsage(user.id, featureId);
  }

  // Next one should fail
  const result = await resolver.checkFeature(user.id, featureId);
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe('limit_reached');

  await user.cleanup();
}
```

### Feature Availability Tests

```typescript
// packages/api/test/tiers/features.test.ts

import { describe, it, expect } from 'vitest';
import { testFeatureAvailability, testRateLimit } from '@snapback/testing';

describe('Feature Tier Gating', () => {
  // Core protection - always free
  testFeatureAvailability('protection.auto_snapshot', {
    free: true,
    pro: true,
    team: true,
    enterprise: true,
  });

  testFeatureAvailability('protection.restore', {
    free: true,
    pro: true,
    team: true,
    enterprise: true,
  });

  // Smart features - Pro+
  testFeatureAvailability('protection.session_grouping_smart', {
    free: false,
    pro: true,
    team: true,
    enterprise: true,
  });

  testFeatureAvailability('protection.rollback_validation', {
    free: false,
    pro: true,
    team: true,
    enterprise: true,
  });

  // AI detection - rate limited
  testFeatureAvailability('ai.detection', {
    free: true,  // Available but limited
    pro: true,
    team: true,
    enterprise: true,
  });

  testFeatureAvailability('ai.tool_identification', {
    free: false,
    pro: true,
    team: true,
    enterprise: true,
  });

  // Team features
  testFeatureAvailability('team.workspace', {
    free: false,
    pro: false,
    team: true,
    enterprise: true,
  });

  testFeatureAvailability('team.sso', {
    free: false,
    pro: false,
    team: false,
    enterprise: true,
  });
});

describe('Rate Limiting', () => {
  it('should limit free tier AI detection to 50/day', async () => {
    await testRateLimit('ai.detection', 'free', 50);
  });

  it('should limit free tier vulnerability scans to 10/day', async () => {
    await testRateLimit('scan.vulnerability', 'free', 10);
  });

  it('should not limit pro tier AI detection', async () => {
    const user = await createMockUser('pro');
    const resolver = new TierResolver();

    // 100 calls should all succeed
    for (let i = 0; i < 100; i++) {
      const result = await resolver.checkFeature(user.id, 'ai.detection');
      expect(result.allowed).toBe(true);
      await resolver.incrementUsage(user.id, 'ai.detection');
    }

    await user.cleanup();
  });
});
```

### Integration Tests

```typescript
// packages/api/test/tiers/integration.test.ts

describe('Tier Integration', () => {
  it('should block protected scan rules for free tier', async () => {
    const freeUser = await createMockUser('free');
    const api = createTestClient(freeUser);

    const result = await api.scanWorkspace({
      includeProtectedRules: true,
    });

    // Should succeed but without protected rules
    expect(result.rulesUsed).not.toContain('ai-patterns');
    expect(result.rulesUsed).not.toContain('consistency');
    expect(result.tierInfo.tier).toBe('free');

    await freeUser.cleanup();
  });

  it('should include protected rules for pro tier', async () => {
    const proUser = await createMockUser('pro');
    const api = createTestClient(proUser);

    const result = await api.scanWorkspace({
      includeProtectedRules: true,
    });

    expect(result.rulesUsed).toContain('ai-patterns');
    expect(result.rulesUsed).toContain('consistency');
    expect(result.tierInfo.tier).toBe('pro');

    await proUser.cleanup();
  });

  it('should return upgrade prompt when feature gated', async () => {
    const freeUser = await createMockUser('free');
    const api = createTestClient(freeUser);

    await expect(api.createCheckpoint({ name: 'test', files: [] }))
      .rejects
      .toMatchObject({
        code: 'FORBIDDEN',
        cause: {
          type: 'FEATURE_GATED',
          requiredTier: 'pro',
          upgradePrompt: expect.objectContaining({
            cta: expect.any(String),
          }),
        },
      });

    await freeUser.cleanup();
  });
});
```

---

## Summary Checklist

### Implementation Order

1. **Database Schema** (Day 1)
   - [ ] Create migrations for `subscriptions`, `usage_tracking`, `feature_overrides`, `upgrade_events`
   - [ ] Add indexes for performance
   - [ ] Seed free tier for existing users

2. **Feature Registry** (Day 1)
   - [ ] Define all features in `FEATURES` constant
   - [ ] Add helper functions for tier checking

3. **TierResolver Service** (Day 2)
   - [ ] Implement core `resolve()` method
   - [ ] Implement `checkFeature()` with caching
   - [ ] Implement `incrementUsage()` for rate limits

4. **API Middleware** (Day 2)
   - [ ] Create `requireFeature()` middleware
   - [ ] Create `withTierContext()` middleware
   - [ ] Add to all tier-gated procedures

5. **Rate Limiter** (Day 3)
   - [ ] Implement Redis-based rate limiting
   - [ ] Add to tier-gated endpoints

6. **Client Integration** (Day 3-4)
   - [ ] Extension `TierClient`
   - [ ] CLI tier checks
   - [ ] MCP tool gating

7. **Upgrade Flow** (Day 4)
   - [ ] Stripe integration
   - [ ] Upgrade tracking
   - [ ] Extension upgrade UX

8. **Testing** (Day 5)
   - [ ] Unit tests for TierResolver
   - [ ] Integration tests for API
   - [ ] E2E tests for upgrade flow

### Security Checklist

- [ ] All tier checks happen server-side
- [ ] No IP-protected logic in client code
- [ ] Rate limits enforced in Redis (not client-side)
- [ ] Upgrade events tracked for analytics
- [ ] Feature overrides auditable

### IP Protection Verification

- [ ] AI detection patterns: Server-only ✓
- [ ] Scoring algorithms: Server-only ✓
- [ ] ML models: Server-only ✓
- [ ] Consistency analysis: Server-only ✓
- [ ] DBSCAN clustering: Server-only ✓

---

This spec provides complete coverage for tier-gating with zero IP leakage. Want me to dive deeper into any specific section?
