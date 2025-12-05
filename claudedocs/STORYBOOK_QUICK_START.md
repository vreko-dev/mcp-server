# Storybook Quick Start Guide

Fast-track setup guide to get Storybook running in 30 minutes.

---

## Prerequisites

- Node.js 20+
- pnpm 10.14.0+
- VSCode (recommended)

---

## Installation (10 minutes)

### Step 1: Install Dependencies

```bash
# Navigate to web app
cd apps/web

# Run installation script
bash ../../claudedocs/storybook-scripts/package-updates.sh

# Or install manually:
pnpm add -D @storybook/react-vite @storybook/react @storybook/addon-essentials \
  @storybook/addon-interactions @storybook/addon-links @storybook/addon-a11y \
  @storybook/addon-themes @storybook/test storybook vite \
  @storybook/addon-coverage chromatic @storybook/test-runner
```

### Step 2: Setup Configuration

```bash
# Create .storybook directory
mkdir -p apps/web/.storybook

# Copy configuration files
cp claudedocs/storybook-configs/main.ts apps/web/.storybook/
cp claudedocs/storybook-configs/preview.tsx apps/web/.storybook/
cp claudedocs/storybook-configs/test-runner.ts apps/web/.storybook/
```

### Step 3: Add Scripts

Add to `apps/web/package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build",
    "test-storybook": "test-storybook"
  }
}
```

### Step 4: Update Turbo Config

Add to `turbo.json`:

```json
{
  "tasks": {
    "storybook": {
      "cache": false,
      "persistent": true
    },
    "storybook:build": {
      "dependsOn": ["^build"],
      "outputs": ["storybook-static/**"]
    }
  }
}
```

---

## Create First Stories (15 minutes)

### Option 1: Use Example Stories

```bash
# Copy example stories to your components
cp claudedocs/storybook-examples/card.stories.tsx \
   apps/web/modules/ui/components/

cp claudedocs/storybook-examples/accordion.stories.tsx \
   apps/web/modules/ui/components/

cp claudedocs/storybook-examples/tabs.stories.tsx \
   apps/web/modules/ui/components/
```

### Option 2: Generate New Story

```bash
# Make script executable
chmod +x claudedocs/storybook-scripts/generate-story.ts

# Generate a story
tsx claudedocs/storybook-scripts/generate-story.ts \
  Badge \
  apps/web/modules/ui/components \
  UI
```

---

## Launch Storybook (5 minutes)

```bash
# Start Storybook dev server
pnpm --filter @snapback/web storybook

# Open browser to http://localhost:6006
```

**What you should see:**
- Storybook UI with sidebar navigation
- Your component stories listed by category
- Controls panel for interactive props
- Accessibility checks in the a11y tab

---

## Setup Visual Regression (Optional, 10 minutes)

### Step 1: Create Chromatic Account

1. Go to [chromatic.com](https://www.chromatic.com)
2. Sign up with GitHub
3. Create new project
4. Copy project token

### Step 2: Add GitHub Workflow

```bash
# Create workflow directory
mkdir -p .github/workflows

# Copy Chromatic workflow
cp claudedocs/storybook-configs/chromatic.yml \
   .github/workflows/
```

### Step 3: Add GitHub Secret

1. Go to repo Settings → Secrets and variables → Actions
2. Add new secret: `CHROMATIC_PROJECT_TOKEN`
3. Paste your Chromatic token

### Step 4: Test Chromatic

```bash
# Run Chromatic locally
npx chromatic --project-token=YOUR_TOKEN

# Or add to package.json and run
pnpm chromatic
```

---

## Verify Setup Checklist

- [ ] Storybook runs at http://localhost:6006
- [ ] Stories appear in sidebar
- [ ] Controls work for component props
- [ ] Dark mode toggle works
- [ ] Accessibility tab shows no errors
- [ ] (Optional) Chromatic build succeeds

---

## Common Issues & Fixes

### Issue: "Cannot find module '@ui/...'"

**Fix:** Update path aliases in `.storybook/main.ts`:

```typescript
async viteFinal(config) {
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@ui': path.resolve(__dirname, '../modules/ui'),
        '@marketing': path.resolve(__dirname, '../modules/marketing'),
      },
    },
  });
}
```

### Issue: Tailwind styles not loading

**Fix:** Import global styles in `.storybook/preview.tsx`:

```typescript
import '../app/globals.css'; // Add this line
```

### Issue: Framer Motion (motion) errors

**Fix:** Add to optimizeDeps in `.storybook/main.ts`:

```typescript
optimizeDeps: {
  include: ['motion', 'react', 'react-dom'],
},
```

### Issue: Stories render but show "No Preview"

**Fix:** Ensure component exports are correct:

```typescript
// Component file
export const Button = ({ ... }) => { ... }

// Story file
import { Button } from './Button'; // Must match export name
```

---

## Next Steps

1. ✅ **Working Storybook?** → Create 5 more component stories
2. ✅ **5+ stories?** → Setup Chromatic for visual regression
3. ✅ **Chromatic setup?** → Integrate into PR workflow
4. 📊 **After 2 weeks** → Review ROI and decide to scale or stop

---

## Quick Reference Commands

```bash
# Development
pnpm --filter @snapback/web storybook

# Build for production
pnpm --filter @snapback/web storybook:build

# Run visual tests
pnpm --filter @snapback/web test-storybook

# Chromatic snapshot
npx chromatic

# Generate story
tsx claudedocs/storybook-scripts/generate-story.ts <Name> <path> [category]
```

---

## Resources

- 📘 [Full Implementation Guide](./STORYBOOK_IMPLEMENTATION_GUIDE.md)
- 📊 [ROI Analysis](./STORYBOOK_ROI_ANALYSIS.md)
- 🎨 [Chromatic Documentation](https://www.chromatic.com/docs)
- 📖 [Storybook Documentation](https://storybook.js.org/docs)

---

**Questions?** Check the [Troubleshooting section](./STORYBOOK_IMPLEMENTATION_GUIDE.md#troubleshooting) in the full guide.

**Estimated time to working Storybook:** 30 minutes
**Estimated time to first 10 stories:** 2-3 hours
