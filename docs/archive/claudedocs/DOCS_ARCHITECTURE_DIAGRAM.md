# Documentation Architecture Visual Diagram

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     RootProvider (i18n)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    DocsLayout                          │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Navigation Bar                      │  │  │
│  │  │  [SnapBack Logo] Documentation  [Language]      │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────┬────────────────────┬──────────────┐ │  │
│  │  │   Sidebar    │   Main Content     │     TOC      │ │  │
│  │  │ (collapsible │   (DocsPage)       │  (Sticky)    │ │  │
│  │  │  = false)    │                    │              │ │  │
│  │  │              │                    │              │ │  │
│  │  │ 📘 Intro     │  # Page Title      │ On this page │ │  │
│  │  │              │                    │              │ │  │
│  │  │ 📖 Getting   │  Breadcrumbs       │ • Section 1  │ │  │
│  │  │   Started    │  Home > Section    │ • Section 2  │ │  │
│  │  │   └ Overview │                    │ • Section 3  │ │  │
│  │  │              │  MDX Content       │              │ │  │
│  │  │ ✨ Features  │  with components   │ [Active:     │ │  │
│  │  │   ├ Dashboard│                    │  Section 2]  │ │  │
│  │  │   ├ API Keys │  - Text            │              │ │  │
│  │  │   └ Usage    │  - Code blocks     │              │ │  │
│  │  │              │  - Images          │              │ │  │
│  │  │ 🏗️ Arch...   │  - Tabs            │              │ │  │
│  │  │              │  - Steps           │              │ │  │
│  │  │ [More...]    │                    │              │ │  │
│  │  │              │                    │              │ │  │
│  │  └──────────────┴────────────────────┴──────────────┘ │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │               DocsFooter                         │  │  │
│  │  │  ┌───────────┬───────────┬──────────┬─────────┐ │  │  │
│  │  │  │   Brand   │   Docs    │Resources │  Legal  │ │  │  │
│  │  │  │           │           │          │         │ │  │  │
│  │  │  │ [Logo]    │ Intro     │ Blog     │ Privacy │ │  │  │
│  │  │  │ SnapBack  │ Getting   │ Community│ Terms   │ │  │  │
│  │  │  │           │ Started   │ FAQ      │ Security│ │  │  │
│  │  │  │ [GitHub]  │ Arch...   │ Support  │ License │ │  │  │
│  │  │  │           │ API       │          │         │ │  │  │
│  │  │  └───────────┴───────────┴──────────┴─────────┘ │  │  │
│  │  │  ─────────────────────────────────────────────  │  │  │
│  │  │  © 2025 SnapBack • Docs v1.0 • View all docs   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Navigation State Flow

```
User lands on /docs
       │
       ▼
   Index page
   (Introduction)
       │
       ▼
┌──────────────────┐
│  Sidebar State   │
│ defaultOpenLevel │
│       = 0        │
└──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  All sections collapsed:            │
│  📘 Introduction                    │
│  ▶ 📖 Getting Started               │
│  ▶ ✨ Features                      │
│  ▶ 🏗️ Architecture                  │
│  ▶ 🔧 Development                   │
│  ▶ 🧪 Testing                       │
│  ▶ 🚀 Deployment                    │
│  ▶ 📄 API Reference                 │
│  ▶ 🆘 Troubleshooting               │
│  ▶ ⚙️ Components                    │
└─────────────────────────────────────┘
       │
       ▼ User clicks section
       │
┌─────────────────────────────────────┐
│  Section expands:                   │
│  📘 Introduction                    │
│  ▼ 📖 Getting Started               │
│     └─ Overview                     │
│  ▶ ✨ Features                      │
│  ▶ 🏗️ Architecture                  │
│  ... (rest collapsed)               │
└─────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (>1024px)

```
┌──────────────────────────────────────────────────────────┐
│                     Navigation Bar                        │
├────────────┬─────────────────────────────┬───────────────┤
│  Sidebar   │      Main Content           │      TOC      │
│  (250px)   │      (flexible)             │    (200px)    │
│            │                             │               │
│  Static    │   Optimal reading width     │    Sticky     │
│  Visible   │   Max-width constrained     │    Visible    │
│            │                             │               │
├────────────┴─────────────────────────────┴───────────────┤
│                       Footer (4 columns)                  │
│  [Brand]    [Documentation]    [Resources]    [Legal]    │
└──────────────────────────────────────────────────────────┘
```

### Tablet (768px-1024px)

```
┌──────────────────────────────────────────┐
│          Navigation Bar                  │
├───────┬──────────────────────────────────┤
│Sidebar│       Main Content               │
│(Drawer│       (full width)               │
│hidden)│                                  │
│       │   TOC: Visible on larger tablets │
│ [☰]   │        Hidden on smaller         │
│       │                                  │
├───────┴──────────────────────────────────┤
│       Footer (2 columns)                 │
│  [Brand] [Documentation]                 │
│  [Resources] [Legal]                     │
└──────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌────────────────────────┐
│    Navigation Bar      │
│  [☰] SnapBack          │
├────────────────────────┤
│                        │
│    Main Content        │
│    (full width)        │
│                        │
│    TOC: Hidden         │
│    (or in drawer)      │
│                        │
├────────────────────────┤
│  Footer (1 column)     │
│  ┌──────────────────┐ │
│  │  Brand           │ │
│  ├──────────────────┤ │
│  │  Documentation   │ │
│  ├──────────────────┤ │
│  │  Resources       │ │
│  ├──────────────────┤ │
│  │  Legal           │ │
│  └──────────────────┘ │
└────────────────────────┘
```

## Color System Application

```
┌─────────────────────────────────────────────────────────┐
│  Navigation Bar                                          │
│  bg: rgba(10, 10, 10, 0.7) + backdrop-blur              │
│  border-bottom: rgba(255, 255, 255, 0.08)               │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│    Sidebar       │  │      Main Content                 │
│                  │  │                                   │
│  bg: #111111     │  │  bg: #0A0A0A                      │
│  (surface)       │  │  (background)                     │
│                  │  │                                   │
│  border-right:   │  │  text: #e9eef3                    │
│  #27272A         │  │  (foreground)                     │
│                  │  │                                   │
│  Links:          │  │  Links: #10B981                   │
│  - Inactive:     │  │  (primary green)                  │
│    #94a3b8       │  │                                   │
│  - Hover:        │  │  Code blocks:                     │
│    bg-primary/5  │  │  Dark terminal bg                 │
│  - Active:       │  │  with green accents               │
│    bg-primary/10 │  │                                   │
│    text-primary  │  │                                   │
│    border-l-2    │  │                                   │
│    (green)       │  │                                   │
└──────────────────┘  └──────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Footer                                                  │
│  bg: rgba(17, 17, 17, 0.5) + backdrop-blur-sm           │
│  border-top: #27272A                                    │
│                                                          │
│  Section headers:                                        │
│  - text: #e9eef3 (foreground)                           │
│  - icons: #10B981 (primary)                             │
│                                                          │
│  Links:                                                  │
│  - Default: #94a3b8 (muted)                             │
│  - Hover: #10B981 (primary)                             │
└─────────────────────────────────────────────────────────┘
```

## Icon System

```
Navigation Sections with Icons:

📘 Introduction (Home)
   - No expansion (single page)

📖 Getting Started (BookOpen)
   ├─ Overview
   └─ [Future: Installation, Configuration]

✨ Features (Sparkles)
   ├─ Dashboard
   ├─ API Keys
   └─ Usage Tracking

🏗️ Architecture (Blocks)
   ├─ Overview
   ├─ Monorepo Structure
   └─ Technology Stack

🔧 Development (Wrench)
   ├─ Setup
   ├─ Commands
   └─ Workflow

🧪 Testing (TestTube)
   ├─ Overview
   ├─ E2E Tests
   └─ Backend Tests

🚀 Deployment (Rocket)
   ├─ Overview
   ├─ CI/CD
   └─ Production

📄 API Reference (FileCode)
   ├─ Overview
   └─ Endpoints

🆘 Troubleshooting (LifeBuoy)
   ├─ FAQ
   └─ Common Issues

⚙️ Components (Code2) [De-emphasized]
   ├─ Glass Island Navigation
   └─ Infinite Moving Cards
```

## Interaction States

### Sidebar Link States

```
┌─────────────────────────────────────┐
│  Default (Inactive)                 │
│  ─────────────────────────────────  │
│  text-muted-foreground (#94a3b8)    │
│  bg-transparent                     │
│  no border                          │
└─────────────────────────────────────┘
           │ hover
           ▼
┌─────────────────────────────────────┐
│  Hover                              │
│  ─────────────────────────────────  │
│  text-foreground (#e9eef3)          │
│  bg-primary/5 (subtle green tint)   │
│  transition-colors                  │
└─────────────────────────────────────┘
           │ click
           ▼
┌─────────────────────────────────────┐
│  Active (Current Page)              │
│  ─────────────────────────────────  │
│  text-primary (#10B981)             │
│  bg-primary/10 (green background)   │
│  border-l-2 border-primary (accent) │
└─────────────────────────────────────┘
           │ focus (keyboard)
           ▼
┌─────────────────────────────────────┐
│  Focus State                        │
│  ─────────────────────────────────  │
│  outline-2 outline-primary          │
│  outline-offset-2                   │
│  (visible focus ring)               │
└─────────────────────────────────────┘
```

## Accessibility Tree

```
<nav aria-label="Documentation navigation">
  <div role="tree">
    <a href="/docs" role="treeitem">
      Introduction
    </a>

    <button role="treeitem" aria-expanded="false">
      <BookOpen aria-hidden="true" />
      Getting Started
    </button>
    <div role="group" hidden>
      <a href="/docs/getting-started/overview" role="treeitem">
        Overview
      </a>
    </div>

    <!-- More sections... -->
  </div>
</nav>

<main id="content">
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/docs">Home</a></li>
      <li><a href="/docs/getting-started">Getting Started</a></li>
      <li aria-current="page">Overview</li>
    </ol>
  </nav>

  <article>
    <h1>Page Title</h1>
    <!-- Content -->
  </article>
</main>

<aside aria-label="Table of contents">
  <nav>
    <h2>On this page</h2>
    <ul>
      <li><a href="#section-1">Section 1</a></li>
      <li><a href="#section-2">Section 2</a></li>
    </ul>
  </nav>
</aside>

<footer aria-label="Documentation footer">
  <section aria-labelledby="footer-docs">
    <h3 id="footer-docs">
      <BookOpen aria-hidden="true" />
      Documentation
    </h3>
    <!-- Links -->
  </section>
  <!-- More sections... -->
</footer>
```

## Data Flow

```
User navigates to page
       │
       ▼
Next.js Route Handler
       │
       ├─> Generate static params
       │   (from all .mdx files)
       │
       ├─> Get locale from params
       │
       ├─> Load page data
       │   (from docsSource)
       │
       └─> Render layout
           │
           ├─> RootProvider (i18n setup)
           │
           ├─> DocsLayout
           │   │
           │   ├─> Nav (title, logo)
           │   │
           │   ├─> Sidebar
           │   │   └─> Generate from meta.json
           │   │       + icon mapping
           │   │       + defaultOpenLevel: 0
           │   │
           │   ├─> Main Content (DocsPage)
           │   │   ├─> Breadcrumbs
           │   │   ├─> Page title
           │   │   ├─> MDX content
           │   │   └─> Components (Tabs, Steps, etc)
           │   │
           │   ├─> TOC (from page.data.toc)
           │   │
           │   └─> Footer (DocsFooter)
           │       ├─> Brand section
           │       ├─> Docs links
           │       ├─> Resources links
           │       └─> Legal links
           │
           └─> Return rendered page
```

## Performance Optimization Flow

```
Build Time
    │
    ├─> Static Generation
    │   ├─> All .mdx files compiled
    │   ├─> Meta.json processed
    │   └─> Routes pre-rendered
    │
    ├─> CSS Optimization
    │   ├─> Tailwind purge unused
    │   ├─> Critical CSS inlined
    │   └─> Non-critical deferred
    │
    └─> Bundle Splitting
        ├─> DocsFooter separate chunk
        ├─> Icons tree-shaken
        └─> MDX components lazy

Runtime
    │
    ├─> Static HTML served
    │   (No hydration for content)
    │
    ├─> Interactive elements hydrate
    │   ├─> Sidebar collapse (disabled)
    │   ├─> TOC scroll sync
    │   └─> Search (if implemented)
    │
    └─> Layout Performance
        ├─> CLS = 0 (no shifts)
        ├─> LCP optimized (static content)
        └─> FID minimal (little JS)
```

---

**Diagram Version:** 1.0
**Last Updated:** 2025-10-02
**Status:** Complete implementation reference
