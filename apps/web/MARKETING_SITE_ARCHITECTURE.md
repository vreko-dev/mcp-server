# SnapBack Marketing Site Architecture

**Document Version:** 1.0.0
**Date:** 2025-10-11
**Framework:** Next.js 15, React 19, TypeScript
**UI Libraries:** Framer Motion 12, Tailwind CSS, Aceternity UI, Magic UI
**Testing:** Vitest, Testing Library, jest-axe

---

## Executive Summary

This document defines the component architecture for SnapBack's marketing site refactor, focusing on three primary interactive sections that showcase the protection system's capabilities. The architecture leverages existing Aceternity and Magic UI patterns while ensuring WCAG AA compliance, optimal performance, and seamless responsive behavior.

### Core Principles

1. **Accessibility First**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support
2. **Performance Optimized**: Lazy loading, code splitting, reduced motion support
3. **Mobile-First Design**: Progressive enhancement from 320px to 4K displays
4. **Animation Excellence**: Leveraging Aceternity/Magic UI patterns with Framer Motion
5. **Type Safety**: Full TypeScript coverage with strict mode enabled

---

## Table of Contents

1. [Component Overview](#component-overview)
2. [Section 1: Hat System Section](#section-1-hat-system-section)
3. [Section 2: Team Config Section](#section-2-team-config-section)
4. [Section 3: Recovery Section](#section-3-recovery-section)
5. [Animation Specifications](#animation-specifications)
6. [Responsive Design System](#responsive-design-system)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Testing Strategy](#testing-strategy)
9. [Performance Guidelines](#performance-guidelines)
10. [Implementation Checklist](#implementation-checklist)

---

## Component Overview

### Architecture Hierarchy

```
app/(marketing)/[locale]/
└── page.tsx
    ├── HatSystemSection/
    │   ├── HatShowcase.tsx          # 3D cards with hat displays
    │   ├── ProtectionLevelCard.tsx  # Individual level card
    │   └── HatAnimationWrapper.tsx  # Motion orchestration
    │
    ├── TeamConfigSection/
    │   ├── ConfigDisplay.tsx        # Interactive .snapbackrc
    │   ├── CodeBlock.tsx            # Syntax-highlighted code
    │   └── ConfigActions.tsx        # Copy/download controls
    │
    └── RecoverySection/
        ├── RecoveryTimeline.tsx     # Sticky scroll reveal
        ├── DiffPreview.tsx          # Code diff visualization
        └── TimelineNavigator.tsx    # Interactive timeline controls
```

### Shared Utilities

```
modules/ui/
├── components/motion/
│   ├── aceternity/
│   │   ├── 3d-card.tsx          ✅ Existing
│   │   ├── bento-grid.tsx       ✅ Existing
│   │   └── sticky-scroll-reveal.tsx ✅ Existing
│   │
│   └── magic/
│       ├── blur-in.tsx          ✅ Existing
│       ├── animated-list.tsx    ✅ Existing
│       └── blur-fade.tsx        ✅ Existing
│
└── lib/
    ├── motion.ts                ✅ Existing (animation utilities)
    └── accessibility.ts         🆕 New (a11y helpers)
```

---

## Section 1: Hat System Section

### Purpose

Visually showcase the three protection levels using 3D hat imagery with interactive hover effects and clear differentiation.

### Component Structure

#### 1.1 HatSystemSection (Container)

**File:** `app/(marketing)/[locale]/components/HatSystemSection.tsx`

```typescript
import type { ReactNode } from "react";

export interface HatSystemSectionProps {
	/** Optional section heading override */
	heading?: string;
	/** Optional section description */
	description?: string;
	/** Layout variant: grid or carousel */
	variant?: "grid" | "carousel";
	/** Additional CSS classes */
	className?: string;
}

export const HatSystemSection: React.FC<HatSystemSectionProps> = ({
	heading = "Three Levels of Protection",
	description = "SnapBack adapts to your workflow with intelligent protection levels",
	variant = "grid",
	className,
}) => {
	// Implementation
};
```

**Responsibilities:**

-   Section layout and spacing
-   Responsive grid/carousel switching
-   Coordinating entrance animations
-   Managing reduced motion preferences

**Animation Pattern:**

-   Container: Fade in on viewport entry
-   Cards: Staggered entrance with 150ms delay between each
-   Scroll-triggered animation using `useInView` hook

#### 1.2 ProtectionLevelCard (Individual Card)

**File:** `app/(marketing)/[locale]/components/ProtectionLevelCard.tsx`

```typescript
export type ProtectionLevel = "watched" | "protected" | "critical";

export interface ProtectionLevelCardProps {
	/** Protection level type */
	level: ProtectionLevel;
	/** Card title */
	title: string;
	/** Card description */
	description: string;
	/** Features list */
	features: string[];
	/** 3D hat image source */
	imageSrc: string;
	/** Alt text for image */
	imageAlt: string;
	/** Animation delay for stagger effect */
	delay?: number;
	/** Additional CSS classes */
	className?: string;
}

export const ProtectionLevelCard: React.FC<ProtectionLevelCardProps> = ({
	level,
	title,
	description,
	features,
	imageSrc,
	imageAlt,
	delay = 0,
	className,
}) => {
	// Implementation using Card3D pattern
};
```

**Design Specifications:**

| Level              | Color Accent        | Icon      | Image Asset                           |
| ------------------ | ------------------- | --------- | ------------------------------------- |
| Watched (Blue)     | `hsl(220 100% 60%)` | 👀 Watch  | `/images/3d_hats/blue-hat-watch.png`  |
| Protected (Yellow) | `hsl(45 100% 60%)`  | ⚠️ Shield | `/images/3d_hats/yellow-hat-warn.png` |
| Critical (Red)     | `hsl(0 85% 60%)`    | 🛡️ Block  | `/images/3d_hats/red-hat-block.png`   |

**Interaction States:**

-   **Default**: Subtle elevation, border glow matching level color
-   **Hover**: 3D tilt effect (using Card3D pattern), increased elevation, stronger glow
-   **Focus**: 2px outline in level color, outline-offset: 4px
-   **Active**: Scale down to 0.98, maintain focus outline

**Accessibility:**

-   Semantic HTML: `<article>` with proper heading hierarchy
-   ARIA labels: `aria-label="Protection level: {level}"`
-   Keyboard navigation: Full tab order, Enter/Space activation
-   Screen reader: Announce features list with proper list semantics

#### 1.3 HatAnimationWrapper (Animation Orchestrator)

**File:** `app/(marketing)/[locale]/components/HatAnimationWrapper.tsx`

```typescript
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { useReducedMotion } from "@ui/lib/motion";

export interface HatAnimationWrapperProps {
	children: React.ReactNode;
	/** Stagger delay in seconds */
	staggerDelay?: number;
	/** Animation index for stagger calculation */
	index?: number;
	className?: string;
}

export const HatAnimationWrapper: React.FC<HatAnimationWrapperProps> = ({
	children,
	staggerDelay = 0.15,
	index = 0,
	className,
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			ref={ref}
			initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 40 }}
			animate={
				isInView
					? { opacity: 1, y: 0 }
					: { opacity: 0, y: reducedMotion ? 0 : 40 }
			}
			transition={{
				duration: reducedMotion ? 0 : 0.6,
				delay: reducedMotion ? 0 : index * staggerDelay,
				ease: [0.16, 1, 0.3, 1], // Apple easing
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
};
```

### Layout Specifications

**Desktop (≥1024px):**

```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 2rem; /* 32px */
max-width: 1280px;
margin: 0 auto;
padding: 4rem 2rem; /* 64px vertical, 32px horizontal */
```

**Tablet (768px - 1023px):**

```css
grid-template-columns: repeat(2, 1fr);
gap: 1.5rem; /* 24px */
padding: 3rem 1.5rem;

/* Third card spans full width */
.card:nth-child(3) {
	grid-column: 1 / -1;
	max-width: 600px;
	margin: 0 auto;
}
```

**Mobile (<768px):**

```css
grid-template-columns: 1fr;
gap: 1rem; /* 16px */
padding: 2rem 1rem;
```

### Animation Timeline

```
Section Viewport Entry
│
├─ t=0ms:     Container fade in (opacity: 0 → 1)
├─ t=150ms:   Card 1 (Blue Hat) entrance
├─ t=300ms:   Card 2 (Yellow Hat) entrance
└─ t=450ms:   Card 3 (Red Hat) entrance

Total Duration: 1000ms (including 0.6s animation duration)
```

### Asset Integration

**Image Optimization:**

```typescript
import Image from "next/image";

<Image
	src={imageSrc}
	alt={imageAlt}
	width={400}
	height={400}
	quality={90}
	priority={index === 0} // Priority load first card
	placeholder="blur"
	blurDataURL="data:image/png;base64,..." // Generated at build
	className="object-contain"
/>;
```

**Lazy Loading Strategy:**

-   First card (Blue Hat): Priority load (`priority={true}`)
-   Remaining cards: Lazy load with IntersectionObserver
-   Use Next.js Image optimization for automatic format selection (WebP/AVIF)

---

## Section 2: Team Config Section

### Purpose

Display an interactive `.snapbackrc` configuration file with syntax highlighting, copy functionality, and download capability.

### Component Structure

#### 2.1 TeamConfigSection (Container)

**File:** `app/(marketing)/[locale]/components/TeamConfigSection.tsx`

```typescript
export interface TeamConfigSectionProps {
	/** Optional section heading */
	heading?: string;
	/** Optional section description */
	description?: string;
	/** Config file content */
	config?: string;
	/** Layout variant */
	variant?: "split" | "centered";
	className?: string;
}

export const TeamConfigSection: React.FC<TeamConfigSectionProps> = ({
	heading = "Configure Your Team's Protection",
	description = "Simple JSON configuration for powerful protection rules",
	config = defaultConfig,
	variant = "split",
	className,
}) => {
	// Implementation
};
```

**Layout Variants:**

1. **Split Layout** (default):

    - Left: Config explanation, features list, benefits
    - Right: Interactive code block
    - Desktop: 40/60 split
    - Mobile: Stacked vertically

2. **Centered Layout**:
    - Config block centered with max-width
    - Description above, actions below
    - Better for focused, single-message presentations

#### 2.2 ConfigDisplay (Interactive Code Block)

**File:** `app/(marketing)/[locale]/components/ConfigDisplay.tsx`

```typescript
export interface ConfigDisplayProps {
	/** Configuration content */
	content: string;
	/** Programming language for syntax highlighting */
	language?: "json" | "yaml" | "typescript";
	/** Enable line numbers */
	showLineNumbers?: boolean;
	/** Highlighted lines (1-indexed) */
	highlightLines?: number[];
	/** File name display */
	fileName?: string;
	/** Enable copy functionality */
	enableCopy?: boolean;
	/** Enable download functionality */
	enableDownload?: boolean;
	/** Additional CSS classes */
	className?: string;
}

export const ConfigDisplay: React.FC<ConfigDisplayProps> = ({
	content,
	language = "json",
	showLineNumbers = true,
	highlightLines = [],
	fileName = ".snapbackrc",
	enableCopy = true,
	enableDownload = true,
	className,
}) => {
	// Implementation
};
```

**Visual Design:**

```
┌─────────────────────────────────────────────┐
│ 🔴 🟡 🟢  .snapbackrc          [📋] [⬇️]   │ ← Header
├─────────────────────────────────────────────┤
│  1  {                                       │
│  2    "version": "2.0",                     │
│  3    "protectionLevels": {                 │ ← Line numbers
│  4      "watched": {                        │
│  5        "patterns": ["*.md", "*.txt"],    │ ← Highlighted
│  6        "autoSave": true                  │
│  7      },                                  │
│  8      "protected": {                      │
│  9        "patterns": ["src/**/*.ts"],      │
│ 10        "confirmBeforeSave": true         │
│ 11      }                                   │
│ 12    }                                     │
│ 13  }                                       │
└─────────────────────────────────────────────┘
```

**Syntax Highlighting:**

-   Use Shiki (already in project) for accurate syntax highlighting
-   Theme: Match SnapBack terminal aesthetic (dark theme)
-   Token colors align with existing design system

```typescript
import { codeToHtml } from "shiki";

const highlightedCode = await codeToHtml(content, {
	lang: language,
	theme: "github-dark",
	transformers: [
		// Line number transformer
		// Highlight line transformer
	],
});
```

**Copy Functionality:**

```typescript
import { useState } from "react";
import { toast } from "sonner";

const [copied, setCopied] = useState(false);

const handleCopy = async () => {
	await navigator.clipboard.writeText(content);
	setCopied(true);
	toast.success("Configuration copied to clipboard");

	setTimeout(() => setCopied(false), 2000);
};
```

**Download Functionality:**

```typescript
const handleDownload = () => {
	const blob = new Blob([content], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	a.click();
	URL.revokeObjectURL(url);

	toast.success("Configuration downloaded");
};
```

#### 2.3 ConfigActions (Action Bar)

**File:** `app/(marketing)/[locale]/components/ConfigActions.tsx`

```typescript
export interface ConfigActionsProps {
	/** Copy button handler */
	onCopy: () => void;
	/** Download button handler */
	onDownload: () => void;
	/** Copy state indicator */
	copied?: boolean;
	/** Disabled state */
	disabled?: boolean;
	className?: string;
}

export const ConfigActions: React.FC<ConfigActionsProps> = ({
	onCopy,
	onDownload,
	copied = false,
	disabled = false,
	className,
}) => {
	// Implementation with accessible buttons
};
```

**Button States:**

| State          | Visual Feedback                 | Accessibility           |
| -------------- | ------------------------------- | ----------------------- |
| Default        | Border, subtle hover            | `aria-label`, focusable |
| Hover          | Border glow, slight scale       | No change               |
| Active (Click) | Scale down, ripple effect       | No change               |
| Copied         | Checkmark icon, green color     | Announce "Copied"       |
| Disabled       | Reduced opacity, no interaction | `aria-disabled="true"`  |

### Default Configuration Content

```json
{
	"version": "2.0",
	"protectionLevels": {
		"watched": {
			"patterns": ["*.md", "*.txt", "docs/**"],
			"autoSave": true,
			"notifications": "minimal"
		},
		"protected": {
			"patterns": ["src/**/*.{ts,tsx,js,jsx}", "*.config.*"],
			"confirmBeforeSave": true,
			"createSnapshot": true
		},
		"critical": {
			"patterns": [".env*", "secrets/**", "*.key"],
			"blockAutoSave": true,
			"requireExplicitSave": true,
			"encryption": true
		}
	},
	"team": {
		"sharedSnapshots": true,
		"notifyOnProtectedChanges": true
	}
}
```

### Animation Specifications

**Entrance Animation:**

```typescript
const codeBlockVariants = {
	hidden: {
		opacity: 0,
		scale: 0.95,
		filter: "blur(10px)",
	},
	visible: {
		opacity: 1,
		scale: 1,
		filter: "blur(0px)",
		transition: {
			duration: 0.6,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};
```

**Line-by-Line Reveal (Optional Enhancement):**

```typescript
const lineVariants = {
	hidden: { opacity: 0, x: -20 },
	visible: (i: number) => ({
		opacity: 1,
		x: 0,
		transition: {
			delay: i * 0.05, // 50ms stagger per line
			duration: 0.3,
		},
	}),
};
```

### Responsive Behavior

**Desktop (≥1024px):**

-   Split layout: 40% explanation, 60% code
-   Code block max-width: 800px
-   Font size: 14px (code)

**Tablet (768px - 1023px):**

-   Split layout: 50/50
-   Code block full width of container
-   Font size: 13px

**Mobile (<768px):**

-   Stacked layout: explanation → code
-   Code block full width with horizontal scroll if needed
-   Font size: 12px
-   Reduced line height for space efficiency

---

## Section 3: Recovery Section

### Purpose

Showcase the recovery workflow using a timeline-based interface with sticky scroll reveal pattern and interactive diff previews.

### Component Structure

#### 3.1 RecoverySection (Container)

**File:** `app/(marketing)/[locale]/components/RecoverySection.tsx`

```typescript
export interface RecoveryStep {
	id: string;
	timestamp: string;
	title: string;
	description: string;
	diff?: {
		before: string;
		after: string;
		language: string;
	};
	icon?: React.ReactNode;
}

export interface RecoverySectionProps {
	/** Recovery timeline steps */
	steps: RecoveryStep[];
	/** Optional section heading */
	heading?: string;
	/** Optional section description */
	description?: string;
	className?: string;
}

export const RecoverySection: React.FC<RecoverySectionProps> = ({
	steps,
	heading = "Instant Recovery, Zero Downtime",
	description = "Travel back in time with SnapBack's snapshot system",
	className,
}) => {
	// Implementation using StickyScrollReveal pattern
};
```

**Layout Pattern:**

-   Uses existing `StickyScrollReveal` component from Aceternity
-   Left side: Scrollable timeline with steps
-   Right side: Sticky diff preview that updates based on scroll position
-   Smooth transitions between steps with animated background gradients

#### 3.2 RecoveryTimeline (Timeline Component)

**File:** `app/(marketing)/[locale]/components/RecoveryTimeline.tsx`

```typescript
export interface RecoveryTimelineProps {
	/** Timeline steps */
	steps: RecoveryStep[];
	/** Currently active step index */
	activeStep: number;
	/** Step click handler */
	onStepClick?: (index: number) => void;
	className?: string;
}

export const RecoveryTimeline: React.FC<RecoveryTimelineProps> = ({
	steps,
	activeStep,
	onStepClick,
	className,
}) => {
	// Implementation
};
```

**Visual Design:**

```
Timeline Visualization:

    ●━━━━━ 2:45 PM - Initial save
    │      "Added user authentication"
    │
    ●━━━━━ 2:43 PM - Modified config
    │      "Updated database settings"
    │
    ◉━━━━━ 2:40 PM - Created snapshot  ← Active
    │      "Stable working state"
    │
    ○━━━━━ 2:35 PM - File changes
           "Refactored utility functions"

Legend:
● Completed step (past)
◉ Active step (current)
○ Available step (future/clickable)
```

**Step States:**

| State  | Visual                       | Dot Style            | Accessibility                 |
| ------ | ---------------------------- | -------------------- | ----------------------------- |
| Past   | Full opacity, green accent   | Filled circle        | `aria-label="Completed step"` |
| Active | Highlighted, pulse animation | Larger filled circle | `aria-current="step"`         |
| Future | Reduced opacity              | Outline circle       | `aria-label="Available step"` |

#### 3.3 DiffPreview (Code Diff Component)

**File:** `app/(marketing)/[locale]/components/DiffPreview.tsx`

```typescript
export interface DiffPreviewProps {
	/** Code before changes */
	before: string;
	/** Code after changes */
	after: string;
	/** Programming language */
	language: string;
	/** Diff view mode */
	mode?: "split" | "unified";
	/** File name */
	fileName?: string;
	className?: string;
}

export const DiffPreview: React.FC<DiffPreviewProps> = ({
	before,
	after,
	language,
	mode = "unified",
	fileName,
	className,
}) => {
	// Implementation with diff highlighting
};
```

**Diff Visualization:**

**Unified Mode (Default):**

```diff
function authenticate(user: User) {
-  const token = generateToken(user.id);
+  const token = await generateSecureToken(user.id);
+  await logAuthEvent(user.id, 'login');
   return token;
}
```

**Split Mode (Optional):**

```
Before                          After
────────────────────────────────────────────────
function authenticate(user) {   function authenticate(user) {
  const token = generateToken(    const token = await generateSecureToken(
    user.id);                       user.id);
                                   await logAuthEvent(user.id, 'login');
  return token;                    return token;
}                               }
```

**Color Coding:**

-   Additions: `bg-green-500/10`, border: `border-l-2 border-green-500`
-   Deletions: `bg-red-500/10`, border: `border-l-2 border-red-500`
-   Context: Default text color, no special styling
-   Line numbers: Muted color, non-selectable

**Diff Generation:**

```typescript
import { diffLines, diffWords } from "diff";

const generateDiff = (before: string, after: string) => {
	const lineDiff = diffLines(before, after);

	return lineDiff.map((part, index) => ({
		id: `diff-${index}`,
		type: part.added ? "addition" : part.removed ? "deletion" : "context",
		content: part.value,
		count: part.count,
	}));
};
```

#### 3.4 TimelineNavigator (Navigation Controls)

**File:** `app/(marketing)/[locale]/components/TimelineNavigator.tsx`

```typescript
export interface TimelineNavigatorProps {
	/** Total number of steps */
	totalSteps: number;
	/** Current active step */
	currentStep: number;
	/** Navigation handler */
	onNavigate: (step: number) => void;
	/** Enable keyboard navigation */
	enableKeyboard?: boolean;
	className?: string;
}

export const TimelineNavigator: React.FC<TimelineNavigatorProps> = ({
	totalSteps,
	currentStep,
	onNavigate,
	enableKeyboard = true,
	className,
}) => {
	// Implementation with arrow key support
};
```

**Navigation Controls:**

-   Previous/Next buttons with keyboard shortcuts (←/→)
-   Progress indicator: "Step 2 of 5"
-   Keyboard navigation: Arrow keys, Home/End keys
-   Touch gestures: Swipe left/right on mobile

### Default Recovery Steps Data

```typescript
const defaultRecoverySteps: RecoveryStep[] = [
	{
		id: "step-1",
		timestamp: "2:45 PM",
		title: "Initial Save",
		description: "Added user authentication middleware",
		diff: {
			before: "// Empty file",
			after: `export const authMiddleware = (req, res, next) => {
  if (!req.user) return res.status(401).send();
  next();
};`,
			language: "typescript",
		},
		icon: "💾",
	},
	{
		id: "step-2",
		timestamp: "2:43 PM",
		title: "Modified Configuration",
		description: "Updated database connection settings",
		diff: {
			before: `database: {
  host: 'localhost',
  port: 5432
}`,
			after: `database: {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  ssl: true
}`,
			language: "typescript",
		},
		icon: "⚙️",
	},
	{
		id: "step-3",
		timestamp: "2:40 PM",
		title: "Created Snapshot",
		description: "Stable working state before refactoring",
		diff: {
			before: "function calculate(x, y) { return x + y; }",
			after: "function calculate(x: number, y: number): number { return x + y; }",
			language: "typescript",
		},
		icon: "🎯",
	},
	{
		id: "step-4",
		timestamp: "2:35 PM",
		title: "Refactored Utilities",
		description: "Improved type safety in utility functions",
		diff: {
			before: "export const utils = { format: (s) => s.trim() };",
			after: "export const utils = { format: (s: string): string => s.trim() };",
			language: "typescript",
		},
		icon: "🔧",
	},
];
```

### Animation Specifications

**Scroll-Triggered Animations:**

```typescript
import { useScroll, useTransform } from "motion/react";

const { scrollYProgress } = useScroll({
	target: containerRef,
	offset: ["start start", "end start"],
});

// Active step calculation
const activeStep = useTransform(scrollYProgress, [0, 1], [0, steps.length - 1]);

// Background gradient transition
const backgroundColor = useTransform(
	scrollYProgress,
	[0, 0.33, 0.66, 1],
	[
		"hsl(220 20% 5%)", // Blue tint
		"hsl(45 20% 5%)", // Yellow tint
		"hsl(0 20% 5%)", // Red tint
		"hsl(140 20% 5%)", // Green tint
	]
);
```

**Step Transition Animation:**

```typescript
const stepVariants = {
	inactive: {
		opacity: 0.3,
		scale: 0.95,
	},
	active: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.5,
			ease: [0.16, 1, 0.3, 1],
		},
	},
};
```

**Diff Preview Animation:**

```typescript
const diffVariants = {
	enter: {
		opacity: 0,
		x: 20,
	},
	center: {
		opacity: 1,
		x: 0,
		transition: {
			duration: 0.4,
			ease: [0.16, 1, 0.3, 1],
		},
	},
	exit: {
		opacity: 0,
		x: -20,
		transition: {
			duration: 0.3,
		},
	},
};
```

### Responsive Behavior

**Desktop (≥1024px):**

-   Sticky scroll layout: Left scrollable, right sticky
-   Timeline width: 40%
-   Diff preview width: 60%
-   Sticky positioning with top offset: 120px

**Tablet (768px - 1023px):**

-   Modified sticky layout: 50/50 split
-   Reduced diff preview font size
-   Horizontal scroll on diffs if needed

**Mobile (<768px):**

-   Accordion-style layout instead of sticky scroll
-   Each step is collapsible
-   Diff preview appears below each expanded step
-   Swipe gestures for navigation

---

## Animation Specifications

### Global Animation System

**Animation Constants:**

```typescript
// From existing: modules/ui/lib/motion.ts
export const DURATION = {
	instant: 0,
	fast: 150,
	normal: 300,
	moderate: 500,
	slow: 800,
} as const;

export const EASING = {
	apple: [0.16, 1, 0.3, 1] as const, // Smooth, premium feel
	standard: [0.4, 0.0, 0.2, 1] as const, // Material Design
	snapback: [0.34, 1.56, 0.64, 1] as const, // Bouncy, playful
} as const;
```

### Entrance Animations

**Viewport-Triggered Entrance:**

```typescript
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { useReducedMotion, DURATION, EASING } from "@ui/lib/motion";

const entranceVariants = {
	hidden: {
		opacity: 0,
		y: 40,
		filter: "blur(10px)",
	},
	visible: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
	},
};

<motion.div
	initial="hidden"
	animate={isInView ? "visible" : "hidden"}
	variants={entranceVariants}
	transition={{
		duration: reducedMotion ? 0 : DURATION.moderate / 1000,
		ease: EASING.apple,
	}}
/>;
```

**Staggered Children:**

```typescript
const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15, // 150ms between children
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
			ease: EASING.apple,
		},
	},
};
```

### Hover Animations

**Card Hover Effects:**

```typescript
const cardHoverVariants = {
	rest: {
		scale: 1,
		y: 0,
		transition: { duration: 0.2 },
	},
	hover: {
		scale: 1.02,
		y: -8,
		transition: {
			duration: 0.3,
			ease: EASING.snapback,
		},
	},
};

<motion.div
	variants={cardHoverVariants}
	initial="rest"
	whileHover="hover"
	whileTap={{ scale: 0.98 }}
/>;
```

**Glow Effect on Hover:**

```typescript
const glowVariants = {
	rest: {
		boxShadow: "0 0 20px rgba(16, 185, 129, 0.1)",
	},
	hover: {
		boxShadow: [
			"0 0 20px rgba(16, 185, 129, 0.1)",
			"0 0 40px rgba(16, 185, 129, 0.3)",
			"0 0 20px rgba(16, 185, 129, 0.1)",
		],
		transition: {
			duration: 1.5,
			repeat: Infinity,
			ease: "easeInOut",
		},
	},
};
```

### Scroll-Based Animations

**Parallax Effect:**

```typescript
import { useScroll, useTransform } from "motion/react";

const { scrollYProgress } = useScroll({
	target: ref,
	offset: ["start end", "end start"],
});

const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

<motion.div style={{ y, opacity }} />;
```

**Progress Indicator:**

```typescript
const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

<motion.div
	style={{ scaleX }}
	className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left"
/>;
```

### Transition Animations

**Page Section Transitions:**

```typescript
const sectionVariants = {
	enter: {
		opacity: 0,
		scale: 0.95,
		filter: "blur(10px)",
	},
	center: {
		opacity: 1,
		scale: 1,
		filter: "blur(0px)",
		transition: {
			duration: 0.6,
			ease: EASING.apple,
		},
	},
	exit: {
		opacity: 0,
		scale: 1.05,
		filter: "blur(10px)",
		transition: {
			duration: 0.4,
		},
	},
};
```

### Reduced Motion Support

**Global Hook:**

```typescript
// Already exists: modules/ui/lib/motion.ts
import { useReducedMotion } from "@ui/lib/motion";

const reducedMotion = useReducedMotion();

// Conditionally disable animations
<motion.div
	animate={reducedMotion ? {} : { y: -10 }}
	transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
/>;
```

**CSS Fallback:**

```css
/* Already in globals.css */
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
```

---

## Responsive Design System

### Breakpoint System

```typescript
// Tailwind CSS breakpoints (already configured)
export const breakpoints = {
	sm: "640px", // Small devices (landscape phones)
	md: "768px", // Medium devices (tablets)
	lg: "1024px", // Large devices (desktops)
	xl: "1280px", // Extra large devices
	"2xl": "1536px", // 2K+ displays
} as const;

// Usage in components
const isMobile = useMediaQuery("(max-width: 767px)");
const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
const isDesktop = useMediaQuery("(min-width: 1024px)");
```

### Mobile-First Approach

**Base styles start at 320px:**

```typescript
// Mobile (320px - 767px)
className = "text-sm p-4 space-y-4";

// Tablet (768px - 1023px)
className = "md:text-base md:p-6 md:space-y-6";

// Desktop (1024px+)
className = "lg:text-lg lg:p-8 lg:space-y-8";
```

### Typography Scale

```css
/* Mobile-first typography */
.text-heading-1 {
	font-size: clamp(2rem, 5vw, 3.5rem); /* 32px → 56px */
	line-height: 1.1;
	font-weight: 700;
	letter-spacing: -0.02em;
}

.text-heading-2 {
	font-size: clamp(1.5rem, 4vw, 2.5rem); /* 24px → 40px */
	line-height: 1.2;
	font-weight: 600;
	letter-spacing: -0.01em;
}

.text-body {
	font-size: clamp(0.875rem, 2vw, 1rem); /* 14px → 16px */
	line-height: 1.6;
}

.text-caption {
	font-size: clamp(0.75rem, 1.5vw, 0.875rem); /* 12px → 14px */
	line-height: 1.4;
}
```

### Spacing System

```typescript
// Consistent spacing scale (Tailwind)
const spacing = {
	xs: "0.25rem", // 4px
	sm: "0.5rem", // 8px
	md: "1rem", // 16px
	lg: "1.5rem", // 24px
	xl: "2rem", // 32px
	"2xl": "3rem", // 48px
	"3xl": "4rem", // 64px
	"4xl": "6rem", // 96px
} as const;

// Responsive spacing
className = "p-4 md:p-6 lg:p-8"; // Padding
className = "space-y-4 md:space-y-6 lg:space-y-8"; // Vertical spacing
className = "gap-4 md:gap-6 lg:gap-8"; // Grid/flex gap
```

### Touch Targets

**Minimum touch target size: 44px × 44px**

```css
.touch-target {
	min-width: 44px;
	min-height: 44px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.5rem 1rem;
}

/* Increase spacing on mobile */
@media (max-width: 767px) {
	.touch-target {
		min-width: 48px;
		min-height: 48px;
		padding: 0.75rem 1.25rem;
	}
}
```

### Responsive Images

```typescript
// Next.js Image with responsive sizes
<Image
	src="/images/3d_hats/blue-hat-watch.png"
	alt="Blue hat representing watched protection level"
	width={400}
	height={400}
	sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
	priority={index === 0}
	className="w-full h-auto"
/>
```

### Layout Patterns

**Grid System:**

```typescript
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Auto-fit grid (automatic columns)
<div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

**Flex Layout:**

```typescript
// Responsive stack → row
<div className="flex flex-col md:flex-row gap-4 md:gap-8">
	<div className="flex-1">Content 1</div>
	<div className="flex-1">Content 2</div>
</div>
```

### Overflow Handling

```css
/* Horizontal scroll on mobile for code blocks */
.code-container {
	overflow-x: auto;
	-webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

/* Hide scrollbar on mobile, show on hover on desktop */
@media (max-width: 767px) {
	.code-container::-webkit-scrollbar {
		height: 0;
	}
}

@media (min-width: 768px) {
	.code-container::-webkit-scrollbar {
		height: 8px;
	}

	.code-container::-webkit-scrollbar-thumb {
		background: var(--border-color);
		border-radius: 4px;
	}
}
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

**Required Standards:**

1. **Perceivable**: Information must be presentable to users
2. **Operable**: UI components must be operable
3. **Understandable**: Information and UI operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

### Semantic HTML

**Component Structure:**

```typescript
// ❌ Wrong: Non-semantic divs
<div className="card" onClick={handleClick}>
  <div className="title">Title</div>
  <div className="content">Content</div>
</div>

// ✅ Correct: Semantic HTML
<article className="card">
  <h3 className="title">Title</h3>
  <p className="content">Content</p>
  <button onClick={handleClick}>Action</button>
</article>
```

**Section Structure:**

```typescript
<section aria-labelledby="hat-system-heading">
	<h2 id="hat-system-heading">Three Levels of Protection</h2>
	<div className="grid">
		{levels.map((level) => (
			<article key={level.id} aria-labelledby={`level-${level.id}`}>
				<h3 id={`level-${level.id}`}>{level.title}</h3>
				{/* Content */}
			</article>
		))}
	</div>
</section>
```

### Keyboard Navigation

**Focus Management:**

```typescript
// Interactive elements must be keyboard accessible
<button
	onClick={handleClick}
	onKeyDown={(e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	}}
	aria-label="Copy configuration"
>
	Copy
</button>
```

**Focus Indicators:**

```css
/* Visible focus indicators */
.focus-visible:focus {
	outline: 2px solid var(--primary-color);
	outline-offset: 2px;
	border-radius: 4px;
}

/* High contrast focus for better visibility */
@media (prefers-contrast: high) {
	.focus-visible:focus {
		outline: 3px solid var(--primary-color);
		outline-offset: 3px;
	}
}
```

**Tab Order:**

```typescript
// Proper tab order with tabIndex
<div role="tablist">
	<button role="tab" tabIndex={active ? 0 : -1} aria-selected={active}>
		Tab 1
	</button>
	<button role="tab" tabIndex={active ? 0 : -1} aria-selected={active}>
		Tab 2
	</button>
</div>
```

### ARIA Attributes

**Live Regions:**

```typescript
// Announce dynamic content changes
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
	{copied ? "Configuration copied to clipboard" : ""}
</div>
```

**Progress Indicators:**

```typescript
<div
	role="progressbar"
	aria-valuenow={currentStep}
	aria-valuemin={1}
	aria-valuemax={totalSteps}
	aria-label={`Step ${currentStep} of ${totalSteps}`}
>
	<div style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
</div>
```

**Expandable Sections:**

```typescript
<button
  aria-expanded={isOpen}
  aria-controls="timeline-content"
  onClick={() => setIsOpen(!isOpen)}
>
  {title}
</button>
<div id="timeline-content" hidden={!isOpen}>
  {content}
</div>
```

### Screen Reader Support

**Screen Reader Only Text:**

```css
/* Utility class for screen reader only content */
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
```

**Image Alt Text:**

```typescript
// Descriptive alt text
<Image
  src="/images/3d_hats/blue-hat-watch.png"
  alt="Blue detective hat with magnifying glass representing the Watched protection level, which monitors file changes without blocking"
  width={400}
  height={400}
/>

// Decorative images
<Image
  src="/decorative-pattern.png"
  alt=""  // Empty alt for decorative images
  aria-hidden="true"
  width={100}
  height={100}
/>
```

**Accessible Buttons:**

```typescript
// Icon-only buttons need aria-label
<button aria-label="Copy to clipboard" onClick={handleCopy}>
  <ClipboardIcon aria-hidden="true" />
</button>

// Button with visible text doesn't need aria-label
<button onClick={handleCopy}>
  <ClipboardIcon aria-hidden="true" />
  <span>Copy</span>
</button>
```

### Color Contrast

**WCAG AA Requirements:**

-   Normal text (< 18pt): 4.5:1 contrast ratio
-   Large text (≥ 18pt): 3:1 contrast ratio
-   UI components: 3:1 contrast ratio

**Color Palette (Meeting WCAG AA):**

```typescript
const colors = {
	// Background colors
	background: "hsl(0 0% 4%)", // #0A0A0A
	surface: "hsl(0 0% 7%)", // #111111

	// Text colors (on dark background)
	foreground: "hsl(0 0% 95%)", // #F2F2F2 - 18.1:1 contrast
	muted: "hsl(0 0% 65%)", // #A6A6A6 - 7.5:1 contrast

	// Accent colors
	primary: "hsl(140 100% 50%)", // #00FF41 - 12.6:1 contrast
	blue: "hsl(220 100% 60%)", // #3385FF - 6.8:1 contrast
	yellow: "hsl(45 100% 60%)", // #FFD633 - 11.2:1 contrast
	red: "hsl(0 85% 60%)", // #F23838 - 5.1:1 contrast
};
```

**Color Contrast Testing:**

```typescript
// Use jest-axe for automated testing
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

it("should have no accessibility violations", async () => {
	const { container } = render(<ProtectionLevelCard {...props} />);
	const results = await axe(container);
	expect(results).toHaveNoViolations();
});
```

### Form Accessibility

**Labels and Descriptions:**

```typescript
<div>
	<label htmlFor="config-name">
		Configuration Name
		<span className="sr-only">(required)</span>
	</label>
	<input
		id="config-name"
		type="text"
		aria-required="true"
		aria-describedby="config-name-help"
	/>
	<p id="config-name-help" className="text-sm text-muted">
		Choose a descriptive name for your configuration
	</p>
</div>
```

**Error Messages:**

```typescript
<div>
	<label htmlFor="email">Email</label>
	<input
		id="email"
		type="email"
		aria-invalid={!!error}
		aria-describedby={error ? "email-error" : undefined}
	/>
	{error && (
		<p id="email-error" className="text-red-500" role="alert">
			{error}
		</p>
	)}
</div>
```

### Animation Accessibility

**Reduced Motion:**

```typescript
// Check for reduced motion preference
import { useReducedMotion } from "@ui/lib/motion";

export const AnimatedCard = ({ children }) => {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
			animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
			transition={reducedMotion ? { duration: 0 } : { duration: 0.5 }}
		>
			{children}
		</motion.div>
	);
};
```

**Pause Animations:**

```typescript
// Provide controls for auto-playing animations
const [isPaused, setIsPaused] = useState(false);

<div>
	<button
		onClick={() => setIsPaused(!isPaused)}
		aria-label={isPaused ? "Resume animation" : "Pause animation"}
	>
		{isPaused ? "Resume" : "Pause"}
	</button>

	<motion.div
		animate={isPaused ? {} : { rotate: 360 }}
		transition={{ repeat: Infinity, duration: 2 }}
	>
		{content}
	</motion.div>
</div>;
```

---

## Testing Strategy

### Testing Pyramid

```
             /\
            /  \
           / E2E \          ← 10% (Critical user flows)
          /------\
         /  Inte- \
        / gration \         ← 20% (Component integration)
       /----------\
      /    Unit    \
     /     Tests    \       ← 70% (Component logic)
    /________________\
```

### Test Coverage Goals

-   **Unit Tests**: 80%+ coverage
-   **Integration Tests**: Key user interactions
-   **Accessibility Tests**: 100% of interactive components
-   **Visual Regression**: Critical UI components

### Unit Testing

**Component Rendering:**

```typescript
import { render, screen } from "@testing-library/react";
import { ProtectionLevelCard } from "./ProtectionLevelCard";

describe("ProtectionLevelCard", () => {
	const mockProps = {
		level: "watched" as const,
		title: "Watched Protection",
		description: "Monitor file changes",
		features: ["Auto-save", "Minimal notifications"],
		imageSrc: "/images/3d_hats/blue-hat-watch.png",
		imageAlt: "Blue detective hat",
	};

	it("renders all content correctly", () => {
		render(<ProtectionLevelCard {...mockProps} />);

		expect(screen.getByText("Watched Protection")).toBeInTheDocument();
		expect(screen.getByText("Monitor file changes")).toBeInTheDocument();
		expect(screen.getByText("Auto-save")).toBeInTheDocument();
		expect(screen.getByAltText("Blue detective hat")).toBeInTheDocument();
	});

	it("applies correct level-specific styling", () => {
		const { container } = render(<ProtectionLevelCard {...mockProps} />);
		const card = container.firstChild;

		// Check for level-specific class or style
		expect(card).toHaveClass("level-watched");
	});
});
```

**Props Validation:**

```typescript
it("handles all protection levels", () => {
	const levels: Array<"watched" | "protected" | "critical"> = [
		"watched",
		"protected",
		"critical",
	];

	levels.forEach((level) => {
		const { rerender } = render(
			<ProtectionLevelCard {...mockProps} level={level} />
		);
		expect(screen.getByText(mockProps.title)).toBeInTheDocument();
	});
});

it("handles optional props", () => {
	render(<ProtectionLevelCard {...mockProps} delay={0.5} />);
	// Should render without crashing
	expect(screen.getByText(mockProps.title)).toBeInTheDocument();
});
```

**Animation Testing:**

```typescript
import { waitFor } from "@testing-library/react";

it("respects reduced motion preferences", () => {
	// Mock reduced motion preference
	window.matchMedia = vi.fn().mockImplementation((query) => ({
		matches: query === "(prefers-reduced-motion: reduce)",
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));

	render(<ProtectionLevelCard {...mockProps} />);

	// Verify no animations applied
	const card = screen.getByRole("article");
	expect(card).not.toHaveStyle({ transform: expect.anything() });
});
```

### Integration Testing

**User Interactions:**

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigDisplay } from "./ConfigDisplay";

describe("ConfigDisplay Integration", () => {
	it("copies configuration to clipboard on button click", async () => {
		const user = userEvent.setup();
		const mockConfig = '{"version": "2.0"}';

		// Mock clipboard API
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});

		render(<ConfigDisplay content={mockConfig} enableCopy />);

		const copyButton = screen.getByLabelText(/copy/i);
		await user.click(copyButton);

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockConfig);
		expect(screen.getByText(/copied/i)).toBeInTheDocument();
	});

	it("downloads configuration file", async () => {
		const user = userEvent.setup();
		const mockConfig = '{"version": "2.0"}';

		// Mock URL.createObjectURL
		global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
		global.URL.revokeObjectURL = vi.fn();

		// Mock <a> element click
		const mockClick = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue({
			click: mockClick,
			href: "",
			download: "",
		} as any);

		render(<ConfigDisplay content={mockConfig} enableDownload />);

		const downloadButton = screen.getByLabelText(/download/i);
		await user.click(downloadButton);

		expect(mockClick).toHaveBeenCalled();
		expect(URL.createObjectURL).toHaveBeenCalled();
	});
});
```

**State Management:**

```typescript
describe("RecoveryTimeline Integration", () => {
	it("updates active step on navigation", async () => {
		const user = userEvent.setup();
		const mockSteps = [
			{ id: "1", title: "Step 1", description: "First step" },
			{ id: "2", title: "Step 2", description: "Second step" },
		];

		render(<RecoveryTimeline steps={mockSteps} activeStep={0} />);

		const nextButton = screen.getByLabelText(/next/i);
		await user.click(nextButton);

		// Verify active step changed
		expect(screen.getByText("Step 2")).toHaveAttribute(
			"aria-current",
			"step"
		);
	});

	it("navigates using keyboard arrows", async () => {
		const user = userEvent.setup();
		const mockSteps = [
			{ id: "1", title: "Step 1", description: "First step" },
			{ id: "2", title: "Step 2", description: "Second step" },
		];

		const { container } = render(
			<RecoveryTimeline steps={mockSteps} activeStep={0} enableKeyboard />
		);

		// Focus container
		container.firstChild?.focus();

		// Press arrow key
		await user.keyboard("{ArrowRight}");

		expect(screen.getByText("Step 2")).toHaveAttribute(
			"aria-current",
			"step"
		);
	});
});
```

### Accessibility Testing

**Automated Accessibility Testing:**

```typescript
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("Accessibility Tests", () => {
	it("HatSystemSection should have no a11y violations", async () => {
		const { container } = render(<HatSystemSection />);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it("ConfigDisplay should have no a11y violations", async () => {
		const { container } = render(
			<ConfigDisplay content='{"test": true}' />
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});

	it("RecoveryTimeline should have no a11y violations", async () => {
		const mockSteps = [{ id: "1", title: "Step 1", description: "First" }];
		const { container } = render(
			<RecoveryTimeline steps={mockSteps} activeStep={0} />
		);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
```

**Keyboard Navigation Testing:**

```typescript
describe("Keyboard Accessibility", () => {
	it("all interactive elements are keyboard accessible", async () => {
		const user = userEvent.setup();
		render(<HatSystemSection />);

		// Tab through all interactive elements
		await user.tab();
		expect(
			screen.getByRole("button", { name: /learn more/i })
		).toHaveFocus();

		await user.tab();
		expect(
			screen.getByRole("link", { name: /documentation/i })
		).toHaveFocus();
	});

	it("Enter and Space keys activate buttons", async () => {
		const user = userEvent.setup();
		const mockOnClick = vi.fn();

		render(<button onClick={mockOnClick}>Click me</button>);

		const button = screen.getByRole("button");
		button.focus();

		await user.keyboard("{Enter}");
		expect(mockOnClick).toHaveBeenCalledTimes(1);

		await user.keyboard(" ");
		expect(mockOnClick).toHaveBeenCalledTimes(2);
	});

	it("Escape key closes modals/dialogs", async () => {
		const user = userEvent.setup();
		const mockOnClose = vi.fn();

		render(<Modal isOpen onClose={mockOnClose} />);

		await user.keyboard("{Escape}");
		expect(mockOnClose).toHaveBeenCalled();
	});
});
```

**Screen Reader Testing:**

```typescript
describe("Screen Reader Support", () => {
	it("provides descriptive labels for icon buttons", () => {
		render(<ConfigActions onCopy={vi.fn()} onDownload={vi.fn()} />);

		expect(
			screen.getByLabelText("Copy configuration to clipboard")
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("Download configuration file")
		).toBeInTheDocument();
	});

	it("announces dynamic content changes", async () => {
		const user = userEvent.setup();
		render(<ConfigDisplay content='{"test": true}' enableCopy />);

		const copyButton = screen.getByLabelText(/copy/i);
		await user.click(copyButton);

		// Check for live region announcement
		expect(screen.getByRole("status")).toHaveTextContent(/copied/i);
	});

	it("provides context for complex interactions", () => {
		render(<RecoveryTimeline steps={mockSteps} activeStep={1} />);

		expect(screen.getByLabelText(/step 2 of 5/i)).toBeInTheDocument();
	});
});
```

**Focus Management Testing:**

```typescript
describe("Focus Management", () => {
	it("maintains focus after interactions", async () => {
		const user = userEvent.setup();
		render(<ConfigDisplay content='{"test": true}' enableCopy />);

		const copyButton = screen.getByLabelText(/copy/i);
		await user.click(copyButton);

		// Focus should remain on button
		expect(copyButton).toHaveFocus();
	});

	it("traps focus within modal", async () => {
		const user = userEvent.setup();
		render(
			<Modal isOpen>
				<button>Close</button>
			</Modal>
		);

		// Tab should cycle within modal
		await user.tab();
		expect(screen.getByRole("button", { name: /close/i })).toHaveFocus();

		await user.tab();
		// Should loop back to first element
	});
});
```

### Visual Regression Testing

**Snapshot Testing:**

```typescript
describe("Visual Regression", () => {
	it("matches snapshot for default state", () => {
		const { container } = render(<ProtectionLevelCard {...mockProps} />);
		expect(container).toMatchSnapshot();
	});

	it("matches snapshot for hover state", () => {
		const { container } = render(<ProtectionLevelCard {...mockProps} />);
		const card = screen.getByRole("article");

		fireEvent.mouseEnter(card);
		expect(container).toMatchSnapshot();
	});
});
```

**Playwright Visual Testing:**

```typescript
// tests/e2e/marketing-site.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Marketing Site Visual Tests", () => {
	test("Hat System Section renders correctly", async ({ page }) => {
		await page.goto("/");
		await page.locator("#hat-system-section").scrollIntoViewIfNeeded();

		await expect(page.locator("#hat-system-section")).toHaveScreenshot(
			"hat-system-section.png"
		);
	});

	test("Config Display renders correctly", async ({ page }) => {
		await page.goto("/");
		await page.locator("#config-section").scrollIntoViewIfNeeded();

		await expect(page.locator("#config-section")).toHaveScreenshot(
			"config-section.png"
		);
	});

	test("Recovery Timeline renders correctly", async ({ page }) => {
		await page.goto("/");
		await page.locator("#recovery-section").scrollIntoViewIfNeeded();

		await expect(page.locator("#recovery-section")).toHaveScreenshot(
			"recovery-section.png"
		);
	});
});
```

### Performance Testing

**Component Performance:**

```typescript
import { render } from "@testing-library/react";

describe("Performance Tests", () => {
	it("renders large lists efficiently", () => {
		const startTime = performance.now();

		const manyItems = Array.from({ length: 100 }, (_, i) => ({
			id: `${i}`,
			title: `Item ${i}`,
			description: `Description ${i}`,
		}));

		render(<HatSystemSection items={manyItems} />);

		const endTime = performance.now();
		const renderTime = endTime - startTime;

		// Should render in less than 100ms
		expect(renderTime).toBeLessThan(100);
	});

	it("handles rapid interactions without lag", async () => {
		const user = userEvent.setup();
		render(<RecoveryTimeline steps={mockSteps} activeStep={0} />);

		const nextButton = screen.getByLabelText(/next/i);

		const startTime = performance.now();

		// Rapid clicks
		for (let i = 0; i < 10; i++) {
			await user.click(nextButton);
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;

		// Should handle 10 clicks in less than 500ms
		expect(totalTime).toBeLessThan(500);
	});
});
```

### Test Organization

**File Structure:**

```
__tests__/
├── components/
│   ├── HatSystemSection.test.tsx
│   ├── ProtectionLevelCard.test.tsx
│   ├── ConfigDisplay.test.tsx
│   ├── RecoveryTimeline.test.tsx
│   └── DiffPreview.test.tsx
│
├── integration/
│   ├── hat-system-flow.test.tsx
│   ├── config-interactions.test.tsx
│   └── recovery-navigation.test.tsx
│
├── accessibility/
│   ├── hat-system-a11y.test.tsx
│   ├── config-a11y.test.tsx
│   └── recovery-a11y.test.tsx
│
└── e2e/
    └── marketing-site.spec.ts
```

### Test Utilities

**Custom Render Function:**

```typescript
// __tests__/utils/test-utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";

// Mock providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
	return (
		<ThemeProvider>
			<I18nProvider>{children}</I18nProvider>
		</ThemeProvider>
	);
};

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
```

**Mock Data Factory:**

```typescript
// __tests__/utils/mock-data.ts
export const createMockProtectionLevel = (
	overrides?: Partial<ProtectionLevelCardProps>
): ProtectionLevelCardProps => ({
	level: "watched",
	title: "Watched Protection",
	description: "Monitor file changes",
	features: ["Auto-save", "Notifications"],
	imageSrc: "/images/3d_hats/blue-hat-watch.png",
	imageAlt: "Blue hat",
	...overrides,
});

export const createMockRecoverySteps = (count: number = 5): RecoveryStep[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `step-${i}`,
		timestamp: `2:${40 + i} PM`,
		title: `Step ${i + 1}`,
		description: `Description for step ${i + 1}`,
		diff: {
			before: "old code",
			after: "new code",
			language: "typescript",
		},
	}));
```

---

## Performance Guidelines

### Core Web Vitals Targets

| Metric                              | Target  | Description          |
| ----------------------------------- | ------- | -------------------- |
| **LCP** (Largest Contentful Paint)  | < 2.5s  | Main content visible |
| **FID** (First Input Delay)         | < 100ms | Interactivity delay  |
| **CLS** (Cumulative Layout Shift)   | < 0.1   | Visual stability     |
| **INP** (Interaction to Next Paint) | < 200ms | Responsiveness       |
| **TTFB** (Time to First Byte)       | < 800ms | Server response      |

### Optimization Strategies

#### 1. Code Splitting

**Route-Based Splitting:**

```typescript
// app/(marketing)/[locale]/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load sections below the fold
const RecoverySection = dynamic(() => import("./components/RecoverySection"), {
	loading: () => <SectionSkeleton />,
	ssr: true, // Server-side render for SEO
});

export default function MarketingPage() {
	return (
		<>
			{/* Above the fold - eager load */}
			<HeroSection />
			<HatSystemSection />

			{/* Below the fold - lazy load */}
			<Suspense fallback={<SectionSkeleton />}>
				<TeamConfigSection />
				<RecoverySection />
			</Suspense>
		</>
	);
}
```

**Component-Based Splitting:**

```typescript
// Heavy components loaded on interaction
const Modal = dynamic(() => import("./Modal"), {
	loading: () => <Spinner />,
	ssr: false,
});

const [showModal, setShowModal] = useState(false);

<button onClick={() => setShowModal(true)}>Open</button>;
{
	showModal && <Modal onClose={() => setShowModal(false)} />;
}
```

#### 2. Image Optimization

**Next.js Image Component:**

```typescript
import Image from "next/image";

<Image
	src="/images/3d_hats/blue-hat-watch.png"
	alt="Blue detective hat"
	width={400}
	height={400}
	quality={85} // Optimized quality (default: 75)
	priority={isFold} // Priority for above-the-fold images
	placeholder="blur" // Blur-up placeholder
	blurDataURL={blurData} // Low-quality placeholder
	sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
	loading={isFold ? "eager" : "lazy"}
/>;
```

**Image Format Selection:**

```typescript
// Next.js automatically serves modern formats
// Priority: AVIF > WebP > original format

// Optional: Explicit format handling
const imageConfig = {
	formats: ["image/avif", "image/webp"],
	deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
	imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
};
```

**Responsive Images:**

```typescript
<picture>
	<source
		media="(max-width: 767px)"
		srcSet="/images/mobile-hat.avif"
		type="image/avif"
	/>
	<source
		media="(max-width: 767px)"
		srcSet="/images/mobile-hat.webp"
		type="image/webp"
	/>
	<source
		media="(min-width: 768px)"
		srcSet="/images/desktop-hat.avif"
		type="image/avif"
	/>
	<img
		src="/images/desktop-hat.png"
		alt="Protection level hat"
		loading="lazy"
	/>
</picture>
```

#### 3. Animation Performance

**GPU-Accelerated Properties:**

```typescript
// ✅ Use transform and opacity (GPU-accelerated)
const performantAnimation = {
	initial: { opacity: 0, transform: "translateY(20px)" },
	animate: { opacity: 1, transform: "translateY(0)" },
};

// ❌ Avoid layout-triggering properties
const slowAnimation = {
	initial: { height: 0, marginTop: 20 },
	animate: { height: "auto", marginTop: 0 },
};
```

**will-change Optimization:**

```css
/* Use sparingly, only for actively animating elements */
.animating-element {
	will-change: transform, opacity;
}

/* Remove after animation completes */
.animation-complete {
	will-change: auto;
}
```

**Framer Motion Optimization:**

```typescript
import { motion, useReducedMotion } from "motion/react";

// Layout animations are expensive - use conditionally
const Card = () => {
	const reducedMotion = useReducedMotion();

	return (
		<motion.div
			layout={!reducedMotion} // Disable layout animations for reduced motion
			layoutId="card" // Shared layout animations
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{
				type: "spring",
				stiffness: 300,
				damping: 30,
				mass: 0.8,
			}}
		>
			{content}
		</motion.div>
	);
};
```

#### 4. Bundle Size Optimization

**Tree Shaking:**

```typescript
// ✅ Import only what you need
import { motion } from "motion/react";
import { useInView, useScroll } from "motion/react";

// ❌ Avoid namespace imports
import * as Motion from "motion/react";
```

**Dynamic Imports:**

```typescript
// Heavy utility loaded on demand
const handleExport = async () => {
	const { exportToPDF } = await import("./utils/export");
	exportToPDF(data);
};
```

**Bundle Analysis:**

```bash
# Analyze bundle size
pnpm build
npx @next/bundle-analyzer

# Check specific imports
npx bundle-phobia <package-name>
```

#### 5. Rendering Optimization

**React Server Components:**

```typescript
// app/(marketing)/[locale]/page.tsx
// Server component by default (no "use client")

export default async function MarketingPage() {
	// Fetch data on server
	const data = await fetchMarketingData();

	return (
		<>
			<HeroSection data={data} />

			{/* Client component for interactivity */}
			<ClientInteractiveSection />
		</>
	);
}
```

**Memoization:**

```typescript
import { memo, useMemo, useCallback } from "react";

// Memoize expensive components
export const ProtectionLevelCard = memo(({ level, ...props }) => {
	// Component implementation
});

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
	return processLargeDataset(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
	doSomething(id);
}, [id]);
```

**Virtual Scrolling:**

```typescript
// For large lists (>50 items)
import { useVirtualizer } from "@tanstack/react-virtual";

const VirtualList = ({ items }) => {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 100, // Estimated item height
		overscan: 5, // Render 5 extra items
	});

	return (
		<div ref={parentRef} style={{ height: "500px", overflow: "auto" }}>
			<div style={{ height: virtualizer.getTotalSize() }}>
				{virtualizer.getVirtualItems().map((virtualItem) => (
					<div
						key={virtualItem.key}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${virtualItem.start}px)`,
						}}
					>
						{items[virtualItem.index]}
					</div>
				))}
			</div>
		</div>
	);
};
```

#### 6. Network Optimization

**Preloading Critical Resources:**

```typescript
// app/layout.tsx
import { headers } from "next/headers";

export default function RootLayout({ children }) {
	return (
		<html>
			<head>
				{/* Preload critical fonts */}
				<link
					rel="preload"
					href="/fonts/inter.woff2"
					as="font"
					type="font/woff2"
					crossOrigin="anonymous"
				/>

				{/* Preconnect to external domains */}
				<link rel="preconnect" href="https://cdn.example.com" />
				<link rel="dns-prefetch" href="https://api.example.com" />
			</head>
			<body>{children}</body>
		</html>
	);
}
```

**Resource Hints:**

```typescript
// Prefetch next page
<Link href="/docs" prefetch={true}>
	Documentation
</Link>;

// Preload on hover
const [shouldPreload, setShouldPreload] = useState(false);

<Link
	href="/docs"
	onMouseEnter={() => setShouldPreload(true)}
	prefetch={shouldPreload}
>
	Documentation
</Link>;
```

**Caching Strategy:**

```typescript
// next.config.js
export default {
	images: {
		minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
	},

	headers: async () => [
		{
			source: "/images/:path*",
			headers: [
				{
					key: "Cache-Control",
					value: "public, max-age=31536000, immutable",
				},
			],
		},
	],
};
```

#### 7. Third-Party Script Optimization

**Next.js Script Component:**

```typescript
import Script from "next/script";

export default function Page() {
	return (
		<>
			{/* Load after page interactive */}
			<Script
				src="https://analytics.example.com/script.js"
				strategy="afterInteractive"
			/>

			{/* Load lazily */}
			<Script
				src="https://widget.example.com/widget.js"
				strategy="lazyOnload"
			/>

			{/* Inline critical scripts */}
			<Script id="critical-script" strategy="beforeInteractive">
				{`window.config = ${JSON.stringify(config)};`}
			</Script>
		</>
	);
}
```

#### 8. Performance Monitoring

**Web Vitals Tracking:**

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
	return (
		<html>
			<body>
				{children}
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
```

**Custom Performance Metrics:**

```typescript
// lib/performance.ts
export const measurePerformance = (metricName: string) => {
	if (typeof window === "undefined") return;

	performance.mark(`${metricName}-start`);

	return () => {
		performance.mark(`${metricName}-end`);
		performance.measure(
			metricName,
			`${metricName}-start`,
			`${metricName}-end`
		);

		const measure = performance.getEntriesByName(metricName)[0];
		console.log(`${metricName}: ${measure.duration}ms`);
	};
};

// Usage
const endMeasure = measurePerformance("component-render");
// ... component logic
endMeasure();
```

### Performance Budget

| Resource Type     | Budget              | Rationale             |
| ----------------- | ------------------- | --------------------- |
| JavaScript        | < 200 KB            | Fast interactive time |
| CSS               | < 50 KB             | Quick first paint     |
| Images            | < 500 KB (per page) | Reasonable load time  |
| Fonts             | < 100 KB            | Fast text rendering   |
| Total Page Weight | < 1 MB              | Mobile-friendly       |

---

## Implementation Checklist

### Phase 1: Foundation Setup

-   [ ] **Project Structure**

    -   [ ] Create component directories
    -   [ ] Set up test directories
    -   [ ] Configure path aliases
    -   [ ] Set up mock data files

-   [ ] **Accessibility Infrastructure**

    -   [ ] Create `accessibility.ts` utility file
    -   [ ] Set up jest-axe configuration
    -   [ ] Create reusable a11y hooks
    -   [ ] Document a11y patterns

-   [ ] **Animation System**
    -   [ ] Verify motion utilities
    -   [ ] Create animation presets
    -   [ ] Set up reduced motion handling
    -   [ ] Document animation patterns

### Phase 2: Hat System Section

-   [ ] **Component Development**

    -   [ ] Create `HatSystemSection` container
    -   [ ] Create `ProtectionLevelCard` component
    -   [ ] Create `HatAnimationWrapper` orchestrator
    -   [ ] Implement responsive layouts
    -   [ ] Integrate 3D hat assets

-   [ ] **Testing**

    -   [ ] Unit tests: Component rendering
    -   [ ] Unit tests: Props validation
    -   [ ] Integration tests: Animation behavior
    -   [ ] Accessibility tests: WCAG compliance
    -   [ ] Visual regression tests

-   [ ] **Documentation**
    -   [ ] Component API documentation
    -   [ ] Usage examples
    -   [ ] Storybook stories (optional)

### Phase 3: Team Config Section

-   [ ] **Component Development**

    -   [ ] Create `TeamConfigSection` container
    -   [ ] Create `ConfigDisplay` with syntax highlighting
    -   [ ] Create `ConfigActions` button group
    -   [ ] Implement copy functionality
    -   [ ] Implement download functionality

-   [ ] **Testing**

    -   [ ] Unit tests: Syntax highlighting
    -   [ ] Integration tests: Copy/download
    -   [ ] Accessibility tests: Button interactions
    -   [ ] Keyboard navigation tests

-   [ ] **Documentation**
    -   [ ] Configuration format spec
    -   [ ] Usage examples
    -   [ ] Customization guide

### Phase 4: Recovery Section

-   [ ] **Component Development**

    -   [ ] Create `RecoverySection` container
    -   [ ] Create `RecoveryTimeline` component
    -   [ ] Create `DiffPreview` component
    -   [ ] Create `TimelineNavigator` controls
    -   [ ] Implement sticky scroll behavior

-   [ ] **Testing**

    -   [ ] Unit tests: Timeline rendering
    -   [ ] Integration tests: Navigation
    -   [ ] Accessibility tests: Keyboard controls
    -   [ ] Performance tests: Scroll smoothness

-   [ ] **Documentation**
    -   [ ] Timeline data format
    -   [ ] Diff generation guide
    -   [ ] Customization options

### Phase 5: Integration & Polish

-   [ ] **Page Integration**

    -   [ ] Integrate all sections into main page
    -   [ ] Add section transitions
    -   [ ] Implement scroll-triggered animations
    -   [ ] Add loading states

-   [ ] **Performance Optimization**

    -   [ ] Code splitting implementation
    -   [ ] Image optimization verification
    -   [ ] Bundle size analysis
    -   [ ] Lighthouse audit (score > 90)

-   [ ] **Cross-Browser Testing**

    -   [ ] Chrome/Edge testing
    -   [ ] Firefox testing
    -   [ ] Safari testing
    -   [ ] Mobile browser testing

-   [ ] **Accessibility Audit**
    -   [ ] WCAG 2.1 AA compliance verification
    -   [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
    -   [ ] Keyboard navigation verification
    -   [ ] Color contrast verification

### Phase 6: Launch Preparation

-   [ ] **Documentation**

    -   [ ] Component library documentation
    -   [ ] Maintenance guide
    -   [ ] Performance monitoring setup
    -   [ ] Troubleshooting guide

-   [ ] **Quality Assurance**

    -   [ ] E2E test suite completion
    -   [ ] Visual regression baseline
    -   [ ] Load testing
    -   [ ] Security audit

-   [ ] **Deployment**
    -   [ ] Staging deployment
    -   [ ] Production deployment
    -   [ ] Monitoring setup
    -   [ ] Rollback plan

---

## Appendix

### Color System Reference

```typescript
export const protectionLevelColors = {
	watched: {
		primary: "hsl(220 100% 60%)", // Blue
		bg: "hsl(220 100% 60% / 0.1)",
		border: "hsl(220 100% 60% / 0.3)",
		glow: "hsla(220, 100%, 60%, 0.3)",
	},
	protected: {
		primary: "hsl(45 100% 60%)", // Yellow
		bg: "hsl(45 100% 60% / 0.1)",
		border: "hsl(45 100% 60% / 0.3)",
		glow: "hsla(45, 100%, 60%, 0.3)",
	},
	critical: {
		primary: "hsl(0 85% 60%)", // Red
		bg: "hsl(0 85% 60% / 0.1)",
		border: "hsl(0 85% 60% / 0.3)",
		glow: "hsla(0, 85%, 60%, 0.3)",
	},
} as const;
```

### Asset Paths Reference

```typescript
export const assetPaths = {
	hats: {
		blue: "/images/3d_hats/blue-hat-watch.png",
		yellow: "/images/3d_hats/yellow-hat-warn.png",
		red: "/images/3d_hats/red-hat-block.png",
		all: "/images/3d_hats/all-3-hats.png",
	},
	icons: {
		blue: "/images/icons/blue-hat-icon.png",
		yellow: "/images/icons/yellow-hat-icon.png",
		red: "/images/icons/red-hat-icon.png",
	},
} as const;
```

### Typography Scale

```typescript
export const typography = {
	heading1: "clamp(2rem, 5vw, 3.5rem)", // 32px → 56px
	heading2: "clamp(1.5rem, 4vw, 2.5rem)", // 24px → 40px
	heading3: "clamp(1.25rem, 3vw, 2rem)", // 20px → 32px
	body: "clamp(0.875rem, 2vw, 1rem)", // 14px → 16px
	caption: "clamp(0.75rem, 1.5vw, 0.875rem)", // 12px → 14px
	code: "clamp(0.75rem, 1.5vw, 0.875rem)", // 12px → 14px
} as const;
```

### Useful Resources

**Documentation:**

-   [Framer Motion Docs](https://www.framer.com/motion/)
-   [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
-   [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
-   [Tailwind CSS Docs](https://tailwindcss.com/docs)

**Testing:**

-   [Vitest Documentation](https://vitest.dev/)
-   [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
-   [jest-axe](https://github.com/nickcolley/jest-axe)
-   [Playwright](https://playwright.dev/)

**Performance:**

-   [Web Vitals](https://web.dev/vitals/)
-   [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
-   [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

**Document Status:** Ready for Implementation
**Next Steps:** Share with system-architect for component implementation

**Questions or Clarifications:**
Contact frontend-architect for architecture guidance or implementation support.
