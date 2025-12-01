# Component Library Quick Start Guide

**Quick Reference**: Start here for immediate implementation tasks

---

## Immediate Actions (Today)

### 1. Create Directory Structure

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site/apps/web/modules/ui

# Create new component categories
mkdir -p components/primitives
mkdir -p components/composed
mkdir -p components/feedback
mkdir -p components/layout
mkdir -p components/motion/aceternity
mkdir -p components/motion/magic
mkdir -p components/motion/interactions
mkdir -p components/domain/terminal
mkdir -p components/domain/marketing
mkdir -p components/domain/onboarding
mkdir -p components/domain/navigation

# Create hooks directory
mkdir -p hooks

# Create lib directory for utilities
mkdir -p lib

# Create styles directory
mkdir -p styles
```

### 2. Create Shared Utilities

**File**: `apps/web/modules/ui/hooks/use-reduced-motion.ts`

```typescript
"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if user prefers reduced motion
 * Respects prefers-reduced-motion media query
 * @returns boolean indicating if reduced motion is preferred
 */
export function useReducedMotion(): boolean {
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		);
		setReducedMotion(mediaQuery.matches);

		const handleChange = () => setReducedMotion(mediaQuery.matches);
		mediaQuery.addEventListener("change", handleChange);

		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return reducedMotion;
}
```

**File**: `apps/web/modules/ui/hooks/index.ts`

```typescript
export { useReducedMotion } from "./use-reduced-motion";
export { useKonamiCode } from "./use-konami-code";
```

**File**: `apps/web/modules/ui/lib/animations.ts`

```typescript
import type { Variants } from "motion/react";

/**
 * Standard animation variants for consistent motion
 * All animations respect reduced motion preferences
 */

export const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
};

export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.8 },
	visible: { opacity: 1, scale: 1 },
};

export const slideInLeft: Variants = {
	hidden: { opacity: 0, x: -20 },
	visible: { opacity: 1, x: 0 },
};

export const slideInRight: Variants = {
	hidden: { opacity: 0, x: 20 },
	visible: { opacity: 1, x: 0 },
};

/**
 * Get motion props that respect reduced motion preference
 */
export function getMotionProps(variant: Variants, reducedMotion: boolean) {
	if (reducedMotion) {
		return {
			initial: "visible",
			animate: "visible",
		};
	}

	return {
		initial: "hidden",
		animate: "visible",
		variants: variant,
	};
}

/**
 * Spring configuration presets
 */
export const springConfig = {
	gentle: { type: "spring", stiffness: 120, damping: 14 },
	bouncy: { type: "spring", stiffness: 300, damping: 20 },
	snappy: { type: "spring", stiffness: 400, damping: 17 },
	smooth: { type: "spring", stiffness: 200, damping: 25 },
} as const;
```

**File**: `apps/web/modules/ui/lib/index.ts`

```typescript
export * from "./utils";
export * from "./animations";
export * from "./motion";
```

---

## Component Import Reference

### Current State (Before Migration)

```typescript
// AVOID: Old fragmented imports
import { Button } from "@/modules/ui/components/button";
import { BentoGrid } from "@/modules/marketing/components/ui";
import { Terminal } from "@/modules/marketing/components/ui/terminal";
```

### Target State (After Migration)

```typescript
// RECOMMENDED: Category-based imports
import { Button, Input, Label } from "@/modules/ui/components/primitives";
import { BentoGrid } from "@/modules/ui/components/layout";
import { Terminal } from "@/modules/ui/components/domain/terminal";
import { BackgroundBeams } from "@/modules/ui/components/motion/aceternity";
import { BlurFade, Marquee } from "@/modules/ui/components/motion/magic";

// ALSO VALID: Direct imports for code splitting
import { Button } from "@/modules/ui/components/primitives/button";
```

---

## Component Categories Quick Reference

### Primitives

**Location**: `modules/ui/components/primitives/`
**Purpose**: Radix UI wrappers, base building blocks
**Examples**: Button, Input, Label, Avatar, Badge, Card, Dialog, Select, Tabs

### Composed

**Location**: `modules/ui/components/composed/`
**Purpose**: Built from multiple primitives
**Examples**: Form, InputOTP, PasswordInput, CommandPalette, DataTable

### Feedback

**Location**: `modules/ui/components/feedback/`
**Purpose**: User feedback and loading states
**Examples**: Alert, Progress, Skeleton, Spinner, Toast

### Layout

**Location**: `modules/ui/components/layout/`
**Purpose**: Structural and grid components
**Examples**: BentoGrid, Container, Section, StaggerContainer

### Motion - Aceternity

**Location**: `modules/ui/components/motion/aceternity/`
**Purpose**: Aceternity UI animated components
**Examples**: BackgroundBeams, Spotlight, HeroHighlight, LampEffect, AuroraBackground

### Motion - Magic

**Location**: `modules/ui/components/motion/magic/`
**Purpose**: Magic UI animated components
**Examples**: BlurFade, Confetti, NumberTicker, Marquee, Dock, AnimatedBeam

### Motion - Interactions

**Location**: `modules/ui/components/motion/interactions/`
**Purpose**: Interactive motion effects
**Examples**: MagneticButton, HoverUnderline, TypewriterEffect

### Domain - Terminal

**Location**: `modules/ui/components/domain/terminal/`
**Purpose**: Terminal-related components
**Examples**: Terminal, TerminalToast, TerminalUltimate

### Domain - Marketing

**Location**: `modules/ui/components/domain/marketing/`
**Purpose**: Marketing-specific components
**Examples**: ApiKeyReveal, MetricCard, TestimonialCard, InfiniteMovingCards

### Domain - Onboarding

**Location**: `modules/ui/components/domain/onboarding/`
**Purpose**: Onboarding flow components
**Examples**: OnboardingWizard, EmptyCheckpoints

### Domain - Navigation

**Location**: `modules/ui/components/domain/navigation/`
**Purpose**: Navigation components
**Examples**: FloatingNav, ScrollProgress

---

## Common Tasks

### Creating a New Component

**1. Choose correct category**

-   Radix UI wrapper? → `primitives/`
-   Combines multiple components? → `composed/`
-   Shows feedback/loading? → `feedback/`
-   Layout/grid system? → `layout/`
-   Animated effect? → `motion/aceternity/` or `motion/magic/`
-   Feature-specific? → `domain/{feature}/`

**2. Use component template**

```typescript
"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import { motion } from "motion/react";
import { type ReactNode, forwardRef } from "react";

export interface ComponentNameProps {
	className?: string;
	children?: ReactNode;
	variant?: "default" | "primary";
	size?: "sm" | "md" | "lg";
}

export const ComponentName = forwardRef<HTMLDivElement, ComponentNameProps>(
	(
		{ className, children, variant = "default", size = "md", ...props },
		ref
	) => {
		const reducedMotion = useReducedMotion();

		return (
			<motion.div
				ref={ref}
				className={cn(
					"base-styles",
					variant === "primary" && "primary-styles",
					size === "lg" && "large-styles",
					className
				)}
				initial={reducedMotion ? {} : { opacity: 0 }}
				animate={{ opacity: 1 }}
				{...props}
			>
				{children}
			</motion.div>
		);
	}
);

ComponentName.displayName = "ComponentName";
```

**3. Add to barrel export**

```typescript
// In category index.ts
export { ComponentName } from "./component-name";
```

**4. Write tests**

```typescript
// component-name.test.tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { ComponentName } from "./component-name";

describe("ComponentName", () => {
	it("renders correctly", () => {
		render(<ComponentName>Test</ComponentName>);
		expect(screen.getByText("Test")).toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = render(<ComponentName>Test</ComponentName>);
		expect(await axe(container)).toHaveNoViolations();
	});
});
```

---

## Migration Priority Order

### Phase 1: Critical Path (Do First)

1. Move all primitives to `primitives/`
2. Create barrel exports for primitives
3. Update imports in most-used files (layout, navigation)

### Phase 2: High Usage (Do Second)

1. Consolidate BentoGrid (used in multiple places)
2. Move feedback components (Toast, Skeleton, Progress)
3. Organize motion/aceternity components

### Phase 3: Feature-Specific (Do Third)

1. Organize domain/marketing components
2. Organize domain/terminal components
3. Move remaining motion components

### Phase 4: Cleanup (Do Last)

1. Remove old marketing/components/ui directory
2. Update all remaining imports
3. Remove unused components

---

## Testing Checklist

### Before Committing

-   [ ] TypeScript compiles without errors
-   [ ] Biome linting passes
-   [ ] Component renders in dev environment
-   [ ] Accessibility audit passes (axe-core)
-   [ ] Visual regression test passes
-   [ ] Unit tests pass

### Accessibility Quick Check

```bash
# Run axe-core accessibility audit
pnpm test -- component-name.test.tsx

# Manual keyboard test
# 1. Tab through all interactive elements
# 2. Verify focus indicators are visible
# 3. Activate with Enter/Space
# 4. Check screen reader announcements
```

### Performance Quick Check

```bash
# Check bundle size impact
pnpm build
pnpm run analyze # If you have bundle analyzer

# Check component size
ls -lh dist/components/your-component.js
```

---

## Common Patterns

### Respecting Reduced Motion

```typescript
const reducedMotion = useReducedMotion();

// For framer-motion components
<motion.div
  animate={reducedMotion ? {} : { x: 100 }}
  transition={reducedMotion ? { duration: 0 } : { duration: 0.5 }}
/>

// For CSS animations
className={cn(
  "base-class",
  !reducedMotion && "animate-class"
)}
```

### Accessibility Labels

```typescript
<button
  aria-label="Close dialog"
  aria-describedby="dialog-description"
  aria-expanded={isOpen}
  aria-controls="dialog-content"
>
  <X className="h-4 w-4" aria-hidden="true" />
</button>

<div id="dialog-description" className="sr-only">
  Closes the dialog and returns to the previous screen
</div>
```

### Keyboard Navigation

```typescript
function handleKeyDown(event: React.KeyboardEvent) {
	switch (event.key) {
		case "Enter":
		case " ": // Space
			event.preventDefault();
			handleActivate();
			break;
		case "Escape":
			handleClose();
			break;
		case "ArrowDown":
			handleNext();
			break;
		case "ArrowUp":
			handlePrevious();
			break;
	}
}
```

### Code Splitting

```typescript
// Lazy load heavy components
import { lazy, Suspense } from "react";
import { Skeleton } from "@/modules/ui/components/feedback";

const HeavyComponent = lazy(() =>
	import("@/modules/ui/components/motion/aceternity").then((mod) => ({
		default: mod.BackgroundBeams,
	}))
);

export function Page() {
	return (
		<Suspense fallback={<Skeleton className="h-96" />}>
			<HeavyComponent />
		</Suspense>
	);
}
```

---

## Troubleshooting

### Import Not Found

```
Error: Module not found: Can't resolve '@/modules/ui/components/primitives'
```

**Solution**: Check that barrel export exists in `primitives/index.ts`

### TypeScript Errors After Move

```
Error: Type 'ComponentProps' is not assignable to type 'IntrinsicAttributes'
```

**Solution**: Update import path in component file, check forwardRef types

### Accessibility Test Failing

```
Error: Expected no accessibility violations but found 2
```

**Solution**: Run `axe-core` to see specific violations, fix ARIA issues

### Animation Not Working

```
Component renders but doesn't animate
```

**Solution**: Check `useReducedMotion` hook, verify motion library imported

---

## Quick Wins

### 1. Add Reduced Motion Hook Everywhere

Search for all motion components and add:

```typescript
const reducedMotion = useReducedMotion();
```

### 2. Standardize Import Paths

Use find/replace to update imports:

```bash
# Find files with old imports
grep -r "@/modules/marketing/components/ui" apps/web --include="*.tsx"

# Replace with new imports (use your editor's find/replace)
```

### 3. Add Accessibility Labels

Search for buttons without aria-label:

```bash
grep -r "<button" apps/web --include="*.tsx" | grep -v "aria-label"
```

---

## Resources

**Internal**:

-   [Full Strategy Document](./UNIFIED_COMPONENT_LIBRARY_STRATEGY.md)
-   [Component Documentation](../content/docs/components/)
-   [Accessibility Guide](../content/docs/accessibility/)

**External**:

-   [Aceternity UI](https://ui.aceternity.com)
-   [Magic UI](https://magicui.design)
-   [Radix UI](https://radix-ui.com)
-   [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
-   [Motion Documentation](https://motion.dev)

---

## Need Help?

**Component Categorization**: Review "Component Categories Quick Reference" above
**Import Issues**: Check "Component Import Reference" section
**Accessibility**: Review "Accessibility Quick Check" checklist
**Performance**: Run bundle analysis and check "Performance Quick Check"

**Questions**: Open discussion in team chat or create GitHub issue
