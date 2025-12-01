# Documentation Site Testing Checklist

**Purpose:** Comprehensive testing checklist for the new documentation architecture
**Date:** 2025-10-02
**Status:** Ready for testing

## Quick Start Testing

### 1. Development Server

```bash
# Start development server
cd /Users/user1/WebstormProjects/SnapBack-Site
pnpm dev

# Navigate to documentation
# Open: http://localhost:3000/docs
```

### 2. Visual Inspection Checklist

```
□ Navigation bar visible and styled correctly
□ Sidebar displays on left with dark background
□ Main content area centered with proper width
□ Table of contents (TOC) visible on right (desktop)
□ Footer displays at bottom with 4-column layout
□ No layout overflow or horizontal scrolling
□ No overlapping elements (sidebar/footer)
□ Green accents visible on hover/active states
```

## Detailed Testing Sections

### A. Layout & Spacing

**Test Cases:**

```
□ Sidebar top aligns with navigation bar (4.5rem offset)
□ Sidebar height fills viewport minus nav height
□ No pt-[4.5rem] wrapper div (removed)
□ Main content has proper padding
□ Footer margin-top provides adequate spacing (mt-16)
□ Footer doesn't overlap sidebar or content
□ All sections properly contained within viewport
```

**How to Test:**

1. Open browser DevTools
2. Select sidebar element (#nd-sidebar)
3. Verify: `top: 4.5rem`, `height: calc(100dvh - 4.5rem)`
4. Check for no parent wrapper with `pt-[4.5rem]`
5. Scroll to bottom, verify footer spacing

**Expected Results:**

-   Sidebar: Dark background (#111111), right border
-   Content: Proper width, no overlap
-   Footer: Spaced from content, no overlap with sidebar

---

### B. Sidebar Navigation

**Test Cases:**

```
□ All section icons display correctly
□ Sections collapsed by default (defaultOpenLevel: 0)
□ Click section to expand/collapse
□ Sidebar NOT collapsible (no collapse button)
□ Active page highlighted in green
□ Hover states work (subtle green tint)
□ Section headers bold and spaced properly
□ Subsection items indented correctly
□ Scroll behavior independent of main content
```

**Icon Verification:**

```
□ 📖 BookOpen - Getting Started
□ ✨ Sparkles - Features
□ 🏗️ Blocks - Architecture
□ 🔧 Wrench - Development
□ 🧪 TestTube - Testing
□ 🚀 Rocket - Deployment
□ 📄 FileCode - API Reference
□ 🆘 LifeBuoy - Troubleshooting
□ ⚙️ Code2 - Components
```

**How to Test:**

1. Load /docs page
2. Verify all sections collapsed initially
3. Click "Getting Started" - should expand
4. Click again - should collapse
5. Navigate to a page - verify active highlighting
6. Hover over links - verify green tint appears
7. Try collapsing entire sidebar - should NOT work

**Expected Results:**

-   Progressive disclosure working
-   Green (#10B981) active states with left border
-   No sidebar collapse functionality
-   Icons visible and semantically correct

---

### C. Footer Component

**Test Cases:**

```
Desktop (>1024px):
□ 4-column grid layout
□ Columns evenly spaced
□ Brand section with logo and GitHub link
□ Documentation section with 4 links
□ Resources section with 4 links
□ Legal section with 4 links
□ Bottom bar with copyright and metadata
□ All links clickable and navigate correctly

Tablet (768-1024px):
□ 2-column grid layout
□ Sections stack properly
□ Spacing remains consistent
□ Touch targets adequate

Mobile (<768px):
□ Single column layout
□ All sections stack vertically
□ Touch targets minimum 44x44px
□ Links easily tappable
```

**Link Verification:**

**Documentation Section:**

```
□ Introduction → /docs
□ Getting Started → /docs/getting-started/overview
□ Architecture → /docs/architecture/overview
□ API Reference → /docs/api/overview
```

**Resources Section:**

```
□ Blog → /blog (internal)
□ Community → External (new tab)
□ FAQ → /docs/troubleshooting/faq
□ Support → External (new tab)
```

**Legal Section:**

```
□ Privacy Policy → /legal/privacy-policy
□ Terms of Service → /legal/terms
□ Security → External (new tab)
□ License → External (new tab)
```

**How to Test:**

1. Scroll to footer
2. Verify visual layout matches design
3. Click each link, verify navigation
4. Check external links open in new tab
5. Resize browser to test responsive breakpoints
6. Verify icon colors (primary green)

**Expected Results:**

-   Dark surface background with subtle border
-   Green icons and hover states
-   All links functional
-   Responsive grid behavior
-   Proper spacing throughout

---

### D. Table of Contents (TOC)

**Test Cases:**

```
□ TOC visible on desktop (right side)
□ TOC hidden on mobile
□ Sticky positioning works (follows scroll)
□ Active section highlighted in green
□ Active section has left green border
□ Hover states work
□ Links scroll smoothly to sections
□ TOC updates as user scrolls
```

**How to Test:**

1. Navigate to long documentation page
2. Verify TOC on right side (desktop)
3. Scroll down page
4. Verify TOC stays in view (sticky)
5. Verify current section highlighted
6. Click TOC link, verify smooth scroll
7. Resize to mobile, verify TOC hidden

**Expected Results:**

-   Sticky at `top: 5rem`
-   Active states with green accent
-   Smooth scroll behavior
-   Mobile: Hidden or in drawer

---

### E. Responsive Behavior

**Desktop Testing (>1024px):**

```
□ 3-column layout (sidebar, content, TOC)
□ Sidebar static and visible
□ TOC visible on right
□ Footer 4-column grid
□ Optimal reading width for content
□ Navigation bar full width
```

**Tablet Testing (768-1024px):**

```
□ Sidebar becomes drawer (hamburger menu)
□ TOC visible on larger tablets (>900px)
□ TOC hidden on smaller tablets (<900px)
□ Footer 2-column grid
□ Content full width
□ Touch targets adequate
```

**Mobile Testing (<768px):**

```
□ Sidebar drawer accessible via hamburger
□ Content full width
□ TOC hidden or in drawer
□ Footer single column
□ Navigation bar compact
□ Touch targets minimum 44x44px
□ No horizontal scrolling
```

**Test Viewports:**

```
Mobile:
□ iPhone SE (375x667)
□ iPhone 14 Pro (393x852)

Tablet:
□ iPad Mini (768x1024)
□ iPad Pro (1024x1366)

Desktop:
□ 1280x720 (small desktop)
□ 1920x1080 (full HD)
□ 2560x1440 (2K)
```

**How to Test:**

1. Open Chrome DevTools
2. Enable device toolbar
3. Test each viewport size
4. Verify layout adapts correctly
5. Test touch interactions on actual devices

---

### F. Accessibility Testing

**Keyboard Navigation:**

```
□ Tab through all interactive elements
□ Focus indicators clearly visible
□ Focus order logical (top to bottom, left to right)
□ Shift+Tab works in reverse
□ Enter/Space activates links/buttons
□ Escape closes drawer (mobile)
□ No keyboard traps
```

**Screen Reader Testing:**

```
□ Navigation landmarks announced correctly
□ Heading hierarchy logical (h1 > h2 > h3)
□ Link text descriptive ("Read more" avoided)
□ Images have alt text
□ Icons have aria-labels or are hidden
□ Current page announced as "current"
□ Expandable sections announced correctly
```

**Color Contrast:**

```
□ Text on background ≥7:1 (AAA)
□ Links on background ≥4.5:1 (AA)
□ Active states ≥4.5:1
□ Focus indicators ≥3:1
□ Icons paired with text (not color-only)
```

**How to Test:**

**Keyboard:**

1. Close mouse/trackpad
2. Tab through entire page
3. Verify all interactive elements reachable
4. Check focus indicators visible

**Screen Reader (macOS VoiceOver):**

1. Cmd+F5 to enable
2. Navigate with VO keys
3. Verify announcements make sense
4. Test with Safari and Chrome

**Screen Reader (Windows NVDA):**

1. Install NVDA (free)
2. Navigate with arrow keys
3. Verify announcements
4. Test with Firefox and Edge

**Contrast:**

1. Use browser DevTools
2. Inspect element colors
3. Use WebAIM Contrast Checker
4. Verify all ratios meet standards

**Automated Testing:**

```bash
# Run Lighthouse accessibility audit
# Chrome DevTools > Lighthouse > Accessibility

# Expected score: ≥95/100
```

---

### G. Performance Testing

**Lighthouse Metrics:**

```
Target Scores:
□ Performance: ≥90
□ Accessibility: ≥95
□ Best Practices: ≥90
□ SEO: ≥90

Core Web Vitals:
□ LCP (Largest Contentful Paint): <2.5s
□ FID (First Input Delay): <100ms
□ CLS (Cumulative Layout Shift): <0.1
```

**How to Test:**

1. Open Chrome DevTools
2. Lighthouse panel
3. Generate report (Desktop & Mobile)
4. Review metrics
5. Address any issues

**Bundle Size:**

```
□ Total page weight <500KB
□ JavaScript <150KB
□ CSS <50KB
□ Images optimized
□ Fonts optimized
```

**How to Test:**

1. Chrome DevTools > Network
2. Disable cache
3. Reload page
4. Check total transferred size
5. Verify compression enabled

**Layout Shift Testing:**

```
□ No shifts during page load
□ No shifts when sidebar expands
□ No shifts when footer loads
□ No shifts during image loading
□ CLS score = 0 or near 0
```

**How to Test:**

1. Chrome DevTools > Performance
2. Record page load
3. Review layout shifts panel
4. Verify score <0.1

---

### H. Cross-Browser Testing

**Required Browsers:**

```
Chrome/Edge (Chromium):
□ Latest version
□ Windows 10/11
□ macOS
□ Layout correct
□ Interactions work
□ No console errors

Firefox:
□ Latest version
□ Windows 10/11
□ macOS
□ Layout correct
□ Interactions work
□ No console errors

Safari:
□ Latest version (macOS)
□ iOS Safari (iPhone/iPad)
□ Layout correct
□ Backdrop blur works
□ No console errors
```

**How to Test:**

1. Open docs in each browser
2. Verify visual consistency
3. Test all interactions
4. Check DevTools console
5. Test on actual devices (iOS)

---

### I. Content Rendering

**MDX Components:**

```
□ Headings render correctly (h1-h6)
□ Paragraphs styled properly
□ Lists (ordered/unordered) formatted
□ Code blocks syntax highlighted
□ Inline code styled
□ Links styled and functional
□ Images zoom on click
□ Tables responsive
□ Blockquotes styled
□ Tabs component works
□ Steps component works
□ File tree component works
```

**How to Test:**

1. Navigate to various docs pages
2. Verify all content types render
3. Test interactive components
4. Click images to verify zoom
5. Check code syntax highlighting

---

### J. Internationalization (i18n)

**Language Switching:**

```
□ English (en) works
□ German (de) works
□ Language switcher functional
□ URLs preserve locale
□ Content loads in correct language
□ Footer remains English (or localized if implemented)
```

**How to Test:**

1. Navigate to /docs (default: en)
2. Switch to /de/docs
3. Verify content in German
4. Verify navigation works
5. Check footer (currently English-only)

---

## Regression Testing

**Verify No Breaking Changes:**

```
□ Marketing pages still work (/home, /pricing)
□ Authentication flows unaffected
□ Blog pages unaffected
□ Legal pages accessible
□ All existing routes functional
□ No 404 errors in console
□ No TypeScript errors
□ No build errors
```

**How to Test:**

```bash
# Type checking
pnpm --filter web run type-check

# Build test
pnpm build

# Check for errors in output
```

---

## Issue Reporting Template

If you find issues, report using this template:

```markdown
**Issue Title:** [Brief description]

**Environment:**

-   Browser: [Chrome/Firefox/Safari version]
-   OS: [macOS/Windows/iOS version]
-   Viewport: [Desktop/Tablet/Mobile dimensions]

**Steps to Reproduce:**

1. Navigate to [URL]
2. [Action taken]
3. [Result observed]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[If applicable]

**Console Errors:**
[If any]

**Priority:**
[Critical/High/Medium/Low]
```

---

## Sign-Off Checklist

Before marking as complete:

```
Layout & Spacing:        □ Pass  □ Fail
Sidebar Navigation:      □ Pass  □ Fail
Footer Component:        □ Pass  □ Fail
Table of Contents:       □ Pass  □ Fail
Responsive Design:       □ Pass  □ Fail
Accessibility:           □ Pass  □ Fail
Performance:             □ Pass  □ Fail
Cross-Browser:           □ Pass  □ Fail
Content Rendering:       □ Pass  □ Fail
Internationalization:    □ Pass  □ Fail
Regression Tests:        □ Pass  □ Fail

Overall Status:          □ Ready for Production
                         □ Needs Minor Fixes
                         □ Needs Major Fixes
```

---

**Testing Date:** ******\_******
**Tested By:** ******\_******
**Sign-Off:** ******\_******

---

## Quick Command Reference

```bash
# Start development
pnpm dev

# Type check
pnpm --filter web run type-check

# Build
pnpm build

# Lint
biome lint .

# Format
biome format . --write

# E2E tests (if applicable)
pnpm --filter web run e2e
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Status:** Ready for QA team
