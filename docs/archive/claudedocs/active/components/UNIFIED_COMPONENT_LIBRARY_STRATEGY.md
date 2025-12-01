# Unified Component Library Strategy

**Status**: Implementation Plan
**Created**: 2025-10-03
**Framework**: Next.js 15 + React 19 + TypeScript

---

## Executive Summary

This strategy consolidates the current fragmented component architecture into a unified, scalable component library that leverages Aceternity UI and Magic UI patterns while maintaining WCAG 2.1 AA compliance and optimal performance.

**Current State Issues**:

-   Duplicate components across `modules/ui/components` and `modules/marketing/components/ui`
-   Inconsistent import patterns and naming conventions
-   Mixed component sources (Radix UI, custom, Aceternity-inspired, Magic-inspired)
-   No clear component categorization strategy

**Target State Benefits**:

-   Single source of truth for all UI components
-   Clear component hierarchy and categorization
-   Consistent accessibility and performance standards
-   Optimized bundle sizes through code splitting
-   Developer productivity through predictable patterns

---

## 1. Component Inventory & Analysis

### 1.1 Current Component Distribution

#### Base UI Components (`modules/ui/components/`)

**Radix UI Primitives** (shadcn/ui pattern):

-   `accordion.tsx` - Collapsible content sections
-   `alert-dialog.tsx` - Modal confirmations
-   `alert.tsx` - Inline notifications
-   `avatar.tsx` - User profile images
-   `badge.tsx` - Status indicators
-   `button.tsx` - Primary interaction element
-   `card.tsx` - Content containers
-   `dialog.tsx` - Modal dialogs
-   `dropdown-menu.tsx` - Contextual menus
-   `form.tsx` - Form field wrapper
-   `input.tsx` - Text input field
-   `input-otp.tsx` - One-time password input
-   `label.tsx` - Form labels
-   `password-input.tsx` - Password field with visibility toggle
-   `progress.tsx` - Progress indicators
-   `select.tsx` - Dropdown selectors
-   `sheet.tsx` - Side panels
-   `skeleton.tsx` - Loading placeholders
-   `table.tsx` - Data tables
-   `tabs.tsx` - Tab navigation
-   `textarea.tsx` - Multi-line text input
-   `toast.tsx` - Temporary notifications
-   `tooltip.tsx` - Contextual hints

**Magic UI Components** (`modules/ui/components/magic/`):

-   `animated-list.tsx` - Animated list items
-   `confetti.tsx` - Celebration effects
-   `number-ticker.tsx` - Animated numbers
-   `snapback-terminal-ultimate.tsx` - Terminal simulation

**Aceternity UI Components** (`modules/ui/components/aceternity/`):

-   `bento-grid.tsx` - Grid layout system

#### Marketing UI Components (`modules/marketing/components/ui/`)

**Custom/Enhanced Components** (48 total):

-   `3d-card.tsx` - 3D card effects
-   `accessible-tooltip.tsx` - WCAG-compliant tooltips
-   `animated-list.tsx` - **DUPLICATE** of magic/animated-list
-   `animated-number.tsx` - Number animations
-   `api-key-reveal.tsx` - API key display with copy
-   `background-beams.tsx` - Animated backgrounds
-   `bento-grid.tsx` - **DUPLICATE** enhanced version
-   `command-palette.tsx` - Command search interface
-   `damage-counter.tsx` - Game-style counter
-   `empty-checkpoints.tsx` - Empty state component
-   `enhanced-button.tsx` - Advanced button variants
-   `file-tree.tsx` - File explorer component
-   `floating-nav.tsx` - Floating navigation
-   `floating-status.tsx` - Status indicators
-   `hero-highlight.tsx` - Text highlighting effects
-   `hover-underline.tsx` - Animated underlines
-   `infinite-moving-cards.tsx` - Carousel component
-   `loading.tsx` - Loading states
-   `logo-carousel.tsx` - Logo display carousel
-   `magnetic-button.tsx` - Magnetic hover effects
-   `magnetic-hover.tsx` - Magnetic interactions
-   `metric-card.tsx` - Metric display cards
-   `mobile-optimized.tsx` - Mobile-specific optimizations
-   `neon-card.tsx` - Neon glow effects
-   `onboarding-wizard.tsx` - Multi-step onboarding
-   `optimized-motion.tsx` - Motion utilities
-   `parallax-scroll.tsx` - Parallax effects
-   `progress-bar.tsx` - Progress indicators
-   `protection-status.tsx` - Status displays
-   `scroll-progress.tsx` - Scroll indicators
-   `settings-section.tsx` - Settings UI
-   `shimmer-button.tsx` - Shimmer effects
-   `skeleton.tsx` - **DUPLICATE** loading placeholders
-   `snap-motion.tsx` - Motion library
-   `split-comparison.tsx` - Before/after comparison
-   `spotlight.tsx` - Spotlight effects
-   `stagger-container.tsx` - Staggered animations
-   `sticky-scroll-reveal.tsx` - Sticky scroll effects
-   `tabs.tsx` - **DUPLICATE** tab navigation
-   `terminal.tsx` - Terminal emulation
-   `terminal-toast.tsx` - Terminal-styled toasts
-   `testimonial-card.tsx` - Testimonial display
-   `text-generate-effect.tsx` - Text generation effects
-   `tracing-beam.tsx` - Animated tracing lines
-   `typewriter-effect.tsx` - Typewriter animations

**Aceternity Subfolder** (`marketing/components/ui/aceternity/`):

-   `scroll-based-velocity.tsx` - Velocity-based scrolling
-   `spotlight.tsx` - **DUPLICATE** spotlight effects

**Magic Subfolder** (`marketing/components/ui/magic/`):

-   `blur-fade.tsx` - Blur fade transitions
-   `blur-in.tsx` - Blur in animations
-   `rainbow-button.tsx` - Rainbow gradient buttons

### 1.2 Duplicate Components Identified

| Component           | Location 1                  | Location 2                 | Recommendation                  |
| ------------------- | --------------------------- | -------------------------- | ------------------------------- |
| `bento-grid.tsx`    | `ui/components/aceternity/` | `marketing/components/ui/` | Consolidate to unified library  |
| `animated-list.tsx` | `ui/components/magic/`      | `marketing/components/ui/` | Keep Magic version, enhance     |
| `skeleton.tsx`      | `ui/components/`            | `marketing/components/ui/` | Keep base UI version            |
| `tabs.tsx`          | `ui/components/`            | `marketing/components/ui/` | Keep base UI, enhance if needed |
| `spotlight.tsx`     | `marketing/ui/aceternity/`  | `marketing/ui/`            | Consolidate to Aceternity       |

### 1.3 Component Categorization

**Category 1: Primitives** (Radix UI based)

-   Direct wrappers around Radix UI components
-   Minimal styling, maximum composability
-   Examples: Button, Input, Label, Avatar

**Category 2: Composed Components** (Built from primitives)

-   Combine multiple primitives
-   Business logic integration
-   Examples: Form, Card, Sheet, Dialog

**Category 3: Motion Components** (Animation-focused)

-   Leverage framer-motion/motion
-   Performance-optimized animations
-   Examples: Magnetic effects, parallax, typewriter

**Category 4: Layout Components** (Structural)

-   Grid systems, containers, sections
-   Responsive design patterns
-   Examples: BentoGrid, StaggerContainer

**Category 5: Feedback Components** (User feedback)

-   Loading states, progress, notifications
-   Examples: Toast, Progress, Skeleton, Spinner

**Category 6: Domain-Specific** (Feature-specific)

-   Terminal, API key reveal, onboarding
-   Examples: Terminal, OnboardingWizard, FileTree

---

## 2. Aceternity UI Integration Analysis

### 2.1 Aceternity UI Overview

**Source**: [ui.aceternity.com](https://ui.aceternity.com)
**Philosophy**: Beautiful, modern UI components with smooth animations and micro-interactions
**Technology**: React + Tailwind CSS + Framer Motion

**Key Characteristics**:

-   Heavy use of animations and transitions
-   Modern design aesthetic (dark themes, gradients, glows)
-   Performance-optimized with reduced motion support
-   Copy-paste component model (not npm package)

### 2.2 Aceternity Components Currently Used

Based on code analysis, these Aceternity-inspired components exist:

1. **BentoGrid** - Grid layout with hover effects
2. **Spotlight** - Spotlight visual effects
3. **Scroll-based Velocity** - Velocity-driven scroll animations
4. **Background Beams** - Animated background effects
5. **Hero Highlight** - Text highlighting with gradients
6. **3D Card** - Card with 3D transform effects
7. **Sticky Scroll Reveal** - Sticky positioning with reveals
8. **Tracing Beam** - Animated path tracing

### 2.3 Recommended Aceternity Components to Add

**High Priority**:

1. **Lamp Effect** - Dramatic lighting effects for hero sections
2. **Aurora Background** - Animated gradient backgrounds
3. **Shooting Stars** - Animated star field backgrounds
4. **Grid Background** - Subtle grid patterns
5. **Dots Background** - Dot matrix backgrounds
6. **Sparkles** - Sparkle effects for CTAs
7. **Meteors** - Meteor shower effects
8. **Card Hover Effect** - Advanced card interactions
9. **Text Reveal Card** - Card with text reveal animations
10. **Glowing Stars** - Glowing particle effects

**Medium Priority**: 11. **Wavy Background** - Wavy line animations 12. **Moving Border** - Animated border effects 13. **Animated Tooltip** - Enhanced tooltip with animations 14. **Focus Cards** - Cards with focus states 15. **Compare** - Before/after comparison slider

**Accessibility Considerations**:

-   All Aceternity components MUST respect `prefers-reduced-motion`
-   Ensure keyboard navigation works for interactive components
-   Add ARIA labels and roles where needed
-   Maintain color contrast ratios (WCAG AA: 4.5:1 text, 3:1 UI)

### 2.4 Aceternity Integration Pattern

```typescript
// Standard Aceternity component structure
"use client";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { motion } from "motion/react";
import { type ReactNode } from "react";

interface AceternityComponentProps {
	className?: string;
	children?: ReactNode;
	// Component-specific props
}

export function AceternityComponent({
	className,
	children,
	...props
}: AceternityComponentProps) {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			className={cn("base-styles", className)}
			animate={
				reducedMotion
					? {}
					: {
							/* animations */
					  }
			}
			{...props}
		>
			{children}
		</motion.div>
	);
}
```

---

## 3. Magic UI Integration Analysis

### 3.1 Magic UI Overview

**Source**: [magicui.design](https://magicui.design)
**Philosophy**: Animated components and effects for modern web applications
**Technology**: React + Tailwind CSS + Framer Motion

**Key Characteristics**:

-   Focus on micro-interactions and delightful animations
-   Copy-paste component library
-   Accessibility-first approach
-   Production-ready components

### 3.2 Magic UI Components Currently Used

1. **Animated List** - List with staggered animations
2. **Number Ticker** - Animated counting numbers
3. **Confetti** - Celebration confetti effects
4. **Blur Fade** - Blur fade-in transitions
5. **Blur In** - Blur entrance animations
6. **Rainbow Button** - Multi-gradient animated buttons
7. **Snapback Terminal Ultimate** - Custom terminal component

### 3.3 Recommended Magic UI Components to Add

**High Priority**:

1. **Marquee** - Infinite scrolling marquee
2. **Shimmer Button** - Already have, standardize
3. **Animated Beam** - Connection line animations
4. **Dock** - macOS-style dock navigation
5. **Orbiting Circles** - Circular orbit animations
6. **Text Animate** - Text entrance animations
7. **Word Rotate** - Rotating word animations
8. **Border Beam** - Animated border effects
9. **Shiny Button** - Reflective button effects
10. **Globe** - Interactive 3D globe

**Medium Priority**: 11. **Bento Grid** - Enhanced grid layouts (standardize existing) 12. **Animated Gradient Text** - Gradient text animations 13. **Cool Mode** - Click effect animations 14. **Particles** - Particle system effects 15. **Ripple** - Ripple effect animations

**Accessibility Considerations**:

-   Respect `prefers-reduced-motion` for all animations
-   Ensure interactive components are keyboard accessible
-   Provide alternative non-animated fallbacks
-   Test with screen readers

### 3.4 Magic UI Integration Pattern

```typescript
// Standard Magic UI component structure
"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

interface MagicComponentProps {
	className?: string;
	children?: ReactNode;
	// Component-specific props
}

export function MagicComponent({
	className,
	children,
	...props
}: MagicComponentProps) {
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;

		setIsAnimating(!prefersReducedMotion);
	}, []);

	return (
		<AnimatePresence>
			<motion.div
				className={cn("base-styles", className)}
				initial={isAnimating ? { opacity: 0 } : { opacity: 1 }}
				animate={{ opacity: 1 }}
				{...props}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}
```

---

## 4. Unified Library Design

### 4.1 Proposed Directory Structure

```
apps/web/modules/ui/
├── components/
│   ├── primitives/           # Radix UI base components
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── tooltip.tsx
│   │   └── index.ts
│   │
│   ├── composed/             # Built from primitives
│   │   ├── form.tsx
│   │   ├── input-otp.tsx
│   │   ├── password-input.tsx
│   │   ├── command-palette.tsx
│   │   ├── data-table.tsx
│   │   └── index.ts
│   │
│   ├── feedback/             # User feedback components
│   │   ├── alert.tsx
│   │   ├── progress.tsx
│   │   ├── skeleton.tsx
│   │   ├── spinner.tsx
│   │   ├── toast.tsx
│   │   ├── loading-states.tsx
│   │   └── index.ts
│   │
│   ├── layout/               # Structural components
│   │   ├── bento-grid.tsx
│   │   ├── container.tsx
│   │   ├── section.tsx
│   │   ├── stagger-container.tsx
│   │   └── index.ts
│   │
│   ├── motion/               # Animation components
│   │   ├── aceternity/
│   │   │   ├── background-beams.tsx
│   │   │   ├── hero-highlight.tsx
│   │   │   ├── parallax-scroll.tsx
│   │   │   ├── spotlight.tsx
│   │   │   ├── sticky-scroll-reveal.tsx
│   │   │   ├── tracing-beam.tsx
│   │   │   ├── card-3d.tsx
│   │   │   ├── scroll-velocity.tsx
│   │   │   ├── lamp-effect.tsx          # NEW
│   │   │   ├── aurora-background.tsx    # NEW
│   │   │   ├── shooting-stars.tsx       # NEW
│   │   │   ├── meteors.tsx              # NEW
│   │   │   ├── sparkles.tsx             # NEW
│   │   │   └── index.ts
│   │   │
│   │   ├── magic/
│   │   │   ├── animated-list.tsx
│   │   │   ├── blur-fade.tsx
│   │   │   ├── blur-in.tsx
│   │   │   ├── confetti.tsx
│   │   │   ├── number-ticker.tsx
│   │   │   ├── rainbow-button.tsx
│   │   │   ├── marquee.tsx              # NEW
│   │   │   ├── animated-beam.tsx        # NEW
│   │   │   ├── dock.tsx                 # NEW
│   │   │   ├── orbiting-circles.tsx     # NEW
│   │   │   ├── text-animate.tsx         # NEW
│   │   │   ├── word-rotate.tsx          # NEW
│   │   │   ├── border-beam.tsx          # NEW
│   │   │   ├── shiny-button.tsx         # NEW
│   │   │   └── index.ts
│   │   │
│   │   ├── interactions/
│   │   │   ├── magnetic-button.tsx
│   │   │   ├── magnetic-hover.tsx
│   │   │   ├── hover-underline.tsx
│   │   │   ├── typewriter-effect.tsx
│   │   │   ├── text-generate-effect.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── domain/               # Feature-specific components
│   │   ├── terminal/
│   │   │   ├── terminal.tsx
│   │   │   ├── terminal-toast.tsx
│   │   │   ├── terminal-ultimate.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── marketing/
│   │   │   ├── api-key-reveal.tsx
│   │   │   ├── metric-card.tsx
│   │   │   ├── testimonial-card.tsx
│   │   │   ├── infinite-moving-cards.tsx
│   │   │   ├── logo-carousel.tsx
│   │   │   ├── split-comparison.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── onboarding/
│   │   │   ├── onboarding-wizard.tsx
│   │   │   ├── empty-states.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── navigation/
│   │   │   ├── floating-nav.tsx
│   │   │   ├── scroll-progress.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   └── index.ts              # Main barrel export
│
├── hooks/
│   ├── use-konami-code.ts
│   ├── use-reduced-motion.ts
│   ├── use-intersection-observer.ts
│   └── index.ts
│
├── lib/
│   ├── utils.ts              # cn() and utilities
│   ├── motion.ts             # Motion utilities
│   ├── animations.ts         # Animation variants
│   └── index.ts
│
└── styles/
    ├── animations.css        # @keyframes and CSS animations
    └── components.css        # Component-specific styles
```

### 4.2 Import Path Strategy

**Barrel Exports Strategy**:

```typescript
// Primary barrel: apps/web/modules/ui/components/index.ts
export * from "./primitives";
export * from "./composed";
export * from "./feedback";
export * from "./layout";
export * from "./motion";
export * from "./domain";

// Category barrel: apps/web/modules/ui/components/primitives/index.ts
export { Button, buttonVariants } from "./button";
export { Input } from "./input";
export { Label } from "./label";
// ... all primitives

// Sub-category barrel: apps/web/modules/ui/components/motion/aceternity/index.ts
export { BackgroundBeams } from "./background-beams";
export { Spotlight } from "./spotlight";
// ... all aceternity components
```

**Import Patterns**:

```typescript
// Recommended: Named imports from category
import { Button, Input, Label } from "@/modules/ui/components/primitives";
import {
	BackgroundBeams,
	Spotlight,
} from "@/modules/ui/components/motion/aceternity";
import { BlurFade, NumberTicker } from "@/modules/ui/components/motion/magic";

// Also supported: Direct imports for code splitting
import { Button } from "@/modules/ui/components/primitives/button";
import { BackgroundBeams } from "@/modules/ui/components/motion/aceternity/background-beams";

// Utility imports
import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
```

### 4.3 Naming Conventions

**Component Files**: `kebab-case.tsx`

-   `background-beams.tsx`
-   `animated-list.tsx`
-   `onboarding-wizard.tsx`

**Component Names**: `PascalCase`

-   `BackgroundBeams`
-   `AnimatedList`
-   `OnboardingWizard`

**Props Interfaces**: `{ComponentName}Props`

-   `BackgroundBeamsProps`
-   `AnimatedListProps`
-   `OnboardingWizardProps`

**Hooks**: `use-{name}.ts` / `use{Name}`

-   `use-reduced-motion.ts` → `useReducedMotion`
-   `use-konami-code.ts` → `useKonamiCode`

**Utilities**: `camelCase`

-   `cn()` - className utility
-   `useReducedMotion()` - hook
-   `motionVariants` - configuration

### 4.4 Component Template

````typescript
/**
 * ComponentName
 *
 * Description of what the component does and when to use it.
 *
 * @example
 * ```tsx
 * <ComponentName variant="primary" size="lg">
 *   Content here
 * </ComponentName>
 * ```
 *
 * @accessibility
 * - Keyboard navigation: Tab/Enter/Space
 * - Screen reader: Properly labeled with ARIA
 * - Motion: Respects prefers-reduced-motion
 *
 * @performance
 * - Lazy loaded: Yes/No
 * - Code split: Yes/No
 * - Bundle impact: ~XkB gzipped
 */

"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import { motion } from "motion/react";
import { type ReactNode, forwardRef } from "react";

export interface ComponentNameProps {
	/**
	 * Additional CSS classes to apply
	 */
	className?: string;

	/**
	 * Component children
	 */
	children?: ReactNode;

	/**
	 * Variant style
	 * @default "default"
	 */
	variant?: "default" | "primary" | "secondary";

	/**
	 * Component size
	 * @default "md"
	 */
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
					// Base styles
					"relative rounded-lg",
					// Variant styles
					variant === "primary" &&
						"bg-primary text-primary-foreground",
					variant === "secondary" &&
						"bg-secondary text-secondary-foreground",
					// Size styles
					size === "sm" && "p-2 text-sm",
					size === "md" && "p-4 text-base",
					size === "lg" && "p-6 text-lg",
					className
				)}
				initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
				{...props}
			>
				{children}
			</motion.div>
		);
	}
);

ComponentName.displayName = "ComponentName";
````

---

## 5. Implementation Plan

### Phase 1: Foundation Setup (Week 1)

**Step 1.1: Create New Directory Structure**

```bash
# Create new component categories
mkdir -p apps/web/modules/ui/components/primitives
mkdir -p apps/web/modules/ui/components/composed
mkdir -p apps/web/modules/ui/components/feedback
mkdir -p apps/web/modules/ui/components/layout
mkdir -p apps/web/modules/ui/components/motion/aceternity
mkdir -p apps/web/modules/ui/components/motion/magic
mkdir -p apps/web/modules/ui/components/motion/interactions
mkdir -p apps/web/modules/ui/components/domain/terminal
mkdir -p apps/web/modules/ui/components/domain/marketing
mkdir -p apps/web/modules/ui/components/domain/onboarding
mkdir -p apps/web/modules/ui/components/domain/navigation
```

**Step 1.2: Move Existing Primitives**

-   Move all Radix UI components to `primitives/`
-   Create barrel export `primitives/index.ts`
-   Update internal imports to use new paths
-   Test all primitive components in isolation

**Step 1.3: Set Up Shared Utilities**

```typescript
// apps/web/modules/ui/hooks/use-reduced-motion.ts
export function useReducedMotion() {
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

**Step 1.4: Create Animation Utilities**

```typescript
// apps/web/modules/ui/lib/animations.ts
import type { Variants } from "motion/react";

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

// Respects reduced motion
export function getMotionProps(variant: Variants, reducedMotion: boolean) {
	return reducedMotion
		? { initial: "visible", animate: "visible" }
		: { initial: "hidden", animate: "visible", variants: variant };
}
```

### Phase 2: Consolidate Duplicates (Week 1-2)

**Step 2.1: Resolve BentoGrid**

```typescript
// Decision: Merge both versions into enhanced component
// Location: apps/web/modules/ui/components/layout/bento-grid.tsx

"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface BentoGridProps {
	className?: string;
	children?: ReactNode;
}

export const BentoGrid = ({ className, children }: BentoGridProps) => {
	return (
		<div
			className={cn(
				"grid grid-cols-1 md:grid-cols-3 md:auto-rows-[18rem] gap-4 max-w-7xl mx-auto",
				className
			)}
		>
			{children}
		</div>
	);
};

export interface BentoGridItemProps {
	className?: string;
	title?: string | ReactNode;
	description?: string | ReactNode;
	icon?: ReactNode;
	header?: ReactNode;
}

export const BentoGridItem = ({
	className,
	title,
	description,
	icon,
	header,
}: BentoGridItemProps) => {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			whileHover={reducedMotion ? {} : { y: -8, scale: 1.02 }}
			whileTap={reducedMotion ? {} : { scale: 0.98 }}
			transition={
				reducedMotion
					? { duration: 0 }
					: { type: "spring", stiffness: 300, damping: 20 }
			}
			className={cn(
				"group/bento relative rounded-xl border border-border bg-card p-6",
				"shadow-lg transition-all duration-300",
				"hover:border-snapback-green/50 hover:shadow-xl",
				className
			)}
		>
			{header && (
				<motion.div
					className="mb-4"
					whileHover={reducedMotion ? {} : { y: -5 }}
					transition={
						reducedMotion
							? { duration: 0 }
							: { type: "spring", stiffness: 400, damping: 17 }
					}
				>
					{header}
				</motion.div>
			)}

			<div className="group-hover/bento:translate-x-2 transition duration-200">
				{icon && (
					<motion.div
						whileHover={
							reducedMotion ? {} : { scale: 1.2, rotate: 10 }
						}
						transition={
							reducedMotion
								? { duration: 0 }
								: { type: "spring", stiffness: 300 }
						}
						className="mb-4"
					>
						{icon}
					</motion.div>
				)}

				{title && (
					<div className="mb-2 font-bold text-lg text-foreground">
						{title}
					</div>
				)}

				{description && (
					<div className="text-sm text-muted-foreground">
						{description}
					</div>
				)}
			</div>
		</motion.div>
	);
};
```

**Step 2.2: Resolve Other Duplicates**

-   **animated-list.tsx**: Keep Magic version, move to `motion/magic/`
-   **skeleton.tsx**: Keep primitive version, remove marketing duplicate
-   **tabs.tsx**: Keep primitive version, remove marketing duplicate
-   **spotlight.tsx**: Keep Aceternity version, move to `motion/aceternity/`

**Step 2.3: Update All Imports**

```bash
# Find all files importing duplicates
find apps/web -name "*.tsx" -o -name "*.ts" | xargs grep -l "from.*marketing/components/ui.*bento-grid"

# Update imports using morphllm or manual edits
# Old: import { BentoGrid } from "@/modules/marketing/components/ui"
# New: import { BentoGrid } from "@/modules/ui/components/layout"
```

### Phase 3: Categorize Existing Components (Week 2)

**Step 3.1: Move Feedback Components**

```bash
mv apps/web/modules/ui/components/alert.tsx apps/web/modules/ui/components/feedback/
mv apps/web/modules/ui/components/progress.tsx apps/web/modules/ui/components/feedback/
mv apps/web/modules/ui/components/skeleton.tsx apps/web/modules/ui/components/feedback/
mv apps/web/modules/ui/components/toast.tsx apps/web/modules/ui/components/feedback/
```

**Step 3.2: Move Composed Components**

```bash
mv apps/web/modules/ui/components/form.tsx apps/web/modules/ui/components/composed/
mv apps/web/modules/ui/components/input-otp.tsx apps/web/modules/ui/components/composed/
mv apps/web/modules/ui/components/password-input.tsx apps/web/modules/ui/components/composed/
```

**Step 3.3: Organize Motion Components**

```bash
# Aceternity components
mv apps/web/modules/marketing/components/ui/background-beams.tsx \
   apps/web/modules/ui/components/motion/aceternity/
mv apps/web/modules/marketing/components/ui/hero-highlight.tsx \
   apps/web/modules/ui/components/motion/aceternity/
# ... continue for all Aceternity components

# Magic components
mv apps/web/modules/marketing/components/ui/magic/blur-fade.tsx \
   apps/web/modules/ui/components/motion/magic/
# ... continue for all Magic components

# Interaction components
mv apps/web/modules/marketing/components/ui/magnetic-button.tsx \
   apps/web/modules/ui/components/motion/interactions/
# ... continue for all interaction components
```

**Step 3.4: Organize Domain Components**

```bash
# Terminal domain
mv apps/web/modules/marketing/components/ui/terminal.tsx \
   apps/web/modules/ui/components/domain/terminal/
mv apps/web/modules/marketing/components/ui/terminal-toast.tsx \
   apps/web/modules/ui/components/domain/terminal/
mv apps/web/modules/ui/components/magic/snapback-terminal-ultimate.tsx \
   apps/web/modules/ui/components/domain/terminal/

# Marketing domain
mv apps/web/modules/marketing/components/ui/api-key-reveal.tsx \
   apps/web/modules/ui/components/domain/marketing/
mv apps/web/modules/marketing/components/ui/metric-card.tsx \
   apps/web/modules/ui/components/domain/marketing/
# ... continue for all marketing components

# Onboarding domain
mv apps/web/modules/marketing/components/ui/onboarding-wizard.tsx \
   apps/web/modules/ui/components/domain/onboarding/
mv apps/web/modules/marketing/components/ui/empty-checkpoints.tsx \
   apps/web/modules/ui/components/domain/onboarding/

# Navigation domain
mv apps/web/modules/marketing/components/ui/floating-nav.tsx \
   apps/web/modules/ui/components/domain/navigation/
mv apps/web/modules/marketing/components/ui/scroll-progress.tsx \
   apps/web/modules/ui/components/domain/navigation/
```

### Phase 4: Add New Aceternity Components (Week 3)

**Step 4.1: Add High Priority Aceternity Components**

**Lamp Effect** (`motion/aceternity/lamp-effect.tsx`):

```typescript
"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface LampEffectProps {
	className?: string;
	children?: ReactNode;
}

export const LampEffect = ({ className, children }: LampEffectProps) => {
	const reducedMotion = useReducedMotion();

	return (
		<div
			className={cn(
				"relative min-h-screen w-full overflow-hidden bg-black",
				className
			)}
		>
			{/* Lamp glow effect */}
			<motion.div
				initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={reducedMotion ? { duration: 0 } : { duration: 1 }}
				className="absolute inset-0"
			>
				<div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500/20 to-transparent blur-3xl" />
			</motion.div>

			{/* Content */}
			<div className="relative z-10">{children}</div>
		</div>
	);
};
```

**Aurora Background** (`motion/aceternity/aurora-background.tsx`):

```typescript
"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface AuroraBackgroundProps {
	className?: string;
	children?: ReactNode;
	showRadialGradient?: boolean;
}

export const AuroraBackground = ({
	className,
	children,
	showRadialGradient = true,
}: AuroraBackgroundProps) => {
	const reducedMotion = useReducedMotion();

	return (
		<div className={cn("relative overflow-hidden", className)}>
			<div className="absolute inset-0">
				{/* Aurora gradient layers */}
				<motion.div
					className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20"
					animate={
						reducedMotion
							? {}
							: {
									backgroundPosition: ["0% 0%", "100% 100%"],
							  }
					}
					transition={
						reducedMotion
							? { duration: 0 }
							: {
									duration: 20,
									repeat: Number.POSITIVE_INFINITY,
									repeatType: "reverse",
							  }
					}
				/>

				{showRadialGradient && (
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.8),rgba(0,0,0,1))]" />
				)}
			</div>

			<div className="relative z-10">{children}</div>
		</div>
	);
};
```

**Continue for remaining high-priority components...**

### Phase 5: Add New Magic UI Components (Week 3-4)

**Step 5.1: Add High Priority Magic Components**

**Marquee** (`motion/magic/marquee.tsx`):

```typescript
"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import type { ReactNode } from "react";

export interface MarqueeProps {
	className?: string;
	children?: ReactNode;
	direction?: "left" | "right";
	speed?: "slow" | "normal" | "fast";
	pauseOnHover?: boolean;
}

export const Marquee = ({
	className,
	children,
	direction = "left",
	speed = "normal",
	pauseOnHover = true,
}: MarqueeProps) => {
	const reducedMotion = useReducedMotion();

	const speedMap = {
		slow: "60s",
		normal: "40s",
		fast: "20s",
	};

	return (
		<div className={cn("group relative flex overflow-hidden", className)}>
			<div
				className={cn(
					"flex w-max gap-4",
					!reducedMotion && "animate-marquee",
					pauseOnHover && "group-hover:[animation-play-state:paused]"
				)}
				style={{
					animationDirection:
						direction === "right" ? "reverse" : "normal",
					animationDuration: reducedMotion ? "0s" : speedMap[speed],
				}}
			>
				{children}
				{/* Duplicate for seamless loop */}
				{!reducedMotion && children}
			</div>
		</div>
	);
};
```

**Dock** (`motion/magic/dock.tsx`):

```typescript
"use client";

import { cn } from "@/modules/ui/lib/utils";
import { useReducedMotion } from "@/modules/ui/hooks";
import { motion } from "motion/react";
import { type ReactNode, useState } from "react";

export interface DockProps {
	className?: string;
	children?: ReactNode;
}

export const Dock = ({ className, children }: DockProps) => {
	return (
		<div
			className={cn(
				"flex h-16 items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 backdrop-blur-md px-4",
				className
			)}
		>
			{children}
		</div>
	);
};

export interface DockItemProps {
	className?: string;
	children?: ReactNode;
	onClick?: () => void;
}

export const DockItem = ({ className, children, onClick }: DockItemProps) => {
	const reducedMotion = useReducedMotion();
	const [isHovered, setIsHovered] = useState(false);

	return (
		<motion.button
			className={cn(
				"relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-accent",
				className
			)}
			whileHover={reducedMotion ? {} : { y: -8, scale: 1.2 }}
			whileTap={reducedMotion ? {} : { scale: 0.95 }}
			transition={
				reducedMotion
					? { duration: 0 }
					: {
							type: "spring",
							stiffness: 400,
							damping: 17,
					  }
			}
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{children}
		</motion.button>
	);
};
```

### Phase 6: Update All Imports (Week 4)

**Step 6.1: Create Import Map**

```typescript
// tools/migration/import-map.ts
export const importMap = {
	// Old marketing UI imports → New unified imports
	"@/modules/marketing/components/ui/bento-grid":
		"@/modules/ui/components/layout",
	"@/modules/marketing/components/ui/infinite-moving-cards":
		"@/modules/ui/components/domain/marketing",
	"@/modules/marketing/components/ui/terminal":
		"@/modules/ui/components/domain/terminal",
	"@/modules/marketing/components/ui/background-beams":
		"@/modules/ui/components/motion/aceternity",
	// ... complete map
};
```

**Step 6.2: Automated Import Updates**

```bash
# Use morphllm MCP or custom script to update imports
# Find all .tsx and .ts files
find apps/web -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  > files-to-update.txt

# Run import update script
pnpm tsx tools/migration/update-imports.ts
```

**Step 6.3: Manual Verification**

-   Review each updated file for correctness
-   Run TypeScript compiler to catch any errors
-   Test components in Storybook/dev environment

### Phase 7: Testing & Validation (Week 4-5)

**Step 7.1: Component Unit Tests**

```typescript
// apps/web/modules/ui/components/__tests__/primitives/button.test.tsx
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Button } from "../primitives/button";

expect.extend(toHaveNoViolations);

describe("Button", () => {
	it("renders correctly", () => {
		render(<Button>Click me</Button>);
		expect(
			screen.getByRole("button", { name: /click me/i })
		).toBeInTheDocument();
	});

	it("should have no accessibility violations", async () => {
		const { container } = render(<Button>Accessible button</Button>);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it("respects disabled state", () => {
		render(<Button disabled>Disabled</Button>);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("shows loading state", () => {
		render(<Button loading>Loading</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("disabled");
		expect(screen.getByRole("button")).toContainHTML("spinner");
	});
});
```

**Step 7.2: Accessibility Testing**

```typescript
// Test checklist for each component:
// ✓ Keyboard navigation (Tab, Enter, Space, Arrows)
// ✓ Screen reader announcements (ARIA labels, roles, states)
// ✓ Focus management (visible focus indicators)
// ✓ Color contrast (WCAG AA: 4.5:1 text, 3:1 UI)
// ✓ Reduced motion support
// ✓ Touch target size (minimum 44x44px)

// Use Playwright for E2E accessibility tests
import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

test.describe("Component Accessibility", () => {
	test("should have no accessibility violations", async ({ page }) => {
		await page.goto("/components/button");
		await injectAxe(page);
		await checkA11y(page);
	});

	test("supports keyboard navigation", async ({ page }) => {
		await page.goto("/components/button");
		await page.keyboard.press("Tab");
		await expect(page.locator("button")).toBeFocused();
		await page.keyboard.press("Enter");
		// Verify button action
	});
});
```

**Step 7.3: Performance Testing**

```typescript
// Measure bundle impact
import { analyzeBundle } from "tools/bundle-analyzer";

const results = await analyzeBundle({
	entry: "apps/web/modules/ui/components/index.ts",
});

console.log("Bundle size:", results.gzipSize);
console.log("Tree-shakeable:", results.treeSheakable);
console.log("Dependencies:", results.dependencies);

// Performance budget
expect(results.gzipSize).toBeLessThan(50 * 1024); // 50kB limit
```

**Step 7.4: Visual Regression Testing**

```typescript
// Use Playwright for visual regression
import { test, expect } from "@playwright/test";

test("Button visual regression", async ({ page }) => {
	await page.goto("/components/button");

	// Capture screenshots of all variants
	const variants = ["primary", "secondary", "outline", "ghost"];

	for (const variant of variants) {
		await page
			.locator(`[data-variant="${variant}"]`)
			.scrollIntoViewIfNeeded();
		await expect(
			page.locator(`[data-variant="${variant}"]`)
		).toHaveScreenshot(`button-${variant}.png`);
	}
});
```

### Phase 8: Documentation (Week 5)

**Step 8.1: Component Documentation**
Create MDX documentation for each component category:

````mdx
## <!-- apps/web/content/docs/components/primitives/button.mdx -->

title: Button
description: Interactive button component with multiple variants and states
category: primitives

---

# Button

The Button component is a foundational interactive element supporting various visual styles and states.

## Installation

```bash
pnpm add @radix-ui/react-slot class-variance-authority
```
````

## Usage

```tsx
import { Button } from "@/modules/ui/components/primitives";

export function Example() {
	return (
		<Button variant="primary" size="lg">
			Click me
		</Button>
	);
}
```

## Variants

<ComponentPreview>
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="ghost">Ghost</Button>
</ComponentPreview>

## Props

| Prop     | Type                                               | Default       | Description          |
| -------- | -------------------------------------------------- | ------------- | -------------------- |
| variant  | `"primary" \| "secondary" \| "outline" \| "ghost"` | `"secondary"` | Visual style variant |
| size     | `"sm" \| "md" \| "lg"`                             | `"md"`        | Button size          |
| loading  | `boolean`                                          | `false`       | Show loading spinner |
| disabled | `boolean`                                          | `false`       | Disable interactions |

## Accessibility

-   **Keyboard**: Focusable via Tab, activates with Enter/Space
-   **Screen Reader**: Announced as button with proper label
-   **ARIA**: Uses native `<button>` semantics
-   **Focus**: Visible focus ring meets WCAG standards

## Performance

-   **Bundle Size**: ~2kB gzipped
-   **Dependencies**: Radix Slot, CVA
-   **Tree-shakeable**: Yes

````

**Step 8.2: Migration Guide**
```markdown
<!-- apps/web/content/docs/migration/component-library.mdx -->
# Component Library Migration Guide

## Old Import Paths → New Import Paths

| Old Path | New Path | Notes |
|----------|----------|-------|
| `@/modules/marketing/components/ui` | `@/modules/ui/components/*` | Use specific category |
| `@/modules/marketing/components/ui/bento-grid` | `@/modules/ui/components/layout` | Moved to layout |
| `@/modules/marketing/components/ui/terminal` | `@/modules/ui/components/domain/terminal` | Domain-specific |

## Breaking Changes

### BentoGrid
- Merged two implementations into one
- Props interface unchanged
- Improved animation performance

### AnimatedList
- Now only in Magic UI folder
- Marketing version removed
- API remains the same

## Migration Steps

1. Update imports to new paths
2. Test all components still render
3. Verify accessibility not regressed
4. Check bundle size impact
````

---

## 6. Accessibility & Performance Guidelines

### 6.1 WCAG 2.1 AA Compliance Checklist

**Perceivable**:

-   [ ] Text has 4.5:1 contrast ratio (normal), 3:1 (large text)
-   [ ] UI components have 3:1 contrast ratio against background
-   [ ] Color is not the only visual means of conveying information
-   [ ] Text can be resized up to 200% without loss of content
-   [ ] Images have alt text (decorative images use alt="")
-   [ ] Videos have captions and audio descriptions

**Operable**:

-   [ ] All functionality available via keyboard
-   [ ] No keyboard traps
-   [ ] Focus order is logical and predictable
-   [ ] Focus indicators are visible (2px outline minimum)
-   [ ] Touch targets are at least 44x44px
-   [ ] Users can pause, stop, or hide moving content
-   [ ] Respects `prefers-reduced-motion` for animations
-   [ ] Sufficient time for interactions (or ability to extend)

**Understandable**:

-   [ ] Form inputs have associated labels
-   [ ] Error messages are clear and specific
-   [ ] Help text provided where needed
-   [ ] Navigation is consistent across pages
-   [ ] Interactive elements look interactive
-   [ ] Instructions don't rely solely on sensory characteristics

**Robust**:

-   [ ] Valid HTML (passes W3C validator)
-   [ ] Proper ARIA roles, states, and properties
-   [ ] Name, role, value available to assistive tech
-   [ ] Status messages announced to screen readers
-   [ ] Works with browser zoom up to 200%
-   [ ] Compatible with assistive technologies

### 6.2 Component Accessibility Template

```typescript
/**
 * Accessibility Implementation Checklist for [ComponentName]
 *
 * WCAG 2.1 AA Compliance:
 * ✓ 1.4.3 Contrast: Minimum 4.5:1 text, 3:1 UI components
 * ✓ 1.4.11 Non-text Contrast: UI components meet 3:1
 * ✓ 2.1.1 Keyboard: All functionality via keyboard
 * ✓ 2.1.2 No Keyboard Trap: Can navigate away
 * ✓ 2.4.7 Focus Visible: Clear focus indicators
 * ✓ 2.5.5 Target Size: Minimum 44x44px touch targets
 * ✓ 2.5.8 Target Spacing: 8px minimum between targets
 * ✓ 4.1.2 Name, Role, Value: Proper ARIA implementation
 * ✓ 2.3.3 Reduced Motion: Respects prefers-reduced-motion
 *
 * Keyboard Support:
 * - Tab: Move focus to/from component
 * - Enter/Space: Activate component
 * - Escape: Close/dismiss (if applicable)
 * - Arrow keys: Navigate within component (if applicable)
 *
 * Screen Reader Support:
 * - Component announced with proper role
 * - Current state communicated (expanded, selected, etc.)
 * - Changes announced dynamically via live regions
 * - Instructions provided where needed
 *
 * Testing:
 * - [ ] Tested with keyboard only (no mouse)
 * - [ ] Tested with NVDA/JAWS screen reader
 * - [ ] Tested with VoiceOver (macOS/iOS)
 * - [ ] Tested with browser zoom at 200%
 * - [ ] Tested with Windows High Contrast Mode
 * - [ ] Automated testing with axe-core
 * - [ ] Manual testing against WCAG criteria
 */

export const ComponentName = ({ ... }) => {
  // Implementation with accessibility features

  return (
    <div
      role="..." // Proper ARIA role
      aria-label="..." // Accessible name
      aria-describedby="..." // Additional description
      tabIndex={0} // Keyboard focusable
      onKeyDown={handleKeyDown} // Keyboard support
    >
      {/* Component content */}
    </div>
  );
};
```

### 6.3 Performance Optimization Guidelines

**Core Web Vitals Targets**:

-   **LCP (Largest Contentful Paint)**: < 2.5s
-   **FID (First Input Delay)**: < 100ms
-   **CLS (Cumulative Layout Shift)**: < 0.1
-   **INP (Interaction to Next Paint)**: < 200ms

**Component Performance Checklist**:

-   [ ] Lazy load components not in initial viewport
-   [ ] Code split large components (>10kB)
-   [ ] Optimize animation performance (use transform/opacity)
-   [ ] Avoid layout thrashing (batch DOM reads/writes)
-   [ ] Use CSS containment where applicable
-   [ ] Implement virtual scrolling for long lists
-   [ ] Debounce/throttle expensive operations
-   [ ] Memoize expensive computations
-   [ ] Use `React.memo` for pure components
-   [ ] Profile with React DevTools Profiler

**Code Splitting Strategy**:

```typescript
// Lazy load motion components
import { lazy, Suspense } from "react";
import { Skeleton } from "@/modules/ui/components/feedback";

const BackgroundBeams = lazy(() =>
	import("@/modules/ui/components/motion/aceternity").then((mod) => ({
		default: mod.BackgroundBeams,
	}))
);

export function HeroSection() {
	return (
		<Suspense fallback={<Skeleton className="h-screen" />}>
			<BackgroundBeams />
		</Suspense>
	);
}
```

**Bundle Optimization**:

```typescript
// Use barrel exports with tree-shaking
// Good: Allows bundler to tree-shake
export { Button } from "./button";
export { Input } from "./input";

// Bad: Bundles everything together
export * from "./button";
export * from "./input";

// Direct imports for critical path
import { Button } from "@/modules/ui/components/primitives/button";

// Barrel imports for non-critical path
import {
	BackgroundBeams,
	Spotlight,
} from "@/modules/ui/components/motion/aceternity";
```

**Animation Performance**:

```typescript
// Use CSS transforms (GPU-accelerated)
const goodAnimation = {
  transform: "translateY(-10px)", // Good
  opacity: 0.8, // Good
};

const badAnimation = {
  top: "-10px", // Bad: causes layout
  width: "100%", // Bad: causes layout
};

// Use will-change sparingly
<motion.div
  style={{ willChange: "transform" }} // Only for active animations
  animate={{ transform: "translateY(-10px)" }}
/>

// Optimize SVG animations
<motion.svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  // Use CSS properties for animation
  animate={{ rotate: 360 }}
  transition={{ duration: 2, repeat: Infinity }}
>
  {/* SVG content */}
</motion.svg>
```

---

## 7. Migration Checklist

### Pre-Migration

-   [ ] Audit all existing components
-   [ ] Document current import patterns
-   [ ] Create component inventory spreadsheet
-   [ ] Identify all duplicate components
-   [ ] Review accessibility compliance
-   [ ] Measure current bundle sizes
-   [ ] Set up testing infrastructure

### Phase 1: Foundation (Week 1)

-   [ ] Create new directory structure
-   [ ] Move primitives to new location
-   [ ] Set up shared utilities
-   [ ] Create animation utilities
-   [ ] Update barrel exports
-   [ ] Test primitive components

### Phase 2: Consolidation (Week 1-2)

-   [ ] Merge duplicate BentoGrid
-   [ ] Resolve AnimatedList duplicate
-   [ ] Consolidate Skeleton component
-   [ ] Merge Tabs components
-   [ ] Consolidate Spotlight component
-   [ ] Update all imports for consolidated components
-   [ ] Test consolidated components

### Phase 3: Categorization (Week 2)

-   [ ] Move feedback components
-   [ ] Move composed components
-   [ ] Organize motion/aceternity components
-   [ ] Organize motion/magic components
-   [ ] Organize motion/interactions components
-   [ ] Organize domain-specific components
-   [ ] Create category barrel exports
-   [ ] Update imports for categorized components

### Phase 4: New Aceternity (Week 3)

-   [ ] Add LampEffect component
-   [ ] Add AuroraBackground component
-   [ ] Add ShootingStars component
-   [ ] Add Meteors component
-   [ ] Add Sparkles component
-   [ ] Add GridBackground component
-   [ ] Add DotsBackground component
-   [ ] Test new components for accessibility
-   [ ] Document new components

### Phase 5: New Magic UI (Week 3-4)

-   [ ] Add Marquee component
-   [ ] Add Dock component
-   [ ] Add AnimatedBeam component
-   [ ] Add OrbitingCircles component
-   [ ] Add TextAnimate component
-   [ ] Add WordRotate component
-   [ ] Add BorderBeam component
-   [ ] Add ShinyButton component
-   [ ] Test new components for accessibility
-   [ ] Document new components

### Phase 6: Import Updates (Week 4)

-   [ ] Create import mapping
-   [ ] Run automated import updates
-   [ ] Manual review of updates
-   [ ] Fix TypeScript errors
-   [ ] Fix linting errors
-   [ ] Test all pages render correctly

### Phase 7: Testing (Week 4-5)

-   [ ] Write unit tests for primitives
-   [ ] Write unit tests for composed components
-   [ ] Run accessibility audits (axe-core)
-   [ ] Perform keyboard navigation testing
-   [ ] Test with screen readers
-   [ ] Run visual regression tests
-   [ ] Measure performance impact
-   [ ] Test on mobile devices
-   [ ] Test in different browsers

### Phase 8: Documentation (Week 5)

-   [ ] Document all primitive components
-   [ ] Document all composed components
-   [ ] Document all motion components
-   [ ] Document all domain components
-   [ ] Create migration guide
-   [ ] Create usage examples
-   [ ] Create accessibility guide
-   [ ] Create performance guide
-   [ ] Update CLAUDE.md

### Post-Migration

-   [ ] Remove old component directories
-   [ ] Clean up unused imports
-   [ ] Update package dependencies
-   [ ] Run final bundle analysis
-   [ ] Deploy to staging
-   [ ] QA testing
-   [ ] Deploy to production
-   [ ] Monitor performance metrics
-   [ ] Gather developer feedback
-   [ ] Iterate based on feedback

---

## 8. Success Metrics

### Developer Experience

-   **Import Clarity**: 90% of developers find components within 30 seconds
-   **Documentation**: 95% of components have complete documentation
-   **Consistency**: 100% of components follow naming conventions
-   **Discoverability**: All components indexed and searchable

### Performance

-   **Bundle Size**: < 50kB gzipped for base UI components
-   **LCP**: < 2.5s on 3G network
-   **FID/INP**: < 100ms for all interactions
-   **CLS**: < 0.1 across all pages
-   **Tree-shaking**: 100% of unused components eliminated

### Accessibility

-   **WCAG Compliance**: 100% AA compliance
-   **Keyboard Support**: All components keyboard accessible
-   **Screen Reader**: All components properly announced
-   **Contrast**: 100% of components meet minimum ratios
-   **Reduced Motion**: 100% of components respect preference

### Quality

-   **Test Coverage**: > 80% unit test coverage
-   **Accessibility Tests**: 100% of components tested
-   **Visual Regression**: No unintended visual changes
-   **Browser Support**: Works in 95% of target browsers
-   **Mobile Support**: Works on iOS 12+, Android 8+

---

## 9. Maintenance Plan

### Weekly

-   Review new component requests
-   Update documentation for changes
-   Run automated accessibility audits
-   Monitor bundle size changes

### Monthly

-   Review component usage analytics
-   Update Aceternity/Magic UI components
-   Performance audit and optimization
-   Dependency updates

### Quarterly

-   Major component library review
-   Accessibility compliance audit
-   Performance benchmark comparison
-   Developer survey for feedback
-   Update design system documentation

### Annually

-   WCAG compliance re-certification
-   Major version updates (if needed)
-   Architecture review and optimization
-   Component library roadmap planning

---

## 10. Risk Mitigation

**Risk**: Breaking changes during migration
**Mitigation**: Gradual rollout, maintain old imports during transition, comprehensive testing

**Risk**: Performance regression
**Mitigation**: Bundle size monitoring, performance budgets, automated testing

**Risk**: Accessibility regression
**Mitigation**: Automated axe-core tests, manual testing, accessibility checklist

**Risk**: Developer confusion
**Mitigation**: Clear documentation, migration guide, team training sessions

**Risk**: Incomplete migration
**Mitigation**: Tracking spreadsheet, automated linting rules, code review process

---

## Conclusion

This unified component library strategy provides a clear path to consolidating the fragmented component architecture into a cohesive, performant, and accessible system. By leveraging Aceternity UI and Magic UI patterns while maintaining WCAG 2.1 AA compliance, the application will have:

1. **Single Source of Truth**: All components in one location with clear categorization
2. **Improved Developer Experience**: Predictable import patterns and comprehensive documentation
3. **Better Performance**: Optimized bundle sizes and code splitting strategies
4. **Accessibility First**: All components meet WCAG standards
5. **Future-Proof**: Scalable architecture ready for growth

The 5-week implementation plan balances thorough migration with iterative delivery, ensuring the team can continue feature development while improving the foundation.

---

**Next Steps**:

1. Review and approve this strategy
2. Set up project tracking (GitHub Project/Jira)
3. Allocate team resources for 5-week timeline
4. Begin Phase 1: Foundation Setup
5. Schedule weekly check-ins to monitor progress

**Questions/Concerns**: Please provide feedback on this strategy before implementation begins.
