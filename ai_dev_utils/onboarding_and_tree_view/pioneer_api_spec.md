# Pioneer API Specification

**Base URL**: `/api/pioneer`  
**Auth**: API Key or Session Token  
**Format**: JSON

---

## Data Models

### Pioneer

```typescript
interface Pioneer {
  id: string;
  userId: string;
  githubUsername: string;
  tier: "seedling" | "grower" | "cultivator" | "guardian";
  totalPoints: number;
  referralCode: string;        // unique, e.g. "abc123"
  referredBy?: string;         // referralCode of referrer
  createdAt: string;           // ISO timestamp
  lastActivityAt: string;
}
```

### PioneerAction

```typescript
interface PioneerAction {
  id: string;
  pioneerId: string;
  actionType: ActionType;
  points: number;
  verified: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

type ActionType =
  | "account_created"      // +50, once
  | "email_verified"       // +25, once
  | "github_starred"       // +100, once
  | "discord_joined"       // +75, once
  | "first_snapshot"       // +50, once
  | "referral_signup"      // +200, repeatable
  | "referral_activated"   // +100, repeatable (referral hits 5 snapshots)
  | "feedback_submitted"   // +150, repeatable
  | "share_twitter"        // +50, weekly
  | "tutorial_completed";  // +25, once
```

### Tier Thresholds

```typescript
const TIER_THRESHOLDS = {
  seedling: 0,
  grower: 250,
  cultivator: 750,
  guardian: 1500,
} as const;
```

---

## Endpoints

### 1. Signup / Initialize

**POST** `/api/pioneer/signup`

Creates Pioneer record on first auth. Idempotent—returns existing if already exists.

**Request:**
```typescript
{
  // No body needed - uses session
}
```

**Response:**
```typescript
{
  pioneer: Pioneer;
  isNew: boolean;
  pointsAwarded?: number;  // 50 if new
}
```

**Side effects:**
- Creates `account_created` action (+50 pts) if new
- Generates unique `referralCode`

---

### 2. Get Current Pioneer

**GET** `/api/pioneer/me`

**Response:**
```typescript
{
  pioneer: Pioneer;
  progress: {
    currentTier: string;
    nextTier: string | null;
    pointsToNext: number;
    percentToNext: number;
  };
  completedActions: ActionType[];
  availableActions: {
    actionType: ActionType;
    points: number;
    completed: boolean;
    repeatable: boolean;
  }[];
}
```

---

### 3. Record Action

**POST** `/api/pioneer/actions`

Records a point-earning action. Server validates eligibility.

**Request:**
```typescript
{
  actionType: ActionType;
  metadata?: {
    // For referral_signup
    referralCode?: string;
    
    // For feedback_submitted
    feedbackId?: string;
    
    // For share_twitter
    tweetUrl?: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  action?: PioneerAction;
  pointsAwarded: number;
  newTotal: number;
  tierChanged?: {
    from: string;
    to: string;
  };
  error?: string;  // "already_completed" | "rate_limited" | "invalid_action"
}
```

**Validation rules:**
| Action | Validation |
|--------|------------|
| `github_starred` | Check GitHub API for star |
| `discord_joined` | Check Discord OAuth callback |
| `first_snapshot` | Check telemetry for snapshot event |
| `referral_signup` | Validate referralCode exists |
| `share_twitter` | Rate limit: 1 per 7 days |
| `feedback_submitted` | Require feedbackId from feedback form |

---

### 4. Verify GitHub Star

**POST** `/api/pioneer/actions/verify-github`

Checks if user has starred the repo. Called from extension or web after GitHub auth.

**Request:**
```typescript
{
  // Uses session's GitHub token
}
```

**Response:**
```typescript
{
  starred: boolean;
  pointsAwarded?: number;  // 100 if newly verified
}
```

**Implementation:**
```typescript
// GitHub API call
GET https://api.github.com/user/starred/marcellelabs/snapback
Authorization: Bearer {user_github_token}
// 204 = starred, 404 = not starred
```

---

### 5. Discord OAuth Callback

**GET** `/api/pioneer/actions/discord/callback`

Handles Discord OAuth, awards points if joined server.

**Query params:**
```
?code={discord_oauth_code}&state={csrf_token}
```

**Response:** Redirects to `/pioneer?discord=success` or `?discord=error`

**Side effects:**
- Awards `discord_joined` (+75 pts) if user in SnapBack server
- Assigns Discord role based on tier

---

### 6. Get Leaderboard

**GET** `/api/pioneer/leaderboard`

**Query params:**
```
?limit=10        // default 10, max 100
&offset=0        // for pagination
&around=true     // include current user's position
```

**Response:**
```typescript
{
  leaderboard: {
    rank: number;
    username: string;
    avatar?: string;
    tier: string;
    points: number;
    isCurrentUser: boolean;
  }[];
  total: number;
  currentUserRank?: number;
}
```

---

### 7. Get Referral Info

**GET** `/api/pioneer/referrals`

**Response:**
```typescript
{
  referralCode: string;
  referralUrl: string;  // "https://snapback.dev/join/{code}"
  stats: {
    totalSignups: number;
    activatedSignups: number;  // hit 5 snapshots
    pointsEarned: number;
  };
  referrals: {
    username: string;
    status: "pending" | "activated";
    signedUpAt: string;
    activatedAt?: string;
  }[];
}
```

---

### 8. Apply Referral Code

**POST** `/api/pioneer/referrals/apply`

Called during signup if user has referral code.

**Request:**
```typescript
{
  referralCode: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  referrer?: string;  // username of referrer
  error?: string;     // "invalid_code" | "already_referred" | "self_referral"
}
```

**Side effects:**
- Awards `referral_signup` (+200 pts) to referrer
- Sets `referredBy` on new Pioneer

---

### 9. Get Pioneer Stats (Public)

**GET** `/api/pioneer/stats`

No auth required. For homepage counter.

**Response:**
```typescript
{
  totalPioneers: number;
  tierCounts: {
    seedling: number;
    grower: number;
    cultivator: number;
    guardian: number;
  };
  recentActivity: {
    type: "signup" | "tier_up";
    username: string;
    tier?: string;
    timestamp: string;
  }[];
}
```

---

### 10. Tier History

**GET** `/api/pioneer/tiers/history`

**Response:**
```typescript
{
  history: {
    tier: string;
    reachedAt: string;
    pointsAtTime: number;
  }[];
}
```

---

## Webhooks (Internal)

### Telemetry → Pioneer

When extension sends telemetry events, trigger point checks:

```typescript
// packages/api/modules/telemetry/procedures/ingest-events.ts
if (event.type === "snapshot.created" && !pioneer.completedFirstSnapshot) {
  await awardPoints(pioneer.id, "first_snapshot");
}

if (event.type === "tutorial.completed") {
  await awardPoints(pioneer.id, "tutorial_completed");
}
```

### Referral Activation Check

Cron job or event-driven:

```typescript
// Check if referred users hit 5 snapshots
SELECT p.id, p.referred_by, COUNT(s.id) as snapshot_count
FROM pioneers p
JOIN snapshots s ON s.user_id = p.user_id
WHERE p.referred_by IS NOT NULL
  AND p.id NOT IN (SELECT pioneer_id FROM pioneer_actions WHERE action_type = 'referral_activated')
GROUP BY p.id
HAVING COUNT(s.id) >= 5;

// Award referral_activated (+100 pts) to referrer
```

---

## Database Schema

```sql
-- Pioneer table
CREATE TABLE pioneers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'seedling',
  total_points INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES pioneers(referral_code),
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_tier CHECK (tier IN ('seedling', 'grower', 'cultivator', 'guardian'))
);

-- Pioneer actions
CREATE TABLE pioneer_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  pioneer_id TEXT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  verified BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate one-time actions
  UNIQUE (pioneer_id, action_type) WHERE action_type IN (
    'account_created', 'email_verified', 'github_starred', 
    'discord_joined', 'first_snapshot', 'tutorial_completed'
  )
);

-- Tier history (for analytics)
CREATE TABLE pioneer_tier_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  pioneer_id TEXT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  points_at_time INTEGER NOT NULL,
  reached_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pioneers_total_points ON pioneers(total_points DESC);
CREATE INDEX idx_pioneers_referral_code ON pioneers(referral_code);
CREATE INDEX idx_pioneer_actions_pioneer_id ON pioneer_actions(pioneer_id);
CREATE INDEX idx_pioneer_actions_type ON pioneer_actions(action_type);
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /actions` | 10/min |
| `GET /leaderboard` | 30/min |
| `POST /referrals/apply` | 5/min |
| `GET /stats` | 60/min (public) |

---

## Error Codes

```typescript
type PioneerError =
  | "not_authenticated"
  | "pioneer_not_found"
  | "action_already_completed"
  | "action_rate_limited"
  | "invalid_action_type"
  | "invalid_referral_code"
  | "self_referral"
  | "already_referred"
  | "github_not_starred"
  | "discord_not_joined";
```

---

## PostHog Events

```typescript
// Track for funnel analysis
"pioneer_signup"
"pioneer_action_completed" { action_type, points }
"pioneer_tier_changed" { from, to, points }
"pioneer_referral_sent"
"pioneer_referral_converted"
"pioneer_leaderboard_viewed"
```