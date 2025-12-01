# SnapBack Marketing - Revisit Points

All [TODO] markers and items that need your attention to complete the marketing page improvements.

---

## Quick Reference: Where to Find All [TODO] Markers

### In site-spec.json (8 locations)
| Line | Section | Marker | What to Do |
|------|---------|--------|-----------|
| 40 | Hero | `[TODO: 60-second hero video]` | Record Sessions panel demo (1-2h) |
| 52 | Problem | `[TODO: VS Code showing 6-file...]` | Capture multi-file refactor screenshot (0.5h) |
| 76 | How It Works Step 1 | `[TODO: VS Code status bar...]` | Screenshot autosnapshot indicator (0.5h) |
| 82 | How It Works Step 2 | `[TODO: Detection toast...]` | Screenshot detection notification (0.5h) |
| 87 | How It Works Step 3 | `[TODO: Command Palette...]` | Screenshot restore menu (0.5h) |
| 103 | Interactive Demo | `[TODO: Looping GIF...]` | Record sessions timeline demo (1-2h) |
| 124 | Performance Metrics | `[TODO: Performance benchmark chart]` | Create chart showing metrics (1h) |
| 150 | Privacy | `[TODO: ~/.snapback directory...]` | Screenshot storage folder (0.5h) |

**File**: `apps/web/modules/marketing/config/site-spec.json`

---

## Asset Capture Checklist

### Visual Assets (Priority Order)

#### 🔴 HIGH PRIORITY (Week 1)
- [ ] **Asset: Problem Section Screenshot**
  - Location: site-spec.json line 52
  - Show: VS Code with 6 files, 1 broken after AI refactor
  - Save to: `apps/web/public/images/problem-multi-file-refactor.png`
  - Time: 0.5h

- [ ] **Asset: How It Works Step 1 Screenshot**
  - Location: site-spec.json line 76
  - Show: Status bar with "SnapBack: 47 snapshots" + green checkmark
  - Save to: `apps/web/public/images/how-it-works-step1-autosnapshot.png`
  - Time: 0.5h

- [ ] **Asset: How It Works Step 2 Screenshot**
  - Location: site-spec.json line 82
  - Show: Detection toast notification
  - Save to: `apps/web/public/images/how-it-works-step2-detection.png`
  - Time: 0.5h

- [ ] **Asset: How It Works Step 3 Screenshot**
  - Location: site-spec.json line 87
  - Show: Command Palette with SnapBack: Restore options
  - Save to: `apps/web/public/images/how-it-works-step3-restore.png`
  - Time: 0.5h

- [ ] **Asset: Storage Path Screenshot**
  - Location: site-spec.json line 150
  - Show: File explorer with ~/.snapback folder visible
  - Save to: `apps/web/public/images/privacy-storage-path.png`
  - Time: 0.5h

#### 🟡 MEDIUM PRIORITY (Week 2)
- [ ] **Asset: Hero Video**
  - Location: site-spec.json line 40
  - Record: 60-second Sessions panel demo
  - Save to: `apps/web/public/assets/SnapBack-Hero-Sessions.webm` + `.mp4`
  - Time: 1-2h
  - Formats needed: WebM (preferred) + MP4 (fallback)

- [ ] **Asset: Sessions Timeline GIF**
  - Location: site-spec.json line 103
  - Record: 5-8 second looping demo of restore flow
  - Save to: `apps/web/public/images/sessions-timeline-restore.gif` (or `.mp4`)
  - Time: 1-2h

#### 🟢 LOW PRIORITY (Week 3, Optional)
- [ ] **Asset: Performance Benchmark Chart**
  - Location: site-spec.json line 124
  - Create: Chart showing <100ms, <1s, ~1GB metrics
  - Save to: `apps/web/public/images/performance-benchmarks.svg` (or `.png`)
  - Time: 1h

---

## Testing Checkpoints

### Before Going Live

#### 1. Content Verification
- [ ] Read through landing page for authentic tone (not "marketing-y")
- [ ] Verify founder story doesn't read like a fake metric
- [ ] Check all CTAs point to /waitlist or correct destination
- [ ] Confirm privacy section mentions ~/.snapback explicitly
- [ ] Verify testimonials include constructive feedback

#### 2. Visual Asset Integration
- [ ] All [TODO] markers replaced with actual image paths
- [ ] Images load without 404 errors
- [ ] Videos autoplay with sound muted
- [ ] GIFs loop seamlessly
- [ ] All assets properly sized for responsive design

#### 3. E2E Test Suite
```bash
# Run the new test suite
pnpm test:e2e -- apps/web/tests/e2e/marketing-critical-paths.spec.ts

# Expected: 40 tests pass ✅
# Time: ~5-10 minutes
```

#### 4. Manual Testing Checklist
- [ ] Hero CTA clicks go to /waitlist ✅
- [ ] GitHub link opens in new tab ✅
- [ ] "How It Works" section clearly explains 3 steps ✅
- [ ] Privacy section is visible before scrolling too far ✅
- [ ] Pricing page FAQ is functional ✅
- [ ] All testimonials display correctly ✅
- [ ] Performance metrics are clearly readable ✅

#### 5. Mobile Testing
- [ ] Test on iPhone (375px) - hero, pricing, how-it-works
- [ ] Test on iPad (768px) - full page experience
- [ ] Verify touch targets are large enough
- [ ] Check video autoplay on mobile (usually requires interaction)

#### 6. Accessibility Audit
- [ ] Run Lighthouse audit (PageSpeed Insights)
- [ ] Verify heading hierarchy (H1 → H2 → H3, no skips)
- [ ] Check link contrast meets WCAG AA
- [ ] Verify all images have alt text
- [ ] Test with screen reader (VoiceOver/NVDA)

---

## Detailed Revision Instructions

### Step 1: Capture Screenshots (Est. 2.5h)

1. **Problem Section Screenshot** (0.5h)
   ```
   - Open VS Code with 6 files open
   - Make breaking change to one file (red error underline)
   - Show Problems panel with errors
   - Screenshot entire window (1920x1080)
   - Crop to 16:9 ratio
   - Save: apps/web/public/images/problem-multi-file-refactor.png
   ```

2. **How It Works Step 1** (0.5h)
   ```
   - With SnapBack extension active, edit a file
   - Check status bar for "SnapBack: XX snapshots" indicator
   - Screenshot just the status bar area
   - Ensure green checkmark is visible
   - Save: apps/web/public/images/how-it-works-step1-autosnapshot.png
   ```

3. **How It Works Step 2** (0.5h)
   ```
   - Make a breaking change (delete function, large refactor, test failure)
   - SnapBack should show a detection toast
   - Screenshot the moment toast appears
   - Crop to focus on toast notification
   - Save: apps/web/public/images/how-it-works-step2-detection.png
   ```

4. **How It Works Step 3** (0.5h)
   ```
   - Open Command Palette (⌘⇧P / Ctrl+Shift+P)
   - Type "snapback restore"
   - See SnapBack commands and recent snapshots
   - Screenshot showing restore options
   - Save: apps/web/public/images/how-it-works-step3-restore.png
   ```

5. **Storage Path Screenshot** (0.5h)
   ```
   - Open file explorer
   - Navigate to ~/.snapback
   - Show folder structure (expand if possible)
   - Screenshot the directory
   - Save: apps/web/public/images/privacy-storage-path.png
   ```

### Step 2: Record Videos (Est. 2-4h)

1. **Hero Video** (1-2h)
   ```
   - Set up VS Code with breaking change scenario
   - Open SnapBack Sessions panel
   - Scroll through snapshots
   - Click "Before the break" snapshot
   - Watch files restore in real-time
   - See test results turn green
   - Record 60 seconds total
   - Convert to WebM and MP4
   - Save:
     - apps/web/public/assets/SnapBack-Hero-Sessions.webm
     - apps/web/public/assets/SnapBack-Hero-Sessions.mp4
   ```

2. **Sessions Timeline GIF** (1-2h)
   ```
   - Open SnapBack Sessions panel
   - Expand a session to show snapshots
   - Click on a snapshot to preview
   - Show diff view
   - Click "Restore"
   - Watch files update
   - Record 5-8 seconds, loop
   - Export as GIF (< 5MB) or MP4
   - Save: apps/web/public/images/sessions-timeline-restore.gif
   ```

### Step 3: Update site-spec.json

Once all assets are captured, replace `[TODO: ...]` markers with paths:

```json
// In hero section:
"video_caption": "[TODO: 60-second hero video]..."
// ↓ becomes:
"video_src": "/assets/SnapBack-Hero-Sessions.webm",
"video_src_mp4": "/assets/SnapBack-Hero-Sessions.mp4",

// In problem section:
"screenshot": "[TODO: VS Code showing 6-file...]"
// ↓ becomes:
"screenshot": "/images/problem-multi-file-refactor.png",

// etc. for each asset
```

### Step 4: Run Tests

```bash
# Run all new critical path tests
pnpm test:e2e -- apps/web/tests/e2e/marketing-critical-paths.spec.ts

# Expected output:
# ✓ 40 tests pass
# ✓ No failures
# Time: 5-10 minutes
```

### Step 5: Manual QA

Visit each page and verify:
- [ ] Landing page: founder story looks authentic
- [ ] Landing page: all assets load without errors
- [ ] Landing page: CTAs work correctly
- [ ] Pricing page: FAQ is interactive
- [ ] Features page: all sections render
- [ ] Mobile: responsive layout works

### Step 6: Accessibility Check

```bash
# Run Lighthouse
pnpm run build
# Then test at: https://pagespeed.web.dev/

# Or run locally:
npm install -g lighthouse
lighthouse https://snapback.dev --view
```

---

## Files to Keep Updated

### Primary (Your Working Copy)
- **site-spec.json**: Source of truth for all marketing content
  - Current status: Ready with [TODO] markers
  - Next: Update with asset paths

- **marketing-critical-paths.spec.ts**: E2E test suite
  - Current status: 40 tests ready to run
  - Next: Run tests as assets are added

### Reference Documentation
- **IMPROVEMENT_SUMMARY.md**: Overview of all changes
- **VISUAL_ASSETS_CHECKLIST.md**: Detailed specs for each asset
- **TODO_REVISIT_POINTS.md**: This file (your quick reference)

---

## Quick Links to Sections

**Landing Page Sections** (in order of importance):
1. Hero → needs founder story prominence + video
2. Problem → needs 6-file screenshot
3. How It Works → needs 3 step screenshots
4. Interactive Demo → needs sessions timeline GIF
5. Performance Metrics → needs benchmark chart
6. Privacy → needs storage path screenshot
7. Testimonials → already complete ✅
8. Final CTA → already complete ✅

**Pricing Page Sections**:
- Pricing overview → ready ✅
- Plans → ready ✅
- FAQ → ready ✅

**Product/Features Page Sections**:
- Overview → ready ✅
- Triggers → ready ✅
- Sessions → ready ✅
- Restore flows → ready ✅
- Architecture → ready ✅
- Roadmap → ready ✅

---

## When You're Done

After completing all visual assets and tests:

1. Commit changes:
   ```bash
   git add -A
   git commit -m "marketing: complete visual assets and E2E tests for honest positioning"
   ```

2. Create PR with:
   - Summary of changes
   - Reference to this improvement initiative
   - Links to all 40 E2E tests
   - Performance metrics
   - Visual preview (screenshots/videos)

3. Deploy:
   - Test on staging first
   - Verify all assets load correctly
   - Check performance (Lighthouse score)
   - Monitor conversion metrics

---

## Questions During Capture?

If you have questions about:
- **What a screenshot should show** → See VISUAL_ASSETS_CHECKLIST.md
- **How to record/edit** → See tool recommendations in CHECKLIST
- **What tests check** → See IMPROVEMENT_SUMMARY.md test descriptions
- **How CTAs should work** → See site-spec.json for current destination URLs

---

**Last Updated**: Nov 23, 2025
**Status**: Phase 1-2 COMPLETE, Phase 3-4 READY FOR EXECUTION
**Next Action**: Capture visual assets (6-10 hours of work)
