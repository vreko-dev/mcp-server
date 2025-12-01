# Design: Align SnapBack Docs to Final Tier Model & Enterprise Ladder

## Mission

Transform the SnapBack documentation site (`apps/docs`) into a buyer-legible, tier-truthful system with an Enterprise hub, a canonical Plans & Limits matrix, and inline tier filtering capabilities. Deliver a privacy-first documentation experience with a complete enterprise narrative.

## Strategic Context

### Business Objectives

1. **Tier Truth Enforcement**: Establish clear feature boundaries across Free, Solo, Team, and Enterprise tiers to prevent confusion and align buyer expectations
2. **Enterprise Positioning**: Create a comprehensive enterprise narrative hub demonstrating capability to serve large organizations
3. **Self-Service Clarity**: Enable prospects to self-qualify and understand value propositions without sales friction
4. **Privacy-First Messaging**: Reinforce that MCP is optional and maintain user trust through transparent data practices

### Current State Analysis

The existing documentation structure (`apps/docs`) uses:
- FumaDocs as the MDX processing engine
- Next.js 15 App Router for routing and rendering
- Flat documentation structure in `content/docs/` with 15 MDX files
- No tier-based filtering or access control
- Mixed messaging about Guardian capabilities across tiers
- No dedicated enterprise content or POC guidance

### Target State Vision

Transform documentation into a strategic asset that:
- Surfaces the right content for each buyer persona and tier
- Provides inline tier filtering without page reload
- Establishes enterprise credibility through dedicated security, compliance, and onboarding content
- Creates a canonical source of truth for capabilities and limits
- Maintains accessibility and performance standards

## Tier Model Definition

### Feature Distribution by Tier

#### Free Tier
- **Guardian Detection**: Local MCP scan only (no cloud scoring)
- **Snapshots**: Unlimited local snapshots (user controls pruning). No cloud backup.
- **Protection Levels**: Watch, Warn, Block (local only)
- **Support**: Community forums and documentation
- **Privacy**: Zero cloud transmission (MCP optional, local-only mode)

#### Solo Tier (Entry Paid)
- **Guardian Detection**: Cloud-based AI risk scoring via MCP backend
- **Snapshots**: Unlimited local + cloud backup (5GB storage)
- **Protection Levels**: Full protection with cloud sync
- **MCP Integration**: Backend MCP server with API key authentication
- **Support**: Email (48h SLA)
- **Privacy**: Metadata transmission only when MCP enabled

#### Team Tier (Collaboration)
- **All Solo Features**: Complete Solo capabilities
- **Team Sharing**: Shared snapshots and protection policies
- **Cloud Storage**: 50GB shared team storage
- **Team Members**: 10 seats
- **Analytics**: Team-wide usage and risk analytics
- **Support**: Priority (24h SLA)

#### Enterprise Tier (Full Control)
- **All Team Features**: Complete Team capabilities
- **SSO/SAML**: Single Sign-On with optional SCIM provisioning
- **Unlimited Scale**: Unlimited snapshots, storage (100GB base), and team members
- **Custom Policies**: Organization-wide custom detection rules
- **POC Framework**: Structured 2-week proof-of-concept program
- **Support**: SLA/CSM (24/7 dedicated support with named account manager)
- **Compliance**: Audit logs, DPA available on request
- **Privacy**: Custom data residency and retention policies
- **Enterprise Add-ons**: Extended analytics, private deployment options available (contact sales)

### Critical Tier Boundaries

**Guardian Cloud Checks**: Solo/Team/Enterprise only (Free = Local MCP only — no cloud scoring)
**SSO/SAML**: Enterprise exclusive (including optional SCIM)
**MCP Backend Server**: Solo/Team/Enterprise (Free has local MCP only)

## Information Architecture

### New Content Structure

```
apps/docs/content/
├── docs/                          # Existing core documentation
│   ├── index.mdx
│   ├── quick-start.mdx
│   ├── protection-levels.mdx
│   ├── sessions.mdx
│   ├── ai-detection.mdx
│   ├── mcp.mdx                    # REFACTOR: Split local vs backend
│   ├── cli.mdx
│   ├── analytics.mdx
│   ├── privacy.mdx
│   └── troubleshooting.mdx
├── capabilities/                   # NEW: Tier-filtered feature pages
│   ├── index.mdx
│   ├── guardian-detection.mdx     # With tier filtering
│   ├── session-rollback.mdx
│   └── team-collaboration.mdx     # Team+ badge
├── guides/                         # NEW: How-to guides with tier context
│   ├── index.mdx
│   ├── setting-up-protection.mdx
│   └── configuring-mcp.mdx
├── enterprise/                     # NEW: Enterprise hub
│   ├── index.mdx
│   ├── security-privacy.mdx
│   ├── sso-saml.mdx               # Enterprise badge
│   └── onboarding-poc.mdx
├── reference/                      # NEW: Technical reference
│   ├── cli.mdx
│   └── extension.mdx
├── plans-limits/                   # NEW: Canonical limits matrix
│   └── index.mdx
└── subprocessors.mdx              # NEW: Vendor transparency
```

### Navigation Taxonomy

#### Primary Navigation
- **Getting Started**: Quick start, installation, first snapshot
- **Capabilities**: Tier-filtered feature explanations
- **Guides**: Task-oriented how-to content
- **Enterprise**: Security, SSO, POC framework
- **Reference**: CLI commands, extension API
- **Plans & Limits**: Canonical tier comparison

#### Tier Filtering Scope
Plans Switcher appears on:
- All pages under `/capabilities`
- All pages under `/guides`
- Does NOT appear on: Getting Started, Enterprise hub, Reference

## Final Implementation Specifications

### Locked Decisions

**Analytics**: PostHog Cloud (US region) everywhere (docs + subprocessors)
**CLI Verb**: `snapshot restore` is canonical; `recover` kept as deprecated alias
**Default Filter**: `all` on first visit; thereafter last selection from localStorage

### Component Implementation

#### TierProvider Component
Location: `apps/docs/components/docs/tier-context.tsx`

Responsibilities:
- Manage global tier filter state including `all` option
- Persist tier selection to localStorage as `docs-tier-preference`
- Provide React Context for tier-aware components
- Default tier: `all` (shows everything on first visit)
- Helper methods: `isAtLeast(tier)` for hierarchy checks, `isOneOf(tiers)` for list matching

State Shape:
```typescript
type Tier = 'all' | 'free' | 'solo' | 'team' | 'enterprise';
const rank: Record<Exclude<Tier,'all'>, number> = { free:0, solo:1, team:2, enterprise:3 };

interface TierContextValue {
  tier: Tier;
  setTier: (tier: Tier) => void;
  isAtLeast: (min: Exclude<Tier,'all'>) => boolean;
  isOneOf: (tiers: Exclude<Tier,'all'>[]) => boolean;
}
```

Implementation:
- Client-side only (use 'use client' directive)
- Hydration-safe: Read from localStorage in useEffect
- Graceful degradation: Catch localStorage errors in private browsing modes

#### PlanSwitcher Component
Location: `apps/docs/components/docs/plan-switcher.tsx`

Visual Design:
- Horizontal radio button group with five options: All, Free, Solo, Team, Enterprise
- Active state: Emerald accent border and ring (border-emerald-500 ring-emerald-500)
- Inactive state: Neutral gray border (border-slate-600) with hover effect
- Mobile: Flex-wrap allows wrapping on narrow screens

Behavior:
- Fires PostHog event `docs_plan_filter_changed` with typed properties via `captureDocsEvent` guard
- Updates TierContext immediately (no page reload)
- Keyboard accessible: Arrow Left/Right for navigation, click or Enter to select
- ARIA: role="radiogroup" with aria-label="Filter documentation by plan tier"
- Each button: role="radio" with aria-checked reflecting active state

Rendering Logic:
- Show on `/capabilities/*` pages
- Show on `/guides/*` pages
- Show on `/plans-limits/*` pages
- Show when `frontmatter.showPlanSwitcher === true`
- Do NOT show on Getting Started, Enterprise hub, Reference pages

#### TierBadge Component
Location: `apps/docs/components/docs/tier-badge.tsx`

Visual Variants:
- **free**: Gray badge (neutral)
- **solo**: Blue badge (entry paid)
- **team**: Purple badge (collaboration)
- **enterprise**: Gold badge (premium)

Rendering Rules:
- Appears inline next to feature headings
- Text format: "Free", "Solo", "Team", "Enterprise" (exact tier names only)
- Color contrast minimum: 4.5:1 ratio for WCAG AA compliance
- Use ShowFor component for "and above" logic instead of "Solo+" or "Team+" suffix

#### ShowFor Component
Location: `apps/docs/components/docs/show-for.tsx`

Purpose: Conditional rendering based on tier context with two modes

Usage Patterns:
```mdx
<!-- Minimum tier ("and above") -->
<ShowFor minTier="solo">
  This content appears for Solo, Team, and Enterprise.
</ShowFor>

<!-- Explicit tier list -->
<ShowFor tiers={['team', 'enterprise']}>
  This content only appears for Team and Enterprise.
</ShowFor>
```

Behavior:
- Accepts `minTier` prop for hierarchy checks (solo → includes team, enterprise)
- Accepts `tiers` prop as array for explicit tier matching
- Compares against TierContext.tier
- Renders children only if tier matches (complete removal from DOM when hidden)
- When tier is 'all', always renders content (no filtering)

#### CTAUpgrade Component
Location: `apps/docs/components/docs/cta-upgrade.tsx`

Purpose: Contextual upgrade prompts

Properties:
- `targetTier`: Required tier for feature access
- `featureName`: Display name of gated feature
- `ctaText`: Optional custom CTA text

Behavior:
- Links to `/plans-limits#{targetTier}` with tier anchor
- Fires PostHog event `docs_cta_click` with properties: `feature_name`, `target_tier`, `source_page`
- Visual: Emerald gradient background with arrow icon

### Layout Integration

#### Root Layout Wrapper
Location: `apps/docs/app/[[...slug]]/layout.tsx`

Modification:
- Wrap existing `DocsLayout` with `<TierProvider>`
- Inject PlanSwitcher into layout based on page metadata

Conditional Switcher Logic:
```typescript
// In apps/docs/app/[[...slug]]/layout.tsx
const slug = '/' + (params.slug?.join('/') ?? '');
const showSwitcher =
  page?.frontmatter?.showPlanSwitcher === true ||
  slug.startsWith('/capabilities') ||
  slug.startsWith('/guides') ||
  slug.startsWith('/plans-limits');
```

Default State:
- Default to `all` on first visit (no filtering, shows all content)
- If localStorage has preference: Use saved tier
- Rationale: Maximizes feature discovery; users opt into filtering

#### Footer Privacy Notice

Add to all page footers:
```
ℹ️ MCP is optional. When enabled, some data is sent to SnapBack for analysis.
The extension works without MCP. [Learn more](/enterprise/security-privacy)
```

Implementation: Create `PrivacyNotice` component:
```tsx
export function PrivacyNotice() {
  return (
    <p className="text-sm text-slate-400 mt-8">
      ℹ️ MCP is optional. When enabled, some data is sent to SnapBack for analysis.
      The extension works without MCP.
      {' '}<a href="/enterprise/security-privacy" className="underline">Learn more</a>.
    </p>
  );
}
```

## Content Specification

### Enterprise Hub Structure

#### `/enterprise/index.mdx`
Purpose: Enterprise buyer landing page

Content Blocks:
1. **Overview**: Enterprise-grade code protection for teams that ship with AI
2. **Security Pillars**: Data sovereignty, compliance, audit trails
3. **Integration Readiness**: SSO/SAML, API access, webhooks
4. **Support Model**: Dedicated CSM, 24/7 support, SLA guarantees
5. **Navigation Cards**: Links to Security/Privacy, SSO Setup, POC Framework

#### `/enterprise/security-privacy.mdx`
Purpose: Security and compliance narrative

Required Sections:
1. **Data Flows by Tier**: Mermaid diagram showing Free (local only) → Solo/Team/Enterprise (metadata transmission)
2. **Data Retention Policies**:
   - Free: Unlimited local (user controls pruning via settings)
   - Solo: 30 days cloud backup
   - Team: 90 days cloud backup
   - Enterprise: Custom retention (365+ days configurable)
3. **Export and Deletion**: GDPR-compliant data portability
4. **DPA (Data Processing Agreement)**: Available on request for Enterprise customers (contact sales@snapback.dev)
5. **Subprocessors**: Link to `/subprocessors`
6. **Compliance Roadmap**: SOC 2 Type II certification in progress (roadmap item). GDPR-compliant data handling practices currently implemented.

#### `/enterprise/sso-saml.mdx`
Purpose: SSO implementation guide for Enterprise customers

Badge: **Enterprise**

Required Sections:
1. **Supported Identity Providers**: Okta, Azure AD, Google Workspace, OneLogin, Auth0
2. **SAML Configuration Steps**:
   - Step 1: Generate SAML metadata from SnapBack admin
   - Step 2: Configure IdP application
   - Step 3: Upload IdP metadata to SnapBack
   - Step 4: Map user attributes (email, name, groups)
   - Step 5: Test with test user account
3. **SCIM Provisioning** (optional): Automatic user provisioning and deprovisioning
4. **Attribute Mapping Table**: Required vs optional SAML attributes
5. **Testing Checklist**: New user login, group membership sync, forced logout
6. **Rollout Strategy**: Pilot group → full organization
7. **Troubleshooting**: Common SAML assertion errors

#### `/enterprise/onboarding-poc.mdx`
Purpose: Structured proof-of-concept framework

Content Structure:
1. **POC Timeline**: 2-week structured program
   - Week 1: Setup, integration, baseline metrics
   - Week 2: Production pilot, success validation
2. **Success Criteria Template**:
   - Snapshot creation latency < 200ms
   - Guardian detection accuracy > 90%
   - Zero false positives in critical file blocking
   - Team adoption > 80% within 2 weeks
3. **Rollback Plan**: How to safely exit POC without data loss
4. **Sample Recover Report**: Link to `/artifacts/recover-report-sample.pdf`
5. **Evaluation Scorecard**: Quantitative metrics for decision-making

### Plans & Limits Matrix

#### `/plans-limits/index.mdx`
Purpose: Canonical source of truth for tier capabilities

Frontmatter:
```yaml
title: Plans & Limits
description: Canonical source for features, quotas, retention, and support by tier
showPlanSwitcher: true
```

Table Structure:

| Feature Category | Free | Solo | Team | Enterprise |
|-----------------|------|------|------|------------|
| **Guardian Detection** |
| Local MCP scan | ✓ | ✓ | ✓ | ✓ |
| Cloud AI scoring | — | ✓ | ✓ | ✓ |
| Custom detection rules | — | — | — | ✓ |
| **Snapshots & Recovery** |
| Local snapshots | Unlimited* | Unlimited | Unlimited | Unlimited |
| Cloud backup | — | 5GB | 50GB | 100GB+ |
| Cloud retention | — | 30 days | 90 days | Custom |
| Session time-travel | Basic | Full | Full | Full |
| **Collaboration** |
| Team members | 1 | 1 | 10 | Unlimited |
| Shared snapshots | — | — | ✓ | ✓ |
| Team policies (.snapbackrc) | — | — | ✓ | ✓ |
| **Security & Compliance** |
| SSO/SAML | — | — | — | ✓ |
| SCIM provisioning | — | — | — | ✓ (optional) |
| Audit logs | — | — | Basic | Immutable |
| DPA available | — | — | — | ✓ |
| **Support** |
| Community forums | ✓ | ✓ | ✓ | ✓ |
| Email support | — | Email (48h) | Priority (24h) | SLA/CSM |

*Free tier: You control pruning via extension settings. See Plans & Limits for cloud storage details.

Anchor Links: Each tier heading has anchor: `#free`, `#solo`, `#team`, `#enterprise`

CTA Strategy:
- Free → "Get Started" (link to `/quick-start`)
- Solo → "Start Free Trial" (link to `https://snapback.dev/pricing#solo`)
- Team → "Start Team Trial" (link to `https://snapback.dev/pricing#team`)
- Enterprise → "Contact Sales" (link to `https://snapback.dev/contact`)

### MCP Page Refactoring

#### `/docs/mcp.mdx` Restructuring
Current Issue: Does not distinguish between Free (local only) and Solo/Team/Enterprise (backend server)

New Structure:
1. **Introduction**: Overview of MCP integration philosophy
2. **Local MCP (Free Tier)**:
   - Table: Claude Desktop, Cursor local MCP servers
   - Capabilities: File watching, local snapshot triggers
   - Limitation callout: "Local MCP only — no cloud scoring"
3. **Backend MCP (Solo/Team/Enterprise Tiers)**:
   - Badge: **Solo** (use ShowFor to display for Solo/Team/Enterprise)
   - Table: API-authenticated MCP server with Guardian cloud detection
   - API Key Setup: Step-by-step configuration
   - Capabilities: Risk scoring, dependency analysis
4. **Privacy Notice**: Repeated from footer with link to `/enterprise/security-privacy`

### Reference Documentation

#### `/reference/cli.mdx`
Purpose: Complete CLI command reference

Required Content:
- Installation: `npm install -g @snapback/cli`
- Authentication: `snapback login` with API key flow
- Core Commands:
  - `snapback snapshot create [file]` - Create manual snapshot
  - `snapback snapshot list` - List recent snapshots
  - `snapback snapshot restore <snapshot-id>` - Restore from snapshot (canonical)
  - `snapback snapshot recover <snapshot-id>` - (Deprecated alias) Use 'restore'
  - `snapback guardian scan [file]` - Run Guardian detection
  - `snapback session list` - View session history
- Flags: `--verbose`, `--json`, `--tier <tier>` for testing tier behavior
- Exit Codes: 0 = success, 1 = error, 2 = validation failure

Examples: Real working examples with expected output

#### `/reference/extension.mdx`
Purpose: VS Code extension command reference

Required Content:
- Installation: VS Code marketplace link
- Commands:
  - `snapback.createSnapshot` - Manual snapshot creation
  - `snapback.setProtectionLevel` - Configure file protection
  - `snapback.viewSessions` - Open session timeline
  - `snapback.recoverFile` - Restore file from snapshot
  - `snapback.guardianScan` - Manual Guardian scan
  - `snapback.storageHealthCheck` - Verify storage adapter
- Settings: Complete list from `package.json` contributions
- Keyboard Shortcuts: Default bindings

### Subprocessors Page

#### `/subprocessors.mdx`
Purpose: Vendor transparency for security reviews

Required Vendors:
1. **AWS (Amazon Web Services)**: Cloud infrastructure and snapshot storage (US-East-1 region)
2. **Vercel**: Web hosting and edge functions (Global CDN)
3. **PostHog (Cloud, US)**: Product analytics - event names, device/page metadata. No code content. DPA available.
4. **Supabase**: PostgreSQL database and authentication (US-East-1 region)

For Each Vendor:
- Service Purpose: What they process
- Data Shared: Types of data transmitted
- Location: Data residency region
- DPA Status: Data Processing Agreement status

Note: Better Auth is a library integrated into our application, not a hosted subprocessor.

Roadmap Notice: "Additional subprocessors for Enterprise features (SSO providers) will be added upon GA launch."

### Artifact: Recover Report Sample

#### `/public/artifacts/recover-report-sample.pdf`
Purpose: Tangible deliverable for POC evaluation

Content Requirements:
- Redacted customer logo and project name
- Executive Summary: 2-week POC results
- Key Metrics:
  - Snapshots created: 1,247
  - Guardian detections: 83 (67 secrets, 16 mocks)
  - Recoveries executed: 12
  - Time saved: ~4.5 hours
- Risk Breakdown: Chart showing detection categories
- Team Adoption: 87% of developers used extension daily
- Recommendations: Next steps for full deployment

Linked From:
- `/capabilities` (in Guardian Detection section)
- `/enterprise/onboarding-poc` (in Success Criteria section)

## Frontmatter Schema

### Required Fields
All MDX files must include:
```yaml
title: "Page Title"
description: "SEO and preview description"
```

### Tier-Specific Fields
For pages under `/capabilities` and `/guides`:
```yaml
tier: [free, solo, team, enterprise]  # Array of tiers where feature is available
persona: [solo, team, enterprise]     # Target buyer persona
jobs: ["undo-ai-edits", "prevent-secrets", "enforce-policy"]  # Jobs-to-be-done
```

### Special Flags
```yaml
showPlanSwitcher: true   # Force Plan Switcher to appear (default auto-detects by path)
hidePrivacyNotice: false # Opt-out of footer privacy notice (rarely used)
```

### Tier Array Logic
Component behavior based on `tier` frontmatter:
- `tier: [free]` → TierBadge shows "Free", content visible only when Free selected (or All)
- `tier: [solo, team, enterprise]` → TierBadge shows "Solo", content visible for Solo/Team/Enterprise via ShowFor with minTier
- No `tier` field → Content always visible (no filtering)

Helper for "tier and above" logic:
- Use `minTier` prop in ShowFor: `<ShowFor minTier="solo">` renders for Solo/Team/Enterprise (and All)
- Use `tiers` prop for explicit list: `<ShowFor tiers={['team', 'enterprise']}>` renders only for Team/Enterprise (and All)
- Tier hierarchy: free < solo < team < enterprise
- Special tier: `all` bypasses all filtering (shows everything)

## Analytics Implementation

### Analytics Type Safety

#### Typed Event Guard
Location: `apps/docs/lib/analytics.ts`

Purpose: Type-safe PostHog event capture with runtime validation

Event Definitions:
```typescript
type Tier = 'all' | 'free' | 'solo' | 'team' | 'enterprise';

type PlanFilterChanged = {
  name: 'docs_plan_filter_changed';
  props: { from_tier: Tier; to_tier: Tier; page_path: string };
};

type CtaClick = {
  name: 'docs_cta_click';
  props: {
    feature_name: string;
    target_tier: Exclude<Tier, 'all'>;
    source_page: string;
    cta_text?: string
  };
};

type EnterpriseContact = {
  name: 'docs_enterprise_contact_click';
  props: {
    source: 'enterprise-hub' | 'plans-limits' | 'sso-page';
    page_path: string
  };
};

type QuickstartComplete = {
  name: 'quickstart_complete';
  props: { step_count: number; time_spent: number; tier_context: Tier };
};

type GuardianView = {
  name: 'guardian_docs_view';
  props: { tier_filter: Tier; has_cta_visible: boolean };
};

type DocsEvent =
  | PlanFilterChanged
  | CtaClick
  | EnterpriseContact
  | QuickstartComplete
  | GuardianView;
```

Capture Function:
```typescript
export function captureDocsEvent(e: DocsEvent): void {
  // Guards:
  // 1. Check if PostHog is loaded (window.posthog?.capture exists)
  // 2. Validate required properties per event type
  // 3. Log validation errors to console.error
  // 4. Only capture if validation passes
}
```

Usage in Components:
```typescript
import { captureDocsEvent } from '@/lib/analytics';

// Plan Switcher
captureDocsEvent({
  name: 'docs_plan_filter_changed',
  props: { from_tier: tier, to_tier: v, page_path: location.pathname }
});

// CTA Upgrade
captureDocsEvent({
  name: 'docs_cta_click',
  props: {
    feature_name: 'Guardian Cloud Scoring',
    target_tier: 'solo',
    source_page: '/capabilities/guardian-detection'
  }
});
```

Unit Tests:
Location: `apps/docs/__tests__/analytics.events.spec.ts`

Test Coverage:
- Valid events are captured when PostHog is loaded
- Invalid events (missing required props) are rejected with console.error
- No errors when PostHog is not loaded (graceful degradation)
- Type errors caught at compile time for malformed events

### Event: `docs_plan_filter_changed`
Triggered by: PlanSwitcher component
Properties:
- `from_tier`: Previous tier selection
- `to_tier`: New tier selection
- `page_path`: Current page URL path
- `section`: "capabilities" | "guides" | "other"

Purpose: Measure tier interest and filtering behavior

### Event: `docs_cta_click`
Triggered by: CTAUpgrade component
Properties:
- `feature_name`: Gated feature name
- `target_tier`: Required tier for access
- `source_page`: Page path where CTA was clicked
- `cta_text`: Actual CTA button text

Purpose: Measure conversion intent and feature demand

### Event: `docs_enterprise_contact_click`
Triggered by: Enterprise CTA buttons
Properties:
- `source`: "enterprise-hub" | "plans-limits" | "sso-page"
- `page_path`: Current page path

Purpose: Track enterprise sales qualified leads

### Event: `quickstart_complete`
Triggered by: Quick start guide completion
Properties:
- `step_count`: Number of steps completed
- `time_spent`: Time from page load to completion (seconds)
- `tier_context`: Currently selected tier filter

Purpose: Measure onboarding success

### Event: `guardian_docs_view`
Triggered by: Guardian detection page views
Properties:
- `tier_filter`: Current tier context
- `has_cta_visible`: Boolean if upgrade CTA is visible

Purpose: Measure interest in premium Guardian features

### PostHog Dashboard

Export Location: `apps/docs/.analytics/dashboard.json`

Required Panels:
1. **Tier Filter Usage**: Bar chart of tier selection distribution (including "All")
2. **CTA Click Funnel**: Conversion from page view → CTA click → external link
3. **Enterprise Lead Volume**: Time series of enterprise contact clicks
4. **Quickstart Completion Rate**: Percentage of visitors completing guide
5. **Top Gated Features**: Ranked list of features triggering upgrade CTAs

Dashboard Filters:
- Date range selector
- Path filter (capabilities vs guides vs enterprise vs plans-limits)
- Tier filter (which tier was active during event, including "All")

### Mermaid Diagram Support

Configuration: `apps/docs/source.config.ts` (or fumadocs config)

Add remark-mermaidjs plugin:
```typescript
import remarkMermaid from 'remark-mermaidjs';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkSmartypants, remarkMermaid],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings, rehypeShiki]
  }
});
```

Verification: Test mermaid code block renders in dev mode before committing diagrams

### CI Drift Prevention

Location: `apps/docs/package.json` (or root package.json)

Lint Scripts:
```json
{
  "scripts": {
    "docs:links": "linkinator http://localhost:3000 --concurrency 20 --timeout 10000 --recurse --skip 'mailto:|^https?://'",
    "docs:lint:numbers": "bash -c \"! grep -RIEn '\\b(GB|days)\\b' apps/docs/content/(capabilities|guides) || (echo 'Numbers must live only in Plans & Limits' && exit 1)\"",
    "docs:lint:sso": "bash -c \"! grep -RIEn 'SSO|SAML' apps/docs/content | grep -v 'enterprise/sso-saml' || (echo 'SSO mentions must be enterprise-only' && exit 1)\"",
    "docs:lint": "pnpm biome check && pnpm docs:lint:numbers && pnpm docs:lint:sso"
  }
}
```

Purpose:
- `docs:links`: Fail on broken internal links or placeholder hrefs
- `docs:lint:numbers`: Prevent storage/retention numbers outside Plans & Limits (enforce canonical source)
- `docs:lint:sso`: Prevent SSO/SAML mentions outside `/enterprise/sso-saml`
- Run in CI to catch drift before merge

## Accessibility Requirements

### Keyboard Navigation
- Plan Switcher: Arrow keys navigate options, Enter/Space selects
- All CTAs: Tab-focusable with visible focus ring (2px emerald outline)
- Skip links: "Skip to content" link for screen reader users

### Screen Reader Support
- Plan Switcher: `aria-label="Filter documentation by plan tier"`, `role="radiogroup"`
- Tier Badges: `aria-label="Available in {tier} plan"`
- ShowFor hidden content: Uses `display: none` (not `visibility: hidden`) so removed from accessibility tree
- Mermaid diagrams: `aria-label` describing flow + link to text alternative

### Color Contrast
All tier badge variants meet WCAG AA (4.5:1):
- Free badge: #6B7280 on #1F2937 = 4.52:1
- Solo badge: #3B82F6 on #1E293B = 5.21:1
- Team badge: #8B5CF6 on #1E293B = 4.87:1
- Enterprise badge: #F59E0B on #1E293B = 6.43:1

### Alt Text Requirements
All images and diagrams must include:
- Descriptive alt text summarizing content
- For complex diagrams: Link to text alternative or detailed description below

## Testing Strategy

### Acceptance Tests

#### Test 1: Tier Filtering Behavior
**Setup**: Navigate to `/capabilities/guardian-detection`
**Steps**:
1. Default view is **All** (or last selection from localStorage) → Verify all content visible
2. Select "Free" from Plan Switcher → Verify Solo+ content is hidden
3. Select "Solo" from Plan Switcher → Verify Solo+ content appears
4. Select "Enterprise" → Verify both Solo+ and Enterprise-only content visible
5. Verify localStorage persists selection on page reload

**Expected**: Content visibility matches tier hierarchy (Free < Solo < Team < Enterprise); All shows everything

#### Test 2: SSO Enterprise Exclusivity
**Setup**: Search documentation for "SSO" and "SAML"
**Steps**:
1. Verify all SSO mentions only appear on `/enterprise/sso-saml`
2. Check Plans & Limits matrix → SSO only has checkmark for Enterprise
3. Verify SSO page has Enterprise badge in heading

**Expected**: Zero mentions of SSO outside Enterprise tier

#### Test 3: Guardian Free Tier Messaging
**Setup**: Set Plan Switcher to "Free"
**Steps**:
1. Navigate to `/capabilities/guardian-detection`
2. Verify text includes "Local MCP only — no cloud scoring"
3. Check MCP page → Verify "Local MCP" table visible, "Backend MCP" hidden
4. Verify CTAUpgrade component appears prompting upgrade to Solo

**Expected**: Free tier clearly labeled as local-only with upgrade path

#### Test 4: Subprocessors Page Exists
**Setup**: Navigate to `/subprocessors`
**Steps**:
1. Verify page renders without 404
2. Check for AWS, Vercel, PostHog (Cloud, US), Supabase listings
3. Verify Better Auth is NOT listed (it's a library, not a subprocessor)
4. Verify links from `/enterprise/security-privacy` and footer

**Expected**: Page exists with accurate vendor list and is linked from security documentation

#### Test 5: Recover Report Accessibility
**Setup**: Navigate to `/enterprise/onboarding-poc`
**Steps**:
1. Click "Download Sample Recover Report" link
2. Verify PDF downloads from `/artifacts/recover-report-sample.pdf`
3. Check PDF is also linked from `/capabilities`

**Expected**: PDF downloads successfully and is linked in ≥2 locations

#### Test 6: PostHog Event Tracking
**Setup**: Install PostHog debugger, navigate to `/capabilities`
**Steps**:
1. Change Plan Switcher from All → Solo
2. Verify `docs_plan_filter_changed` event fires with typed properties via `captureDocsEvent`
3. Click upgrade CTA
4. Verify `docs_cta_click` event fires with feature name and tier
5. Navigate to `/enterprise` and click "Contact Sales"
6. Verify `docs_enterprise_contact_click` event fires
7. Check console for validation errors (should be none for valid events)

**Expected**: All five events fire with correct property schemas; invalid events log errors but don't crash

#### Test 7: Link Checker Passes
**Setup**: Run `pnpm linkinator --config linkinator.config.json`
**Steps**:
1. Scan all internal links
2. Verify zero 404 errors
3. Verify all anchor links (`#free`, `#solo`, etc.) resolve

**Expected**: CI link checker passes with zero errors

#### Test 8: MDX Lint Validation
**Setup**: Run `pnpm lint` from `apps/docs`
**Steps**:
1. Biome validates all MDX files
2. Check for frontmatter schema compliance
3. Verify no console errors during build

**Expected**: Lint passes with zero warnings

### Manual QA Checklist

Before PR submission:
- [ ] Plan Switcher appears on Capabilities, Guides, and Plans & Limits pages
- [ ] Plan Switcher defaults to "All" on first visit (or shows last selection)
- [ ] Plan Switcher does NOT appear on Getting Started, Enterprise, Reference
- [ ] Free tier shows "Local MCP only — no cloud scoring" in Guardian docs
- [ ] SSO mentions only exist in `/enterprise/sso-saml` (verify via `pnpm docs:lint:sso`)
- [ ] Privacy notice footer links to `/enterprise/security-privacy`
- [ ] All "snapshot" terminology consistent; "restore" is canonical ("recover" marked deprecated)
- [ ] Subprocessors page lists PostHog as "Cloud, US" and excludes Better Auth
- [ ] Recover Report PDF exists and downloads
- [ ] PostHog dashboard loads with local event data
- [ ] All tier badges show exact tier names (no "Solo+" or "Team+")
- [ ] ShowFor uses `minTier` for "and above" logic instead of tier lists
- [ ] Keyboard navigation works through Plan Switcher (Arrow Left/Right)
- [ ] Screen reader announces tier changes and filter state
- [ ] Plans & Limits matrix is canonical source (all other pages link there for numbers)
- [ ] Link checker passes (`pnpm docs:links`)
- [ ] Numbers lint passes (`pnpm docs:lint:numbers`)
- [ ] SSO lint passes (`pnpm docs:lint:sso`)

## Deployment Strategy

### Branch and PR
**Branch Name**: `docs/ladder-v1`
**PR Title**: `docs: tier-filtered capabilities + enterprise hub + plans & limits`

**PR Description Template**:
```markdown
## Overview
Refactors documentation to align with final tier model (Free/Solo/Team/Enterprise) and adds Enterprise hub with SSO, security, and POC content.

## Changes
- ✅ Plan Switcher component with localStorage persistence
- ✅ Tier badges and conditional rendering (ShowFor, TierBadge)
- ✅ Enterprise hub: Security/Privacy, SSO/SAML, Onboarding/POC
- ✅ Plans & Limits canonical matrix with tier anchors
- ✅ MCP page split: Local (Free) vs Backend (Solo+)
- ✅ Reference docs: CLI and Extension commands
- ✅ Subprocessors transparency page
- ✅ PostHog analytics with 5 events

## Screenshots
1. Plan Switcher on Capabilities page
2. Enterprise hub navigation
3. Plans & Limits matrix
4. Tier badge rendering

## Testing
- [x] Link checker passes (0 broken links)
- [x] MDX lint passes
- [x] All 8 acceptance tests pass
- [x] PostHog events verified in debugger
- [x] Keyboard navigation tested
- [x] Screen reader compatibility verified

## Rollback Plan
New components are additive. To disable:
- Hide Plan Switcher by removing from layout
- Previous links remain functional (no breaking changes)
```

### Rollback Procedure
If issues arise post-merge:

**Option 1: Hide Plan Switcher**
```typescript
// apps/docs/app/[[...slug]]/layout.tsx
const ENABLE_PLAN_SWITCHER = false; // Feature flag
```

**Option 2: Revert Commit**
- All new components are isolated in `components/docs/`
- No modifications to existing core docs
- Safe to revert entire commit without data loss

**Option 3: Redirect Strategy**
Add redirects in `next.config.mjs`:
```javascript
redirects: [
  { source: '/enterprise/:path*', destination: '/contact', permanent: false },
  { source: '/plans-limits', destination: '/pricing', permanent: false }
]
```

### Monitoring Post-Deploy

**Week 1 Metrics**:
- Plan Switcher usage rate (% of visitors who interact)
- Tier distribution (which tier is most selected)
- Enterprise hub visit volume
- CTA click-through rate by tier

**Success Criteria**:
- Zero 404 errors in Vercel logs
- Link checker CI remains green
- PostHog receiving all 5 event types
- Enterprise hub pages rank in Google within 7 days (indexed)

## Privacy and Compliance

### Data Handling
**User Data Collected by Docs Site**:
- Plan Switcher preference (localStorage only, not transmitted)
- PostHog analytics events (anonymized user IDs)
- Page views and navigation patterns

**No PII Collected**: No email, names, or identifiable information

### MCP Privacy Messaging
**Standard Footer Notice**:
"ℹ️ MCP is optional. When enabled, some data is sent to SnapBack for analysis. The extension works without MCP. [Learn more](/privacy)"

**Placement**:
- Footer of all documentation pages
- Repeated inline on `/docs/mcp` page
- Included in Enterprise security/privacy documentation

### GDPR Compliance
- localStorage preference can be cleared by user
- PostHog respects Do Not Track headers
- Data deletion instructions in `/enterprise/security-privacy`

## Success Metrics

### Quantitative KPIs
1. **Tier Qualification Rate**: 60%+ of visitors interact with Plan Switcher within 30 days
2. **Enterprise Lead Volume**: 10+ enterprise contact clicks per month
3. **Quickstart Completion**: 40%+ completion rate (up from baseline)
4. **CTA Conversion**: 5%+ of visitors click upgrade CTAs
5. **Zero Errors**: Link checker and MDX lint remain green in CI

### Qualitative Indicators
1. **Sales Feedback**: Prospects reference Enterprise hub in calls
2. **Support Ticket Reduction**: Fewer "What tier includes X?" questions
3. **SEO Performance**: Enterprise pages rank for "AI code protection enterprise SSO"
4. **User Feedback**: Positive sentiment in Discord/GitHub about clarity

### Monitoring Cadence
- **Daily** (Week 1): Check Vercel logs for 404s, PostHog event volume
- **Weekly** (Month 1): Review tier distribution, CTA performance
- **Monthly**: Assess enterprise lead quality, update dashboard

## Open Questions and Risks

### Technical Risks
1. **FumaDocs Compatibility**: Confirm custom components work with FumaDocs MDX processing
   - Mitigation: Test in local dev environment before PR
2. **Mermaid Diagram Rendering**: Ensure remark-mermaidjs plugin is installed and configured
   - Mitigation: Add to source.config.ts, verify mermaid code blocks render in dev mode
3. **MDX Linting**: Biome may not validate MDX structure reliably
   - Mitigation: Use custom lint scripts (docs:lint:numbers, docs:lint:sso) for docs-specific rules
4. **localStorage Persistence**: Browser privacy modes may clear tier preference
   - Mitigation: Graceful degradation to "All" tiers view (no filtering)
5. **PDF File Size**: Recover Report sample must be <2MB for fast download
   - Mitigation: Compress with Acrobat or similar tool
6. **Link Checker CI Rule**: Must fail build on broken internal links or placeholder hrefs
   - Mitigation: Add `docs:links` script to CI pipeline; use linkinator with proper config
7. **PostHog Type Safety**: Risk of invalid event payloads causing silent failures
   - Mitigation: Typed `captureDocsEvent` guard with runtime validation and unit tests

### Content Risks
1. **Terminology Drift**: Risk of "snapshot" vs "checkpoint" inconsistency across CLI/extension/docs
   - Mitigation: Global find/replace to standardize on "snapshot" everywhere; add to style guide
2. **Tier Boundary Confusion**: Users may not understand Solo vs Team distinction
   - Mitigation: Clear comparison table in Plans & Limits as canonical source
3. **SSO Documentation Depth**: Customers may need IdP-specific guides
   - Mitigation: Start with generic SAML guide, add IdP-specific docs post-launch
4. **POC Framework Scope**: 2-week timeline may be too aggressive for some enterprises
   - Mitigation: Label as "recommended" not "required" timeline
5. **Storage Limits Consistency**: Risk of conflicting GB/seat numbers across docs
   - Mitigation: Make Plans & Limits matrix canonical; all other pages say "See Plans & Limits"

### Process Risks
1. **Screenshot Requirements**: Need to capture screenshots pre-merge for PR
   - Mitigation: Build locally, capture screenshots, commit to PR
2. **PostHog Dashboard Export**: Dashboard must exist before code merge
   - Mitigation: Create dashboard in PostHog staging, export JSON, commit to repo
3. **Recover Report Creation**: Requires redacting real customer data
   - Mitigation: Create synthetic report with realistic but fake data

## Future Enhancements

### Phase 2 (Post-Launch)
1. **Interactive Tier Calculator**: "Which plan is right for me?" quiz
2. **Video Walkthroughs**: Loom recordings for SSO setup, POC framework
3. **Customer Testimonials**: Enterprise case studies in `/enterprise/case-studies`
4. **API Documentation**: Interactive API reference for Enterprise tier
5. **Tier Hierarchy Helper**: Add `minTier` prop to ShowFor component for cleaner "and above" logic
6. **SSO Regression Prevention**: Add automated check (grep/lint rule) to prevent SSO mentions outside `/enterprise/sso-saml`
7. **Enhanced UI Components**: Explore Aceternity UI or Magic UI for polished tier badges, animated plan switcher, and marketing-grade CTAs (balance visual appeal vs bundle size impact on <400KB target)

### Phase 3 (3-6 Months)
1. **Multi-Language Support**: Translate docs to Spanish, German, Japanese
2. **Advanced Search**: Tier-aware search results (hide Solo+ results for Free tier context)
3. **Changelog Integration**: Tier-labeled release notes
4. **Community Contributions**: Open-source examples repo linked from docs

### Backlog Ideas
- Comparison page: SnapBack vs Git revert vs manual backups
- Security whitepaper: Downloadable PDF for security reviews
- Compliance certifications: SOC2 badge, GDPR seal in footer
- Interactive demo: Embedded SnapBack demo environment in docs- Compliance certifications: SOC2 badge, GDPR seal in footer
