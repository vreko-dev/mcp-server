# Bundle Optimization Guide

## Dynamic Imports for Heavy Components

To reduce initial bundle size, use dynamic imports for heavy components:

```typescript
// Before: Import everything upfront
import { MetricsGrid } from "@/modules/saas/dashboard/components/MetricsGrid";

// After: Lazy load
import dynamic from "next/dynamic";

const MetricsGrid = dynamic(
	() => import("@/modules/saas/dashboard/components/MetricsGrid"),
	{ loading: () => <MetricsGrid.Skeleton /> }
);
```

## Tree-shaking Zod

To reduce Zod bundle size:

```typescript
// Before (imports 1.1MB)
import { z } from "zod";

// After (imports ~200KB)
import { object, string, number } from "zod";
const z = { object, string, number };
```

## Optimize Package Imports

The Next.js config already includes:

```javascript
experimental: {
  optimizePackageImports: [
    "zod",
    "@tanstack/react-query",
    "lucide-react",
    "@radix-ui/react-*",
  ],
}
```

## Webpack Chunk Splitting

The webpack configuration includes:

```javascript
config.optimization.splitChunks = {
	chunks: "all",
	cacheGroups: {
		vendor: {
			test: /node_modules/,
			name: "vendor",
			priority: 10,
			chunks: "all",
		},
		common: {
			minChunks: 2,
			priority: 5,
			chunks: "all",
		},
	},
};
```

## Bundle Analysis

To analyze bundle size:

```bash
ANALYZE=true pnpm build
```

This will generate a report showing which modules contribute most to the bundle size.
