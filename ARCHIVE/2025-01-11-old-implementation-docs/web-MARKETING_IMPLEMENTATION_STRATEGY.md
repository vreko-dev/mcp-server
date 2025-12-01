# SnapBack Marketing Site - Implementation Strategy

**Status**: 75% Complete
**Timeline**: 2-3 Weeks
**Approach**: TDD with Sequential Implementation

## Executive Summary

### ✅ Current Status

-   **Hero**: Correct slogan "Code Breaks. Snap Back." ✓
-   **Assets**: Hat images and icons exist ✓
-   **Components**: Hero, StoryScroll, ProtectionPreview, FeatureCards, SocialProof, Pricing, Newsletter ✓

### ❌ Missing Critical Sections

-   Hat System Section (PRIMARY DIFFERENTIATOR)
-   Team Config Section (Team tier selling point)
-   Recovery Section (Core "snap back" feature)
-   InteractiveDemo integration (exists but not used)

---

## Asset Mapping

### Hat Images (3D Rendered)

```
Source: /public/images/3d_hats/
├── all-3-hats.png          → HatSystemSection hero image
├── red-hat-block.png       → Critical level detail
├── yellow-hat-warn.png     → Protected level detail
└── blue-hat-watch.png      → Watched level detail
```

### Hat Icons (Simplified)

```
Source: /public/images/icons/
├── red-hat-icon.png        → Critical file decorations
├── yellow-hat-icon.png     → Protected file decorations
└── blue-hat-icon.png       → Watched file decorations
```

---

## Branding Guidelines

### Core Messaging

**Slogan**: "Code Breaks. Snap Back."
**Tagline**: "Visual protection for every file. AI-aware checkpoints. Instant recovery."

### Protection Level System

#### 🔴 Critical (Red)

-   **Color**: `from-red-500 to-rose-600`
-   **Border**: `border-red-500/50`
-   **Icon**: ⛑️ Rescue Helmet
-   **Files**: .env, package.json, configs
-   **Behavior**: Checkpoint every change, AI blocking, team notifications

#### 🟡 Protected (Yellow)

-   **Color**: `from-yellow-500 to-amber-600`
-   **Border**: `border-yellow-500/50`
-   **Icon**: 👷 Hard Hat
-   **Files**: Source code, components, utils
-   **Behavior**: Pre-AI checkpoints, every 5 minutes, diff preview

#### 🔵 Watched (Blue)

-   **Color**: `from-blue-500 to-cyan-600` (Changed from green)
-   **Border**: `border-blue-500/50`
-   **Icon**: 🧢 Baseball Cap
-   **Files**: README, docs, markdown
-   **Behavior**: Daily checkpoints, change tracking, minimal overhead

---

## Component Architecture

### Component Dependencies

```
HatSystemSection
├── next/image (hat images)
├── framer-motion (animations)
├── @ui/components/card
├── @ui/components/badge
└── @ui/components/button

TeamConfigSection
├── @ui/components/card
├── @ui/components/badge
├── @ui/components/button
├── lucide-react (Copy, Download icons)
└── framer-motion

RecoverySection
├── @ui/components/card
├── @ui/components/badge
├── @ui/components/button
├── lucide-react (Clock, DollarSign, Undo2)
└── framer-motion
```

### Page Integration Order

```tsx
<Hero />
<StoryScroll />
<HatSystemSection />      // NEW - After story
<InteractiveDemo />       // MOVE HERE - Currently not in page
<RecoverySection />       // NEW - After demo
<TeamConfigSection />     // NEW - Before pricing
<ProtectionPreview />     // Keep
<FeatureCards />          // Keep
<SocialProof />          // Keep
<PricingSection />       // Keep
<Newsletter />           // Keep
```

---

## TDD Implementation Strategy

### Phase 1: Test Infrastructure Setup

```typescript
// Test utilities location: apps/web/tests/unit/marketing/

1. Create test helpers for component rendering
2. Set up visual regression test baseline
3. Configure accessibility testing (axe)
4. Set up viewport testing for mobile/desktop
```

### Phase 2: Hat System Section (Week 1, Mon-Tue)

```
1. Write tests first:
   ✓ Renders all three protection levels
   ✓ Displays correct hat images
   ✓ Shows proper color schemes
   ✓ Animates on scroll
   ✓ Passes accessibility audit
   ✓ Mobile responsive

2. Implement component:
   ✓ Create HatSystemSection.tsx
   ✓ Add to @marketing/home/components/
   ✓ Import assets correctly

3. Integration:
   ✓ Add to home page
   ✓ Verify animations work with SmoothScrollProvider
   ✓ Test keyboard navigation
```

### Phase 3: Team Config Section (Week 1, Wed-Thu)

```
1. Write tests first:
   ✓ Renders config code block
   ✓ Copy button functionality
   ✓ Download button (mock for now)
   ✓ Syntax highlighting works
   ✓ Responsive on mobile

2. Implement component:
   ✓ Create TeamConfigSection.tsx
   ✓ Add copy-to-clipboard handler
   ✓ Style code block

3. Integration:
   ✓ Add to home page
   ✓ Verify clipboard API works
```

### Phase 4: Recovery Section (Week 1, Fri)

```
1. Write tests first:
   ✓ Renders timeline correctly
   ✓ Shows checkpoint metadata
   ✓ Displays diff preview
   ✓ Stats are visible and formatted
   ✓ Restore button interactive

2. Implement component:
   ✓ Create RecoverySection.tsx
   ✓ Add timeline UI
   ✓ Add stats cards

3. Integration:
   ✓ Add to home page
   ✓ Verify timeline animations
```

### Phase 5: InteractiveDemo Integration (Week 2, Mon)

```
1. Enhance existing InteractiveDemo:
   ✓ Add file list with hat indicators
   ✓ Add hat assignment interaction
   ✓ Add visual feedback
   ✓ Connect to hat color system

2. Tests:
   ✓ User can assign hats
   ✓ Visual feedback works
   ✓ State persists during interaction

3. Integration:
   ✓ Add to home page in correct position
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// Location: apps/web/tests/unit/marketing/home/components/

HatSystemSection.test.tsx
TeamConfigSection.test.tsx
RecoverySection.test.tsx
InteractiveDemo.test.tsx (enhance existing)
```

### Test Coverage Requirements

-   Component rendering: 100%
-   User interactions: 100%
-   Accessibility: All WCAG 2.1 AA
-   Visual regression: Baseline + mobile/desktop

### E2E Tests (Playwright)

```typescript
// Location: apps/web/tests/e2e/marketing/

critical-user-journey.spec.ts
├── Visit home page
├── Scroll to Hat System
├── Scroll to Interactive Demo
├── Scroll to Recovery
├── Scroll to Team Config
├── Scroll to Pricing
└── Submit newsletter

hat-system-interactions.spec.ts
├── Hover over hat cards
├── View hat images
└── Verify animations

team-config-interactions.spec.ts
├── Copy config code
├── Download config (when implemented)
└── Verify syntax highlighting
```

---

## Performance Budget

### Metrics

-   **LCP**: < 2.5s
-   **FID**: < 100ms
-   **CLS**: < 0.1
-   **Bundle Size**: < 500KB (initial)
-   **Images**: WebP format, < 100KB each

### Optimization Strategy

1. Lazy load sections below fold
2. Optimize hat images (convert to WebP if needed)
3. Use `next/image` with proper sizing
4. Defer non-critical animations
5. Code split by route

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

-   ✓ Keyboard navigation for all interactive elements
-   ✓ Screen reader support (aria-labels)
-   ✓ Color contrast ratio > 4.5:1
-   ✓ Focus indicators visible
-   ✓ Reduced motion support
-   ✓ Alt text for all images

### Motion Accessibility

```typescript
// Use in all motion components
const shouldReduceMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

<motion.div
  initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
>
```

---

## Integration Checklist

### Before Starting

-   [ ] Review Context7 patterns for Aceternity UI
-   [ ] Check Magic UI component library
-   [ ] Verify test infrastructure works
-   [ ] Create feature branch

### During Implementation

-   [ ] Write tests first (TDD)
-   [ ] Implement component
-   [ ] Pass all tests
-   [ ] Add to home page
-   [ ] Manual QA on mobile/desktop
-   [ ] Accessibility audit (axe)
-   [ ] Visual regression check
-   [ ] Git commit with descriptive message

### After Each Section

-   [ ] Update todo list
-   [ ] Document any issues
-   [ ] Take screenshot for documentation
-   [ ] Update MARKETING_IMPLEMENTATION_STRATEGY.md

---

## Risk Mitigation

### Concurrency Issues (Previous Problem)

**Solution**: Sequential implementation only

-   Implement one section at a time
-   Complete tests → implementation → integration cycle fully
-   Commit after each section complete
-   No parallel file operations

### Asset Loading

**Solution**: Proper image optimization

-   Verify all images < 100KB
-   Use WebP format
-   Preload above-fold images
-   Lazy load below-fold

### Animation Performance

**Solution**: Respect user preferences

-   Detect reduced motion preference
-   Provide fallback static views
-   Throttle scroll animations
-   Use CSS transforms over layout changes

---

## Week-by-Week Breakdown

### Week 1: Critical Missing Sections

**Mon-Tue**: Hat System Section

-   [ ] Write tests
-   [ ] Implement component
-   [ ] Integrate to page
-   [ ] QA and accessibility

**Wed-Thu**: Team Config Section

-   [ ] Write tests
-   [ ] Implement component
-   [ ] Add clipboard functionality
-   [ ] Integrate to page

**Fri**: Recovery Section

-   [ ] Write tests
-   [ ] Implement component
-   [ ] Integrate to page

**Weekend**: Testing & Polish

-   [ ] E2E tests for all sections
-   [ ] Mobile responsiveness check
-   [ ] Performance audit

### Week 2: Enhancement & Integration

**Mon**: InteractiveDemo Enhancement

-   [ ] Add hat assignment UI
-   [ ] Connect to protection level system
-   [ ] Integrate to page

**Tue-Wed**: Polish & Optimization

-   [ ] Visual regression testing
-   [ ] Performance optimization
-   [ ] Bundle size analysis
-   [ ] Accessibility final audit

**Thu**: Integration Testing

-   [ ] Full user journey E2E
-   [ ] Cross-browser testing
-   [ ] Mobile device testing

**Fri**: Documentation & Deploy Prep

-   [ ] Update README
-   [ ] Create deployment checklist
-   [ ] Staging deployment

### Week 3: Launch Preparation

**Mon-Tue**: Performance & SEO

-   [ ] Lighthouse audit (score > 90)
-   [ ] Meta tags verification
-   [ ] Sitemap update
-   [ ] Analytics integration

**Wed**: Final QA

-   [ ] QA checklist completion
-   [ ] Stakeholder review
-   [ ] Fix any critical issues

**Thu**: Pre-launch

-   [ ] Deploy to staging
-   [ ] Final smoke tests
-   [ ] Monitor error tracking

**Fri**: Launch

-   [ ] Deploy to production
-   [ ] Monitor analytics
-   [ ] Watch error rates
-   [ ] Celebrate! 🚀

---

## Success Criteria

### Functional

-   [x] Hero displays correct slogan
-   [ ] Hat System section renders with all 3 levels
-   [ ] Team Config section with copy functionality
-   [ ] Recovery section with timeline and stats
-   [ ] InteractiveDemo integrated and interactive
-   [ ] All sections responsive on mobile
-   [ ] Page loads in correct order

### Performance

-   [ ] Lighthouse score > 90
-   [ ] LCP < 2.5s
-   [ ] CLS < 0.1
-   [ ] Bundle size < 500KB

### Accessibility

-   [ ] WCAG 2.1 AA compliant
-   [ ] Keyboard navigation works
-   [ ] Screen reader compatible
-   [ ] Reduced motion support

### Quality

-   [ ] Test coverage > 80%
-   [ ] All E2E tests pass
-   [ ] Visual regression tests pass
-   [ ] No console errors

---

## Quick Reference Commands

### Development

```bash
# Start dev server
pnpm dev

# Run unit tests
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Run accessibility audit
pnpm test:a11y

# Build for production
pnpm build
```

### Asset Management

```bash
# Optimize images
pnpm optimize:images

# Check bundle size
pnpm analyze:bundle
```

---

## Contact & Support

**Implementation Questions**: Refer to this document
**Asset Issues**: Check `/public/images/` directory
**Test Failures**: Review test output, check component props
**Performance Issues**: Run `pnpm analyze:bundle`

---

**Last Updated**: 2025-10-11
**Document Owner**: Development Team
**Status**: In Progress
