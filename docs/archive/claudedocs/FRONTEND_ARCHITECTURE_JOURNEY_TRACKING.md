# SnapBack Frontend Architecture: User Journey Tracking & Engagement System

## Executive Summary

Comprehensive frontend architecture for SnapBack's personalized user journey system supporting 24 distinct user paths across web dashboard, VS Code extension, CLI, and MCP server platforms.

**Core Technologies:**

-   Next.js 15 App Router + React 19
-   Radix UI + shadcn/ui patterns
-   Tailwind CSS with custom design tokens
-   PostHog for analytics & feature flags
-   Framer Motion for animations
-   Real-time sync via Server-Sent Events (SSE)

---

## 1. Component Architecture & Hierarchy

### 1.1 Core Journey Components Structure

```
apps/web/modules/saas/journeys/
├── components/
│   ├── journey-tracker/
│   │   ├── JourneyProgress.tsx              # Main progress visualization
│   │   ├── JourneyTimeline.tsx              # Timeline with milestones
│   │   ├── JourneyStageIndicator.tsx        # Current stage display
│   │   └── JourneyCompletionCelebration.tsx # Celebration on completion
│   │
│   ├── usage-widgets/
│   │   ├── CheckpointUsageCard.tsx          # Checkpoint count & limits
│   │   ├── TeamActivityWidget.tsx           # Team usage overview
│   │   ├── ApiKeyUsageWidget.tsx            # API usage metrics
│   │   └── UsageChartWidget.tsx             # Time-series charts
│   │
│   ├── onboarding/
│   │   ├── OnboardingWizard.tsx             # Multi-step wizard container
│   │   ├── UserTypeSelector.tsx             # Individual/Team/Enterprise
│   │   ├── SetupSteps/
│   │   │   ├── InstallationStep.tsx         # Guide installation
│   │   │   ├── FirstCheckpointStep.tsx      # Create first checkpoint
│   │   │   ├── TeamSetupStep.tsx            # Team configuration
│   │   │   └── IntegrationStep.tsx          # Connect tools
│   │   └── OnboardingProgress.tsx           # Progress indicator
│   │
│   ├── engagement/
│   │   ├── UpgradePrompt.tsx                # Context-aware CTAs
│   │   ├── FeatureDiscovery.tsx             # Feature announcements
│   │   ├── InAppMessage.tsx                 # Message center
│   │   ├── TrialExpiryBanner.tsx            # Trial countdown
│   │   └── LimitReachedModal.tsx            # Usage limit warnings
│   │
│   ├── achievements/
│   │   ├── AchievementBadge.tsx             # Individual badge
│   │   ├── AchievementGrid.tsx              # All achievements
│   │   ├── MilestoneCard.tsx                # Milestone display
│   │   └── AchievementToast.tsx             # Achievement unlock toast
│   │
│   └── communication/
│       ├── NotificationCenter.tsx           # In-app inbox
│       ├── NotificationItem.tsx             # Single notification
│       ├── TooltipGuide.tsx                 # Contextual tooltips
│       └── AnnouncementBanner.tsx           # Product updates
│
├── hooks/
│   ├── useJourneyState.ts                   # Journey state management
│   ├── useUsageMetrics.ts                   # Usage data fetching
│   ├── useOnboardingFlow.ts                 # Onboarding orchestration
│   ├── useAchievements.ts                   # Achievement tracking
│   └── useRealtimeSync.ts                   # Real-time updates
│
├── providers/
│   ├── JourneyProvider.tsx                  # Journey context
│   ├── UsageProvider.tsx                    # Usage metrics context
│   └── NotificationProvider.tsx             # Notification state
│
├── lib/
│   ├── journey-detector.ts                  # Detect user journey type
│   ├── journey-config.ts                    # Journey definitions
│   ├── milestone-tracker.ts                 # Track milestone progress
│   └── personalization-engine.ts            # Content personalization
│
└── types/
    ├── journey.types.ts                     # Journey type definitions
    ├── usage.types.ts                       # Usage metric types
    └── achievement.types.ts                 # Achievement types
```

### 1.2 Integration with Existing Modules

```
apps/web/modules/saas/
├── dashboard/                               # Enhanced with journey widgets
│   ├── components/
│   │   ├── DashboardLayout.tsx              # Add journey sidebar
│   │   ├── QuickStatsCards.tsx              # Journey-aware stats
│   │   └── ActivityFeed.tsx                 # Journey-based activities
│
├── usage/                                   # Usage tracking module
│   ├── components/
│   │   ├── UsageDashboard.tsx               # Comprehensive usage view
│   │   ├── UsageChart.tsx                   # Visual usage analytics
│   │   └── UsageLimitAlert.tsx              # Proactive limit warnings
│
├── apikeys/                                 # API key management
│   └── components/
│       └── ApiKeyUsageWidget.tsx            # Key usage in journey
│
└── organizations/                           # Team journey features
    └── components/
        └── TeamJourneyDashboard.tsx         # Team progress view
```

---

## 2. Key User Flows & Wireframe Descriptions

### 2.1 First-Time User Onboarding Flow

**Flow:** Sign Up → User Type Detection → Adaptive Onboarding → First Checkpoint → Dashboard

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Welcome & User Type Selection                      │
│                                                              │
│  [SnapBack Logo]                                            │
│  Welcome to SnapBack!                                       │
│  Tell us about your use case:                              │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Individual  │ │    Team     │ │ Enterprise  │          │
│  │   Solo      │ │ Collaboration│ │   Scale     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                              │
│  Progress: [●○○○] 1 of 4                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 2: Installation Guide (Dynamic based on user type)    │
│                                                              │
│  Let's get you protected                                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Install VS Code Extension                         │   │
│  │    [Install from Marketplace] [Already Installed ✓] │   │
│  │                                                       │   │
│  │ 2. Install CLI (Optional)                            │   │
│  │    $ npm install -g snapback-cli                     │   │
│  │    [Copy Command]                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [Skip for Now]                        [Continue →]         │
│  Progress: [●●○○] 2 of 4                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 3: Create First Checkpoint (Interactive Demo)         │
│                                                              │
│  Create your first checkpoint                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Terminal Animation]                                 │   │
│  │ $ snapback checkpoint "Initial setup"                │   │
│  │ ✓ Checkpoint created: #1                            │   │
│  │ ✓ Files tracked: 42                                  │   │
│  │ ✓ AI detection: Claude Code v3.5                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  🎉 Achievement Unlocked: First Checkpoint!                 │
│                                                              │
│  [Skip Demo]                           [Complete Setup →]   │
│  Progress: [●●●○] 3 of 4                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 4: Dashboard Tour                                     │
│                                                              │
│  Your SnapBack Dashboard                                    │
│                                                              │
│  [Interactive Tooltips pointing to key features]            │
│  • Checkpoint history                                       │
│  • Usage metrics                                            │
│  • Team settings (if applicable)                            │
│  • Upgrade options                                          │
│                                                              │
│  [Start Coding Protected →]                                 │
│  Progress: [●●●●] 4 of 4                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Dashboard with Journey Progress

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ SnapBack Dashboard                        [Profile] [Notifications] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Your Journey: Solo Developer → Pro User                      │    │
│ │ ┌──────────────────────────────────────────────────────┐    │    │
│ │ │ [●●●●●●●●●○○○○○○] 60% Complete                        │    │    │
│ │ │                                                       │    │    │
│ │ │ Next Milestone: Create 10 Checkpoints (7/10)        │    │    │
│ │ └──────────────────────────────────────────────────────┘    │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│ │ Checkpoints  │ │ Recoveries   │ │ Time Saved   │                │
│ │     42       │ │      8       │ │   3.2 hrs    │                │
│ │ ↑ 12 today   │ │ ↑ 2 today    │ │ this week    │                │
│ └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Recent Activity                                              │    │
│ │ • 10 min ago: Checkpoint created "Add auth flow"            │    │
│ │ • 1 hour ago: Recovery performed                            │    │
│ │ • 2 hours ago: Achievement unlocked: Speed Demon            │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│ ┌────────────────────────────────┐ ┌─────────────────────────┐    │
│ │ Achievements (4/12)             │ │ Upgrade to Solo         │    │
│ │ [🏆] [🔥] [⚡] [🎯]             │ │ Unlock cloud backup    │    │
│ │                                 │ │ & advanced features    │    │
│ │ Next: Create 10 checkpoints     │ │ [Start 14-Day Trial →] │    │
│ └────────────────────────────────┘ └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Usage Limit Warning Flow

**Flow:** Approaching Limit → Warning → Contextual Upgrade Prompt → Decision

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Checkpoint Limit Alert                                  │
│                                                              │
│  You've used 8 of 10 free checkpoints this month            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Usage Progress: [████████░░] 80%                     │   │
│  │                                                       │   │
│  │ • 2 checkpoints remaining                            │   │
│  │ • Resets in 12 days                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Continue with Free or Upgrade for unlimited?               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Free (Limited)   │  │ Solo ($29/mo)                 │   │
│  │ • 10/month       │  │ • Unlimited checkpoints       │   │
│  │ • Local only     │  │ • Cloud backup                │   │
│  │                  │  │ • Priority support            │   │
│  │ [Stay Free]      │  │ [Try Free for 14 Days →]      │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│                                                              │
│  [Remind Me Later]                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Team Journey Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│ Team Dashboard: Acme Corp                        [Admin] [Settings] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Team Journey: Onboarding → Adoption → Power Users           │    │
│ │ Current Stage: Active Adoption (Day 23)                     │    │
│ │ ┌──────────────────────────────────────────────────────┐    │    │
│ │ │ Team Health Score: 87/100 ●●●●●●●●●○                  │    │    │
│ │ │ • 8/12 members active today                           │    │    │
│ │ │ • 156 checkpoints this week                           │    │    │
│ │ └──────────────────────────────────────────────────────┘    │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Top Contributors (This Week)                                 │   │
│ │ 1. [👤] Sarah Chen       42 checkpoints    🏆 Power User     │   │
│ │ 2. [👤] Mike Johnson     38 checkpoints    ⚡ Active          │   │
│ │ 3. [👤] Alex Rivera      35 checkpoints    ⚡ Active          │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ ┌────────────────────────┐ ┌─────────────────────────────────┐    │
│ │ Usage by Project        │ │ Recovery Success Rate           │    │
│ │ [Chart: Pie/Bar]        │ │ [Chart: Line over time]         │    │
│ │ • Frontend: 45%         │ │ 94.5% successful recoveries     │    │
│ │ • Backend: 35%          │ │ ↑ 2.3% from last week           │    │
│ │ • Mobile: 20%           │ └─────────────────────────────────┘    │
│ └────────────────────────┘                                          │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 💡 Recommendation: Setup centralized policies                │   │
│ │    Your team is growing! Create shared checkpoint policies  │   │
│ │    [Setup Policies →]                                        │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. State Management Strategy

### 3.1 Architecture: Server-First with Client Hydration

**Pattern:** React Server Components + Client Islands + Context for UI State

```typescript
// Server State (from Database)
// - Journey configuration
// - Usage metrics (historical)
// - Achievement definitions
// - User preferences

// Client State (Real-time & UI)
// - Current journey step
// - Active notifications
// - Toast queue
// - Modal/dialog state
// - Optimistic updates
```

### 3.2 Implementation Approach

```typescript
// apps/web/modules/saas/journeys/providers/JourneyProvider.tsx
"use client";

import { createContext, useContext, useReducer, useEffect } from "react";
import type { JourneyState, JourneyAction } from "../types/journey.types";

const JourneyContext = createContext<{
	state: JourneyState;
	dispatch: React.Dispatch<JourneyAction>;
} | null>(null);

// Server data passed as initial props
export function JourneyProvider({
	children,
	initialJourney,
}: {
	children: React.ReactNode;
	initialJourney: JourneyState;
}) {
	const [state, dispatch] = useReducer(journeyReducer, initialJourney);

	// Real-time sync with SSE
	useEffect(() => {
		const eventSource = new EventSource("/api/journey/stream");

		eventSource.onmessage = (event) => {
			const update = JSON.parse(event.data);
			dispatch({ type: "JOURNEY_UPDATE", payload: update });
		};

		return () => eventSource.close();
	}, []);

	return (
		<JourneyContext.Provider value={{ state, dispatch }}>
			{children}
		</JourneyContext.Provider>
	);
}

export function useJourney() {
	const context = useContext(JourneyContext);
	if (!context)
		throw new Error("useJourney must be used within JourneyProvider");
	return context;
}
```

### 3.3 State Structure

```typescript
// apps/web/modules/saas/journeys/types/journey.types.ts

export interface JourneyState {
	// Core journey data
	journeyType: JourneyType;
	currentStage: JourneyStage;
	startedAt: Date;
	completedStages: string[];

	// Progress tracking
	milestones: Milestone[];
	achievements: Achievement[];

	// Usage metrics (cached from server)
	usage: {
		checkpoints: {
			count: number;
			limit: number;
			resetDate: Date;
		};
		apiCalls: {
			count: number;
			limit: number;
		};
		storage: {
			used: number;
			limit: number;
		};
	};

	// UI state
	onboarding: {
		isComplete: boolean;
		currentStep: number;
		skippedSteps: string[];
	};

	// Notifications
	notifications: Notification[];
	unreadCount: number;
}

export type JourneyType =
	| "solo_developer"
	| "team_member"
	| "team_admin"
	| "enterprise_user"
	| "trial_user"
	| "power_user";

export type JourneyStage =
	| "signup"
	| "onboarding"
	| "first_checkpoint"
	| "active_user"
	| "power_user"
	| "team_adoption"
	| "churned"
	| "dormant";
```

### 3.4 Server State with React Query (for API data)

```typescript
// apps/web/modules/saas/journeys/hooks/useUsageMetrics.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUsageMetrics() {
	return useQuery({
		queryKey: ["usage-metrics"],
		queryFn: async () => {
			const response = await api.usage.getMetrics.$get();
			return response.json();
		},
		refetchInterval: 30000, // Refresh every 30s
		staleTime: 15000, // Consider fresh for 15s
	});
}

export function useRealtimeUsage() {
	const [usage, setUsage] = useState<UsageMetrics | null>(null);

	useEffect(() => {
		const eventSource = new EventSource("/api/usage/stream");

		eventSource.addEventListener("usage-update", (event) => {
			setUsage(JSON.parse(event.data));
		});

		return () => eventSource.close();
	}, []);

	return usage;
}
```

---

## 4. Real-Time Data Synchronization

### 4.1 Strategy: Server-Sent Events (SSE) for Live Updates

**Why SSE over WebSockets:**

-   Simpler implementation with Next.js App Router
-   Automatic reconnection
-   HTTP/2 multiplexing
-   Better for server → client updates (our use case)

### 4.2 Implementation

```typescript
// apps/web/app/api/journey/stream/route.ts
import { getAuth } from "@repo/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const { user } = await getAuth();
	if (!user) return new Response("Unauthorized", { status: 401 });

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Send initial data
			const journey = await getJourneyState(user.id);
			controller.enqueue(
				encoder.encode(`data: ${JSON.stringify(journey)}\n\n`)
			);

			// Subscribe to real-time updates (using DB triggers or queue)
			const unsubscribe = await subscribeToJourneyUpdates(
				user.id,
				(update) => {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
					);
				}
			);

			// Cleanup on disconnect
			request.signal.addEventListener("abort", () => {
				unsubscribe();
				controller.close();
			});
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
```

### 4.3 Client-Side SSE Hook

```typescript
// apps/web/modules/saas/journeys/hooks/useRealtimeSync.ts
"use client";

import { useEffect, useState } from "react";

export function useRealtimeSync<T>(endpoint: string) {
	const [data, setData] = useState<T | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const eventSource = new EventSource(endpoint);

		eventSource.onopen = () => setIsConnected(true);
		eventSource.onerror = () => setIsConnected(false);

		eventSource.onmessage = (event) => {
			const update = JSON.parse(event.data);
			setData(update);
		};

		return () => {
			eventSource.close();
			setIsConnected(false);
		};
	}, [endpoint]);

	return { data, isConnected };
}

// Usage in component
function DashboardUsage() {
	const { data: usage, isConnected } =
		useRealtimeSync<UsageMetrics>("/api/usage/stream");

	return (
		<div>
			<StatusIndicator connected={isConnected} />
			{usage && <UsageDisplay data={usage} />}
		</div>
	);
}
```

### 4.4 Optimistic Updates Pattern

```typescript
// apps/web/modules/saas/journeys/hooks/useOptimisticCheckpoint.ts
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function useOptimisticCheckpoint() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const createCheckpoint = async (description: string) => {
		// Optimistic UI update
		startTransition(async () => {
			// Server action
			await createCheckpointAction(description);
			// Revalidate and refresh
			router.refresh();
		});
	};

	return { createCheckpoint, isPending };
}

// In component
function CheckpointButton() {
	const { createCheckpoint, isPending } = useOptimisticCheckpoint();

	return (
		<button
			onClick={() => createCheckpoint("My checkpoint")}
			disabled={isPending}
		>
			{isPending ? "Creating..." : "Create Checkpoint"}
		</button>
	);
}
```

---

## 5. Recommended Libraries

### 5.1 Notifications & Toasts

**Recommended: Sonner** (already in dependencies ✓)

-   React 19 compatible
-   Beautiful defaults
-   Promise-based API
-   Accessible (ARIA labels)

```typescript
// apps/web/modules/saas/journeys/lib/notifications.ts
import { toast } from "sonner";

export const journeyNotifications = {
	milestoneReached: (milestone: string) => {
		toast.success("Milestone Reached!", {
			description: milestone,
			icon: "🎉",
			duration: 5000,
			action: {
				label: "View",
				onClick: () => router.push("/app/achievements"),
			},
		});
	},

	limitWarning: (remaining: number) => {
		toast.warning("Approaching Limit", {
			description: `${remaining} checkpoints remaining this month`,
			action: {
				label: "Upgrade",
				onClick: () => router.push("/app/settings/billing"),
			},
		});
	},

	achievementUnlocked: (achievement: Achievement) => {
		toast(achievement.name, {
			description: achievement.description,
			icon: achievement.emoji,
			duration: 6000,
		});
	},
};
```

### 5.2 Charts & Analytics

**Recommended: Recharts**

-   React 19 compatible
-   Responsive out of the box
-   Composable API
-   Accessible

```bash
pnpm add recharts
```

```typescript
// apps/web/modules/saas/journeys/components/usage-widgets/UsageChartWidget.tsx
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

export function UsageChartWidget({ data }: { data: UsageData[] }) {
	return (
		<div className="h-64 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data}>
					<XAxis
						dataKey="date"
						stroke="hsl(var(--muted-foreground))"
						fontSize={12}
					/>
					<YAxis
						stroke="hsl(var(--muted-foreground))"
						fontSize={12}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: "hsl(var(--card))",
							border: "1px solid hsl(var(--border))",
						}}
					/>
					<Line
						type="monotone"
						dataKey="checkpoints"
						stroke="hsl(var(--primary))"
						strokeWidth={2}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
```

### 5.3 Animations

**Recommended: Framer Motion** (already in dependencies ✓)

-   React 19 compatible
-   Declarative API
-   Layout animations
-   Gesture support

```typescript
// apps/web/modules/saas/journeys/components/journey-tracker/JourneyProgress.tsx
"use client";

import { motion } from "framer-motion";

export function JourneyProgress({ progress }: { progress: number }) {
	return (
		<div className="relative h-2 w-full rounded-full bg-muted">
			<motion.div
				className="absolute h-full rounded-full bg-primary"
				initial={{ width: 0 }}
				animate={{ width: `${progress}%` }}
				transition={{ duration: 0.5, ease: "easeOut" }}
			/>
		</div>
	);
}

// Celebration animation
export function AchievementCelebration({
	achievement,
}: {
	achievement: Achievement;
}) {
	return (
		<motion.div
			initial={{ scale: 0, rotate: -180 }}
			animate={{ scale: 1, rotate: 0 }}
			exit={{ scale: 0, rotate: 180 }}
			transition={{ type: "spring", stiffness: 260, damping: 20 }}
			className="fixed inset-0 flex items-center justify-center bg-black/50"
		>
			<div className="rounded-lg bg-card p-8 text-center">
				<div className="text-6xl">{achievement.emoji}</div>
				<h2 className="mt-4 text-2xl font-bold">{achievement.name}</h2>
				<p className="mt-2 text-muted-foreground">
					{achievement.description}
				</p>
			</div>
		</motion.div>
	);
}
```

### 5.4 Forms & Validation

**Recommended: React Hook Form + Zod** (already in dependencies ✓)

```typescript
// apps/web/modules/saas/journeys/components/onboarding/TeamSetupStep.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const teamSetupSchema = z.object({
	teamName: z.string().min(3, "Team name must be at least 3 characters"),
	members: z.array(z.string().email()).min(1, "Add at least one team member"),
});

export function TeamSetupStep() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(teamSetupSchema),
	});

	const onSubmit = async (data) => {
		await createTeamAction(data);
	};

	return <form onSubmit={handleSubmit(onSubmit)}>{/* Form fields */}</form>;
}
```

### 5.5 Feature Flags & A/B Testing

**Recommended: PostHog** (Integration with React 19)

```bash
pnpm add posthog-js posthog-node
```

```typescript
// apps/web/lib/posthog.ts
import posthog from "posthog-js";

export function initPostHog() {
	if (typeof window !== "undefined") {
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
			api_host:
				process.env.NEXT_PUBLIC_POSTHOG_HOST ||
				"https://app.posthog.com",
			loaded: (posthog) => {
				if (process.env.NODE_ENV === "development") posthog.debug();
			},
		});
	}
}

// apps/web/modules/saas/journeys/hooks/useFeatureFlag.ts
("use client");

import { usePostHog } from "posthog-js/react";

export function useFeatureFlag(flag: string) {
	const posthog = usePostHog();
	return posthog?.isFeatureEnabled(flag) ?? false;
}

// Usage
function UpgradePrompt() {
	const showNewPricing = useFeatureFlag("new-pricing-page");

	return showNewPricing ? <NewPricingCTA /> : <LegacyPricingCTA />;
}
```

---

## 6. Accessibility Implementation Strategy

### 6.1 WCAG 2.1 AA Compliance Checklist

**Keyboard Navigation:**

-   ✓ All interactive elements accessible via Tab/Shift+Tab
-   ✓ Focus indicators visible (2px solid primary color)
-   ✓ Skip links for main content
-   ✓ Escape key closes modals/dialogs

**Screen Reader Support:**

-   ✓ Semantic HTML (nav, main, article, aside)
-   ✓ ARIA labels for icon-only buttons
-   ✓ ARIA live regions for dynamic content
-   ✓ Descriptive link text (no "Click here")

**Visual Accessibility:**

-   ✓ 4.5:1 contrast ratio for text
-   ✓ 3:1 for UI components
-   ✓ Reduced motion support
-   ✓ Focus visible on all interactive elements

### 6.2 Implementation Examples

```typescript
// apps/web/modules/saas/journeys/components/engagement/UpgradePrompt.tsx
"use client";

export function UpgradePrompt({ usage }: { usage: UsageMetrics }) {
	return (
		<section
			aria-labelledby="upgrade-heading"
			className="rounded-lg border border-primary/20 bg-card p-6"
		>
			<h2 id="upgrade-heading" className="text-xl font-semibold">
				Upgrade to Solo
			</h2>

			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="mt-4"
			>
				You've used {usage.checkpoints.count} of{" "}
				{usage.checkpoints.limit} checkpoints
			</div>

			<button
				aria-label="Start 14-day free trial for Solo plan"
				className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
			>
				Start 14-Day Trial
			</button>
		</section>
	);
}

// Focus trap for modal
import { Dialog } from "@/modules/ui/components/dialog";

export function LimitReachedModal({ isOpen, onClose }: ModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent aria-describedby="limit-description">
				<DialogHeader>
					<DialogTitle>Checkpoint Limit Reached</DialogTitle>
				</DialogHeader>

				<div id="limit-description">
					You've reached your monthly checkpoint limit. Upgrade to
					continue.
				</div>

				<DialogFooter>
					<button onClick={onClose} className="focus-visible:ring-2">
						Maybe Later
					</button>
					<button
						onClick={handleUpgrade}
						className="bg-primary focus-visible:ring-2"
					>
						Upgrade Now
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
```

### 6.3 Reduced Motion Support

```typescript
// apps/web/modules/ui/hooks/useReducedMotion.ts
"use client";

import { useEffect, useState } from "react";

export function useReducedMotion() {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		);
		setPrefersReducedMotion(mediaQuery.matches);

		const listener = (e: MediaQueryListEvent) => {
			setPrefersReducedMotion(e.matches);
		};

		mediaQuery.addEventListener("change", listener);
		return () => mediaQuery.removeEventListener("change", listener);
	}, []);

	return prefersReducedMotion;
}

// Usage
import { motion } from "framer-motion";
import { useReducedMotion } from "@/modules/ui/hooks/useReducedMotion";

export function AnimatedCard({ children }) {
	const prefersReducedMotion = useReducedMotion();

	return (
		<motion.div
			initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={
				prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
			}
		>
			{children}
		</motion.div>
	);
}
```

---

## 7. Performance Optimization Techniques

### 7.1 React 19 Optimization Features

**Server Components by Default:**

```typescript
// apps/web/modules/saas/journeys/components/journey-tracker/JourneyProgress.tsx
// Server Component (default) - No 'use client'

import { getJourneyState } from "@/lib/journey";

export async function JourneyProgress({ userId }: { userId: string }) {
	// Fetch directly in component
	const journey = await getJourneyState(userId);

	return (
		<div>
			<h2>{journey.currentStage}</h2>
			<ProgressBar progress={journey.progress} /> {/* Client component */}
		</div>
	);
}
```

**Async React Server Components:**

```typescript
// Server Component with streaming
export async function DashboardStats({ userId }: { userId: string }) {
	// These fetch in parallel
	const [checkpoints, recoveries, achievements] = await Promise.all([
		getCheckpointCount(userId),
		getRecoveryCount(userId),
		getAchievements(userId),
	]);

	return (
		<div className="grid grid-cols-3 gap-4">
			<StatCard title="Checkpoints" value={checkpoints} />
			<StatCard title="Recoveries" value={recoveries} />
			<StatCard title="Achievements" value={achievements.length} />
		</div>
	);
}
```

**Suspense for Incremental Loading:**

```typescript
// apps/web/app/(saas)/app/dashboard/page.tsx
import { Suspense } from "react";

export default function DashboardPage() {
	return (
		<div>
			<Suspense fallback={<JourneyProgressSkeleton />}>
				<JourneyProgress userId={user.id} />
			</Suspense>

			<Suspense fallback={<UsageWidgetsSkeleton />}>
				<UsageWidgets userId={user.id} />
			</Suspense>

			<Suspense fallback={<ActivityFeedSkeleton />}>
				<ActivityFeed userId={user.id} />
			</Suspense>
		</div>
	);
}
```

### 7.2 Bundle Optimization

**Dynamic Imports for Heavy Components:**

```typescript
// apps/web/modules/saas/journeys/components/achievements/AchievementGrid.tsx
"use client";

import dynamic from "next/dynamic";

// Lazy load confetti effect
const Confetti = dynamic(
	() => import("@/modules/ui/components/magic/confetti"),
	{
		ssr: false,
		loading: () => null,
	}
);

export function AchievementGrid({
	achievements,
}: {
	achievements: Achievement[];
}) {
	const [showConfetti, setShowConfetti] = useState(false);

	return (
		<div>
			{achievements.map((achievement) => (
				<AchievementBadge key={achievement.id} {...achievement} />
			))}
			{showConfetti && <Confetti />}
		</div>
	);
}
```

**Code Splitting by Route:**

```typescript
// Next.js automatically splits by route
// Ensure heavy components are only in routes that need them

// ✓ Good: Chart library only loaded on usage page
// apps/web/app/(saas)/app/usage/page.tsx
import { UsageChart } from "@/modules/saas/journeys/components/usage-widgets/UsageChartWidget";

// ✗ Bad: Chart library loaded on every page
// apps/web/modules/saas/shared/components/Layout.tsx
```

### 7.3 React Query Optimization

```typescript
// apps/web/modules/saas/journeys/hooks/useUsageMetrics.ts
import { useQuery } from "@tanstack/react-query";

export function useUsageMetrics() {
	return useQuery({
		queryKey: ["usage-metrics"],
		queryFn: fetchUsageMetrics,

		// Performance optimizations
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,

		// Prefetch on hover
		placeholderData: (previousData) => previousData,
	});
}

// Prefetch on link hover
function DashboardLink() {
	const queryClient = useQueryClient();

	return (
		<Link
			href="/app/usage"
			onMouseEnter={() => {
				queryClient.prefetchQuery({
					queryKey: ["usage-metrics"],
					queryFn: fetchUsageMetrics,
				});
			}}
		>
			View Usage
		</Link>
	);
}
```

### 7.4 Image Optimization

```typescript
// apps/web/modules/saas/journeys/components/achievements/AchievementBadge.tsx
import Image from "next/image";

export function AchievementBadge({
	achievement,
}: {
	achievement: Achievement;
}) {
	return (
		<div className="relative">
			{achievement.image && (
				<Image
					src={achievement.image}
					alt={achievement.name}
					width={80}
					height={80}
					loading="lazy"
					placeholder="blur"
					blurDataURL={achievement.blurDataUrl}
				/>
			)}
		</div>
	);
}
```

### 7.5 Virtualization for Long Lists

```bash
pnpm add @tanstack/react-virtual
```

```typescript
// apps/web/modules/saas/journeys/components/NotificationCenter.tsx
"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

export function NotificationCenter({
	notifications,
}: {
	notifications: Notification[];
}) {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: notifications.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 80,
		overscan: 5,
	});

	return (
		<div ref={parentRef} className="h-96 overflow-auto">
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					position: "relative",
				}}
			>
				{virtualizer.getVirtualItems().map((virtualRow) => (
					<div
						key={virtualRow.key}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						<NotificationItem
							notification={notifications[virtualRow.index]}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
```

---

## 8. Implementation Phases & Priorities

### Phase 1: Foundation (Week 1-2)

**Priority: Critical**

-   [ ] Set up journey detection system
-   [ ] Create core journey types and state management
-   [ ] Implement JourneyProvider with basic state
-   [ ] Build usage metrics API and hooks
-   [ ] Create basic dashboard layout with placeholder widgets

**Deliverables:**

-   Journey detection working
-   Basic dashboard showing user journey type
-   Usage data flowing from API to UI

---

### Phase 2: Core Journey Experience (Week 3-4)

**Priority: Critical**

-   [ ] Build onboarding wizard with user type detection
-   [ ] Create journey progress tracker component
-   [ ] Implement milestone system
-   [ ] Add usage widgets (checkpoints, recoveries, time saved)
-   [ ] Build notification system with Sonner

**Deliverables:**

-   Complete onboarding flow
-   Dashboard with journey progress
-   Working notification system

---

### Phase 3: Engagement Features (Week 5-6)

**Priority: High**

-   [ ] Achievement system with badges
-   [ ] Context-aware upgrade prompts
-   [ ] Usage limit warnings and modals
-   [ ] In-app messaging center
-   [ ] Feature discovery tooltips

**Deliverables:**

-   Achievement unlocking and display
-   Smart upgrade prompts based on journey
-   Complete in-app communication system

---

### Phase 4: Team Features (Week 7-8)

**Priority: High**

-   [ ] Team journey dashboard
-   [ ] Team health score metrics
-   [ ] Contributor leaderboard
-   [ ] Team activity feed
-   [ ] Shared achievement system

**Deliverables:**

-   Team-specific dashboard
-   Collaborative features live
-   Team usage analytics

---

### Phase 5: Advanced Analytics (Week 9-10)

**Priority: Medium**

-   [ ] Usage charts with Recharts
-   [ ] Trend analysis
-   [ ] Predictive usage warnings
-   [ ] Export and reporting features
-   [ ] Custom dashboard widgets

**Deliverables:**

-   Rich data visualizations
-   Advanced analytics features
-   Customizable dashboards

---

### Phase 6: Real-Time & Polish (Week 11-12)

**Priority: Medium**

-   [ ] SSE implementation for real-time updates
-   [ ] Optimistic UI for all actions
-   [ ] Performance optimization pass
-   [ ] Accessibility audit and fixes
-   [ ] Animation polish
-   [ ] A/B testing setup with PostHog

**Deliverables:**

-   Real-time data sync
-   Polished animations
-   WCAG 2.1 AA compliant
-   A/B testing infrastructure

---

## 9. Cross-Platform Consistency

### 9.1 Design Tokens (Shared Across Platforms)

```typescript
// packages/design-tokens/src/index.ts
export const tokens = {
	colors: {
		primary: {
			DEFAULT: "hsl(142, 76%, 36%)", // #10B981 - SnapBack green
			foreground: "hsl(0, 0%, 100%)",
		},
		background: {
			DEFAULT: "hsl(0, 0%, 3.9%)", // #0A0A0A
			elevated: "hsl(0, 0%, 6.7%)", // #111111
		},
	},

	spacing: {
		xs: "0.25rem",
		sm: "0.5rem",
		md: "1rem",
		lg: "1.5rem",
		xl: "2rem",
	},

	typography: {
		fontFamily: {
			sans: "Inter, system-ui, sans-serif",
			mono: "JetBrains Mono, monospace",
		},
		fontSize: {
			xs: "0.75rem",
			sm: "0.875rem",
			base: "1rem",
			lg: "1.125rem",
			xl: "1.25rem",
			"2xl": "1.5rem",
		},
	},

	animations: {
		duration: {
			fast: "150ms",
			base: "300ms",
			slow: "500ms",
		},
		easing: {
			easeIn: "cubic-bezier(0.4, 0, 1, 1)",
			easeOut: "cubic-bezier(0, 0, 0.2, 1)",
			easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
		},
	},
};
```

### 9.2 VS Code Extension Consistency

**Webview Components (Same design tokens):**

```typescript
// extensions/vscode/src/webview/components/JourneyWidget.tsx
import { tokens } from "@snapback/design-tokens";

export function JourneyWidget({ journey }: { journey: JourneyState }) {
	return (
		<div
			style={{
				backgroundColor: tokens.colors.background.DEFAULT,
				padding: tokens.spacing.md,
				borderRadius: "8px",
			}}
		>
			<h3 style={{ color: tokens.colors.primary.DEFAULT }}>
				Your Journey: {journey.currentStage}
			</h3>
			<ProgressBar progress={journey.progress} />
		</div>
	);
}
```

### 9.3 CLI Output Consistency

```typescript
// clients/cli/src/ui/journey-display.ts
import chalk from "chalk";
import { tokens } from "@snapback/design-tokens";

export function displayJourney(journey: JourneyState) {
	console.log(chalk.hex(tokens.colors.primary.DEFAULT)("Your Journey:"));
	console.log(`Stage: ${journey.currentStage}`);
	console.log(`Progress: ${createProgressBar(journey.progress)}`);
}

function createProgressBar(progress: number): string {
	const filled = Math.floor(progress / 10);
	const empty = 10 - filled;
	return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}
```

---

## 10. Testing Strategy

### 10.1 Component Testing (Vitest + Testing Library)

```typescript
// apps/web/modules/saas/journeys/__tests__/JourneyProgress.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { JourneyProgress } from "../components/journey-tracker/JourneyProgress";

describe("JourneyProgress", () => {
	it("renders progress percentage correctly", () => {
		render(<JourneyProgress progress={60} />);
		expect(screen.getByText("60%")).toBeInTheDocument();
	});

	it("shows correct milestone", () => {
		render(
			<JourneyProgress progress={60} milestone="Create 10 checkpoints" />
		);
		expect(screen.getByText(/Create 10 checkpoints/i)).toBeInTheDocument();
	});

	it("applies correct ARIA attributes", () => {
		render(<JourneyProgress progress={60} />);
		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveAttribute("aria-valuenow", "60");
		expect(progressBar).toHaveAttribute("aria-valuemin", "0");
		expect(progressBar).toHaveAttribute("aria-valuemax", "100");
	});
});
```

### 10.2 Accessibility Testing (jest-axe)

```typescript
// apps/web/modules/saas/journeys/__tests__/UpgradePrompt.a11y.test.tsx
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { UpgradePrompt } from "../components/engagement/UpgradePrompt";

expect.extend(toHaveNoViolations);

describe("UpgradePrompt Accessibility", () => {
	it("should not have any accessibility violations", async () => {
		const { container } = render(
			<UpgradePrompt usage={{ checkpoints: { count: 8, limit: 10 } }} />
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
```

### 10.3 E2E Testing (Playwright)

```typescript
// apps/web/tests/e2e/journey-onboarding.spec.ts
import { test, expect } from "@playwright/test";

test.describe("User Journey Onboarding", () => {
	test("should complete solo developer onboarding", async ({ page }) => {
		await page.goto("/app/onboarding");

		// Step 1: User type selection
		await page.click('button:has-text("Individual Solo")');
		await page.click('button:has-text("Continue")');

		// Step 2: Installation
		await expect(page.locator("h2")).toContainText(
			"Install VS Code Extension"
		);
		await page.click('button:has-text("Already Installed")');

		// Step 3: First checkpoint
		await expect(page.locator(".terminal-animation")).toBeVisible();
		await page.click('button:has-text("Complete Setup")');

		// Should redirect to dashboard
		await expect(page).toHaveURL("/app/dashboard");
		await expect(page.locator("text=Your Journey")).toBeVisible();
	});

	test("should show upgrade prompt at 80% usage", async ({ page }) => {
		// Mock usage at 8/10
		await page.route("/api/usage/stream", (route) => {
			route.fulfill({
				status: 200,
				contentType: "text/event-stream",
				body: 'data: {"checkpoints":{"count":8,"limit":10}}\n\n',
			});
		});

		await page.goto("/app/dashboard");
		await expect(page.locator("text=Approaching Limit")).toBeVisible();
	});
});
```

---

## 11. Error Handling & Edge Cases

### 11.1 Error Boundaries

```typescript
// apps/web/modules/saas/journeys/components/JourneyErrorBoundary.tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class JourneyErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Journey Error:", error, errorInfo);
		// Log to error tracking service
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
						<h3 className="text-lg font-semibold text-destructive">
							Something went wrong
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							We couldn't load your journey data. Please refresh
							the page.
						</p>
						<button
							onClick={() => window.location.reload()}
							className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
						>
							Refresh Page
						</button>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
```

### 11.2 Loading States

```typescript
// apps/web/modules/saas/journeys/components/usage-widgets/CheckpointUsageCard.tsx
"use client";

import { useUsageMetrics } from "../../hooks/useUsageMetrics";
import { Skeleton } from "@/modules/ui/components/skeleton";

export function CheckpointUsageCard() {
	const { data: usage, isLoading, error } = useUsageMetrics();

	if (isLoading) {
		return (
			<div className="rounded-lg border p-6">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="mt-2 h-8 w-16" />
				<Skeleton className="mt-4 h-2 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/50 p-6">
				<p className="text-sm text-destructive">
					Failed to load usage data
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border p-6">
			<h3 className="text-sm font-medium text-muted-foreground">
				Checkpoints
			</h3>
			<p className="mt-2 text-3xl font-bold">
				{usage?.checkpoints.count}
			</p>
			<div className="mt-4">
				<div className="h-2 w-full rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary"
						style={{
							width: `${
								(usage?.checkpoints.count /
									usage?.checkpoints.limit) *
								100
							}%`,
						}}
					/>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					{usage?.checkpoints.limit - usage?.checkpoints.count}{" "}
					remaining
				</p>
			</div>
		</div>
	);
}
```

---

## 12. Summary & Quick Reference

### 12.1 Tech Stack Summary

| Category          | Technology            | Purpose                   |
| ----------------- | --------------------- | ------------------------- |
| **Framework**     | Next.js 15 + React 19 | App infrastructure        |
| **UI Components** | Radix UI + shadcn/ui  | Accessible primitives     |
| **Styling**       | Tailwind CSS          | Utility-first styling     |
| **State**         | Context + React Query | Client/server state       |
| **Real-time**     | Server-Sent Events    | Live updates              |
| **Analytics**     | PostHog               | Feature flags & A/B tests |
| **Charts**        | Recharts              | Data visualization        |
| **Animations**    | Framer Motion         | Micro-interactions        |
| **Forms**         | React Hook Form + Zod | Form handling             |
| **Notifications** | Sonner                | Toast messages            |
| **Testing**       | Vitest + Playwright   | Unit + E2E tests          |

### 12.2 File Structure Quick Reference

```
apps/web/modules/saas/journeys/
├── components/          # All UI components
│   ├── journey-tracker/ # Progress & milestones
│   ├── usage-widgets/   # Usage displays
│   ├── onboarding/      # Onboarding flows
│   ├── engagement/      # CTAs & prompts
│   └── achievements/    # Badges & rewards
├── hooks/               # Reusable hooks
├── providers/           # Context providers
├── lib/                 # Business logic
└── types/               # TypeScript types
```

### 12.3 Implementation Priority Matrix

| Feature           | Priority | Complexity | Impact |
| ----------------- | -------- | ---------- | ------ |
| Journey Detection | P0       | Medium     | High   |
| Basic Dashboard   | P0       | Low        | High   |
| Onboarding Flow   | P0       | Medium     | High   |
| Usage Widgets     | P0       | Low        | High   |
| Progress Tracker  | P1       | Medium     | High   |
| Achievements      | P1       | Medium     | Medium |
| Upgrade Prompts   | P1       | Low        | High   |
| Team Features     | P2       | High       | Medium |
| Real-time Sync    | P2       | High       | Medium |
| Advanced Charts   | P3       | Medium     | Low    |

### 12.4 Performance Targets

-   **Initial Load:** < 2s (LCP)
-   **Interaction:** < 100ms (FID)
-   **Layout Shift:** < 0.1 (CLS)
-   **Bundle Size:** < 200KB (initial JS)
-   **API Response:** < 500ms (p95)
-   **Real-time Latency:** < 1s (SSE updates)

### 12.5 Accessibility Checklist

-   [x] Keyboard navigation
-   [x] Focus indicators (2px solid)
-   [x] ARIA labels and live regions
-   [x] 4.5:1 text contrast
-   [x] 3:1 UI component contrast
-   [x] Reduced motion support
-   [x] Screen reader testing
-   [x] Skip links

---

## Next Steps

1. **Review & Approval:** Review this architecture with the team
2. **Setup Phase 1:** Initialize journey module structure
3. **API Design:** Design backend API for journey tracking (separate doc)
4. **Design System:** Create Figma designs for key components
5. **Implementation:** Begin Phase 1 development

---

## Additional Resources

-   [Next.js 15 Docs](https://nextjs.org/docs)
-   [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
-   [Radix UI Primitives](https://www.radix-ui.com/primitives)
-   [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
-   [PostHog Feature Flags](https://posthog.com/docs/feature-flags)
-   [Framer Motion Docs](https://www.framer.com/motion/)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Author:** Claude Code (Frontend Architect)
