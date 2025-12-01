# SnapBack SaaS Platform - Comprehensive Analysis

**Analysis Date**: 2025-09-30
**Analyzed Components**: Dashboard, Authentication, Onboarding, All User Journeys
**Architecture**: Next.js 15 + React 19 + Better Auth + Drizzle ORM + Stripe

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Overview](#current-state-overview)
3. [Authentication & Authorization](#authentication--authorization)
4. [Dashboard Implementation](#dashboard-implementation)
5. [Onboarding Flows](#onboarding-flows)
6. [User Journeys](#user-journeys)
7. [Integration Architecture](#integration-architecture)
8. [Strengths & Opportunities](#strengths--opportunities)

---

## Executive Summary

The SnapBack SaaS platform is a **modern, production-ready multi-tenant application** built with Next.js 15 App Router and Better Auth. The platform supports **developer tool protection** with API key management, cloud backup, and team collaboration features.

### Key Metrics

-   **Routes**: 20+ protected routes across account and organization scopes
-   **Auth Methods**: 6 authentication providers (email/password, magic link, Google, GitHub, passkeys, 2FA)
-   **Billing Plans**: 3 tiers (Free, Solo at $9/mo, Team at $25/mo with seat-based pricing)
-   **API Modules**: 9 domain-specific modules with type-safe oRPC
-   **Database Tables**: 20+ tables with full type safety via Drizzle ORM

### Architecture Highlights

✅ End-to-end TypeScript type safety
✅ Multi-tenancy with organization-based isolation
✅ Comprehensive authentication with Better Auth
✅ Stripe integration with webhook handling
✅ Server Components for performance
✅ React Query for optimal caching

---

## Current State Overview

### Route Structure

```
/apps/web/app/(saas)/
├── layout.tsx                              # Auth gate + session provider
├── onboarding/page.tsx                     # Post-signup onboarding
├── new-organization/page.tsx               # Organization creation
├── choose-plan/page.tsx                    # Plan selection
├── organization-invitation/[id]/page.tsx   # Team invitation acceptance
└── app/
    ├── layout.tsx                          # Billing gate + org requirement
    ├── dashboard/page.tsx                  # NEW: Main dashboard
    ├── (account)/                          # User-scoped routes
    │   ├── page.tsx                        # User start page
    │   ├── chatbot/page.tsx               # AI chatbot
    │   ├── settings/
    │   │   ├── general/page.tsx           # Profile settings
    │   │   ├── security/page.tsx          # Password, 2FA, passkeys
    │   │   └── billing/page.tsx           # User billing
    │   └── admin/                         # Admin-only
    │       ├── users/page.tsx
    │       └── organizations/page.tsx
    └── (organizations)/[slug]/            # Organization-scoped routes
        ├── page.tsx                       # Org start page
        ├── chatbot/page.tsx              # Org-scoped chatbot
        └── settings/
            ├── general/page.tsx           # Org name, slug, logo
            ├── members/page.tsx           # Team management
            ├── billing/page.tsx           # Org billing
            └── danger-zone/page.tsx       # Delete org
```

### Protection Layers

**Layer 1: SaaS Layout** (apps/web/app/(saas)/layout.tsx:17-63)

-   Session check → redirect to `/auth/login` if not authenticated
-   Prefetch: session, organizations, purchases
-   Providers: `SessionProvider`, `ActiveOrganizationProvider`, `ConfirmationAlertProvider`

**Layer 2: App Layout** (apps/web/app/(saas)/app/layout.tsx:12-72)

-   Onboarding gate → redirect to `/onboarding` if incomplete
-   Organization requirement → redirect to `/new-organization` if none exist
-   Billing gate → redirect to `/choose-plan` if no active plan

**Layer 3: Admin Layout** (apps/web/app/(saas)/app/(account)/admin/layout.tsx:17-21)

-   Admin role required → redirect to `/app` if not admin

**Layer 4: Organization Layout** (apps/web/app/(saas)/app/(organizations)/[slug]/layout.tsx:20-43)

-   Organization existence check → 404 if not found
-   Prefetch organization data and purchases

---

## Authentication & Authorization

### Supported Authentication Methods

#### 1. **Email + Password**

**Flow**: apps/web/modules/saas/auth/components/LoginForm.tsx:59-357

```typescript
// Login process
1. User submits credentials
2. authClient.signIn.email({ email, password })
3. Check for 2FA → redirect to /auth/verify if enabled
4. Create session with activeOrganizationId
5. Redirect to invitation or default app route
```

**Features**:

-   Password strength requirements
-   Email verification (configurable)
-   Password reset via email
-   Account linking with OAuth

#### 2. **Magic Link** (Passwordless)

**Flow**: apps/web/modules/saas/auth/components/LoginForm.tsx:118-126

```typescript
// Magic link process
1. User enters email
2. authClient.signIn.magicLink({ email, callbackURL })
3. Email sent with one-time login link
4. User clicks link → auto-login
5. Session created, redirect to app
```

**Email Template**: packages/mail/emails/MagicLink.tsx

#### 3. **OAuth Providers** (Google, GitHub)

**Configuration**: packages/auth/auth.ts:189-200

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: ["email", "profile"]
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: ["user:email"]
  }
}
```

**Account Linking**: Enabled - allows users to link multiple providers to same account

#### 4. **Passkeys** (WebAuthn)

**Status**: Disabled by default (config.auth.enablePasskeys: false)

**Implementation**:

-   Registration: apps/web/modules/saas/settings/components/PasskeysBlock.tsx
-   Login: authClient.signIn.passkey()
-   Storage: `passkey` table with WebAuthn credentials
-   Device types tracked: biometric, security key

#### 5. **Two-Factor Authentication** (TOTP)

**Enabled**: config.auth.enableTwoFactor: true

**Setup Flow**: apps/web/modules/saas/settings/components/TwoFactorBlock.tsx

```typescript
1. User enables 2FA in settings
2. Generate TOTP secret
3. Display QR code for authenticator apps
4. Generate backup codes
5. Verify TOTP code to activate
```

**Login with 2FA**:

```typescript
1. User logs in with password
2. Check if 2FA enabled → set twoFactorRedirect flag
3. Redirect to /auth/verify
4. Enter TOTP code from app
5. authClient.twoFactor.verifyTotp({ code })
6. Create session on success
```

#### 6. **Password Reset**

**Flow**: apps/web/modules/saas/auth/components/ForgotPasswordForm.tsx

```typescript
1. User clicks "Forgot password" → /auth/forgot-password
2. Enter email address
3. authClient.forgetPassword({ email })
4. Email sent with reset link + token
5. User clicks link → /auth/reset-password?token=xxx
6. Enter new password
7. authClient.resetPassword({ password, token })
8. Password updated, redirect to login
```

### Session Management

**Storage**: Database-backed sessions (PostgreSQL)
**Cookie**: HTTP-only, secure, SameSite protection
**Expiration**: 30 days (configurable via config.auth.sessionCookieMaxAge)

**Session Schema**: packages/database/drizzle/schema/postgres.ts

```typescript
session {
  id: varchar (PK)
  userId: text (FK → user)
  token: text (unique index)
  expiresAt: timestamp
  activeOrganizationId: text  // Current organization context
  ipAddress: text              // Security tracking
  userAgent: text              // Device fingerprinting
  impersonatedBy: text         // Admin impersonation support
}
```

**Server-Side Access**: apps/web/modules/saas/auth/lib/server.ts:7-76

```typescript
// Cached session retrieval
export const getSession = cache(async () => {
	return await auth.api.getSession({
		headers: await headers(),
		query: { disableCookieCache: true },
	});
});
```

**Client-Side Access**: apps/web/modules/saas/auth/hooks/session.tsx

```typescript
const { user, session, loaded } = useSession();
// user: { id, name, email, role, ... }
// session: { activeOrganizationId, ... }
```

### Authorization Model

#### User Roles

```typescript
// User-level roles (database: user.role)
"admin"     → Full platform access, can manage all users/orgs
undefined   → Standard user access
```

#### Organization Roles

```typescript
// Organization member roles (database: member.role)
"owner"  → Full organization control, can delete org
"admin"  → Can invite/remove members, manage settings, billing
"member" → Basic access, view-only for settings
```

#### Permission Checks

**Route Protection**:

```typescript
// Admin routes: apps/web/app/(saas)/app/(account)/admin/layout.tsx:17-21
if (user?.role !== "admin") redirect("/app");

// Organization admin checks
if (!isOrganizationAdmin(organization, user)) {
	// Hide invite form, delete button, etc.
}
```

**API Authorization**: packages/api/modules/organizations/lib/membership.ts

```typescript
export async function verifyOrganizationMembership(
	organizationId: string,
	userId: string
) {
	const membership = await drizzle.db.query.member.findFirst({
		where: (member, { and, eq }) =>
			and(
				eq(member.organizationId, organizationId),
				eq(member.userId, userId)
			),
	});

	if (!membership) return null;
	return { organization, role: membership.role };
}
```

**API Key Permissions** (Plan-based): packages/api/modules/apikeys/procedures/create-api-key.ts:91-119

```typescript
free: {
  maxCheckpoints: 100,
  cloudBackup: false,
  advancedDetection: false,
  customRules: false,
  teamSharing: false
}

solo: {
  maxCheckpoints: undefined,  // unlimited
  cloudBackup: true,
  advancedDetection: true,
  customRules: true,
  teamSharing: false
}

team: {
  maxCheckpoints: undefined,
  cloudBackup: true,
  advancedDetection: true,
  customRules: true,
  teamSharing: true  // Shared checkpoints across team
}
```

### Security Features

✅ **HTTP-only session cookies** - Not accessible via JavaScript
✅ **CSRF protection** - Built into Better Auth
✅ **Password hashing** - bcrypt with 10 rounds
✅ **API key hashing** - bcrypt, never stored in plain text
✅ **Email verification** - Configurable, recommended for production
✅ **Rate limiting** - IP-based and API key-based
✅ **Session tracking** - IP address and user agent logged
✅ **Account linking** - Secure OAuth account linking
✅ **Webhook signature verification** - Stripe webhook secrets

⚠️ **Missing**: Audit logging, IP-based login alerts, device management

---

## Dashboard Implementation

### Current Features

**Location**: apps/web/app/(saas)/app/dashboard/page.tsx:19-226

#### 1. **Status Overview Banner**

```typescript
// Active protection status
<Alert>
	<Shield className="h-4 w-4" />
	<AlertTitle>Protected & Active</AlertTitle>
	<AlertDescription>
		Your checkpoints are actively monitoring for AI changes
	</AlertDescription>
</Alert>
```

#### 2. **Metrics Grid** (4-column responsive)

**Data Source**: Mock data (hardcoded)

```typescript
metrics = [
	{
		title: "Checkpoints Created",
		value: "247",
		change: "+12%",
		trend: "up",
		icon: FileCheck,
	},
	{
		title: "Recoveries Performed",
		value: "3",
		change: "+2 this week",
		trend: "neutral",
		icon: RotateCcw,
	},
	{
		title: "Files Protected",
		value: "1,247",
		change: "Across 5 projects",
		trend: "neutral",
		icon: FolderTree,
	},
	{
		title: "AI Detection Rate",
		value: "94%",
		change: "High confidence",
		trend: "up",
		icon: Brain,
	},
];
```

**Rendering**: Card components with icons, values, change indicators

#### 3. **API Keys Section**

**Data Source**: Real data from database

```typescript
// Server-side query
const userApiKeys = await drizzle.db
	.select()
	.from(apiKeys)
	.where(eq(apiKeys.userId, session.user.id))
	.orderBy(apiKeys.createdAt);

// Display component
<ApiKeyList apiKeys={userApiKeys} />;
```

**Features**:

-   List all user API keys
-   Show key preview (first 8 chars)
-   Display last used timestamp
-   Create new key button
-   Revoke key action (partial implementation)

#### 4. **Quick Actions**

**Status**: Placeholder UI (not functional)

```typescript
quickActions = [
	{
		title: "Download Extension",
		description: "Get the VS Code extension",
		icon: Download,
		action: "download-vscode", // Not implemented
	},
	{
		title: "Install CLI",
		description: "Command-line tools",
		icon: Terminal,
		action: "install-cli", // Not implemented
	},
	{
		title: "View Documentation",
		description: "Setup guides & API docs",
		icon: BookOpen,
		action: "view-docs", // Not implemented
	},
];
```

### Data Flow

```
Server Component (dashboard/page.tsx)
  ↓
1. getSession() → verify authentication
2. Query apiKeys table → getUserApiKeys()
3. Query subscriptions table → getSubscription()
  ↓
Pass data as server-side props
  ↓
Client Components (ApiKeyList, metrics cards)
  ↓
Interactive actions (create/revoke keys)
  ↓
API mutations via oRPC
  ↓
Database updates
  ↓
UI refresh via React Query invalidation
```

### Backend Integration

**API Endpoints**: packages/api/modules/apikeys/procedures/

#### Create API Key

```typescript
// Frontend mutation
const createKeyMutation = useMutation(
  orpc.apiKeys.create.mutationOptions()
);

await createKeyMutation.mutateAsync({ name: "My Dev Key" });

// Backend: packages/api/modules/apikeys/procedures/create-api-key.ts
1. Verify user has active subscription
2. Get plan-based permissions
3. Generate random key: "sb_" + 32 hex chars
4. Hash key with bcrypt
5. Store: { userId, name, key: hashed, keyPreview: first8chars, permissions }
6. Return raw key (only shown once)
```

#### List API Keys

```typescript
// Backend: packages/api/modules/apikeys/procedures/list-api-keys.ts
const keys = await drizzle.db
	.select()
	.from(apiKeys)
	.where(eq(apiKeys.userId, userId))
	.orderBy(desc(apiKeys.createdAt));

// Returns: { id, name, keyPreview, lastUsedAt, createdAt, permissions }
// Note: Full hashed key never returned
```

#### Revoke API Key

```typescript
// Backend: packages/api/modules/apikeys/procedures/revoke-api-key.ts
await drizzle.db
	.update(apiKeys)
	.set({ revokedAt: new Date() })
	.where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
```

### Usage Tracking

**Table**: apiUsage (packages/database/drizzle/schema/postgres.ts)

```typescript
apiUsage {
  id: text (PK)
  apiKeyId: text (FK → apiKeys)
  endpoint: text  // "checkpoint", "recovery", "status"
  method: text
  statusCode: integer
  metadata: json {
    filesProtected?: number
    checkpointId?: string
    aiTool?: "cursor" | "copilot" | "continue" | "codeium"
  }
  timestamp: timestamp
}
```

**Tracking Implementation**: API middleware logs each request

```typescript
await drizzle.db.insert(apiUsage).values({
	apiKeyId: validKey.id,
	endpoint: request.url.pathname,
	method: request.method,
	statusCode: response.status,
	metadata: { filesProtected, checkpointId, aiTool },
	timestamp: new Date(),
});

// Update lastUsedAt
await drizzle.db
	.update(apiKeys)
	.set({ lastUsedAt: new Date() })
	.where(eq(apiKeys.id, validKey.id));
```

### Dashboard Limitations

⚠️ **Mock Data**: Metrics (checkpoints, recoveries, files, detection rate) are hardcoded
⚠️ **Placeholder Actions**: Quick actions (download extension, install CLI) not functional
⚠️ **No Analytics**: No time-series charts or historical trends
⚠️ **No Project Breakdown**: Can't see per-project checkpoint counts
⚠️ **Limited API Key UI**: Create/revoke flows partially implemented

### Recommended Enhancements

1. **Real Metrics**:

    ```sql
    -- Add queries for real data
    SELECT COUNT(*) FROM checkpoints WHERE userId = ?
    SELECT COUNT(*) FROM recoveries WHERE userId = ?
    SELECT SUM(filesProtected) FROM apiUsage WHERE apiKeyId IN (...)
    ```

2. **Analytics Dashboard**:

    - Time-series charts (checkpoints over time)
    - Per-project breakdown
    - AI tool usage distribution
    - Recovery success rate

3. **Functional Quick Actions**:

    - Download extension → link to VS Code marketplace
    - Install CLI → `npm install -g snapback-cli` instructions
    - View docs → link to documentation site

4. **Enhanced API Key Management**:
    - Copy key to clipboard
    - Regenerate key
    - Set expiration dates
    - Usage statistics per key

---

## Onboarding Flows

### New User Onboarding

**Entry Point**: After signup and email verification (if enabled)

**Flow Diagram**:

```
Signup → Email Verification → Onboarding → Organization Setup → Plan Selection → Dashboard
```

#### Onboarding Page

**Location**: apps/web/app/(saas)/onboarding/page.tsx:19-35

**Gate Logic**: apps/web/app/(saas)/app/layout.tsx:35-41

```typescript
if (!session.user.onboardingComplete) {
	redirect(`/onboarding?redirectTo=${encodeURIComponent(pathname)}`);
}
```

**Component**: apps/web/modules/saas/onboarding/components/OnboardingForm.tsx:11-73

**Features**:

-   Multi-step design (currently 1 step)
-   Progress bar for step tracking
-   URL parameter for step navigation: `?step=1`
-   Extensible for additional steps

**Step 1 Content**: apps/web/modules/saas/onboarding/components/OnboardingStep1.tsx

-   Welcome message
-   Basic information collection
-   Call to action: "Get Started"

**Completion Handler**:

```typescript
const onCompleted = async () => {
	await authClient.updateUser({
		onboardingComplete: true,
	});

	await clearCache(); // Invalidate session cache

	router.replace(redirectTo ?? "/app");
};
```

**Configuration**: config/index.ts:62

```typescript
users: {
	enableOnboarding: true; // Can be disabled
}
```

### Organization Setup Flow

**Trigger Conditions**:

1. No organizations exist AND `config.organizations.requireOrganization: true`
2. User manually navigates to `/new-organization`
3. Post-onboarding redirect (if org required)

**Access Control**: apps/web/app/(saas)/new-organization/page.tsx:9-26

```typescript
// Redirect if organizations disabled
if (!config.organizations.enable) redirect("/app");

// Redirect if user can't create orgs and already has one
if (
	!config.organizations.enableUsersToCreateOrganizations &&
	(!config.organizations.requireOrganization || organizations.length > 0)
) {
	redirect("/app");
}
```

#### Create Organization Form

**Location**: apps/web/modules/saas/organizations/components/CreateOrganizationForm.tsx:49-70

**Flow**:

```typescript
1. User enters organization name
2. Frontend validation (min 1 char, max 50 chars)
3. Mutation: createOrganizationMutation.mutateAsync({ name })
4. Backend generates unique slug:
   - Base: sanitized name → "my-org"
   - Collision check → append nanoid if exists: "my-org-a1b2c3"
5. Better Auth creates organization + member record
6. Set as active organization: setActiveOrganization(slug)
7. Invalidate organization list query
8. Redirect to /app/{slug}
```

**Backend**: packages/api/modules/organizations/procedures/generate-organization-slug.ts

```typescript
export const generateOrganizationSlug = publicProcedure
	.input(z.object({ name: z.string() }))
	.handler(async ({ input }) => {
		const baseSlug = input.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		let slug = baseSlug;
		let exists = await drizzle.getOrganizationBySlug(slug);

		while (exists) {
			slug = `${baseSlug}-${nanoid(6)}`;
			exists = await drizzle.getOrganizationBySlug(slug);
		}

		return { slug };
	});
```

**Database Changes**:

```sql
-- Insert organization
INSERT INTO organization (id, name, slug, createdAt)
VALUES ('org_xxx', 'My Org', 'my-org', NOW());

-- Create owner member record
INSERT INTO member (id, organizationId, userId, role, createdAt)
VALUES ('mem_xxx', 'org_xxx', 'user_xxx', 'owner', NOW());

-- Update session
UPDATE session
SET activeOrganizationId = 'org_xxx'
WHERE userId = 'user_xxx';
```

### Team Invitation Flow

**Complete Journey**: Invite → Email → Signup/Login → Accept → Onboard

#### Step 1: Admin Sends Invitation

**Location**: apps/web/modules/saas/organizations/components/InviteMemberForm.tsx

**Requirements**:

-   User role: admin or owner
-   Input: email, role (owner/admin/member)

**Process**:

```typescript
1. Admin fills form: email + role
2. Submit: authClient.organization.inviteMember({ organizationId, email, role })
3. Backend creates invitation record:
   {
     id: "inv_xxx",
     organizationId,
     email,
     role,
     status: "pending",
     expiresAt: now + 7 days,
     inviterId: currentUserId
   }
4. Send invitation email
```

**Email Content**: packages/auth/auth.ts:224-236

```typescript
sendInvitationEmail: async ({ email, id, organization }) => {
	const existingUser = await drizzle.getUserByEmail(email);

	const url = new URL(
		existingUser ? "/auth/login" : "/auth/signup",
		getBaseUrl()
	);
	url.searchParams.set("invitationId", id);
	url.searchParams.set("email", email);

	await sendEmail({
		to: email,
		templateId: "organizationInvitation",
		context: {
			organizationName: organization.name,
			inviterName: inviter.name,
			url: url.toString(),
		},
	});
};
```

#### Step 2: Recipient Clicks Email Link

**Scenarios**:

**A. New User** → `/auth/signup?invitationId=xxx&email=user@example.com`

```typescript
1. Signup form pre-fills email
2. User completes signup
3. Email verification (if enabled)
4. Auto-redirect to invitation acceptance page
```

**B. Existing User** → `/auth/login?invitationId=xxx&email=user@example.com`

```typescript
1. Login form pre-fills email
2. User authenticates
3. Auto-redirect to invitation acceptance page
```

#### Step 3: Accept Invitation

**Location**: apps/web/app/(saas)/organization-invitation/[invitationId]/page.tsx:8-40

**Page Load**:

```typescript
// Fetch invitation details
const invitation = await auth.api.getInvitation({
	query: { id: invitationId },
});

// Fetch organization
const organization = await drizzle.getOrganizationById(
	invitation.organizationId
);

// Display modal
<OrganizationInvitationModal
	organizationName={invitation.organizationName}
	organizationSlug={invitation.organizationSlug}
	logoUrl={organization?.logo}
	invitationId={invitationId}
/>;
```

**Modal Component**: apps/web/modules/saas/organizations/components/OrganizationInvitationModal.tsx:34-48

**Accept Handler**:

```typescript
const handleAccept = async () => {
	// Accept invitation via Better Auth
	await authClient.organization.acceptInvitation({ invitationId });

	// Invalidate organization list cache
	await queryClient.invalidateQueries({
		queryKey: organizationListQueryKey,
	});

	// Redirect to organization
	router.replace(`/app/${organizationSlug}`);
};
```

**Backend Actions**: Better Auth handles:

1. Create `member` record in database
2. Update invitation status: `pending` → `accepted`
3. Send welcome email (optional)

#### Step 4: Seat Count Update Hook

**Location**: packages/auth/auth.ts:58-84

```typescript
hooks: {
	after: createAuthMiddleware(async (ctx) => {
		if (ctx.path.startsWith("/organization/accept-invitation")) {
			const organizationId = ctx.body.organizationId;
			await updateSeatsInOrganizationSubscription(organizationId);
		}
	});
}
```

**Seat Update Logic**: packages/payments/src/lib/customer.ts

```typescript
export async function updateSeatsInOrganizationSubscription(orgId: string) {
	// Get organization with member count
	const org = await drizzle.db.query.organization.findFirst({
		where: eq(organization.id, orgId),
		extras: {
			membersCount: sql<number>`
        (SELECT COUNT(*) FROM ${member}
         WHERE ${member.organizationId} = ${organization.id})
      `.as("membersCount"),
		},
	});

	// Get active subscription
	const subscription = await getActiveSubscription(orgId);

	if (subscription?.plan === "team") {
		// Update Stripe subscription seats
		await stripeClient.subscriptions.update(
			subscription.stripeSubscriptionId,
			{
				items: [
					{
						id: subscription.items[0].id,
						quantity: org.membersCount,
					},
				],
				proration_behavior: "always_invoice", // Immediate prorated charge
			}
		);
	}
}
```

### Plan Selection Flow

**Entry Point**: After organization setup OR when no active plan exists

**Gate Logic**: apps/web/app/(saas)/app/layout.tsx:50-65

```typescript
if (config.payments.enableBilling) {
	const { hasSubscription, hasPurchase } = createPurchasesHelper(purchases);

	// Free plan exists → bypass billing gate
	const hasFreeOption = plans.some((p) => p.isFree);

	if (!hasFreeOption && !hasSubscription && !hasPurchase) {
		redirect(`/choose-plan?redirectTo=${encodeURIComponent(pathname)}`);
	}
}
```

#### Choose Plan Page

**Location**: apps/web/app/(saas)/choose-plan/page.tsx:22-79

**Component**: apps/web/modules/saas/payments/components/PricingTable.tsx

**Features**:

-   Display all available plans
-   Monthly/yearly toggle (if configured)
-   Highlight recommended plan
-   Feature comparison matrix
-   Free plan auto-assignment

**Plan Selection**:

```typescript
const handleSelectPlan = async (plan: Plan) => {
	if (plan.isFree) {
		// Free plan: no checkout needed
		// Auto-assigned by backend based on absence of purchase
		router.push("/app");
		return;
	}

	// Paid plan: create Stripe checkout
	const { checkoutLink } = await createCheckoutLinkMutation.mutateAsync({
		type: "subscription",
		productId: plan.prices[0].productId,
		redirectUrl: `${getBaseUrl()}/app`,
		organizationId: activeOrg?.id, // If org context
		trialPeriodDays: plan.trialPeriodDays,
	});

	// Redirect to Stripe hosted checkout
	window.location.href = checkoutLink;
};
```

**Checkout Link Creation**: packages/api/modules/payments/procedures/create-checkout-link.ts

```typescript
export const createCheckoutLink = protectedProcedure
	.input(
		z.object({
			type: z.enum(["one-time", "subscription"]),
			productId: z.string(),
			redirectUrl: z.string().optional(),
			organizationId: z.string().optional(),
			trialPeriodDays: z.number().optional(),
		})
	)
	.handler(async ({ input, context }) => {
		const { type, productId, redirectUrl, organizationId } = input;
		const userId = context.user.id;

		// Get or create Stripe customer
		let customerId = organizationId
			? (await getOrganization(organizationId)).paymentsCustomerId
			: context.user.paymentsCustomerId;

		if (!customerId) {
			const customer = await stripeClient.customers.create({
				email: context.user.email,
				metadata: { userId, organizationId },
			});
			customerId = customer.id;

			// Store customer ID
			if (organizationId) {
				await updateOrganization({
					id: organizationId,
					paymentsCustomerId: customerId,
				});
			} else {
				await updateUser({
					id: userId,
					paymentsCustomerId: customerId,
				});
			}
		}

		// Calculate seats for team plans
		let seats = 1;
		if (organizationId) {
			const org = await getOrganizationWithMembersCount(organizationId);
			seats = org.membersCount;
		}

		// Create Stripe checkout session
		const session = await stripeClient.checkout.sessions.create({
			mode: type === "subscription" ? "subscription" : "payment",
			customer: customerId,
			line_items: [
				{
					price: productId,
					quantity: seats,
				},
			],
			subscription_data: {
				trial_period_days: input.trialPeriodDays,
				metadata: { organizationId, userId },
			},
			success_url: redirectUrl ?? `${getBaseUrl()}/app`,
			cancel_url: `${getBaseUrl()}/choose-plan`,
		});

		return { checkoutLink: session.url };
	});
```

**Webhook Handling**: apps/web/app/api/webhooks/payments/route.ts

```typescript
// After successful payment
case "checkout.session.completed":
  const session = event.data.object;

  await drizzle.db.insert(purchase).values({
    id: createId(),
    organizationId: session.metadata.organizationId,
    userId: session.metadata.userId,
    type: session.mode === "subscription" ? "SUBSCRIPTION" : "ONE_TIME",
    customerId: session.customer,
    subscriptionId: session.subscription,
    productId: session.line_items.data[0].price.id,
    status: "active",
    createdAt: new Date()
  });

  // User can now access app
  break;
```

### Initial Configuration Checklist

**Post-Onboarding Steps**:

1. ✅ **Create/Join Organization** (if required) - Automated
2. ✅ **Select Plan** (if billing enabled) - Automated gate
3. ⚠️ **Generate API Key** - Manual (dashboard)
4. ⚠️ **Download VS Code Extension** - Manual (marketplace)
5. ⚠️ **Install CLI Tool** - Manual (`npm install`)
6. ⚠️ **Configure First Project** - Manual (IDE)

**Improvement Opportunity**: Guided setup wizard with progress tracking

---

## User Journeys

### 1. Organization Management

#### A. Create Organization

**Entry**: `/new-organization`

```
User clicks "New Organization"
  ↓
Enter organization name
  ↓
Form validation (1-50 chars)
  ↓
Submit → orpc.organizations.generateSlug({ name })
  ↓
Backend generates unique slug (handles collisions)
  ↓
authClient.organization.createOrganization({ name, slug })
  ↓
Database inserts:
  - organization record
  - member record (user as owner)
  ↓
Update session.activeOrganizationId
  ↓
Invalidate organization list query
  ↓
Redirect to /app/{slug}
```

**Files**:

-   Form: apps/web/modules/saas/organizations/components/CreateOrganizationForm.tsx:49-70
-   API: packages/api/modules/organizations/procedures/generate-organization-slug.ts

#### B. Switch Organizations

**UI**: Sidebar dropdown (apps/web/modules/saas/organizations/components/OrganizationSelect.tsx)

```
User opens organization switcher
  ↓
Displays list of user's organizations (from session)
  ↓
User selects different organization
  ↓
onClick: setActiveOrganization(slug)
  ↓
authClient.setActiveOrganization({ organizationId })
  ↓
Update session.activeOrganizationId in database
  ↓
Redirect to /app/{newSlug}
  ↓
All org-scoped queries now use new context
```

**Context Propagation**:

```typescript
// Server-side: apps/web/modules/saas/auth/lib/server.ts
export const getActiveOrganization = cache(async (slug: string) => {
	return await auth.api.getFullOrganization({
		query: { organizationSlug: slug },
		headers: await headers(),
	});
});

// Client-side: apps/web/modules/saas/organizations/hooks/active-organization.tsx
export const useActiveOrganization = () => {
	return useContext(ActiveOrganizationContext);
	// Returns: { id, name, slug, logo, role, ... }
};
```

#### C. Update Organization Settings

**General Settings** (`/app/{slug}/settings/general`):

```
apps/web/app/(saas)/app/(organizations)/[slug]/settings/general/page.tsx

Available actions:
1. Change organization name
   → authClient.organization.updateOrganization({ name })

2. Update organization slug
   → authClient.organization.updateOrganization({ slug })
   → Checks uniqueness
   → Redirects to new URL

3. Upload logo
   → orpc.organizations.createLogoUploadUrl({ organizationId })
   → Returns signed S3 upload URL
   → Upload directly to S3
   → Save logo URL to database
```

**Implementation**:

```typescript
// Logo upload: packages/api/modules/organizations/procedures/create-logo-upload-url.ts
export const createLogoUploadUrl = protectedProcedure
	.input(
		z.object({
			organizationId: z.string(),
			fileName: z.string(),
			fileType: z.string(),
		})
	)
	.handler(async ({ input, context }) => {
		// Verify membership
		const membership = await verifyOrganizationMembership(
			input.organizationId,
			context.user.id
		);
		if (!membership) throw new ORPCError("FORBIDDEN");

		// Generate signed upload URL
		const key = `organizations/${input.organizationId}/${input.fileName}`;
		const { signedUploadUrl, path } =
			await storage.createPresignedUploadUrl({
				bucketName: process.env.LOGOS_BUCKET_NAME,
				key,
				contentType: input.fileType,
			});

		return { signedUploadUrl, path };
	});
```

#### D. Delete Organization

**Location**: `/app/{slug}/settings/danger-zone`

**Requirements**:

-   User role must be "owner" (not admin)
-   Confirmation dialog with org name verification

**Flow**:

```typescript
// Component: apps/web/modules/saas/organizations/components/DeleteOrganization.tsx
const handleDelete = async () => {
	// 1. Confirm org name matches
	if (inputOrgName !== organization.name) {
		setError("Organization name does not match");
		return;
	}

	// 2. Delete organization
	await authClient.organization.deleteOrganization({
		organizationId: organization.id,
	});

	// 3. Backend hook cancels subscriptions first
	// packages/auth/auth.ts:85-116

	// 4. Cascade delete:
	//    - members (ON DELETE CASCADE)
	//    - invitations
	//    - organization record

	// 5. Invalidate queries
	await queryClient.invalidateQueries({
		queryKey: organizationListQueryKey,
	});

	// 6. Redirect to user account or new org
	router.replace("/app");
};
```

**Pre-Delete Hook**: packages/auth/auth.ts:85-99

```typescript
before: createAuthMiddleware(async (ctx) => {
	if (ctx.path.startsWith("/organization/delete")) {
		const orgId = ctx.body.organizationId;

		// Cancel all active subscriptions
		const subscriptions = await getActiveSubscriptions(orgId);
		for (const sub of subscriptions) {
			await stripeClient.subscriptions.cancel(sub.stripeSubscriptionId);
		}
	}
});
```

### 2. Team Management

#### A. Invite Member

**Location**: `/app/{slug}/settings/members`

**Authorization**: Admin or owner only

**Form**: apps/web/modules/saas/organizations/components/InviteMemberForm.tsx

```
Admin enters email + selects role
  ↓
Form validation (email format, role enum)
  ↓
Submit: authClient.organization.inviteMember({
  organizationId,
  email,
  role
})
  ↓
Backend creates invitation record:
  {
    id: "inv_xxx",
    organizationId,
    email,
    role,
    status: "pending",
    expiresAt: now + 7 days,
    inviterId: currentUserId
  }
  ↓
Send invitation email via sendInvitationEmail()
  ↓
Email contains:
  - Organization name
  - Inviter name
  - Link: /auth/signup?invitationId=xxx&email=xxx
  ↓
Success toast: "Invitation sent to {email}"
  ↓
Invitation appears in pending list
```

**Email Template**: packages/mail/emails/OrganizationInvitation.tsx

#### B. Manage Members

**Location**: `/app/{slug}/settings/members`

**Component**: apps/web/modules/saas/organizations/components/OrganizationMembersList.tsx

**Display**:

```typescript
// Member list with columns:
- Avatar (user image)
- Name + email
- Role badge (Owner/Admin/Member)
- Join date
- Actions dropdown (if authorized)
```

**Available Actions**:

1. **Change Member Role**

```typescript
const handleChangeRole = async (memberId: string, newRole: Role) => {
	await authClient.organization.updateMemberRole({
		organizationId,
		memberId,
		role: newRole,
	});

	// Refresh member list
	await queryClient.invalidateQueries({
		queryKey: ["organization", organizationId, "members"],
	});
};
```

2. **Remove Member**

```typescript
const handleRemoveMember = async (memberId: string) => {
	// Confirmation dialog
	const confirmed = await confirm({
		title: "Remove member",
		description: "Are you sure? They will lose access immediately.",
	});

	if (!confirmed) return;

	await authClient.organization.removeMember({
		organizationId,
		memberId,
	});

	// Backend hook updates seat count
	// packages/auth/auth.ts:68-84

	// Refresh member list
	await queryClient.invalidateQueries({
		queryKey: ["organization", organizationId, "members"],
	});
};
```

**Permission Matrix**:

```typescript
Action             | Owner | Admin | Member
-------------------|-------|-------|-------
View members       |   ✅  |   ✅  |   ✅
Invite members     |   ✅  |   ✅  |   ❌
Remove members     |   ✅  |   ✅  |   ❌
Change roles       |   ✅  |   ✅  |   ❌
Delete org         |   ✅  |   ❌  |   ❌
Leave org          |   ⚠️  |   ✅  |   ✅
```

_⚠️ Owner can only leave if transferring ownership first_

#### C. Pending Invitations

**Display**: Separate section on members page

```typescript
// Show pending invitations with:
- Email address
- Role
- Invited by (user name)
- Sent date
- Expires date
- Actions: Resend, Cancel

const handleResendInvitation = async (invitationId: string) => {
  await authClient.organization.resendInvitation({ invitationId });
  // Sends new email with same invitation ID
};

const handleCancelInvitation = async (invitationId: string) => {
  await authClient.organization.cancelInvitation({ invitationId });
  // Updates status: pending → cancelled
  // Invitation link no longer valid
};
```

### 3. Billing and Subscriptions

#### A. View Active Plan

**Locations**: `/app/settings/billing` OR `/app/{slug}/settings/billing`

**Component**: apps/web/modules/saas/payments/components/ActivePlan.tsx

**Data Hook**: apps/web/modules/saas/payments/hooks/purchases.tsx

```typescript
export const usePurchases = (organizationId?: string) => {
	const { data } = useQuery(
		orpc.payments.listPurchases.queryOptions({
			input: { organizationId },
		})
	);

	const purchases = data?.purchases ?? [];
	const { activePlan, hasSubscription, hasPurchase } =
		createPurchasesHelper(purchases);

	return {
		purchases,
		activePlan, // Current plan ID
		hasSubscription, // Boolean
		hasPurchase, // Boolean
	};
};
```

**Display**:

```typescript
<ActivePlan>
	{/* Plan details */}
	<div>Plan: {planName}</div>
	<div>
		Price: ${price}/{interval}
	</div>
	<div>Status: {status}</div>
	<div>Next billing: {nextBillingDate}</div>
	{/* Features included */}
	<ul>
		{plan.features.map((f) => (
			<li key={f}>{f}</li>
		))}
	</ul>
	{/* Seats (team plans only) */}
	{plan.seatBased && (
		<div>
			Seats: {currentSeats} (${pricePerSeat} each)
		</div>
	)}
	{/* Actions */}
	<CustomerPortalButton /> {/* Manage subscription */}
	<ChangePlanButton /> {/* Upgrade/downgrade */}
</ActivePlan>
```

#### B. Change/Upgrade Plan

**Component**: apps/web/modules/saas/payments/components/ChangePlan.tsx

```
User clicks "Change Plan"
  ↓
Display pricing table (exclude current plan)
  ↓
User selects new plan
  ↓
Create checkout link with upgrade flag
  ↓
Redirect to Stripe Checkout
  ↓
Stripe handles:
  - Prorated billing (immediate charge/credit)
  - Subscription item update
  - Invoice generation
  ↓
Webhook: customer.subscription.updated
  ↓
Update purchase record:
  - productId → new plan ID
  - status → active
  ↓
User redirected back to app
  ↓
New plan features active immediately
```

**Backend**: Stripe handles proration automatically

```typescript
// Webhook handler: apps/web/app/api/webhooks/payments/route.ts
case "customer.subscription.updated":
  const subscription = event.data.object;

  await drizzle.db
    .update(purchase)
    .set({
      productId: subscription.items.data[0].price.id,
      status: subscription.status,
      updatedAt: new Date()
    })
    .where(eq(purchase.subscriptionId, subscription.id));
  break;
```

#### C. Manage Subscription (Customer Portal)

**Component**: apps/web/modules/saas/settings/components/CustomerPortalButton.tsx

```typescript
const handleOpenPortal = async () => {
	const { portalLink } = await createCustomerPortalLinkMutation.mutateAsync({
		customerId: user.paymentsCustomerId,
		redirectUrl: window.location.href,
	});

	window.location.href = portalLink;
};
```

**Stripe Customer Portal Features**:

-   View invoices and payment history
-   Update payment method
-   Cancel subscription
-   Download receipts
-   View upcoming invoices

**Backend**: packages/api/modules/payments/procedures/create-customer-portal-link.ts

```typescript
export const createCustomerPortalLink = protectedProcedure
	.input(
		z.object({
			customerId: z.string(),
			redirectUrl: z.string().optional(),
		})
	)
	.handler(async ({ input }) => {
		const session = await stripeClient.billingPortal.sessions.create({
			customer: input.customerId,
			return_url:
				input.redirectUrl ?? `${getBaseUrl()}/app/settings/billing`,
		});

		return { portalLink: session.url };
	});
```

#### D. Cancel Subscription

**Method 1**: Via Customer Portal (recommended)

-   User clicks "Manage Subscription"
-   Navigates to Stripe portal
-   Clicks "Cancel subscription"
-   Stripe marks: `cancel_at_period_end: true`
-   Webhook: `customer.subscription.updated`
-   Update purchase: `cancelAtPeriodEnd: true`
-   User retains access until period end

**Method 2**: Via App (if implemented)

```typescript
const handleCancelSubscription = async () => {
	const confirmed = await confirm({
		title: "Cancel subscription",
		description:
			"You'll retain access until the end of your billing period.",
	});

	if (!confirmed) return;

	await cancelSubscriptionMutation.mutateAsync({
		subscriptionId: purchase.subscriptionId,
	});

	// Webhook handles database update
};
```

**Cancellation Flow**:

```
User cancels subscription
  ↓
Stripe sets cancel_at_period_end: true
  ↓
Webhook: customer.subscription.updated
  ↓
Update purchase:
  - cancelAtPeriodEnd: true
  - status: still "active"
  ↓
User sees: "Your plan will end on {date}"
  ↓
On period end date:
  ↓
Webhook: customer.subscription.deleted
  ↓
Delete purchase record OR set status: "cancelled"
  ↓
User downgraded to free plan (if exists)
```

#### E. Seat-Based Billing (Team Plans)

**Trigger Events**:

1. Member accepts invitation → increase seats
2. Member removed → decrease seats
3. Manual seat adjustment (future)

**Hook Implementation**: packages/auth/auth.ts:58-84

```typescript
hooks: {
	after: createAuthMiddleware(async (ctx) => {
		if (
			ctx.path.startsWith("/organization/accept-invitation") ||
			ctx.path.startsWith("/organization/remove-member")
		) {
			const organizationId = ctx.body.organizationId;
			await updateSeatsInOrganizationSubscription(organizationId);
		}
	});
}
```

**Seat Update Logic**: packages/payments/src/lib/customer.ts

```typescript
export async function updateSeatsInOrganizationSubscription(orgId: string) {
	// Get organization with member count
	const org = await drizzle.db.query.organization.findFirst({
		where: eq(organization.id, orgId),
		extras: {
			membersCount: sql<number>`
        (SELECT COUNT(*) FROM ${member}
         WHERE ${member.organizationId} = ${organization.id})
      `.as("membersCount"),
		},
	});

	// Get active subscription
	const subscriptions = await drizzle.db.query.purchase.findMany({
		where: and(
			eq(purchase.organizationId, orgId),
			eq(purchase.type, "SUBSCRIPTION"),
			eq(purchase.status, "active")
		),
	});

	if (subscriptions.length === 0) return;
	const subscription = subscriptions[0];

	// Only update for team plans
	const plan = getPlanById(subscription.productId);
	if (!plan?.seatBased) return;

	// Update Stripe subscription quantity
	const stripeSubscription = await stripeClient.subscriptions.retrieve(
		subscription.subscriptionId
	);

	await stripeClient.subscriptions.update(subscription.subscriptionId, {
		items: [
			{
				id: stripeSubscription.items.data[0].id,
				quantity: org.membersCount,
			},
		],
		proration_behavior: "always_invoice", // Immediate prorated charge/credit
	});

	// Stripe automatically invoices/credits the difference
}
```

**Billing Examples**:

```
Team plan: $25/user/month
Current: 3 users = $75/month

Example 1: Add user mid-cycle (15 days into 30-day cycle)
- New user added
- Seat count: 3 → 4
- Prorated charge: $25 × 0.5 (half month) = $12.50
- Immediate invoice for $12.50
- Next full invoice: $100/month

Example 2: Remove user mid-cycle (20 days into 30-day cycle)
- User removed
- Seat count: 4 → 3
- Prorated credit: $25 × 0.33 (10 days remaining) = $8.33
- Credit applied to next invoice
- Next full invoice: $75/month - $8.33 credit = $66.67
```

### 4. Settings and Profile

#### A. General Settings (`/app/settings/general`)

**Available Actions**:

1. **Upload Avatar**

```typescript
// Component: apps/web/modules/saas/settings/components/ChangeAvatarForm.tsx
const handleUpload = async (file: File) => {
	// 1. Request signed upload URL
	const { signedUploadUrl, path } =
		await orpc.users.createAvatarUploadUrl.mutate({
			fileName: file.name,
			fileType: file.type,
		});

	// 2. Upload directly to S3
	await fetch(signedUploadUrl, {
		method: "PUT",
		body: file,
		headers: { "Content-Type": file.type },
	});

	// 3. Update user profile
	await authClient.updateUser({
		image: path, // S3 object URL
	});

	// 4. Refresh session
	await queryClient.invalidateQueries({ queryKey: ["session"] });
};
```

2. **Change Name**

```typescript
// Component: apps/web/modules/saas/settings/components/ChangeNameForm.tsx
const handleSubmit = async (values: { name: string }) => {
	await authClient.updateUser({ name: values.name });
	await queryClient.invalidateQueries({ queryKey: ["session"] });
	form.reset();
};
```

3. **Change Email**

```typescript
// Component: apps/web/modules/saas/settings/components/ChangeEmailForm.tsx
const handleSubmit = async (values: { email: string }) => {
	await authClient.changeEmail({
		newEmail: values.email,
		callbackURL: `${getBaseUrl()}/app/settings/general`,
	});

	// Sends verification email to new address
	// User must click link to confirm
	// Old email remains active until verified
};
```

4. **Change Language** (if i18n enabled)

```typescript
// Component: apps/web/modules/saas/settings/components/LanguageSelector.tsx
const handleChangeLanguage = async (locale: string) => {
	await authClient.updateUser({ locale });

	// Update cookie
	document.cookie = `${i18nConfig.localeCookieName}=${locale}; path=/`;

	// Refresh page to apply new locale
	router.refresh();
};
```

#### B. Security Settings (`/app/settings/security`)

**Password Management**:

1. **Set Password** (for OAuth-only accounts)

```typescript
// Component: apps/web/modules/saas/settings/components/SetPasswordForm.tsx
const handleSetPassword = async (values: {
	password: string;
	confirmPassword: string;
}) => {
	await authClient.setPassword({
		password: values.password,
	});

	// Now user can login with email + password
};
```

2. **Change Password**

```typescript
// Component: apps/web/modules/saas/settings/components/ChangePasswordForm.tsx
const handleChangePassword = async (values: {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}) => {
	await authClient.changePassword({
		currentPassword: values.currentPassword,
		newPassword: values.newPassword,
	});

	form.reset();
};
```

**Connected Accounts**:

```typescript
// Component: apps/web/modules/saas/settings/components/ConnectedAccounts.tsx

// Display linked OAuth accounts
const { data: accounts } = useQuery(getUserAccountsQueryOptions());

// Link new account
const handleLinkAccount = async (provider: "google" | "github") => {
	await authClient.linkAccount({ provider });
	// Redirects to OAuth flow
	// On return, account is linked
};

// Unlink account
const handleUnlinkAccount = async (accountId: string) => {
	// Check: must have at least one auth method remaining
	if (accounts.length === 1 && !hasPassword) {
		alert("You must have at least one way to sign in");
		return;
	}

	await authClient.unlinkAccount({ accountId });
};
```

**Passkeys** (if enabled):

```typescript
// Component: apps/web/modules/saas/settings/components/PasskeysBlock.tsx

// List passkeys
const { data: passkeys } = useQuery(getUserPasskeysQueryOptions());

// Add passkey
const handleAddPasskey = async () => {
	await authClient.passkey.addPasskey({
		name: "MacBook Pro Touch ID", // User-provided name
	});

	// Browser prompts for biometric/security key
	// WebAuthn credential stored in database
};

// Delete passkey
const handleDeletePasskey = async (passkeyId: string) => {
	await authClient.passkey.deletePasskey({ passkeyId });
};
```

**Two-Factor Authentication**:

```typescript
// Component: apps/web/modules/saas/settings/components/TwoFactorBlock.tsx

// Enable 2FA
const handleEnable2FA = async () => {
	// 1. Generate secret
	const { secret, qrCode, backupCodes } = await authClient.twoFactor.enable();

	// 2. Display QR code for user to scan with authenticator app
	setQrCode(qrCode);

	// 3. Display backup codes (store securely)
	setBackupCodes(backupCodes);

	// 4. User enters TOTP code to verify
	const code = await prompt("Enter code from authenticator");

	// 5. Verify and activate
	await authClient.twoFactor.verifyTotp({ code });

	// 2FA now required for login
};

// Disable 2FA
const handleDisable2FA = async () => {
	const password = await prompt("Enter password to disable 2FA");
	await authClient.twoFactor.disable({ password });
};
```

**Active Sessions**:

```typescript
// Component: apps/web/modules/saas/settings/components/ActiveSessions.tsx

// List all sessions
const { data: sessions } = useQuery(getSessionsQueryOptions());

// Display:
// - Device (parsed from user agent)
// - Location (from IP address)
// - Last active timestamp
// - Current session indicator

// Revoke session
const handleRevokeSession = async (sessionId: string) => {
	await authClient.revokeSession({ sessionId });

	// Session deleted from database
	// User logged out on that device
};

// Revoke all other sessions
const handleRevokeAllOther = async () => {
	const currentSessionId = session.id;
	await authClient.revokeOtherSessions({ exceptSessionId: currentSessionId });

	// User logged out from all other devices
};
```

#### C. Billing Settings

See [3. Billing and Subscriptions](#3-billing-and-subscriptions)

#### D. Danger Zone (`/app/settings/danger-zone`)

**Delete Account**:

```typescript
// Component: apps/web/modules/saas/settings/components/DeleteAccount.tsx

const handleDeleteAccount = async () => {
	// 1. Confirmation dialog
	const confirmed = await confirm({
		title: "Delete account",
		description:
			"This action is permanent and cannot be undone. All your data will be deleted.",
	});

	if (!confirmed) return;

	// 2. Email verification
	const email = await prompt("Enter your email to confirm");
	if (email !== user.email) {
		alert("Email does not match");
		return;
	}

	// 3. Delete account
	await authClient.deleteUser();

	// 4. Backend pre-delete hook cancels subscriptions
	// packages/auth/auth.ts:100-116

	// 5. Cascade delete:
	//    - sessions
	//    - accounts
	//    - passkeys
	//    - twoFactor
	//    - members (removed from organizations)
	//    - purchases (if user-level)
	//    - user record

	// 6. Redirect to goodbye page
	router.replace("/goodbye");
};
```

**Pre-Delete Hook**: packages/auth/auth.ts:100-116

```typescript
before: createAuthMiddleware(async (ctx) => {
	if (ctx.path.startsWith("/delete-user")) {
		const userId = ctx.body.userId;

		// Cancel all active user subscriptions
		const subscriptions = await getUserSubscriptions(userId);
		for (const sub of subscriptions) {
			await stripeClient.subscriptions.cancel(sub.stripeSubscriptionId);
		}

		// Note: Organization subscriptions NOT cancelled
		// User just removed as member
	}
});
```

### 5. AI Chatbot

**Locations**: `/app/chatbot` (user-level) OR `/app/{slug}/chatbot` (org-level)

#### Chat Management

**Create Chat**:

```typescript
const createChatMutation = useMutation(orpc.ai.createChat.mutationOptions());

const handleNewChat = async () => {
	const chat = await createChatMutation.mutateAsync({
		title: "New Chat",
		organizationId: activeOrg?.id, // If org context
	});

	router.push(`/app/chatbot/${chat.id}`);
};
```

**List Chats**:

```typescript
const { data: chats } = useQuery(
	orpc.ai.listChats.queryOptions({
		input: { organizationId: activeOrg?.id },
	})
);

// Display sidebar with chat history
// Most recent chats first
// Click to load chat messages
```

**Delete Chat**:

```typescript
const deleteChatMutation = useMutation(orpc.ai.deleteChat.mutationOptions());

const handleDeleteChat = async (chatId: string) => {
	await deleteChatMutation.mutateAsync({ chatId });

	// Chat and all messages deleted
	// Invalidate chat list
	await queryClient.invalidateQueries({
		queryKey: ["ai", "chats"],
	});
};
```

#### Message Flow

**Send Message**:

```typescript
const addMessageMutation = useMutation(
	orpc.ai.addMessageToChat.mutationOptions()
);

const handleSendMessage = async (content: string) => {
	// 1. Add user message to UI (optimistic)
	const userMessage = { role: "user", content };
	setMessages((prev) => [...prev, userMessage]);

	// 2. Send to backend
	const response = await addMessageMutation.mutateAsync({
		chatId: currentChat.id,
		message: content,
	});

	// 3. Backend streams AI response
	// Uses AI SDK for streaming

	// 4. Display assistant response
	setMessages((prev) => [
		...prev,
		{ role: "assistant", content: response.message },
	]);

	// 5. Auto-generate title if first message
	if (messages.length === 0) {
		const title = await generateChatTitle(content);
		await updateChatMutation.mutateAsync({ chatId, title });
	}
};
```

**Backend Implementation**: packages/api/modules/ai/procedures/add-message-to-chat.ts

```typescript
export const addMessageToChat = protectedProcedure
	.input(
		z.object({
			chatId: z.string(),
			message: z.string(),
		})
	)
	.handler(async ({ input, context }) => {
		// 1. Verify chat ownership
		const chat = await drizzle.db.query.aiChat.findFirst({
			where: eq(aiChat.id, input.chatId),
		});

		if (
			chat.userId !== context.user.id &&
			chat.organizationId !== context.session.activeOrganizationId
		) {
			throw new ORPCError("FORBIDDEN");
		}

		// 2. Append user message
		const messages = [
			...chat.messages,
			{
				role: "user",
				content: input.message,
			},
		];

		// 3. Call OpenAI API
		const stream = await openai.chat.completions.create({
			model: "gpt-4",
			messages,
			stream: true,
		});

		// 4. Collect streamed response
		let assistantMessage = "";
		for await (const chunk of stream) {
			assistantMessage += chunk.choices[0]?.delta?.content || "";
		}

		// 5. Save both messages
		await drizzle.db
			.update(aiChat)
			.set({
				messages: [
					...messages,
					{
						role: "assistant",
						content: assistantMessage,
					},
				],
			})
			.where(eq(aiChat.id, input.chatId));

		return { message: assistantMessage };
	});
```

**Scope**:

-   User-level chats: `userId` set, `organizationId` null
-   Org-level chats: `organizationId` set, accessible to all members

### 6. Admin Panel

**Access**: `/app/admin` (requires `user.role === "admin"`)

#### Users Management (`/app/admin/users`)

**Features**:

-   List all platform users
-   Search by name or email
-   Filter by role, banned status
-   Pagination

**Actions**:

```typescript
// Ban user
const handleBanUser = async (
	userId: string,
	reason: string,
	duration?: number
) => {
	await authClient.admin.banUser({
		userId,
		reason,
		expiresAt: duration ? addDays(new Date(), duration) : undefined,
	});

	// User cannot login until unbanned or expiry
};

// Unban user
const handleUnbanUser = async (userId: string) => {
	await authClient.admin.unbanUser({ userId });
};

// Impersonate user (for support)
const handleImpersonate = async (userId: string) => {
	await authClient.admin.impersonateUser({ userId });

	// Creates new session with impersonatedBy field
	// Admin can act as user
	// Banner shows "Impersonating {user}"
};
```

#### Organizations Management (`/app/admin/organizations`)

**List View**:

```typescript
const { data: organizations } = useQuery(
	orpc.admin.listOrganizations.queryOptions({
		input: { limit: 50, offset: 0 },
	})
);

// Display:
// - Organization name, slug
// - Member count
// - Active plan
// - Created date
// - Actions: View details
```

**Organization Detail** (`/app/admin/organizations/[id]`):

```typescript
const { data: org } = useQuery(
	orpc.admin.findOrganization.queryOptions({
		input: { organizationId },
	})
);

// Display:
// - Full organization info
// - Member list with roles
// - Subscription status
// - Billing history

// Admin actions:
// - View organization as member
// - Cancel subscription
// - Delete organization
// - Transfer ownership
```

**Backend**: packages/api/modules/admin/procedures/

```typescript
// list-users.ts
export const listUsers = adminProcedure
	.input(
		z.object({
			limit: z.number().optional(),
			offset: z.number().optional(),
			query: z.string().optional(),
		})
	)
	.handler(async ({ input }) => {
		const users = await drizzle.db.query.user.findMany({
			where: input.query
				? or(
						like(user.email, `%${input.query}%`),
						like(user.name, `%${input.query}%`)
				  )
				: undefined,
			limit: input.limit ?? 50,
			offset: input.offset ?? 0,
			orderBy: desc(user.createdAt),
		});

		const total = await drizzle.db
			.select({ count: sql<number>`count(*)` })
			.from(user);

		return { users, total: total[0].count };
	});
```

---

## Integration Architecture

### Type-Safe API Flow

**Complete Flow**:

```
1. Backend defines schema (Zod)
   packages/api/modules/*/procedures/*.ts
   ↓
2. oRPC router exports types
   packages/api/orpc/router.ts
   ↓
3. Frontend imports typed client
   apps/web/modules/shared/lib/orpc-client.ts
   ↓
4. React Query wrapper provides hooks
   apps/web/modules/shared/lib/orpc-query-utils.ts
   ↓
5. Components use typed hooks
   useMutation(orpc.*.*.mutationOptions())
   ↓
6. Full autocomplete and type checking
```

**Example**:

```typescript
// Backend: packages/api/modules/payments/procedures/create-checkout-link.ts
export const createCheckoutLink = protectedProcedure
	.input(
		z.object({
			type: z.enum(["one-time", "subscription"]),
			productId: z.string(),
			organizationId: z.string().optional(),
		})
	)
	.handler(async ({ input }) => {
		// Implementation
		return { checkoutLink: "https://checkout.stripe.com/..." };
	});

// Frontend: Fully typed!
const mutation = useMutation(
	orpc.payments.createCheckoutLink.mutationOptions()
);

await mutation.mutateAsync({
	type: "subscription", // TypeScript knows valid values
	productId: "price_xxx",
	organizationId: activeOrg.id,
});
// Returns: { checkoutLink: string }
```

### Database Query Patterns

**Drizzle ORM Examples**:

```typescript
// Simple select
const users = await drizzle.db
  .select()
  .from(user)
  .where(eq(user.role, "admin"));

// With relationships
const orgWithMembers = await drizzle.db.query.organization.findFirst({
  where: eq(organization.id, orgId),
  with: {
    members: {
      with: {
        user: true  // Join user data
      }
    }
  }
});

// Aggregate query
const org = await drizzle.db.query.organization.findFirst({
  where: eq(organization.id, orgId),
  extras: {
    membersCount: sql<number>`
      (SELECT COUNT(*) FROM ${member}
       WHERE ${member.organizationId} = ${organization.id})
    `.as("membersCount")
  }
});

// Transaction
await drizzle.db.transaction(async (tx) => {
  await tx.insert(purchase).values({ ... });
  await tx.update(user).set({ paymentsCustomerId: "cus_xxx" });
});
```

### Error Handling

**Backend Errors**:

```typescript
// Throw typed errors
if (!session) throw new ORPCError("UNAUTHORIZED");
if (!membership) throw new ORPCError("FORBIDDEN");
if (!resource) throw new ORPCError("NOT_FOUND");
if (validation.error) throw new ORPCError("BAD_REQUEST", validation.error);
```

**Frontend Handling**:

```typescript
try {
	await mutation.mutateAsync(values);
} catch (error) {
	if (error.code === "UNAUTHORIZED") {
		router.push("/auth/login");
	} else if (error.code === "FORBIDDEN") {
		alert("You don't have permission for this action");
	} else {
		form.setError("root", { message: error.message });
	}
}
```

### Caching Strategy

**React Query Configuration**:

```typescript
// apps/web/modules/shared/lib/query-provider.tsx
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			cacheTime: 5 * 60 * 1000, // 5 minutes
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
```

**Cache Invalidation Examples**:

```typescript
// After creating organization
await queryClient.invalidateQueries({
	queryKey: organizationListQueryKey,
});

// After updating user profile
await queryClient.invalidateQueries({
	queryKey: ["session"],
});

// Specific resource
await queryClient.invalidateQueries({
	queryKey: ["organization", organizationId, "members"],
});
```

**Prefetching**:

```typescript
// Server-side prefetch in layout
const queryClient = getServerQueryClient();

await queryClient.prefetchQuery(
	orpc.payments.listPurchases.queryOptions({
		input: { organizationId },
	})
);

return (
	<HydrationBoundary state={dehydrate(queryClient)}>
		{children}
	</HydrationBoundary>
);
```

### Authentication Context

**Server Components**:

```typescript
// apps/web/modules/saas/auth/lib/server.ts
export const getSession = cache(async () => {
	return await auth.api.getSession({
		headers: await headers(),
		query: { disableCookieCache: true },
	});
});

// Usage in any server component
const session = await getSession();
if (!session) redirect("/auth/login");
```

**Client Components**:

```typescript
// apps/web/modules/saas/auth/providers/session-provider.tsx
<SessionProvider initialSession={session}>{children}</SessionProvider>;

// Usage in any client component
const { user, session, loaded } = useSession();
if (!loaded) return <Spinner />;
if (!user) return <LoginButton />;
```

---

## Strengths & Opportunities

### Architectural Strengths

✅ **Modern Stack**: Next.js 15, React 19, Better Auth, Drizzle ORM
✅ **Type Safety**: End-to-end TypeScript with Zod validation
✅ **Multi-tenancy**: Organization-based isolation with role-based access
✅ **Authentication**: 6 auth methods, 2FA, passkeys, OAuth
✅ **Billing**: Stripe integration with seat-based pricing and webhooks
✅ **Performance**: Server Components, React Query caching, prefetching
✅ **Developer Experience**: oRPC type inference, excellent tooling
✅ **Security**: Hashed keys, CSRF protection, rate limiting
✅ **Scalability**: Database indexes, query optimization
✅ **Maintainability**: Feature-based modules, clear separation of concerns

### Current Limitations

⚠️ **Dashboard Incomplete**: Mock data, placeholder quick actions
⚠️ **No Guided Setup**: Users must manually configure API keys and tools
⚠️ **Limited Analytics**: No time-series charts or usage trends
⚠️ **Missing Audit Logs**: No activity tracking for compliance
⚠️ **No Monitoring**: Missing error tracking, performance monitoring
⚠️ **Partial API Key UI**: Create/revoke flows need completion
⚠️ **In-Memory Rate Limiting**: Should use Redis for production
⚠️ **No Webhooks UI**: Can't manage webhook endpoints

### Enhancement Opportunities

#### 1. **Dashboard Enhancements**

```typescript
// Add real metrics
- Connect to actual checkpoint/recovery data
- Time-series charts (Chart.js or Recharts)
- Per-project breakdown
- AI tool usage distribution
- Export data to CSV

// Functional quick actions
- Direct download links for extension/CLI
- Installation guides
- Interactive onboarding wizard
```

#### 2. **Analytics & Reporting**

```typescript
// Usage analytics
- Checkpoint creation over time
- Recovery success rates
- Storage usage trends
- API call patterns
- Cost projections

// Team analytics (for org admins)
- Per-member usage
- Project activity heatmap
- Collaboration metrics
```

#### 3. **Audit Logging**

```typescript
// Security events
auditLog {
  id, userId, organizationId, action, resource,
  metadata, ipAddress, userAgent, timestamp
}

// Track actions:
- Member added/removed
- Role changes
- Subscription changes
- API key created/revoked
- Settings updated
- Data exports
```

#### 4. **Advanced API Key Management**

```typescript
// Features to add:
- API key rotation (generate new, deprecate old)
- Expiration dates with renewal
- Usage statistics per key
- Rate limit configuration per key
- IP whitelisting
- Webhook endpoints configuration
```

#### 5. **Monitoring & Observability**

```typescript
// Error tracking
- Integrate Sentry for error monitoring
- Track API endpoint failures
- Monitor webhook delivery success

// Performance monitoring
- Track response times
- Database query performance
- Storage upload/download speeds
```

#### 6. **Production Improvements**

```typescript
// Rate limiting
- Replace in-memory Map with Redis
- Upstash Redis for serverless
- Configurable limits per plan

// Webhook reliability
- Retry failed webhook deliveries
- Webhook delivery logs
- Manual webhook replay

// Database
- Connection pooling optimization
- Read replicas for scaling
- Automated backups
```

#### 7. **User Experience Enhancements**

```typescript
// Onboarding wizard
- Step-by-step setup guide
- Progress tracking
- Quick start templates
- Interactive tutorials

// Better notifications
- Email notifications for key events
- In-app notification center
- Webhook events for integrations

// Mobile optimization
- Responsive dashboard improvements
- Touch-optimized interactions
- Mobile app consideration
```

#### 8. **Developer Experience**

```typescript
// API documentation
- Auto-generated OpenAPI docs
- Interactive API playground
- Code examples in multiple languages
- SDK libraries

// Testing improvements
- E2E test coverage
- Unit test coverage
- Integration test suite
- Load testing
```

---

## Conclusion

The SnapBack SaaS platform demonstrates a **production-ready architecture** with modern best practices, comprehensive authentication, robust billing integration, and excellent type safety. The codebase is well-organized, maintainable, and scalable.

**Key Strengths**:

-   Solid technical foundation with Next.js 15 + Better Auth + Drizzle
-   Complete user journeys for authentication, organization management, billing
-   Type-safe API with oRPC and end-to-end TypeScript
-   Multi-tenancy with organization-based isolation
-   Security best practices (hashed keys, CSRF protection, rate limiting)

**Primary Gaps**:

-   Dashboard needs real data integration
-   Missing analytics and usage tracking
-   No audit logging for compliance
-   Rate limiting requires Redis for production
-   Quick actions and setup wizard need implementation

**Recommended Next Steps**:

1. **Complete Dashboard**: Integrate real metrics, functional quick actions
2. **Add Analytics**: Time-series charts, usage trends, per-project breakdown
3. **Implement Audit Logging**: Track security events and user actions
4. **Production Hardening**: Redis rate limiting, webhook reliability, monitoring
5. **Enhance Onboarding**: Guided setup wizard with progress tracking
6. **Documentation**: API docs, user guides, developer tutorials

The platform is **ready for MVP launch** with the core features functioning correctly. The enhancements above would elevate it to a **fully-featured production SaaS** with enterprise-grade reliability and user experience.
