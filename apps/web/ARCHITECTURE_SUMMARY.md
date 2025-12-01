# Marketing Site Architecture - Executive Summary

**Document:** `/apps/web/MARKETING_SITE_ARCHITECTURE.md`
**Status:** Ready for Implementation
**Date:** 2025-10-11

---

## Overview

Comprehensive component architecture for SnapBack's marketing site featuring three interactive showcase sections with production-ready specifications for animation, accessibility, and testing.

## Key Deliverables

### 1. Three Core Sections

#### Hat System Section

-   **Purpose:** Visual showcase of 3 protection levels with 3D interactive cards
-   **Components:** `HatSystemSection`, `ProtectionLevelCard`, `HatAnimationWrapper`
-   **Pattern:** Aceternity 3D Card with staggered entrance animations
-   **Assets:** 3D hat images (blue/yellow/red) with hover effects
-   **Responsive:** Grid layout (3-col → 2-col → 1-col)

#### Team Config Section

-   **Purpose:** Interactive `.snapbackrc` configuration display
-   **Components:** `TeamConfigSection`, `ConfigDisplay`, `ConfigActions`
-   **Features:** Syntax highlighting, copy/download functionality
-   **Pattern:** Code block with Shiki highlighting
-   **Responsive:** Split layout (40/60) → Stacked on mobile

#### Recovery Section

-   **Purpose:** Timeline-based recovery workflow visualization
-   **Components:** `RecoverySection`, `RecoveryTimeline`, `DiffPreview`, `TimelineNavigator`
-   **Pattern:** Aceternity StickyScrollReveal with diff preview
-   **Features:** Scroll-triggered animations, keyboard navigation
-   **Responsive:** Sticky layout → Accordion on mobile

### 2. Animation System

**Specifications:**

-   **Entrance:** Viewport-triggered with `useInView`, staggered children (150ms delay)
-   **Hover:** 3D tilt effects, glow animations, scale transforms
-   **Scroll:** Parallax effects, progress indicators, background gradients
-   **Easing:** Apple curves `[0.16, 1, 0.3, 1]` for premium feel
-   **Reduced Motion:** Full support with `useReducedMotion()` hook

**Performance:**

-   GPU-accelerated properties (transform, opacity)
-   Conditional `will-change` optimization
-   Spring physics with optimal stiffness/damping

### 3. Responsive Design

**Breakpoints:**

-   Mobile: 320px - 767px
-   Tablet: 768px - 1023px
-   Desktop: 1024px+

**Mobile-First:**

-   Typography: `clamp()` for fluid scaling
-   Touch targets: 48px minimum
-   Spacing: Progressive enhancement
-   Images: Responsive `sizes` attribute

**Adaptive Layouts:**

-   Grid → Stack transformations
-   Split → Stacked on mobile
-   Sticky scroll → Accordion on mobile

### 4. Accessibility (WCAG 2.1 AA)

**Semantic HTML:**

-   Proper heading hierarchy
-   `<article>`, `<section>`, `<nav>` tags
-   List semantics for features

**Keyboard Navigation:**

-   Full tab order support
-   Enter/Space activation
-   Arrow key navigation (timelines)
-   Escape key dismissal

**Screen Reader Support:**

-   Descriptive ARIA labels
-   Live regions for dynamic content
-   Progress indicators
-   Context announcements

**Visual:**

-   Color contrast ratios > 4.5:1
-   Focus indicators (2px outline)
-   Alternative text for images
-   Reduced motion support

### 5. Testing Strategy

**Unit Tests (70%):**

-   Component rendering
-   Props validation
-   Animation behavior
-   Edge cases

**Integration Tests (20%):**

-   User interactions
-   State management
-   Copy/download functionality
-   Navigation flows

**Accessibility Tests (100%):**

-   jest-axe automated testing
-   Keyboard navigation
-   Screen reader compatibility
-   Focus management

**E2E Tests (10%):**

-   Critical user flows
-   Visual regression
-   Cross-browser compatibility

### 6. Performance Optimization

**Code Splitting:**

-   Route-based splitting
-   Dynamic imports for below-fold content
-   Lazy loading heavy components

**Image Optimization:**

-   Next.js Image component
-   AVIF/WebP format selection
-   Priority loading above-fold
-   Blur placeholder

**Bundle Size:**

-   Tree shaking
-   Selective imports
-   < 200 KB JavaScript budget
-   < 50 KB CSS budget

**Rendering:**

-   React Server Components
-   Memoization for expensive operations
-   Virtual scrolling for large lists

**Core Web Vitals Targets:**

-   LCP < 2.5s
-   FID < 100ms
-   CLS < 0.1
-   INP < 200ms

## Implementation Phases

### Phase 1: Foundation (Week 1)

-   [ ] Project structure setup
-   [ ] Accessibility infrastructure
-   [ ] Animation system verification
-   [ ] Mock data creation

### Phase 2: Hat System Section (Week 2)

-   [ ] Component development
-   [ ] Animation integration
-   [ ] Asset optimization
-   [ ] Testing suite

### Phase 3: Team Config Section (Week 3)

-   [ ] Syntax highlighting setup
-   [ ] Copy/download functionality
-   [ ] Responsive layouts
-   [ ] Testing suite

### Phase 4: Recovery Section (Week 4)

-   [ ] Timeline component
-   [ ] Diff preview
-   [ ] Sticky scroll behavior
-   [ ] Keyboard controls

### Phase 5: Integration & Polish (Week 5)

-   [ ] Page integration
-   [ ] Performance optimization
-   [ ] Cross-browser testing
-   [ ] Accessibility audit

### Phase 6: Launch (Week 6)

-   [ ] Documentation completion
-   [ ] E2E test suite
-   [ ] Deployment pipeline
-   [ ] Monitoring setup

## Technical Stack

**Framework:** Next.js 15 (App Router)
**UI Library:** React 19
**Animation:** Framer Motion 12
**Styling:** Tailwind CSS
**Testing:** Vitest + Testing Library + jest-axe
**E2E:** Playwright

**Existing Components:**

-   ✅ Aceternity UI: 3D Card, Bento Grid, Sticky Scroll Reveal
-   ✅ Magic UI: Blur In, Animated List, Blur Fade
-   ✅ Motion utilities: `useReducedMotion`, animation presets

## Asset Inventory

**3D Hats:**

-   `/images/3d_hats/blue-hat-watch.png` (1087KB)
-   `/images/3d_hats/yellow-hat-warn.png` (916KB)
-   `/images/3d_hats/red-hat-block.png` (1049KB)
-   `/images/3d_hats/all-3-hats.png` (950KB)

**Icons:**

-   `/images/icons/blue-hat-icon.png` (630KB)
-   `/images/icons/yellow-hat-icon.png` (607KB)
-   `/images/icons/red-hat-icon.png` (714KB)

**Optimization Required:**

-   All images > 500KB - use Next.js Image optimization
-   Generate blur placeholders
-   Create responsive image variants

## Color Mappings

### Protection Levels

| Level              | Color               | Usage                   | Contrast Ratio |
| ------------------ | ------------------- | ----------------------- | -------------- |
| Watched (Blue)     | `hsl(220 100% 60%)` | Borders, glows, accents | 6.8:1          |
| Protected (Yellow) | `hsl(45 100% 60%)`  | Borders, glows, accents | 11.2:1         |
| Critical (Red)     | `hsl(0 85% 60%)`    | Borders, glows, accents | 5.1:1          |

### Theme Colors

| Color      | Value               | Usage            | Contrast Ratio |
| ---------- | ------------------- | ---------------- | -------------- |
| Background | `hsl(0 0% 4%)`      | Page background  | -              |
| Surface    | `hsl(0 0% 7%)`      | Card backgrounds | -              |
| Foreground | `hsl(0 0% 95%)`     | Primary text     | 18.1:1         |
| Muted      | `hsl(0 0% 65%)`     | Secondary text   | 7.5:1          |
| Primary    | `hsl(140 100% 50%)` | Brand accent     | 12.6:1         |

All colors meet WCAG AA standards (> 4.5:1 for normal text, > 3:1 for large text).

## Component API Examples

### Hat System Card

```typescript
<ProtectionLevelCard
	level="watched"
	title="Watched Protection"
	description="Monitor file changes without blocking"
	features={["Auto-save", "Minimal notifications"]}
	imageSrc="/images/3d_hats/blue-hat-watch.png"
	imageAlt="Blue detective hat"
	delay={0}
/>
```

### Config Display

```typescript
<ConfigDisplay
	content={configJson}
	language="json"
	fileName=".snapbackrc"
	showLineNumbers
	highlightLines={[5, 6, 7]}
	enableCopy
	enableDownload
/>
```

### Recovery Timeline

```typescript
<RecoveryTimeline
	steps={recoverySteps}
	activeStep={currentStep}
	onStepClick={handleStepClick}
	enableKeyboard
/>
```

## Success Metrics

**Performance:**

-   Lighthouse score > 90
-   LCP < 2.5s
-   Bundle size < 1MB

**Accessibility:**

-   Zero WCAG violations
-   100% keyboard navigable
-   Screen reader compatible

**Quality:**

-   Test coverage > 80%
-   Zero TypeScript errors
-   Zero console warnings

**User Experience:**

-   Smooth 60fps animations
-   Responsive across all devices
-   Fast time to interactive

## Next Steps

1. **Review:** System-architect reviews architecture document
2. **Implementation:** Begin Phase 1 foundation setup
3. **Collaboration:** Regular sync between frontend-architect and system-architect
4. **Testing:** Continuous testing throughout development
5. **Launch:** Staged rollout with monitoring

## Questions & Support

**Architecture Questions:** Contact frontend-architect
**Implementation Support:** Refer to full architecture document
**Testing Patterns:** Review testing strategy section
**Performance Issues:** Consult performance guidelines

---

**Full Documentation:** `/apps/web/MARKETING_SITE_ARCHITECTURE.md`
**Total Pages:** 40+
**Estimated Implementation Time:** 6 weeks
**Team Size:** 2-3 developers + 1 QA
