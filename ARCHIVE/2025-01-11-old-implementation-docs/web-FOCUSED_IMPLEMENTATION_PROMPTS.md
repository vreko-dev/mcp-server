# SnapBack Marketing - Focused Implementation Prompts

**Purpose**: Step-by-step prompts to avoid timeout issues
**Strategy**: Sequential, one component at a time
**Approach**: TDD (Tests → Implementation → Integration)

---

## 🎯 Phase 1: Hat System Section (Week 1, Mon-Tue)

### Prompt 1A: Create Hat System Tests

```
Create comprehensive Vitest unit tests for the HatSystemSection component at:
apps/web/tests/unit/marketing/home/components/HatSystemSection.test.tsx

Test requirements:
1. Renders all three protection levels (Critical, Protected, Watched)
2. Displays correct hat images from /public/images/3d_hats/
3. Uses correct color schemes:
   - Critical: from-red-500 to-rose-600, border-red-500/50
   - Protected: from-yellow-500 to-amber-600, border-yellow-500/50
   - Watched: from-blue-500 to-cyan-600, border-blue-500/50
4. Shows correct emojis: ⛑️ (Critical), 👷 (Protected), 🧢 (Watched)
5. Renders use case descriptions
6. Passes accessibility checks (axe)
7. Responsive behavior for mobile/desktop

Use existing test patterns from apps/web/tests/e2e/critical/signup-to-success.spec.ts as reference.

Success criteria:
- Tests written and fail (no component yet)
- Tests cover all requirements
- Tests include accessibility checks
```

### Prompt 1B: Implement Hat System Component

```
Implement the HatSystemSection component at:
apps/web/modules/marketing/home/components/HatSystemSection.tsx

Requirements:
1. Use existing hat images:
   - /images/3d_hats/all-3-hats.png (hero composition)
   - /images/3d_hats/red-hat-block.png
   - /images/3d_hats/yellow-hat-warn.png
   - /images/3d_hats/blue-hat-watch.png

2. Use existing UI components:
   - @ui/components/card
   - @ui/components/badge
   - @ui/components/button
   - framer-motion for animations

3. Protection levels data:
   Critical: "⛑️ Rescue Helmet" - .env, package.json, configs
   Protected: "👷 Hard Hat" - Source code, components, utils
   Watched: "🧢 Baseball Cap" - README, docs, markdown

4. Match color scheme from MARKETING_IMPLEMENTATION_STRATEGY.md

5. Implement motion animations:
   - Fade in on scroll (whileInView)
   - Respect reduced motion preferences
   - Stagger animation for cards

6. Make fully responsive (mobile-first)

Success criteria:
- All tests pass
- Component renders correctly
- Animations work smoothly
- Accessible (keyboard navigation, screen reader)
```

### Prompt 1C: Integrate Hat System to Home Page

```
Integrate HatSystemSection into the home page at:
apps/web/app/(marketing)/(home)/page.tsx

Integration requirements:
1. Import: import { HatSystemSection } from "@marketing/home/components/HatSystemSection"
2. Add after <StoryScroll /> and before <ProtectionPreview />
3. Verify it works with SmoothScrollProvider
4. Test scroll animations trigger correctly
5. Ensure no layout shifts (CLS < 0.1)

Run these commands to verify:
- pnpm test:unit (all tests pass)
- pnpm dev (visual check)
- Test on mobile viewport (responsive)

Success criteria:
- Section appears in correct order
- Animations work with smooth scroll
- No console errors
- Mobile responsive
```

---

## 🎯 Phase 2: Team Config Section (Week 1, Wed-Thu)

### Prompt 2A: Create Team Config Tests

```
Create comprehensive Vitest unit tests for the TeamConfigSection component at:
apps/web/tests/unit/marketing/home/components/TeamConfigSection.test.tsx

Test requirements:
1. Renders config code block with YAML content
2. Copy button functionality works
3. Download button renders (functionality can be mocked)
4. Code syntax highlighting displays
5. Shows three benefit cards: Version Controlled, Team Standards, Instant Setup
6. Responsive layout (desktop 3 columns, mobile stack)
7. Accessibility (keyboard navigation, aria-labels)

Success criteria:
- Tests written and fail (no component yet)
- Clipboard API mocked for testing
- Tests include user interaction scenarios
```

### Prompt 2B: Implement Team Config Component

````
Implement the TeamConfigSection component at:
apps/web/modules/marketing/home/components/TeamConfigSection.tsx

Requirements:
1. Use existing UI components:
   - @ui/components/card
   - @ui/components/badge
   - @ui/components/button
   - lucide-react (Copy, Download, Check icons)

2. Config content:
   ```yaml
   # .snapbackrc - Team Protection Configuration
   version: 2.0
   project: "awesome-app"

   hats:
     critical:
       - "*.env*"
       - "package*.json"
       - "*lock.{yaml,json}"
       - "config/**/*.{js,ts,json}"

     protected:
       - "src/**/*.{ts,tsx,js,jsx}"
       - "lib/**/*"

     watched:
       - "*.md"
       - "docs/**/*"

   rules:
     - pattern: "migrations/*.sql"
       hat: critical
       reason: "Database changes are irreversible"
       notify_team: true
````

3. Implement copy-to-clipboard:

    - Use navigator.clipboard.writeText()
    - Show "Copied!" feedback (2 seconds)
    - Fallback for unsupported browsers

4. Style code block:

    - Monospace font
    - Syntax colors for YAML
    - Terminal-like appearance

5. Benefits cards with icons:
   🔄 Version Controlled
   👥 Team Standards
   ⚡ Instant Setup

Success criteria:

-   All tests pass
-   Copy functionality works
-   Accessible keyboard navigation
-   Responsive design

```

### Prompt 2C: Integrate Team Config to Home Page
```

Integrate TeamConfigSection into the home page at:
apps/web/app/(marketing)/(home)/page.tsx

Integration requirements:

1. Import: import { TeamConfigSection } from "@marketing/home/components/TeamConfigSection"
2. Add before <PricingSection />
3. Test clipboard API in browser (needs HTTPS or localhost)
4. Verify code block renders correctly
5. Test copy button feedback

Success criteria:

-   Section appears before pricing
-   Copy button works in browser
-   No console errors
-   Mobile responsive

```

---

## 🎯 Phase 3: Recovery Section (Week 1, Fri)

### Prompt 3A: Create Recovery Section Tests
```

Create comprehensive Vitest unit tests for the RecoverySection component at:
apps/web/tests/unit/marketing/home/components/RecoverySection.test.tsx

Test requirements:

1. Renders timeline with 4 checkpoints
2. Shows checkpoint metadata (time, files, changes)
3. Displays diff preview card
4. Renders three stats cards (Recovery Time, Recoveries, Downtime Prevented)
5. Featured checkpoint has restore button
6. Timeline items have correct visual styling
7. Icons render (Clock, DollarSign, Undo2 from lucide-react)
8. Accessible and responsive

Success criteria:

-   Tests written and fail
-   Timeline structure tested
-   Stats card rendering tested

```

### Prompt 3B: Implement Recovery Section Component
```

Implement the RecoverySection component at:
apps/web/modules/marketing/home/components/RecoverySection.tsx

Requirements:

1. Use existing UI components:

    - @ui/components/card
    - @ui/components/badge
    - @ui/components/button
    - lucide-react (Clock, DollarSign, Undo2)

2. Timeline data (4 checkpoints):

    - Now (current position)
    - 2 minutes ago: AI Activity Detected
    - 5 minutes ago: Critical package.json modified (FEATURED)
    - 10 minutes ago: Manual checkpoint

3. Diff preview example:

    ```
    package.json
    - "react": "^18.0.0"
    + "react": "^19.0.0"
    ```

4. Stats cards:

    - Recovery Time: 2.3s (green)
    - Recoveries: 1,247 (blue)
    - Downtime Prevented: $892K (yellow)

5. Visual styling:
    - Featured checkpoint: red border/background
    - Current position: green indicator
    - Timeline vertical line connecting items
    - Hover effects on timeline items

Success criteria:

-   All tests pass
-   Timeline renders correctly
-   Diff preview styled properly
-   Stats cards animated on scroll

```

### Prompt 3C: Integrate Recovery Section to Home Page
```

Integrate RecoverySection into the home page at:
apps/web/app/(marketing)/(home)/page.tsx

Integration requirements:

1. Import: import { RecoverySection } from "@marketing/home/components/RecoverySection"
2. Add after InteractiveDemo (we'll add InteractiveDemo in Phase 4)
3. For now, add after <ProtectionPreview />
4. Verify timeline animations work
5. Test stats counter animations

Success criteria:

-   Section appears in page
-   Animations trigger on scroll
-   No console errors
-   Mobile timeline readable

```

---

## 🎯 Phase 4: Interactive Demo Integration (Week 2, Mon)

### Prompt 4A: Enhance InteractiveDemo Component
```

Enhance the existing InteractiveDemo component at:
apps/web/modules/marketing/home/components/InteractiveDemo.tsx

Requirements:

1. Review current implementation
2. Add file list with hat indicators:

    - src/index.ts (👷 Protected)
    - package.json (⛑️ Critical)
    - README.md (🧢 Watched)

3. Add interactive hat assignment:

    - Click file to select
    - Choose protection level
    - Visual feedback on change

4. Use hat color system:

    - Critical: red
    - Protected: yellow
    - Watched: blue

5. Add state management:
    - useState for file list
    - Update hat assignment
    - Show confirmation animation

Success criteria:

-   Interactive file selection works
-   Hat assignment updates visual state
-   Animations smooth
-   Accessible keyboard controls

```

### Prompt 4B: Integrate InteractiveDemo to Home Page
```

Add InteractiveDemo to the home page at:
apps/web/app/(marketing)/(home)/page.tsx

Integration requirements:

1. Check if already imported (it might be)
2. Add after <HatSystemSection />
3. Verify interactive elements work
4. Test hat assignment interaction
5. Ensure it works with smooth scroll

Current imports to check:

-   Search for "InteractiveDemo" in page.tsx
-   If not present, import from "@marketing/home/components/InteractiveDemo"

Success criteria:

-   InteractiveDemo renders
-   User can interact with demo
-   No console errors
-   Smooth scroll works

```

---

## 🎯 Phase 5: Page Integration & Ordering (Week 2, Tue)

### Prompt 5: Update Home Page Section Order
```

Update the home page component ordering at:
apps/web/app/(marketing)/(home)/page.tsx

Required order:

1. <Hero />
2. <StoryScroll />
3. <HatSystemSection /> ← NEW
4. <InteractiveDemo /> ← MOVED
5. <RecoverySection /> ← NEW
6. <TeamConfigSection /> ← NEW
7. <ProtectionPreview />
8. <FeatureCards />
9. <SocialProof />
10. <PricingSection />
11. <Newsletter />

Verification steps:

1. Check all imports at top of file
2. Ensure components render in correct order
3. Visual check on localhost
4. Test smooth scroll through entire page
5. Check mobile responsiveness for each section

Success criteria:

-   All sections appear in correct order
-   No duplicate sections
-   Smooth scroll works through all sections
-   Mobile layout correct for all sections

```

---

## 🎯 Phase 6: Testing & QA (Week 2, Wed-Thu)

### Prompt 6A: Visual Regression Testing
```

Run visual regression tests and fix any issues:

Commands:

1. pnpm test:unit (all unit tests)
2. pnpm test:e2e (E2E tests)
3. pnpm build (production build)
4. Check bundle size

Visual checks:

1. Desktop (1920x1080): All sections visible
2. Tablet (768x1024): Layout adapts correctly
3. Mobile (375x667): All content readable

Accessibility:

1. Run axe DevTools on each section
2. Test keyboard navigation (Tab through interactive elements)
3. Test with screen reader (VoiceOver or NVDA)

Success criteria:

-   All automated tests pass
-   Visual regression tests pass
-   Accessibility audit passes (no critical issues)
-   Bundle size < 500KB

```

### Prompt 6B: Performance Audit
```

Run performance audit and optimize:

Commands:

1. pnpm build
2. pnpm start (production mode)
3. Open Chrome DevTools → Lighthouse
4. Run audit (Desktop & Mobile)

Target metrics:

-   Performance: > 90
-   Accessibility: 100
-   Best Practices: > 90
-   SEO: 100
-   LCP: < 2.5s
-   FID: < 100ms
-   CLS: < 0.1

Optimizations if needed:

1. Image optimization (convert to WebP)
2. Code splitting
3. Lazy loading below-fold sections
4. Preload critical assets

Success criteria:

-   Lighthouse score > 90 (all categories)
-   Core Web Vitals pass
-   No console errors
-   Bundle size acceptable

```

---

## 🎯 Phase 7: Final Polish (Week 2, Fri)

### Prompt 7: Final Integration Verification
```

Perform final verification and polish:

Checklist:

1. Review MARKETING_IMPLEMENTATION_STRATEGY.md success criteria
2. Test complete user journey:

    - Visit home page
    - Scroll through all sections
    - Interact with InteractiveDemo
    - Copy config from TeamConfig
    - View recovery timeline
    - Click pricing CTA
    - Submit newsletter

3. Cross-browser testing:

    - Chrome (latest)
    - Firefox (latest)
    - Safari (latest)
    - Mobile Safari (iOS)
    - Chrome Mobile (Android)

4. Edge cases:

    - Slow network (throttle to 3G)
    - Reduced motion preference
    - High contrast mode
    - Screen reader mode

5. Error monitoring:
    - Check Sentry integration
    - Verify error tracking works
    - Test error boundaries

Success criteria:

-   All user journeys work
-   All browsers supported
-   All edge cases handled
-   Error tracking active
-   Ready for production

````

---

## 🚨 Troubleshooting Guide

### Timeout Issues
**Problem**: Commands timeout or hang
**Solution**:
- Stop all parallel operations
- Run one command at a time
- Clear node_modules and reinstall if needed
- Check for infinite loops in components

### Test Failures
**Problem**: Tests fail after implementation
**Solution**:
- Check component props match test expectations
- Verify imports are correct
- Check for async timing issues
- Review test output carefully

### Animation Issues
**Problem**: Animations don't trigger or lag
**Solution**:
- Check SmoothScrollProvider is wrapping page
- Verify framer-motion is installed
- Test with reduced motion disabled
- Check for CSS conflicts

### Asset Loading Issues
**Problem**: Images don't load
**Solution**:
- Verify paths start with / (e.g., /images/3d_hats/)
- Check file names match exactly (case-sensitive)
- Verify files exist in public directory
- Check Next.js image optimization config

### Integration Issues
**Problem**: New sections don't appear
**Solution**:
- Check imports at top of page.tsx
- Verify component export/import match
- Check for React errors in console
- Verify component is in correct position in JSX

---

## 📋 Quick Command Reference

```bash
# Development
pnpm dev                    # Start dev server
pnpm test:unit             # Run unit tests
pnpm test:e2e              # Run E2E tests
pnpm build                 # Production build
pnpm start                 # Production server

# Testing
pnpm test:watch            # Watch mode unit tests
pnpm test:coverage         # Coverage report
pnpm test:a11y             # Accessibility tests

# Quality
pnpm lint                  # Run linter
pnpm format                # Format code
pnpm typecheck             # TypeScript check
````

---

## 📞 When to Ask for Help

Ask if you encounter:

-   Multiple test failures after implementation
-   Timeout issues persisting after sequential approach
-   Accessibility issues you can't resolve
-   Performance metrics not meeting targets
-   Integration conflicts between sections
-   Asset loading problems

Provide:

-   Specific error messages
-   What you've tried
-   Current test output
-   Browser console logs

---

## ✅ Success Verification

After each phase, verify:

-   [ ] Tests pass (pnpm test:unit)
-   [ ] Component renders (visual check)
-   [ ] Accessible (axe audit)
-   [ ] Responsive (mobile check)
-   [ ] No console errors
-   [ ] Git committed with good message

After all phases:

-   [ ] All sections present
-   [ ] Correct ordering
-   [ ] Lighthouse score > 90
-   [ ] All tests pass
-   [ ] User journey works end-to-end
-   [ ] Ready for production

---

**Implementation Start Date**: 2025-10-11
**Target Completion**: Week 3 (2025-10-25)
**Last Updated**: 2025-10-11
