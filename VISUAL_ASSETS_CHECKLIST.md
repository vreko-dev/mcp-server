# SnapBack Marketing - Visual Assets Capture Checklist

## Overview
This document tracks all [TODO] visual assets that need to be captured to complete the marketing page improvements. Each asset has a specific location in the codebase and clear requirements.

---

## Asset 1: Hero Video (60 seconds) ⏱️
**Status**: 🔄 PENDING
**Location**: `apps/web/modules/marketing/config/site-spec.json` → `pages.home.sections.hero.video_caption`
**Current Placeholder**: `[TODO: 60-second hero video] Real SnapBack session showing Sessions panel → snapshot selection → file restoration → confirmation toast`

### Requirements:
- [ ] Duration: 60 seconds maximum
- [ ] Show the exact flow: Sessions panel opening → selecting a prior snapshot → files automatically reverting → success toast
- [ ] Include real production code (your own repo or SnapBack's)
- [ ] Show test results improving (tests go from red to green)
- [ ] Subtitled or captioned for muted autoplay
- [ ] Formats: WebM (preferred) + MP4 fallback
- [ ] File size: < 5MB (WebM), < 10MB (MP4)

### Recording Setup:
```bash
# 1. Create a test scenario:
#    - Open VS Code with SnapBack extension
#    - Make a breaking change to a test file
#    - Run tests (they fail)
#    - Open SnapBack Sessions panel
#    - Select "Before the change" snapshot
#    - Watch files restore
#    - See tests turn green

# 2. Record using:
#    - ScreenFlow (Mac) or OBS (cross-platform)
#    - 1920x1440 resolution, 60fps
#    - Zoom into VS Code window

# 3. Convert to WebM:
ffmpeg -i hero.mov -c:v libvpx-vp9 -b:v 0 -crf 30 -c:a libopus -b:a 128k hero.webm

# 4. Create MP4 fallback:
ffmpeg -i hero.mov -c:v libx264 -crf 23 -c:a aac -b:a 128k hero.mp4
```

### Placement:
- WebM: `apps/web/public/assets/SnapBack-Hero-Sessions.webm`
- MP4: `apps/web/public/assets/SnapBack-Hero-Sessions.mp4`
- Update `video_caption` in site-spec.json to reference video files

---

## Asset 2: Problem Section Screenshot 📸
**Status**: 🔄 PENDING
**Location**: `apps/web/modules/marketing/config/site-spec.json` → `pages.home.sections.problem.timeline_items[0].screenshot`
**Current Placeholder**: `[TODO: VS Code showing 6-file AI refactor with 1 broken file highlighted]`

### Requirements:
- [ ] Show VS Code with 6 open files in tabs
- [ ] One file (e.g., `service.ts`) should have a red error indicator (wavy underline)
- [ ] Other files should appear normal
- [ ] Show the "Problems" panel with errors listed
- [ ] Clear context: "After AI refactor" visible in title or comment
- [ ] Resolution: 1920x1080 minimum
- [ ] Format: PNG (lossless, crisp code)

### Screenshot Setup:
```bash
# 1. Create a repo with 6 related files
# 2. Run a working version (all tests green)
# 3. Use Cursor/Claude to make a bulk refactor suggestion
# 4. Apply the suggestion to see the error in one file
# 5. Screenshot from VS Code with:
#    - File tabs visible (6 files)
#    - One file with red error underline
#    - Problems panel expanded showing errors
# 6. Crop to 16:9 ratio, min 1920x1080
```

### Placement:
- File: `apps/web/public/images/problem-multi-file-refactor.png`
- Update `screenshot` field in site-spec.json

---

## Asset 3: How It Works Screenshots (3x) 📸
**Status**: 🔄 PENDING
**Location**: `apps/web/modules/marketing/config/site-spec.json` → `pages.home.sections.how_it_works.steps[0-2].screenshot`

### Screenshot 3A: Auto-Snapshot on Save
**Placeholder**: `[TODO: VS Code status bar showing 'SnapBack: 47 snapshots' with green checkmark]`

#### Requirements:
- [ ] Show VS Code status bar at bottom
- [ ] "SnapBack: 47 snapshots" text visible
- [ ] Green checkmark or indicator
- [ ] Show a file being edited (cursor visible, text changes)
- [ ] Clear moment in time (timestamp if available)
- [ ] Resolution: 1920x1080, focus on status bar area

#### Screenshot Setup:
```bash
# 1. Open VS Code with SnapBack extension active
# 2. Make several file changes (or fast-forward through them)
# 3. Look at SnapBack status in footer/status bar
# 4. Screenshot just the status bar area, centered
# 5. Crop to 16:9, highlight the status text
```

### Screenshot 3B: Detect Breaking Changes
**Placeholder**: `[TODO: Detection toast notification showing 'Breaking change detected · file-service.ts']`

#### Requirements:
- [ ] Show VS Code with a toast/notification visible
- [ ] Toast text: "Breaking change detected" or similar
- [ ] File name mentioned: "file-service.ts" or similar
- [ ] Toast in corner or center (VS Code default location)
- [ ] Optional: Show red icon or warning indicator
- [ ] Resolution: 1920x1080

#### Screenshot Setup:
```bash
# 1. Make a breaking change (delete a function, large refactor, test failure)
# 2. SnapBack should detect and show a toast
# 3. Screenshot the moment toast is visible
# 4. Crop to focus on toast notification
```

### Screenshot 3C: Restore in One Click
**Placeholder**: `[TODO: Command Palette with SnapBack: Restore menu showing 3 recent snapshots]`

#### Requirements:
- [ ] Show VS Code Command Palette (⌘⇧P / Ctrl+Shift+P)
- [ ] Search term: "snapback restore" (or similar)
- [ ] Show 3-5 recent snapshots in dropdown:
  - "Auto-save · before AI refactor"
  - "Tests passing · all green"
  - "After AI edit · 17 tests failing"
- [ ] Clear action: "SnapBack: Restore Snapshot" command
- [ ] Resolution: 1920x1080

#### Screenshot Setup:
```bash
# 1. Open Command Palette (⌘⇧P / Ctrl+Shift+P)
# 2. Type "snapback restore"
# 3. See SnapBack commands + recent snapshots appear
# 4. Screenshot showing:
#    - Command palette open
#    - SnapBack: Restore option
#    - Recent snapshots below (if available)
# 5. Crop to 16:9
```

### Placement:
- File 3A: `apps/web/public/images/how-it-works-step1-autosnapshot.png`
- File 3B: `apps/web/public/images/how-it-works-step2-detection.png`
- File 3C: `apps/web/public/images/how-it-works-step3-restore.png`
- Update `steps[0-2].screenshot` fields in site-spec.json

---

## Asset 4: Sessions Timeline GIF (Looping) 🎬
**Status**: 🔄 PENDING
**Location**: `apps/web/modules/marketing/config/site-spec.json` → `pages.home.sections.interactive_demo.description`
**Current Placeholder**: `[TODO: Looping GIF showing Sessions panel expanding → diff preview → restore action]`

### Requirements:
- [ ] Duration: 5-8 seconds (short, looping)
- [ ] Show SnapBack Sessions panel opening
- [ ] User selects a prior snapshot
- [ ] Diff preview appears showing what changed
- [ ] User clicks "Restore"
- [ ] Files update in background (smooth transition)
- [ ] Loop seamlessly (GIF or video)
- [ ] Resolution: 1920x1080 minimum
- [ ] Format: GIF (animated, < 5MB) or MP4 (< 3MB)

### Recording Setup:
```bash
# 1. Open SnapBack Sessions panel
# 2. Expand one session showing snapshots
# 3. Click on a snapshot to preview
# 4. Show the diff view highlighting changes
# 5. Click "Restore" button
# 6. Capture the moment files update
# 7. Record: 5-8 seconds loop
# 8. Convert to optimized GIF:
ffmpeg -i timeline.mov -vf "fps=10,scale=1920:-1:flags=lanczos" timeline.gif

# Or keep as MP4:
ffmpeg -i timeline.mov -c:v libx264 -crf 23 -c:a aac -b:a 128k timeline.mp4
```

### Placement:
- File: `apps/web/public/images/sessions-timeline-restore.gif` (or `.mp4`)
- Update `interactive_demo.description` in site-spec.json to reference asset

---

## Asset 5: Performance Benchmark Chart 📊
**Status**: 🔄 PENDING
**Location**: `apps/web/modules/marketing/config/site-spec.json` → `pages.home.sections.for_teams.metric_cards[2].description`
**Current Placeholder**: `[TODO: Performance benchmark chart showing latency/throughput/storage]`

### Requirements:
- [ ] Chart type: Bar or line chart
- [ ] Three metrics shown:
  - **Latency**: < 100ms per snapshot
  - **Restore time**: < 1 second
  - **Storage efficiency**: ~1GB per 100 snapshots
- [ ] Clean, professional design matching brand colors (forest green #4A7C59)
- [ ] Y-axis shows units (ms, seconds, GB)
- [ ] X-axis shows metric categories
- [ ] Optional: Show comparison to alternatives (Git, Local History)
- [ ] Format: SVG (scalable) or PNG (1920x1080)

### Chart Creation:
```bash
# Option 1: Use Figma or similar tool
# - Create 3-bar chart with real data
# - Use brand green (#4A7C59) for bars
# - Add labels, units, legend

# Option 2: Code with D3.js or Chart.js
# - Data:
#   - Snapshot latency: 45ms (average)
#   - Restore time: 0.8s
#   - Storage: 1.2GB per 100 snapshots
# - Export as SVG

# Option 3: Use a charting tool
# - Figma: Design System
# - Notion: Database charts
# - Quick Charts (online): https://quickchart.io/
```

### Placement:
- File: `apps/web/public/images/performance-benchmarks.svg` (preferred) or `.png`
- Update `metric_cards[2].description` to show chart image

---

## Asset 6: Storage Path Screenshot 📁
**Status**: 🔄 PENDING
**Location**: `apps/web/modules/marketing/config/site-spec.json` → `pages.home.sections.privacy.items[0].description`
**Current Placeholder**: `[TODO: Screenshot of ~/.snapback directory structure in file explorer]`

### Requirements:
- [ ] Show file explorer (Finder on Mac, Explorer on Windows)
- [ ] Navigate to home directory (`~`)
- [ ] Show `.snapback` folder clearly visible
- [ ] Optionally expand folder to show contents:
  - `snapshots/` (folder)
  - `config.json` (or similar)
  - File count and total size
- [ ] No sensitive data visible in file names
- [ ] Resolution: 1920x1080
- [ ] Format: PNG

### Screenshot Setup:
```bash
# Mac:
open ~/.snapback
# Take screenshot with Finder showing directory

# Linux/Windows:
explorer "%USERPROFILE%\.snapback"
# Or file manager equivalent
# Take screenshot

# Ensure visible:
# - ~/.snapback folder
# - Its contents (if expanded)
# - Total size/storage info
```

### Placement:
- File: `apps/web/public/images/privacy-storage-path.png`
- Update `privacy.items[0].description` to reference asset

---

## Asset 7: MCP Integration Screenshot (BONUS) 🔧
**Status**: 🔄 PENDING (Optional)
**Location**: Could be added to `/product` page for future enhancement
**Suggested Placeholder**: `[TODO: Claude extension using SnapBack tools in VS Code]`

### Requirements:
- [ ] Show VS Code with Claude extension active
- [ ] Show SnapBack tools available in Claude prompt context
- [ ] Example: "List snapshots", "Restore snapshot" commands visible
- [ ] Show a chat interaction using SnapBack tools
- [ ] Resolution: 1920x1080
- [ ] Format: PNG

### Screenshot Setup:
```bash
# 1. Install Claude VS Code extension
# 2. Install SnapBack VS Code extension
# 3. Open Claude chat
# 4. Show that SnapBack tools appear in context
# 5. Example prompt: "Show me my latest 5 snapshots"
# 6. Screenshot the interaction
```

### Placement:
- File: `apps/web/public/images/mcp-integration-claude.png`
- Could be added to `pages.product.sections` if desired

---

## Summary

| # | Asset | Type | Priority | Est. Time | Status |
|---|-------|------|----------|-----------|--------|
| 1 | Hero Video | Video | 🔴 HIGH | 1-2h | 🔄 PENDING |
| 2 | Problem Section | Screenshot | 🔴 HIGH | 0.5h | 🔄 PENDING |
| 3A | How It Works Step 1 | Screenshot | 🔴 HIGH | 0.5h | 🔄 PENDING |
| 3B | How It Works Step 2 | Screenshot | 🔴 HIGH | 0.5h | 🔄 PENDING |
| 3C | How It Works Step 3 | Screenshot | 🔴 HIGH | 0.5h | 🔄 PENDING |
| 4 | Sessions Timeline | GIF/Video | 🟡 MEDIUM | 1-2h | 🔄 PENDING |
| 5 | Performance Chart | Chart/SVG | 🟡 MEDIUM | 1h | 🔄 PENDING |
| 6 | Storage Path | Screenshot | 🟡 MEDIUM | 0.5h | 🔄 PENDING |
| 7 | MCP Integration | Screenshot | 🟢 LOW | 0.5h | 🔄 PENDING |

**Total Estimated Time**: 6-10 hours
**Deadline**: Before beta launch (Q1 2025 per project timeline)

---

## Implementation Order (Recommended)

### Phase A (Day 1): Quick Wins - 2 hours
1. Asset 2: Problem Section Screenshot (0.5h)
2. Asset 3A, 3B, 3C: How It Works Screenshots (1.5h)
3. Asset 6: Storage Path Screenshot (0.5h)

### Phase B (Day 2): Complex Assets - 3-4 hours
4. Asset 1: Hero Video (1-2h)
5. Asset 4: Sessions Timeline GIF (1-2h)

### Phase C (Optional): Polish - 1-2 hours
6. Asset 5: Performance Chart (1h)
7. Asset 7: MCP Integration Screenshot (0.5h)

---

## After Capture: Integration Steps

For each asset captured:

1. **Save to correct location** in `apps/web/public/`
2. **Optimize media**:
   - Screenshots: Compress PNG with `pngquant` or `imagemin`
   - Videos: Ensure < 10MB for web
   - GIFs: Optimize with `gifsicle` or convert to MP4
3. **Update site-spec.json**:
   - Replace `[TODO: ...]` with actual path
   - Example: `"src": "/images/problem-multi-file-refactor.png"`
4. **Update components** to render images:
   - If not auto-rendering from config, add `<img>` or `<video>` tags
   - Ensure alt text matches placeholder description
5. **Test**:
   - Run E2E tests: `pnpm test:e2e -- marketing-critical-paths.spec.ts`
   - Manual visual check on all pages
   - Mobile responsiveness check
6. **Accessibility**:
   - Alt text for all images
   - Video captions if included
   - Contrast check on overlays

---

## Tools & Resources

### Screenshot Tools
- **Mac**: Built-in Screenshot (⌘⇧3), Figma, Sketch
- **Windows**: Snagit, ShareX
- **Cross-platform**: Flameshot, Greenshot

### Video Recording
- **Mac**: ScreenFlow, Screenium, OBS
- **Windows**: Camtasia, OBS, ScreenFlow (via Parallels)
- **Cross-platform**: OBS (free, open-source)

### Image Optimization
```bash
# PNG compression
pngquant --speed 1 --quality 65-80 input.png --output output.png

# JPEG optimization
jpegoptim --max=80 --size=200k input.jpg

# Batch processing
for f in *.png; do pngquant --speed 1 --quality 70 "$f" --output "optimized_$f"; done
```

### Video Conversion
```bash
# WebM (VP9)
ffmpeg -i input.mov -c:v libvpx-vp9 -b:v 0 -crf 30 -c:a libopus output.webm

# MP4
ffmpeg -i input.mov -c:v libx264 -crf 23 -c:a aac output.mp4

# GIF
ffmpeg -i input.mov -vf "fps=10,scale=1920:-1:flags=lanczos" output.gif
```

---

## Success Criteria

- [ ] All 7 assets captured and optimized
- [ ] All `[TODO: ...]` placeholders replaced in site-spec.json
- [ ] All E2E tests pass: `pnpm test:e2e -- marketing-critical-paths.spec.ts`
- [ ] Visual inspection passes: Pages display correctly with assets
- [ ] Mobile test passes: Assets responsive on mobile viewports
- [ ] Accessibility audit passes: WCAG AA compliance
- [ ] Performance acceptable: Page load < 3 seconds (Lighthouse)

---

**Last Updated**: Nov 23, 2025
**Created By**: Marketing Improvement Initiative
**Next Review**: When 50% of assets are captured
**Final Deadline**: Q1 2025 (before beta launch)
