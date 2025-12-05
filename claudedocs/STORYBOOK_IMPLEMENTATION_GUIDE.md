# Storybook Implementation Guide for SnapBack
**Created:** 2025-12-05
**Target:** apps/web (138 components)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Initial Setup (4-6 hours)](#phase-1-initial-setup)
3. [Phase 2: First Stories (8-12 hours)](#phase-2-first-stories)
4. [Phase 3: Visual Regression (4-6 hours)](#phase-3-visual-regression)
5. [Phase 4: Scale to Full Library](#phase-4-scale-to-full-library)
6. [Maintenance & Best Practices](#maintenance--best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Knowledge
- React component development
- Basic understanding of TypeScript
- Familiarity with your component library structure

### Existing Stack Compatibility
✅ **Already in your project:**
- Next.js 15+ with App Router
- Tailwind CSS with custom config
- Radix UI primitives
- Turbo monorepo
- pnpm workspace
- TypeScript 5.6+
- Vitest + Playwright

### Required Installation
```bash
# Navigate to web app
cd apps/web

# Install Storybook 8 with Vite builder
pnpm add -D @storybook/react-vite @storybook/react @storybook/addon-essentials \
  @storybook/addon-interactions @storybook/addon-links @storybook/addon-a11y \
  @storybook/addon-themes @storybook/test storybook vite

# Additional utilities
pnpm add -D @storybook/addon-coverage chromatic
```

**Installation time:** ~2-3 minutes

---

## Phase 1: Initial Setup

### 1.1 Initialize Storybook

```bash
cd apps/web
npx storybook@latest init --type react --builder vite --skip-install
```

**What this does:**
- Creates `.storybook/` directory
- Generates base configuration
- Adds npm scripts to package.json

### 1.2 Configure Storybook for Your Stack

**File: `apps/web/.storybook/main.ts`**

```typescript
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../modules/ui/components/**/*.stories.@(js|jsx|ts|tsx)',
    '../modules/marketing/components/**/*.stories.@(js|jsx|ts|tsx)',
    '../components/**/*.stories.@(js|jsx|ts|tsx)',
  ],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-coverage',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  core: {
    disableTelemetry: true, // Respect privacy
  },

  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@ui': path.resolve(__dirname, '../modules/ui'),
          '@marketing': path.resolve(__dirname, '../modules/marketing'),
          '@': path.resolve(__dirname, '../'),
        },
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'motion'], // Framer Motion fork
      },
    });
  },

  docs: {
    autodocs: 'tag', // Generate docs automatically for tagged stories
  },

  staticDirs: ['../public'], // Serve public assets
};

export default config;
```

**File: `apps/web/.storybook/preview.tsx`**

```typescript
import type { Preview } from '@storybook/react';
import React from 'react';
import { withThemeByClassName } from '@storybook/addon-themes';

// Import your global styles
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
  },

  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story) => (
      <div className="font-sans antialiased">
        <Story />
      </div>
    ),
  ],

  tags: ['autodocs'],
};

export default preview;
```

### 1.3 Add Scripts to package.json

**File: `apps/web/package.json`** (add to scripts section):

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build",
    "storybook:test": "test-storybook"
  }
}
```

### 1.4 Update Turbo Configuration

**File: `turbo.json`** (add tasks):

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

### 1.5 Test Initial Setup

```bash
# Start Storybook
pnpm --filter @snapback/web storybook

# Should open http://localhost:6006
# You'll see default example stories
```

**Expected result:** Storybook UI loads with example stories

**Time checkpoint:** 1-2 hours elapsed

---

## Phase 2: First Stories

### 2.1 Story Template Structure

**File: `apps/web/.storybook/story-templates/component.stories.tsx.template`**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'UI/ComponentName', // Category/Name
  component: ComponentName,
  parameters: {
    layout: 'centered', // or 'fullscreen', 'padded'
  },
  tags: ['autodocs'],
  argTypes: {
    // Define controls for props
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variant
export const Default: Story = {
  args: {
    // Default props
  },
};

// Interactive variant
export const Interactive: Story = {
  args: {
    onClick: () => console.log('clicked'),
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <ComponentName variant="default" />
      <ComponentName variant="primary" />
      <ComponentName variant="secondary" />
    </div>
  ),
};
```

### 2.2 Create Stories for Card Component

**File: `apps/web/modules/ui/components/card.stories.tsx`**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content area with some example text.</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">Footer content</p>
      </CardFooter>
    </Card>
  ),
};

export const WithoutDescription: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>A card without description.</p>
      </CardContent>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card className="w-[350px] cursor-pointer transition-colors hover:bg-accent">
      <CardHeader>
        <CardTitle>Clickable Card</CardTitle>
        <CardDescription>This card has hover effects.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Try hovering over this card.</p>
      </CardContent>
    </Card>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
      </CardContent>
      <CardFooter>
        <button className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Sign In
        </button>
      </CardFooter>
    </Card>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark">
      <Card className="w-[350px] bg-card">
        <CardHeader>
          <CardTitle>Dark Mode Card</CardTitle>
          <CardDescription>This card adapts to dark theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content in dark mode.</p>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
```

### 2.3 Create Stories for Button Component

First, let me check if you have a button component:

**File: `apps/web/modules/ui/components/button.stories.tsx`**

```typescript
import type { Meta, StoryObj } from '@storybook/react';

// Adjust import based on your button component location
// If using Radix, might be: import { Button } from '@radix-ui/react-...'
// For now, creating a placeholder - you'll adjust to your actual button

// Example Button component (adjust to your actual implementation)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button = ({ variant = 'default', size = 'md', children, ...props }: ButtonProps) => {
  const variants = {
    default: 'bg-background text-foreground border',
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`rounded-md font-medium transition-colors ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
};

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'destructive', 'ghost'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Account',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    variant: 'primary',
    children: 'Large Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Button variant="default">Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="flex gap-4 items-center">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary">
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Item
      </Button>
      <Button variant="destructive">
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </Button>
    </div>
  ),
};
```

### 2.4 Create Story for Complex Marketing Component

**File: `apps/web/modules/marketing/components/ui/testimonial-card.stories.tsx`**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
// Adjust import to your actual testimonial card component

// Example structure - adjust to your actual component
interface TestimonialCardProps {
  author: string;
  role: string;
  company?: string;
  content: string;
  avatar?: string;
  rating?: number;
}

const TestimonialCard = ({ author, role, company, content, avatar, rating }: TestimonialCardProps) => (
  <div className="rounded-lg border bg-card p-6">
    <div className="mb-4 flex items-center gap-4">
      {avatar ? (
        <img src={avatar} alt={author} className="h-12 w-12 rounded-full" />
      ) : (
        <div className="h-12 w-12 rounded-full bg-muted" />
      )}
      <div>
        <h4 className="font-semibold">{author}</h4>
        <p className="text-sm text-muted-foreground">
          {role} {company && `at ${company}`}
        </p>
      </div>
    </div>
    {rating && (
      <div className="mb-2 flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
        ))}
      </div>
    )}
    <p className="text-muted-foreground">{content}</p>
  </div>
);

const meta = {
  title: 'Marketing/TestimonialCard',
  component: TestimonialCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TestimonialCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    author: 'Sarah Johnson',
    role: 'Senior Developer',
    company: 'TechCorp',
    content: 'SnapBack has transformed how we handle version control. The automatic snapshots give us confidence to experiment.',
    rating: 5,
  },
};

export const WithoutCompany: Story = {
  args: {
    author: 'Alex Chen',
    role: 'Freelance Developer',
    content: 'As a solo developer, SnapBack is essential. I can focus on coding instead of worrying about losing work.',
    rating: 5,
  },
};

export const WithoutRating: Story = {
  args: {
    author: 'Maria Garcia',
    role: 'Product Manager',
    company: 'StartupXYZ',
    content: 'Our team uses SnapBack daily. The peace of mind is invaluable.',
  },
};

export const LongTestimonial: Story = {
  args: {
    author: 'James Wilson',
    role: 'Engineering Manager',
    company: 'Enterprise Inc',
    content: 'We evaluated several solutions before choosing SnapBack. The automatic protection policies and intelligent analysis caught issues we would have missed. The VSCode integration is seamless, and the team adopted it within days. Five months in, we\'ve prevented multiple critical data loss scenarios.',
    rating: 5,
  },
};

export const Grid: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ maxWidth: '1200px' }}>
      <TestimonialCard
        author="Sarah Johnson"
        role="Senior Developer"
        company="TechCorp"
        content="SnapBack has transformed how we handle version control."
        rating={5}
      />
      <TestimonialCard
        author="Alex Chen"
        role="Freelance Developer"
        content="As a solo developer, SnapBack is essential."
        rating={5}
      />
      <TestimonialCard
        author="Maria Garcia"
        role="Product Manager"
        company="StartupXYZ"
        content="Our team uses SnapBack daily. The peace of mind is invaluable."
        rating={4}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
```

### 2.5 Verify Stories Work

```bash
# Start Storybook
pnpm --filter @snapback/web storybook

# Navigate to:
# - UI/Card
# - UI/Button
# - Marketing/TestimonialCard
```

**Expected result:** All stories render correctly with controls

**Time checkpoint:** 3-4 hours elapsed

---

## Phase 3: Visual Regression Testing

### 3.1 Setup Chromatic (Recommended)

Chromatic is the official Storybook visual regression tool (free tier: 5,000 snapshots/month).

```bash
cd apps/web

# Install Chromatic
pnpm add -D chromatic

# Sign up at https://www.chromatic.com/
# Link to GitHub repo
# Get project token
```

### 3.2 Configure Chromatic

**File: `.github/workflows/chromatic.yml`**

```yaml
name: Chromatic

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for Chromatic

      - uses: pnpm/action-setup@v2
        with:
          version: 10.14.0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Storybook
        run: pnpm --filter @snapback/web storybook:build

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: 'storybook:build'
          workingDir: apps/web
          exitZeroOnChanges: true # Don't fail CI on visual changes
          exitOnceUploaded: true # Speed up builds
```

### 3.3 Add Chromatic Token to GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add new secret: `CHROMATIC_PROJECT_TOKEN`
3. Paste token from Chromatic dashboard

### 3.4 Configure Chromatic Settings

**File: `apps/web/.storybook/chromatic.config.json`**

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "buildScriptName": "storybook:build",
  "exitZeroOnChanges": true,
  "exitOnceUploaded": true,
  "skip": "dependabot/**",
  "ignoreLastBuildOnBranch": "main"
}
```

### 3.5 Alternative: Percy (if preferred)

Percy offers more features but costs more. Skip if using Chromatic.

```bash
pnpm add -D @percy/cli @percy/storybook

# Add script to package.json
{
  "scripts": {
    "percy": "percy storybook http://localhost:6006"
  }
}
```

### 3.6 Local Visual Testing

**File: `apps/web/.storybook/test-runner.ts`**

```typescript
import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async postRender(page, context) {
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Wait for animations to complete
    await page.waitForTimeout(500);

    // Custom accessibility checks
    const storyContext = await getStoryContext(page, context);
    if (storyContext.parameters?.a11y?.disable) {
      return;
    }

    // Run axe accessibility tests
    await page.evaluate(() => {
      // Add custom a11y checks here
    });
  },
};

export default config;
```

**Run visual tests:**

```bash
# Install test runner
pnpm add -D @storybook/test-runner

# Run tests
pnpm --filter @snapback/web test-storybook
```

**Time checkpoint:** 5-6 hours elapsed

---

## Phase 4: Scale to Full Library

### 4.1 Batch Story Creation Strategy

**Priority order for 138 components:**

1. **Week 1: Core UI primitives (20 components)**
   - Card, Button, Input, Select, Dialog, Tabs
   - Alert, Badge, Avatar, Checkbox
   - Dropdown Menu, Label, Progress, Radio
   - Separator, Sheet, Switch, Toast, Tooltip, Accordion

2. **Week 2: Marketing components (20 components)**
   - Hero sections, CTA blocks, Feature cards
   - Testimonials, Pricing tables, FAQ sections

3. **Week 3-4: Remaining components (98 components)**
   - Complex composed components
   - Page-level examples
   - Animation showcases

### 4.2 Story Generation Script

**File: `apps/web/scripts/generate-story.ts`**

```typescript
#!/usr/bin/env tsx
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface StoryConfig {
  componentName: string;
  componentPath: string;
  category: 'UI' | 'Marketing' | 'Layout';
}

function generateStory(config: StoryConfig): string {
  const { componentName, category } = config;

  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta = {
  title: '${category}/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    // TODO: Add prop controls
  },
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // TODO: Add default props
  },
};

export const Interactive: Story = {
  args: {
    // TODO: Add interactive props
  },
};
`;
}

// Usage
const config: StoryConfig = {
  componentName: process.argv[2],
  componentPath: process.argv[3],
  category: (process.argv[4] || 'UI') as 'UI' | 'Marketing' | 'Layout',
};

if (!config.componentName) {
  console.error('Usage: tsx generate-story.ts <ComponentName> <path> [category]');
  process.exit(1);
}

const storyPath = join(config.componentPath, `${config.componentName}.stories.tsx`);

if (existsSync(storyPath)) {
  console.error(`Story already exists: ${storyPath}`);
  process.exit(1);
}

const storyContent = generateStory(config);
writeFileSync(storyPath, storyContent, 'utf-8');
console.log(`✅ Created story: ${storyPath}`);
```

**Make executable and use:**

```bash
chmod +x apps/web/scripts/generate-story.ts

# Generate stories
tsx apps/web/scripts/generate-story.ts Badge modules/ui/components UI
tsx apps/web/scripts/generate-story.ts HeroSection modules/marketing/components Marketing
```

### 4.3 Bulk Story Creation Checklist

Create this file to track progress:

**File: `claudedocs/storybook-progress.md`**

```markdown
# Storybook Story Creation Progress

## UI Components (45 total)

### Primitives (20)
- [x] Card
- [x] Button
- [ ] Input
- [ ] Select
- [ ] Dialog
- [ ] Tabs
- [ ] Alert
- [ ] Badge
- [ ] Avatar
- [ ] Checkbox
- [ ] Dropdown Menu
- [ ] Label
- [ ] Progress
- [ ] Radio
- [ ] Separator
- [ ] Sheet
- [ ] Switch
- [ ] Toast
- [ ] Tooltip
- [ ] Accordion

### Complex (25)
- [ ] Form
- [ ] Data Table
- [ ] Command Palette
- [ ] ... (list remaining 22)

## Marketing Components (93 total)

### Sections (30)
- [ ] Hero
- [ ] Features
- [ ] Pricing
- [ ] Testimonials
- [ ] FAQ
- [ ] CTA
- [ ] ... (list remaining 24)

### UI Elements (63)
- [x] Testimonial Card
- [ ] Feature Card
- [ ] Pricing Card
- [ ] ... (list remaining 60)

## Total Progress: 3/138 (2%)
```

**Time checkpoint:** Varies by scope (20-60 hours for full library)

---

## Maintenance & Best Practices

### 5.1 Story Naming Conventions

```typescript
// ✅ GOOD - Descriptive and organized
export const WithIcon: Story = { ... }
export const LoadingState: Story = { ... }
export const ErrorState: Story = { ... }
export const DarkMode: Story = { ... }

// ❌ BAD - Vague names
export const Story1: Story = { ... }
export const Test: Story = { ... }
export const Component: Story = { ... }
```

### 5.2 Story Organization

```typescript
// Category structure
UI/                    // Shared components
  Primitives/
    Button
    Input
    Card
  Composed/
    Form
    DataTable
Marketing/            // Marketing-specific
  Sections/
    Hero
    Pricing
  Components/
    TestimonialCard
Layout/               // Layout components
  Navigation
  Footer
```

### 5.3 Accessibility Standards

Always include accessibility checks:

```typescript
export const WithA11y: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
};
```

### 5.4 Documentation Standards

Use MDX for rich documentation:

**File: `apps/web/modules/ui/components/card.stories.mdx`**

```mdx
import { Meta, Canvas, Story } from '@storybook/blocks';
import * as CardStories from './card.stories';

<Meta of={CardStories} />

# Card Component

The Card component is a flexible container for grouping related content.

## Usage

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@ui/components/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

## Examples

<Canvas of={CardStories.Default} />

## Best Practices

- Use CardHeader for titles and descriptions
- CardContent for main content
- CardFooter for actions
- Keep cards focused on single concepts

## Accessibility

- Ensure sufficient color contrast
- Use semantic HTML within cards
- Provide ARIA labels for interactive cards
```

### 5.5 Performance Monitoring

**File: `apps/web/.storybook/preview-head.html`**

```html
<script>
  // Track story load times
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    if (loadTime > 3000) {
      console.warn('Story loaded slowly:', loadTime, 'ms');
    }
  });
</script>
```

### 5.6 Component Update Workflow

When updating components:

1. Update component code
2. Update corresponding story
3. Run visual regression: `pnpm chromatic`
4. Review changes in Chromatic dashboard
5. Accept or reject visual changes
6. Merge PR

### 5.7 Weekly Maintenance Tasks

```bash
# Update Storybook dependencies (monthly)
pnpm update @storybook/react-vite @storybook/react @storybook/addon-*

# Build and test stories
pnpm --filter @snapback/web storybook:build
pnpm --filter @snapback/web test-storybook

# Check for missing stories
find apps/web/modules -name "*.tsx" -not -path "*/node_modules/*" -not -name "*.stories.tsx" | wc -l

# Should match component count minus stories
```

---

## Troubleshooting

### Issue: Tailwind Styles Not Loading

**Solution:** Ensure `globals.css` is imported in `.storybook/preview.tsx`

```typescript
// .storybook/preview.tsx
import '../app/globals.css'; // ← Must be present
```

### Issue: Path Aliases Not Working

**Solution:** Update `viteFinal` in `.storybook/main.ts`

```typescript
async viteFinal(config) {
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@ui': path.resolve(__dirname, '../modules/ui'),
        '@marketing': path.resolve(__dirname, '../modules/marketing'),
        '@': path.resolve(__dirname, '../'),
      },
    },
  });
}
```

### Issue: Framer Motion (motion) Not Working

**Solution:** Add to optimizeDeps in Vite config

```typescript
async viteFinal(config) {
  return mergeConfig(config, {
    optimizeDeps: {
      include: ['motion'], // Your Framer Motion fork
    },
  });
}
```

### Issue: Stories Build but Don't Render

**Solution:** Check for server-side code in components

```typescript
// ❌ BAD - Server code in component
import { headers } from 'next/headers';

// ✅ GOOD - Client-safe component
'use client';
import { useState } from 'react';
```

### Issue: Chromatic Builds Timing Out

**Solution:** Optimize build performance

```typescript
// .storybook/main.ts
export default {
  // ... other config
  core: {
    disableTelemetry: true,
  },
  features: {
    storyStoreV7: true, // Faster builds
  },
};
```

### Issue: Dark Mode Not Working

**Solution:** Ensure theme decorator is set up

```typescript
// .storybook/preview.tsx
import { withThemeByClassName } from '@storybook/addon-themes';

export const decorators = [
  withThemeByClassName({
    themes: {
      light: '',
      dark: 'dark',
    },
    defaultTheme: 'light',
  }),
];
```

### Issue: Visual Regression Tests Failing

**Possible causes:**
1. Font loading inconsistency → Add font preload
2. Animation timing → Disable animations in tests
3. Dynamic content → Use fixed test data
4. Viewport differences → Set consistent viewport

**Solution:**

```typescript
// .storybook/test-runner.ts
export default {
  async postRender(page) {
    // Wait for fonts
    await page.evaluate(() => document.fonts.ready);

    // Disable animations
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });

    // Wait for network idle
    await page.waitForLoadState('networkidle');
  },
};
```

### Issue: Monorepo Package Imports Failing

**Solution:** Add workspace dependencies

```json
// apps/web/package.json
{
  "dependencies": {
    "@snapback/ui": "workspace:*",
    "@snapback/core": "workspace:*"
  }
}
```

Then rebuild dependencies:

```bash
pnpm install
turbo build
```

---

## Appendix A: Complete File Checklist

After setup, you should have:

```
apps/web/
├── .storybook/
│   ├── main.ts                 # Core configuration
│   ├── preview.tsx             # Global decorators & parameters
│   ├── test-runner.ts          # Test runner config
│   ├── chromatic.config.json   # Chromatic settings
│   └── story-templates/        # Reusable templates
├── modules/
│   ├── ui/
│   │   └── components/
│   │       ├── card.tsx
│   │       ├── card.stories.tsx    # ← Stories
│   │       ├── button.tsx
│   │       └── button.stories.tsx
│   └── marketing/
│       └── components/
│           └── ui/
│               ├── testimonial-card.tsx
│               └── testimonial-card.stories.tsx
├── scripts/
│   └── generate-story.ts       # Story generator
└── package.json                # Scripts added

.github/
└── workflows/
    └── chromatic.yml           # CI/CD for visual regression

claudedocs/
└── storybook-progress.md       # Progress tracker
```

---

## Appendix B: Quick Reference Commands

```bash
# Development
pnpm --filter @snapback/web storybook              # Start dev server
pnpm --filter @snapback/web storybook:build        # Production build
pnpm --filter @snapback/web test-storybook         # Run tests

# Visual Regression
pnpm chromatic                                     # Run Chromatic
pnpm chromatic --only-changed                      # Only changed stories

# Story Generation
tsx apps/web/scripts/generate-story.ts <Name> <path> [category]

# Maintenance
pnpm update @storybook/*                           # Update Storybook
pnpm --filter @snapback/web storybook upgrade      # Interactive upgrade
```

---

## Appendix C: Cost Estimate

### Free Tier (Recommended Start)

**Chromatic Free:**
- 5,000 snapshots/month
- Unlimited team members
- 1 month snapshot history

**GitHub Actions:**
- 2,000 minutes/month (free tier)
- Chromatic builds: ~5 min/build
- **Capacity:** ~400 builds/month

**Estimate:** Free for first 3-6 months with moderate usage

### Paid Tier (If Scaling)

**Chromatic Starter ($149/month):**
- 35,000 snapshots/month
- 12 months history
- Priority support

**GitHub Actions ($4/month per additional 1,000 minutes)**

**When to upgrade:**
- Team >5 developers
- >100 components with stories
- Multiple PRs daily

---

## Next Steps

1. **Decision Point:** Approve implementation or defer?
2. **If approved:** Start Phase 1 (4-6 hours)
3. **Milestone 1:** Complete 10 component stories
4. **Review:** Assess team value after 2 weeks
5. **Scale or Stop:** Continue to full library or sunset

**Questions before starting?** Review ROI analysis document for business justification.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-05
**Maintained By:** Engineering Team
