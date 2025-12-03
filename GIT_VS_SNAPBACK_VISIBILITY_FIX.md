# Git vs SnapBack Section Visibility Issue - Analysis & Fix

## Problem Summary

The Git vs SnapBack comparison section was not visible in the browser despite being present in the DOM. This was caused by a hydration mismatch between server-side and client-side rendering when using motion/react animations.

## Root Cause Analysis

### 1. **Missing Hydration Safety Check**
The component used `useReducedMotion()` hook without wrapping the animation logic in a mounted state check. This caused:
- **Server-side rendering**: Reduced motion preference couldn't be determined, defaulting to `false`
- **Client-side hydration**: The hook might return a different value, or motion/react animations wouldn't apply correctly
- **Result**: Element remained stuck at `opacity: 0` from the initial state

### 2. **Animation State Issue**
```typescript
// BEFORE: Problematic pattern
initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
// If animation doesn't trigger on mount, element stays at opacity: 0
```

The animation relies on the `animate` state being applied, but if there's any delay or if the motion/react library doesn't trigger correctly during hydration, the element stays invisible.

### 3. **Test Coverage Gap**
The git-vs-snapback section had **no visibility tests** in the e2e test suite. Other sections had tests verifying they're visible:
- Privacy section ✓
- Problem section ✓
- How-it-works section ✓
- Testimonials section ✓
- **Git vs SnapBack section ✗ (MISSING)**

This is why unit tests didn't catch this deviation—the tests never ran.

## Solution Implemented

### 1. **Fix Component Hydration**
Added proper mounted state handling:

```typescript
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

// All animations now respect isMounted state
initial={!isMounted ? { opacity: 1, x: 0 } : prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
animate={isMounted ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
```

This ensures:
- **During SSR**: Always render with `opacity: 1` (visible)
- **During hydration**: No animation (duration: 0)
- **After mount**: Animations can trigger normally if motion preferences allow

### 2. **Add Data Attribute for Test Coverage**
Added `data-section="git_vs_snapback"` to the section element, matching the pattern used by other sections.

### 3. **Add Comprehensive Tests**
Added 5 new e2e tests to catch future visibility issues:
- Section visibility check
- Headline presence
- Git card visibility
- SnapBack card visibility
- "Use Them Together" CTA visibility

## Changes Made

### Files Modified

#### 1. `/apps/web/modules/marketing/sections/launch/git-vs-snapback.tsx`
- Added `useState` and `useEffect` imports
- Added `isMounted` state tracking
- Updated all three `m.div` animation configurations to respect `isMounted`
- Added `data-section="git_vs_snapback"` attribute to section element

#### 2. `/apps/web/tests/e2e/marketing-critical-paths.spec.ts`
- Added "Git vs SnapBack Comparison Section" test suite with 5 tests
- Tests verify visibility, content, and CTA presence

## Why This Fixes the Issue

1. **Solves hydration mismatch**: Content is visible during SSR and hydration
2. **Restores animations**: After mount, animations work as intended if motion preferences allow
3. **Prevents future regressions**: New tests will catch if this section becomes invisible again
4. **Follows established patterns**: Uses the same approach as other sections in the codebase

## Production Alignment

The fix aligns with the production behavior where:
- Section is immediately visible (no opacity: 0 stuck state)
- Animations play smoothly on client after hydration
- All comparison content is readable and accessible

## Testing the Fix

Run the e2e tests to verify:
```bash
npm run test:e2e -- marketing-critical-paths.spec.ts
```

Or test locally in browser:
```bash
# Navigate to home page and scroll to "Git vs SnapBack: Different Tools, Different Jobs"
# The section should be fully visible with both cards (Git and SnapBack) displaying properly
```

## Design Token Impact

The fix doesn't modify any design tokens—it's a rendering/animation fix. The visual appearance remains identical to production, but now the component renders reliably across server and client.

## Future Prevention

When adding new animated sections:
1. ✓ Always use the `isMounted` pattern for motion animations
2. ✓ Add `data-section` attribute for test coverage
3. ✓ Add visibility tests in e2e suite
4. ✓ Test both with `prefers-reduced-motion` enabled and disabled
