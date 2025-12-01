# Dashboard Hooks Documentation

This document provides comprehensive documentation for all the enhanced dashboard hooks that follow the Resource pattern and include optimistic updates.

## Table of Contents

-   [useDashboardMetrics](#usedashboardmetrics)
-   [useAIDetectionStats](#useaidetectionstats)
-   [useRecentActivity](#userecentactivity)
-   [useApiKeys](#useapikeys)
-   [useCreateApiKey](#usecreateapikey)
-   [useRevokeApiKey](#userevokeapikey)
-   [useSubscriptionWithUsage](#usesubscriptionwithusage)
-   [useUpgradeSubscription](#useupgradesubscription)
-   [useCancelSubscription](#usecancelsubscription)

## Overview

All dashboard hooks follow the Resource pattern for consistent state management. Each hook returns a Resource type that can be one of four states:

-   `loading`: Initial data fetch in progress
-   `empty`: Successful fetch but no data available
-   `error`: An error occurred during fetch or mutation
-   `ready`: Data successfully fetched and available

The hooks automatically handle:

-   Error mapping and user-friendly messages
-   Loading states with metadata
-   Optimistic updates for mutations
-   Automatic rollback on errors
-   Cache invalidation after mutations

## useDashboardMetrics

Fetches dashboard metrics with proper loading, error, and ready states.

### Usage

```typescript
import { useDashboardMetrics } from "@/hooks/use-snapshots";

const metricsR = useDashboardMetrics();

return matchResource(metricsR, {
	loading: () => <LoadingSpinner />,
	empty: () => <EmptyState />,
	error: (error) => <ErrorMessage error={error} />,
	ready: (metrics) => <MetricsDisplay metrics={metrics} />,
});
```

### Return Type

```typescript
Resource<DashboardMetrics, Error>;
```

### DashboardMetrics Interface

```typescript
interface DashboardMetrics {
	snapshotCount: number;
	recoveryCount: number;
	filesProtected: number;
	aiDetectionRate: number;
}
```

## useAIDetectionStats

Fetches AI detection statistics with proper resource states.

### Usage

```typescript
import { useAIDetectionStats } from "@/hooks/use-snapshots";

const aiStatsR = useAIDetectionStats();

return matchResource(aiStatsR, {
	loading: () => <LoadingSpinner />,
	empty: () => <EmptyState />,
	error: (error) => <ErrorMessage error={error} />,
	ready: (aiStats) => <AIDetectionStatsDisplay stats={aiStats} />,
});
```

### Return Type

```typescript
Resource<AIDetectionStat[], Error>;
```

### AIDetectionStat Interface

```typescript
interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}
```

## useRecentActivity

Fetches recent activity feed with proper resource states.

### Usage

```typescript
import { useRecentActivity } from "@/hooks/use-snapshots";

const activitiesR = useRecentActivity();

return matchResource(activitiesR, {
	loading: () => <LoadingSpinner />,
	empty: () => <EmptyState />,
	error: (error) => <ErrorMessage error={error} />,
	ready: (activities) => <ActivityFeed activities={activities} />,
});
```

### Return Type

```typescript
Resource<Activity[], Error>;
```

### Activity Interface

```typescript
interface Activity {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, any>;
}
```

## useCreateSnapshot

Creates a new snapshot with optimistic updates and analytics tracking.

### Usage

```typescript
import { useCreateSnapshot } from "@/hooks/use-snapshots";

const { mutate, isPending, isError, error } = useCreateSnapshot();

const handleCreateSnapshot = (name: string) => {
	mutate({ name });
};
```

### Parameters

```typescript
interface CreateSnapshotInput {
	name: string;
	projectId?: string;
	filePath?: string;
}
```

### Return Type

```typescript
UseResourceMutationResult<
	Snapshot,
	Error,
	CreateSnapshotInput,
	OptimisticContext
>;
```

## useApiKeys

Fetches API keys with proper resource states.

### Usage

```typescript
import { useApiKeys } from "@/hooks/use-api-keys";

const apiKeysR = useApiKeys(userId);

return matchResource(apiKeysR, {
	loading: () => <LoadingSpinner />,
	empty: () => <EmptyState />,
	error: (error) => <ErrorMessage error={error} />,
	ready: (apiKeys) => <ApiKeysList keys={apiKeys} />,
});
```

### Return Type

```typescript
Resource<ApiKeyListItem[], Error>;
```

## useCreateApiKey

Creates a new API key with optimistic updates and analytics tracking.

### Usage

```typescript
import { useCreateApiKey } from "@/hooks/use-api-keys";

const { mutate, isPending, isError, error } = useCreateApiKey();

const handleCreateApiKey = (name: string) => {
	mutate({ userId, name });
};
```

### Parameters

```typescript
interface CreateApiKeyInput {
	name: string;
	scopes?: string[];
	rateLimit?: number;
	expiresAt?: Date;
}
```

### Return Type

```typescript
UseResourceMutationResult<
	ApiKey & { key: string },
	Error,
	CreateApiKeyInput & { userId: string },
	OptimisticContext
>;
```

## useRevokeApiKey

Revokes an API key with optimistic updates and analytics tracking.

### Usage

```typescript
import { useRevokeApiKey } from "@/hooks/use-api-keys";

const { mutate, isPending, isError, error } = useRevokeApiKey();

const handleRevokeApiKey = (keyId: string) => {
	mutate({ userId, keyId });
};
```

### Parameters

```typescript
interface RevokeApiKeyInput {
	keyId: string;
}
```

### Return Type

```typescript
UseResourceMutationResult<
	{ success: boolean; error?: string },
	Error,
	RevokeApiKeyInput & { userId: string },
	OptimisticContext
>;
```

## useSubscriptionWithUsage

Fetches subscription and usage data combined with proper resource states.

### Usage

```typescript
import { useSubscriptionWithUsage } from "@/hooks/use-subscription";

const subscriptionR = useSubscriptionWithUsage(userId);

return matchResource(subscriptionR, {
	loading: () => <LoadingSpinner />,
	empty: () => <EmptyState />,
	error: (error) => <ErrorMessage error={error} />,
	ready: (subscriptionData) => <UsageDisplay data={subscriptionData} />,
});
```

### Return Type

```typescript
Resource<SubscriptionWithUsage, Error>;
```

### SubscriptionWithUsage Interface

```typescript
interface SubscriptionWithUsage {
	subscription: SubscriptionData;
	usage: UsageLimits;
}
```

## useUpgradeSubscription

Upgrades subscription with optimistic updates.

### Usage

```typescript
import { useUpgradeSubscription } from "@/hooks/use-subscription";

const { mutate, isPending, isError, error } = useUpgradeSubscription();

const handleUpgrade = (newTier: string) => {
	mutate({ userId, newTier });
};
```

### Parameters

```typescript
interface UpgradeSubscriptionInput {
	userId: string;
	newTier: string;
	paymentMethodId?: string;
}
```

### Return Type

```typescript
UseResourceMutationResult<
	SubscriptionActionResult,
	Error,
	UpgradeSubscriptionInput,
	OptimisticContext
>;
```

## useCancelSubscription

Cancels subscription with optimistic updates.

### Usage

```typescript
import { useCancelSubscription } from "@/hooks/use-subscription";

const { mutate, isPending, isError, error } = useCancelSubscription();

const handleCancel = () => {
	mutate({ userId });
};
```

### Parameters

```typescript
interface CancelSubscriptionInput {
	userId: string;
}
```

### Return Type

```typescript
UseResourceMutationResult<
	SubscriptionActionResult,
	Error,
	CancelSubscriptionInput,
	OptimisticContext
>;
```

## Best Practices

1. **Always use matchResource** for handling different states
2. **Implement proper error handling** in all components
3. **Use optimistic updates** for better user experience
4. **Track analytics events** for user interactions
5. **Follow accessibility guidelines** for all interactive elements
6. **Implement proper loading states** to avoid layout shifts
7. **Use proper TypeScript typing** for type safety
8. **Test all hooks** with comprehensive unit tests

## Error Handling

All hooks properly handle errors and provide meaningful error messages. When using these hooks, always implement error states in your components:

```typescript
matchResource(resource, {
	// ... other states
	error: (error) => (
		<div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
			<p>Error: {error.message}</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
			>
				Retry
			</button>
		</div>
	),
});
```
