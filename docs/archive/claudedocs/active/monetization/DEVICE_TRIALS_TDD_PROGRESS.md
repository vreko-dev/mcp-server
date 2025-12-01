# Device Trials TDD Implementation Progress

## ✅ Phase 1: Red Phase - Tests First (COMPLETED)

### Test File Created

**Location**: `packages/database/__tests__/device-trials.test.ts`

**Test Coverage** (21 comprehensive tests):

-   ✅ Table structure validation (columns, constraints, indexes)
-   ✅ Device trial creation with fingerprint
-   ✅ Unique fingerprint constraint enforcement
-   ✅ Default values (50 checkpoints, 10K API calls)
-   ✅ Usage tracking (checkpoints, API calls, last_seen_at)
-   ✅ User conversion (linking device to email signup)
-   ✅ Usage preservation after conversion
-   ✅ Reinstall tracking
-   ✅ Abuse prevention (blocking after 3 reinstalls)
-   ✅ Block expiration handling
-   ✅ Limit enforcement (checkpoint and API call limits)
-   ✅ Query performance validation

**Test Results**: All 21 tests failing as expected ✓ (Red phase confirmed)

## ✅ Phase 2: Green Phase - Schema Implementation (COMPLETED)

### Schema File Created

**Location**: `packages/database/drizzle/schema/snapback/device-trials.ts`

**Schema Features**:

```typescript
deviceTrials table:
- id: uuid (primary key)
- deviceFingerprint: text (unique) - VSCode machineId hash
- apiKeyId: text (FK to api_keys)
- checkpointsUsed: integer (default 0)
- apiCallsUsed: integer (default 0)
- checkpointLimit: integer (default 50)
- apiCallLimit: integer (default 10000)
- userId: text (nullable FK to user)
- convertedAt: timestamp (nullable)
- installCount: integer (default 1)
- blockedUntil: timestamp (nullable)
- lastSeenAt: timestamp
- createdAt: timestamp
```

**Indexes**:

-   `device_trials_fingerprint_idx` - Fast device lookup
-   `device_trials_user_idx` - Find all devices for user
-   `device_trials_blocked_idx` - Check blocked devices

**Relations**:

-   One-to-one with user (nullable until email signup)
-   Many-to-one with apiKeys

### SQL Migration File Created

**Location**: `packages/database/drizzle/migrations/0001_create_device_trials.sql`

**Migration Contents**:

-   CREATE TABLE with all columns
-   CREATE UNIQUE INDEX on device_fingerprint
-   CREATE INDEX on user_id (partial, WHERE user_id IS NOT NULL)
-   CREATE INDEX on blocked_until (partial, WHERE blocked_until IS NOT NULL)
-   COMMENT statements for documentation

## ⏳ Next Steps: Database Migration

### Option 1: Manual Migration via Supabase Dashboard (RECOMMENDED)

1. **Open Supabase SQL Editor**:

    - Go to https://supabase.com/dashboard
    - Navigate to your project
    - Open SQL Editor

2. **Run Migration**:

    ```sql
    -- Copy contents from: packages/database/drizzle/migrations/0001_create_device_trials.sql
    -- Paste into SQL Editor and execute
    ```

3. **Verify Table Created**:
    ```sql
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'device_trials'
    ORDER BY ordinal_position;
    ```

### Option 2: Fix drizzle-kit SSL Configuration

Current issue: `drizzle-kit push` fails with SSL connection errors.

**Attempted solutions**:

-   ❌ Added `ssl: "require"` to dbCredentials
-   ❌ Appended `sslmode=require` to DATABASE_URL
-   ❌ Added SSL object config

**Potential fix** (not yet tested):

```bash
# Append SSL mode directly to DATABASE_URL in .env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Then run:
pnpm --filter @snapback/database run push
```

### Option 3: Use Supabase CLI (Alternative)

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Link project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## ✅ Once Migration is Applied

### Verify Tests Pass

```bash
pnpm --filter @snapback/database test __tests__/device-trials.test.ts
```

**Expected Result**: All 21 tests should pass ✓ (Green phase complete)

## 🎯 Progressive Authentication Funnel

The device_trials table enables:

1. **Stage 1: Anonymous Device Trial** (device fingerprint only)

    - 50 checkpoints
    - 10,000 API calls/month
    - No email required
    - Block after 3 reinstalls within 24h

2. **Stage 2: Email Signup** (convert device → user)

    - Link device_fingerprint to user.id
    - Increase to 1,000 checkpoints
    - Still free tier
    - Preserve existing usage

3. **Stage 3: Paid Tier** (full account)
    - Unlimited checkpoints
    - Professional/Team/Enterprise features
    - Tracked via subscriptions table

## 🔒 Anti-Abuse Features

-   **Device Fingerprinting**: VSCode machineId (hashed)
-   **Reinstall Tracking**: install_count increments on each new install
-   **Automatic Blocking**: After 3 reinstalls, set blocked_until = now() + 24h
-   **Cooldown Period**: 24h block before trial reset
-   **Progressive Limits**: 50 → 1000 → unlimited

## 📊 Analytics Integration

PostHog identity flow:

```typescript
// Stage 1: Anonymous device
posthog.identify(`device_${fingerprint}`, {
	deviceType: "vscode_extension",
	trialStage: "anonymous",
});

// Stage 2: Email signup (alias device → user)
posthog.alias(userId, `device_${fingerprint}`);
posthog.identify(userId, {
	email: user.email,
	trialStage: "email_signup",
});

// Stage 3: Payment (update properties)
posthog.identify(userId, {
	plan: "professional",
	trialStage: "paid",
});
```

## 🧪 TDD Cycle Status

-   ✅ **Red Phase**: Tests written and failing (21/21 tests)
-   ✅ **Green Phase**: Schema and migration created
-   ⏳ **Migration Pending**: Manual SQL execution required
-   ⏳ **Verify Green**: Run tests after migration
-   ⏳ **Refactor Phase**: Optimize indexes, add helpers

## Next TDD Cycle: API Routes

After device_trials table is live:

1. Create API route tests (Red phase)
2. Implement API routes (Green phase)
3. Refactor and optimize

Files to create:

-   `apps/web/__tests__/api/device-trial.test.ts`
-   `apps/web/__tests__/api/checkpoint.test.ts`
-   `apps/web/__tests__/api/link-device.test.ts`
-   `apps/web/__tests__/api/stripe-webhooks.test.ts`
