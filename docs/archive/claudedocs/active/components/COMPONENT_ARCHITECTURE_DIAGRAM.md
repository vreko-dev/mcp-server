# Component Library Architecture Diagram

**Visual Reference**: Component organization and relationships

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    @/modules/ui/components                      │
│                  (Unified Component Library)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ Base UI  │       │  Motion  │       │  Domain  │
    │Components│       │Components│       │Specific  │
    └──────────┘       └──────────┘       └──────────┘
```

---

## Detailed Component Tree

```
apps/web/modules/ui/
│
├── components/
│   │
│   ├── primitives/                    [Base Radix UI Components]
│   │   ├── accordion.tsx              • Collapsible sections
│   │   ├── alert-dialog.tsx           • Modal confirmations
│   │   ├── avatar.tsx                 • User profile images
│   │   ├── badge.tsx                  • Status indicators
│   │   ├── button.tsx                 • Primary interaction ⭐
│   │   ├── card.tsx                   • Content containers ⭐
│   │   ├── dialog.tsx                 • Modal dialogs
│   │   ├── dropdown-menu.tsx          • Contextual menus
│   │   ├── input.tsx                  • Text input fields ⭐
│   │   ├── label.tsx                  • Form labels
│   │   ├── select.tsx                 • Dropdown selectors
│   │   ├── sheet.tsx                  • Side panels
│   │   ├── table.tsx                  • Data tables
│   │   ├── tabs.tsx                   • Tab navigation
│   │   ├── textarea.tsx               • Multi-line input
│   │   ├── tooltip.tsx                • Contextual hints
│   │   └── index.ts                   • Barrel export
│   │
│   ├── composed/                      [Built from Primitives]
│   │   ├── form.tsx                   • Form wrapper with validation
│   │   ├── input-otp.tsx              • One-time password input
│   │   ├── password-input.tsx         • Password with visibility toggle
│   │   ├── command-palette.tsx        • Command search (Cmd+K)
│   │   ├── data-table.tsx             • Advanced data table
│   │   └── index.ts
│   │
│   ├── feedback/                      [User Feedback States]
│   │   ├── alert.tsx                  • Inline notifications
│   │   ├── progress.tsx               • Progress indicators
│   │   ├── skeleton.tsx               • Loading placeholders ⭐
│   │   ├── spinner.tsx                • Loading spinners
│   │   ├── toast.tsx                  • Temporary notifications ⭐
│   │   ├── loading-states.tsx         • Various loading states
│   │   └── index.ts
│   │
│   ├── layout/                        [Structural Components]
│   │   ├── bento-grid.tsx             • Grid layout system ⭐
│   │   ├── container.tsx              • Content wrapper
│   │   ├── section.tsx                • Page sections
│   │   ├── stagger-container.tsx      • Staggered animations
│   │   └── index.ts
│   │
│   ├── motion/                        [Animated Components]
│   │   │
│   │   ├── aceternity/                [Aceternity UI]
│   │   │   ├── background-beams.tsx   • Animated backgrounds ⭐
│   │   │   ├── hero-highlight.tsx     • Text highlighting
│   │   │   ├── parallax-scroll.tsx    • Parallax effects
│   │   │   ├── spotlight.tsx          • Spotlight effects ⭐
│   │   │   ├── sticky-scroll-reveal.tsx • Sticky reveals
│   │   │   ├── tracing-beam.tsx       • Path tracing
│   │   │   ├── card-3d.tsx            • 3D card effects
│   │   │   ├── scroll-velocity.tsx    • Velocity scrolling
│   │   │   │
│   │   │   │ [NEW COMPONENTS]
│   │   │   ├── lamp-effect.tsx        • Dramatic lighting 🆕
│   │   │   ├── aurora-background.tsx  • Aurora gradients 🆕
│   │   │   ├── shooting-stars.tsx     • Star animations 🆕
│   │   │   ├── meteors.tsx            • Meteor effects 🆕
│   │   │   ├── sparkles.tsx           • Sparkle effects 🆕
│   │   │   ├── grid-background.tsx    • Grid patterns 🆕
│   │   │   ├── dots-background.tsx    • Dot matrix 🆕
│   │   │   └── index.ts
│   │   │
│   │   ├── magic/                     [Magic UI]
│   │   │   ├── animated-list.tsx      • List animations
│   │   │   ├── blur-fade.tsx          • Blur transitions
│   │   │   ├── blur-in.tsx            • Blur entrance
│   │   │   ├── confetti.tsx           • Celebration effects ⭐
│   │   │   ├── number-ticker.tsx      • Animated numbers ⭐
│   │   │   ├── rainbow-button.tsx     • Rainbow gradients
│   │   │   │
│   │   │   │ [NEW COMPONENTS]
│   │   │   ├── marquee.tsx            • Infinite scrolling 🆕
│   │   │   ├── animated-beam.tsx      • Connection lines 🆕
│   │   │   ├── dock.tsx               • macOS-style dock 🆕
│   │   │   ├── orbiting-circles.tsx   • Orbit animations 🆕
│   │   │   ├── text-animate.tsx       • Text entrance 🆕
│   │   │   ├── word-rotate.tsx        • Rotating words 🆕
│   │   │   ├── border-beam.tsx        • Border animations 🆕
│   │   │   ├── shiny-button.tsx       • Reflective buttons 🆕
│   │   │   └── index.ts
│   │   │
│   │   ├── interactions/              [Interactive Motion]
│   │   │   ├── magnetic-button.tsx    • Magnetic hover
│   │   │   ├── magnetic-hover.tsx     • Magnetic effects
│   │   │   ├── hover-underline.tsx    • Animated underlines
│   │   │   ├── typewriter-effect.tsx  • Typewriter animation ⭐
│   │   │   ├── text-generate-effect.tsx • Text generation
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── domain/                        [Feature-Specific]
│   │   │
│   │   ├── terminal/                  [Terminal Components]
│   │   │   ├── terminal.tsx           • Terminal emulation ⭐
│   │   │   ├── terminal-toast.tsx     • Terminal notifications
│   │   │   ├── terminal-ultimate.tsx  • Advanced terminal
│   │   │   └── index.ts
│   │   │
│   │   ├── marketing/                 [Marketing Components]
│   │   │   ├── api-key-reveal.tsx     • API key display ⭐
│   │   │   ├── metric-card.tsx        • Metric displays ⭐
│   │   │   ├── testimonial-card.tsx   • Testimonials
│   │   │   ├── infinite-moving-cards.tsx • Carousel ⭐
│   │   │   ├── logo-carousel.tsx      • Logo displays
│   │   │   ├── split-comparison.tsx   • Before/after
│   │   │   └── index.ts
│   │   │
│   │   ├── onboarding/                [Onboarding Flow]
│   │   │   ├── onboarding-wizard.tsx  • Multi-step wizard ⭐
│   │   │   ├── empty-checkpoints.tsx  • Empty states
│   │   │   └── index.ts
│   │   │
│   │   ├── navigation/                [Navigation Components]
│   │   │   ├── floating-nav.tsx       • Floating navigation
│   │   │   ├── scroll-progress.tsx    • Scroll indicators
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   └── index.ts                       [Main Barrel Export]
│
├── hooks/                             [Custom React Hooks]
│   ├── use-reduced-motion.ts          • Reduced motion detection ⭐
│   ├── use-konami-code.ts             • Konami code detection
│   ├── use-intersection-observer.ts   • Intersection observer
│   ├── use-media-query.ts             • Media query hook
│   └── index.ts
│
├── lib/                               [Utilities & Helpers]
│   ├── utils.ts                       • cn() className utility ⭐
│   ├── motion.ts                      • Motion utilities
│   ├── animations.ts                  • Animation presets ⭐
│   └── index.ts
│
└── styles/                            [Component Styles]
    ├── animations.css                 • @keyframes definitions
    └── components.css                 • Component-specific styles

Legend:
⭐ = High usage/priority component
🆕 = New component to be added
```

---

## Component Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                        Application                           │
└──────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌──────────┐      ┌──────────┐     ┌──────────┐
  │ Marketing│      │   Saas   │     │  Shared  │
  │  Pages   │      │  Pages   │     │Components│
  └──────────┘      └──────────┘     └──────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │    Domain-Specific Components       │
        │  (terminal, marketing, onboarding)  │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      Motion Components              │
        │  (aceternity, magic, interactions)  │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │    Layout & Feedback Components     │
        │      (bento-grid, toast, etc.)      │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      Composed Components            │
        │    (form, password-input, etc.)     │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │        Primitive Components         │
        │    (button, input, card, etc.)      │
        └─────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌────────┐       ┌────────┐       ┌────────┐
   │ Radix  │       │ Hooks  │       │  Lib   │
   │   UI   │       │        │       │ Utils  │
   └────────┘       └────────┘       └────────┘
```

---

## Import Path Examples

### Primitives

```typescript
// Recommended: Category barrel
import { Button, Input, Label, Card } from "@/modules/ui/components/primitives";

// Also valid: Direct import
import { Button } from "@/modules/ui/components/primitives/button";
```

### Composed Components

```typescript
import { Form, PasswordInput } from "@/modules/ui/components/composed";
```

### Feedback Components

```typescript
import { Toast, Skeleton, Progress } from "@/modules/ui/components/feedback";
```

### Layout Components

```typescript
import { BentoGrid, StaggerContainer } from "@/modules/ui/components/layout";
```

### Motion - Aceternity

```typescript
import {
	BackgroundBeams,
	Spotlight,
	LampEffect,
	AuroraBackground,
} from "@/modules/ui/components/motion/aceternity";
```

### Motion - Magic

```typescript
import {
	BlurFade,
	Confetti,
	NumberTicker,
	Marquee,
	Dock,
} from "@/modules/ui/components/motion/magic";
```

### Motion - Interactions

```typescript
import {
	MagneticButton,
	TypewriterEffect,
} from "@/modules/ui/components/motion/interactions";
```

### Domain - Terminal

```typescript
import {
	Terminal,
	TerminalToast,
} from "@/modules/ui/components/domain/terminal";
```

### Domain - Marketing

```typescript
import {
	ApiKeyReveal,
	MetricCard,
	InfiniteMovingCards,
} from "@/modules/ui/components/domain/marketing";
```

### Hooks

```typescript
import { useReducedMotion, useKonamiCode } from "@/modules/ui/hooks";
```

### Utilities

```typescript
import { cn } from "@/modules/ui/lib/utils";
import { fadeInUp, springConfig } from "@/modules/ui/lib/animations";
```

---

## Component Composition Pattern

```
Page Component
    │
    ├─► Layout Component (BentoGrid)
    │       │
    │       ├─► Motion Component (BackgroundBeams)
    │       │       │
    │       │       └─► Utility (useReducedMotion)
    │       │
    │       └─► Domain Component (MetricCard)
    │               │
    │               ├─► Primitive (Card)
    │               │       │
    │               │       └─► Radix UI (Card Primitive)
    │               │
    │               └─► Motion (NumberTicker)
    │
    └─► Feedback Component (Toast)
            │
            ├─► Primitive (Alert)
            │
            └─► Utility (cn)
```

---

## Data Flow

```
User Interaction
    │
    ├─► Component Event Handler
    │       │
    │       ├─► Hook (useReducedMotion)
    │       │       │
    │       │       └─► Media Query API
    │       │
    │       └─► Motion Library (framer-motion)
    │               │
    │               └─► Animation Variants
    │
    └─► State Update
            │
            └─► Re-render with Animation
```

---

## Accessibility Flow

```
Component Render
    │
    ├─► ARIA Attributes Applied
    │       │
    │       ├─► role="..."
    │       ├─► aria-label="..."
    │       ├─► aria-describedby="..."
    │       └─► aria-expanded="..."
    │
    ├─► Keyboard Event Handlers
    │       │
    │       ├─► onKeyDown
    │       ├─► Tab navigation
    │       └─► Enter/Space activation
    │
    ├─► Focus Management
    │       │
    │       ├─► Visible focus ring
    │       ├─► Focus trap (dialogs)
    │       └─► Focus restoration
    │
    └─► Screen Reader Announcements
            │
            ├─► Live regions (aria-live)
            ├─► Status updates
            └─► Error messages
```

---

## Performance Optimization Flow

```
Component Import
    │
    ├─► Tree Shaking (barrel exports)
    │       │
    │       └─► Only used exports bundled
    │
    ├─► Code Splitting
    │       │
    │       ├─► Lazy loading (React.lazy)
    │       ├─► Suspense boundaries
    │       └─► Dynamic imports
    │
    ├─► Bundle Optimization
    │       │
    │       ├─► Minification
    │       ├─► Compression (gzip/brotli)
    │       └─► Dead code elimination
    │
    └─► Runtime Optimization
            │
            ├─► React.memo (pure components)
            ├─► useMemo (expensive computations)
            ├─► useCallback (stable references)
            └─► Virtualization (long lists)
```

---

## Migration Flow

```
Phase 1: Foundation
    │
    ├─► Create directory structure
    ├─► Move primitives
    ├─► Set up utilities
    └─► Create barrel exports
        │
        ▼
Phase 2: Consolidation
    │
    ├─► Merge duplicate BentoGrid
    ├─► Resolve other duplicates
    └─► Update imports
        │
        ▼
Phase 3: Categorization
    │
    ├─► Move feedback components
    ├─► Move composed components
    ├─► Organize motion components
    └─► Organize domain components
        │
        ▼
Phase 4: New Aceternity
    │
    ├─► Add LampEffect
    ├─► Add AuroraBackground
    └─► Add other new components
        │
        ▼
Phase 5: New Magic UI
    │
    ├─► Add Marquee
    ├─► Add Dock
    └─► Add other new components
        │
        ▼
Phase 6: Import Updates
    │
    ├─► Create import mapping
    ├─► Automated updates
    └─► Manual verification
        │
        ▼
Phase 7: Testing
    │
    ├─► Unit tests
    ├─► Accessibility tests
    ├─► Performance tests
    └─► Visual regression tests
        │
        ▼
Phase 8: Documentation
    │
    ├─► Component docs
    ├─► Migration guide
    └─► Accessibility guide
        │
        ▼
    COMPLETE ✓
```

---

## Component Size Reference

**Small Components** (< 2kB gzipped):

-   Button, Input, Label, Badge, Avatar

**Medium Components** (2-5kB gzipped):

-   Card, Dialog, Form, Select, Tabs

**Large Components** (5-10kB gzipped):

-   BentoGrid, Terminal, CommandPalette, DataTable

**Very Large Components** (> 10kB gzipped):

-   BackgroundBeams, InfiniteMovingCards, OnboardingWizard

**Code Splitting Recommended For**:

-   Motion components (all sizes)
-   Domain-specific components (> 5kB)
-   Infrequently used components
-   Components not on critical path

---

## Quick Reference: Component Selection

**Need basic UI?** → `primitives/`
**Need combined functionality?** → `composed/`
**Need loading/feedback?** → `feedback/`
**Need grid/layout?** → `layout/`
**Need beautiful animations?** → `motion/aceternity/`
**Need interactive effects?** → `motion/magic/`
**Need terminal UI?** → `domain/terminal/`
**Need marketing elements?** → `domain/marketing/`
**Need onboarding flow?** → `domain/onboarding/`

---

This diagram provides a comprehensive visual reference for the component library architecture, showing the hierarchical organization, dependencies, and data flow patterns.
