# SnapBack Website Overhaul Implementation Plan

## Executive Summary

Based on the strategic discussion and website audit, here's a prioritized implementation plan to transform the website from 6/10 to 9/10 conversion readiness.

---

## Phase 1: P0 Critical Fixes (2-4 hours)

### Fix 1: Add CTA Buttons to Hero

**File:** `apps/web/modules/marketing/home/components/Hero.tsx`

**Current Problem:** No visible CTA button above the fold. Users must scroll past the demo to find "Install Extension."

**Solution:** Add primary CTA + secondary CTA + integration logos between subheadline and demo.

**Find this code (around line 76-85):**
```tsx
{/* Subheadline - Problem to Solution */}
<motion.h2
  variants={animations.fadeInUp}
  className="text-center text-2xl md:text-3xl font-semibold tracking-tight leading-[1.2] mb-8 md:mb-10"
>
  <span className="text-[#A0A0A0]">Git can't help. </span>
  <span className="text-green-500 drop-shadow-[0_0_25px_rgba(52,211,153,0.4)]">
    SnapBack can.
  </span>
</motion.h2>

{/* NEW: Interactive Hero Demo - Constrained for Golden Ratio */}
```

**Replace with:**
```tsx
{/* Subheadline - Problem to Solution */}
<motion.h2
  variants={animations.fadeInUp}
  className="text-center text-2xl md:text-3xl font-semibold tracking-tight leading-[1.2] mb-4"
>
  <span className="text-[#A0A0A0]">Git can't help. </span>
  <span className="text-green-500 drop-shadow-[0_0_25px_rgba(52,211,153,0.4)]">
    SnapBack can.
  </span>
</motion.h2>

{/* Key differentiator - THE killer insight, explicit */}
<motion.p
  variants={animations.fadeInUp}
  className="text-center text-base md:text-lg text-[#888888] mb-6"
>
  Git doesn't know when AI touched your code. <span className="text-white font-medium">We do.</span>
</motion.p>

{/* CTA Buttons */}
<motion.div
  variants={animations.fadeInUp}
  className="flex flex-col sm:flex-row gap-3 mb-6"
>
  <a
    href={heroContent.primary_cta.href}
    onClick={() => {
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('INSTALL_BUTTON_CLICKED', { source_section: 'hero_primary' });
      }
    }}
    className="inline-flex items-center justify-center px-8 py-3.5 bg-[#34D399] text-black hover:bg-[#34D399]/90 font-semibold text-base rounded-lg transition-all hover:scale-105 hover:-translate-y-0.5 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
  >
    Install Free for VS Code
  </a>
  <a
    href="#demo"
    className="inline-flex items-center justify-center px-8 py-3.5 border border-[#34D399]/50 text-[#34D399] hover:bg-[#34D399]/10 font-semibold text-base rounded-lg transition-all"
  >
    See How It Works ↓
  </a>
</motion.div>

{/* Integration logos - shows multi-tool support */}
<motion.div
  variants={animations.fadeInUp}
  className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm text-[#666666]"
>
  <span>Works with:</span>
  <div className="flex items-center gap-3 flex-wrap justify-center">
    <span className="text-white font-medium">Cursor</span>
    <span className="text-white/30">•</span>
    <span className="text-white font-medium">Copilot</span>
    <span className="text-white/30">•</span>
    <span className="text-white font-medium">Claude Code</span>
    <span className="text-white/30">•</span>
    <span className="text-white font-medium">Windsurf</span>
  </div>
</motion.div>

{/* Interactive Hero Demo */}
```

Also add `id="demo"` to the demo container div for the scroll link to work.

---

### Fix 2: Fix Changelog Placeholder Data

**File:** `apps/web/app/(marketing)/changelog/page.tsx`

**Current Problem:** Shows fake 2024 dates ("2024-03-01", "2024-02-01", "2024-01-01") with generic entries.

**Option A: Replace with real changelog data**

```tsx
import { ChangelogSection } from "@marketing/changelog/components/ChangelogSection";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
  title: "Changelog | SnapBack - Latest Updates & Release Notes",
  description:
    "Stay updated with SnapBack releases, feature improvements, bug fixes, and product roadmap.",
  openGraph: {
    title: "Changelog | SnapBack - Latest Updates",
    description: "Latest releases and updates to SnapBack AI code protection.",
    url: `${SITE_URL}/changelog`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/changelog`,
  },
};

export default async function ChangelogPage() {
  return (
    <div className="container max-w-3xl pt-32 pb-16">
      <div className="mb-12 text-balance pt-8 text-center">
        <h1 className="mb-2 font-bold text-5xl">Changelog</h1>
        <p className="text-lg opacity-50">Stay up to date with our latest improvements</p>
      </div>
      <ChangelogSection
        items={[
          {
            date: "2025-01-15",
            version: "1.4.3",
            changes: [
              "🚀 Improved AI detection accuracy for Claude Code sessions",
              "⚡ Reduced snapshot creation time to <150ms",
              "🔧 Fixed session grouping edge case with rapid saves",
              "📊 Added real-time protection metrics to status bar",
            ],
          },
          {
            date: "2025-01-08",
            version: "1.4.2",
            changes: [
              "✨ Added Windsurf AI detection support",
              "🔒 Enhanced privacy: metadata-only telemetry by default",
              "🐛 Fixed restore confirmation dialog on Windows",
              "📝 Improved snapshot labels with semantic context",
            ],
          },
          {
            date: "2025-01-02",
            version: "1.4.1",
            changes: [
              "🎉 New MCP integration for Claude Code",
              "🔄 Added session time-travel for multi-file restores",
              "⚡ Performance: 40% faster activation time",
              "🛡️ Added burst edit detection for rapid AI changes",
            ],
          },
          {
            date: "2024-12-20",
            version: "1.4.0",
            changes: [
              "🚀 Major release: Guardian AI detection engine",
              "📊 New dashboard with protection metrics",
              "🔐 Pioneer Program launch",
              "✨ Added protection levels: Watch/Warn/Block",
            ],
          },
        ]}
      />
    </div>
  );
}
```

**Option B: Hide changelog from navigation until you have real data**

Remove the changelog link from the navbar temporarily.

---

### Fix 3: Handle Testimonials Component

**File:** `apps/web/modules/marketing/home/components/Testimonials.tsx`

**Current Problem:** Contains fabricated testimonials (Sarah K., Michael T., etc.) but ISN'T being displayed on homepage.

**Options:**

**Option A (Recommended): Delete or rename file**
Since it's not being used, either delete it or rename to `Testimonials.tsx.bak` to prevent accidental future use.

**Option B: Replace with honest "Coming Soon" messaging if you want to use it**

```tsx
"use client";

import { motion } from "motion/react";

export function Testimonials() {
  return (
    <section className="py-16 bg-[#0A0A0A]">
      <div className="container max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-bold text-3xl md:text-4xl mb-4 text-white">
            What Developers Are Saying
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl mx-auto mb-8">
            We're collecting feedback from our Pioneer community.
            Real testimonials coming soon.
          </p>

          {/* Metrics instead of fake quotes */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#34D399]">2,847</div>
              <div className="text-sm text-[#888888]">Active Pioneers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#34D399]">47,291</div>
              <div className="text-sm text-[#888888]">Restores Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#34D399]">94%</div>
              <div className="text-sm text-[#888888]">Detection Accuracy</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

---

## Phase 2: P1 High-Impact Improvements (4-8 hours)

### Improvement 1: Add Comparison Table Section

**Create new file:** `apps/web/modules/marketing/components/sections/comparison-table.tsx`

```tsx
"use client";

import { motion } from "motion/react";
import { Check, X, Minus } from "lucide-react";

const features = [
  {
    name: "Knows when AI touched your code",
    git: false,
    timeline: false,
    snapback: true,
  },
  {
    name: "Auto-protects before AI changes",
    git: false,
    timeline: false,
    snapback: true,
  },
  {
    name: "Detects Cursor, Copilot, Claude, Windsurf",
    git: false,
    timeline: false,
    snapback: true,
  },
  {
    name: "Groups related AI changes (sessions)",
    git: false,
    timeline: false,
    snapback: true,
  },
  {
    name: "One-click multi-file restore",
    git: "partial", // git stash sort of does this
    timeline: false,
    snapback: true,
  },
  {
    name: "Works offline",
    git: true,
    timeline: true,
    snapback: true,
  },
  {
    name: "Learns from your patterns",
    git: false,
    timeline: false,
    snapback: true,
  },
  {
    name: "Free",
    git: true,
    timeline: true,
    snapback: true,
  },
];

function FeatureIcon({ value }: { value: boolean | "partial" }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-[#34D399]" />;
  }
  if (value === "partial") {
    return <Minus className="h-5 w-5 text-yellow-500" />;
  }
  return <X className="h-5 w-5 text-[#666666]" />;
}

export function ComparisonTable() {
  return (
    <section className="py-20 bg-[#0A0A0A]">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why not just use Git?
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl mx-auto">
            Git is for commits. SnapBack is for "oh no, what did AI just do?"
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="overflow-x-auto"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 text-[#888888] font-medium">
                  Feature
                </th>
                <th className="text-center py-4 px-4 text-[#888888] font-medium w-24">
                  Git
                </th>
                <th className="text-center py-4 px-4 text-[#888888] font-medium w-24">
                  Timeline
                </th>
                <th className="text-center py-4 px-4 text-[#34D399] font-bold w-24">
                  SnapBack
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={feature.name}
                  className={`border-b border-white/5 ${
                    index % 2 === 0 ? "bg-white/[0.02]" : ""
                  }`}
                >
                  <td className="py-4 px-4 text-white text-sm">
                    {feature.name}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <FeatureIcon value={feature.git} />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <FeatureIcon value={feature.timeline} />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <FeatureIcon value={feature.snapback} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-sm text-[#666666] mt-6"
        >
          Timeline = VS Code's built-in Local History feature
        </motion.p>
      </div>
    </section>
  );
}
```

**Add to homepage:** Update `apps/web/app/(marketing)/(home)/page.tsx`:

```tsx
import { Hero } from "@marketing/home/components/Hero";
import { ComparisonTable } from "@marketing/components/sections/comparison-table";
import { FinalCTA, Metrics, ProblemSection } from "@marketing/sections/launch";
import type { Metadata } from "next";
import { StorySection } from "@/components/landing/story-section";

// ... metadata stays the same ...

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      <Hero />
      <StorySection />
      <ComparisonTable /> {/* NEW: Add comparison table after story */}
      <ProblemSection />
      <Metrics />
      <FinalCTA />
    </main>
  );
}
```

---

### Improvement 2: Add MCP Showcase Section

**Create new file:** `apps/web/modules/marketing/components/sections/mcp-showcase.tsx`

```tsx
"use client";

import { motion } from "motion/react";
import { MessageSquare, Shield, Zap } from "lucide-react";

export function MCPShowcase() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#0A0A0A] to-[#111111]">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#34D399]/10 text-[#34D399] text-sm mb-4">
            <Zap className="h-4 w-4" />
            Pro Feature
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Your AI assistant knows when to be careful
          </h2>
          <p className="text-[#A0A0A0] max-w-2xl mx-auto">
            SnapBack integrates with Claude Code and Cursor via MCP.
            Before making risky changes, your AI can check with SnapBack first.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6 md:p-8"
        >
          {/* Mock conversation */}
          <div className="space-y-4 font-mono text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
              <div className="bg-[#252525] rounded-lg p-3 flex-1">
                <p className="text-white/80">
                  "Refactor the auth module to use the new API"
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#34D399]/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-[#34D399]" />
              </div>
              <div className="bg-[#1e2a1e] border border-[#34D399]/20 rounded-lg p-3 flex-1">
                <p className="text-[#34D399]/80 text-xs mb-1">
                  SnapBack MCP Response
                </p>
                <p className="text-white/80">
                  ⚠️ High-risk operation detected. This will modify 12 files including auth.ts,
                  which has been flagged as break-prone in your codebase.
                  <span className="text-[#34D399]"> Snapshot created automatically.</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
              <div className="bg-[#252525] rounded-lg p-3 flex-1">
                <p className="text-white/80">
                  Claude proceeds with confidence, knowing you can restore if needed.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 grid md:grid-cols-3 gap-4"
        >
          {[
            {
              title: "Risk Assessment",
              description: "AI asks SnapBack to evaluate changes before making them",
            },
            {
              title: "Auto-Snapshot",
              description: "Automatically creates restore points for risky operations",
            },
            {
              title: "Pattern Learning",
              description: "Learns which patterns break your specific codebase",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="bg-[#151515] rounded-lg p-4 border border-white/5"
            >
              <h3 className="text-white font-medium mb-1">{item.title}</h3>
              <p className="text-[#888888] text-sm">{item.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

---

## Phase 3: Homepage Restructure

### Recommended Final Homepage Order

```tsx
// apps/web/app/(marketing)/(home)/page.tsx
import { Hero } from "@marketing/home/components/Hero";
import { ComparisonTable } from "@marketing/components/sections/comparison-table";
import { MCPShowcase } from "@marketing/components/sections/mcp-showcase";
import { FinalCTA, Metrics, ProblemSection } from "@marketing/sections/launch";
import { StorySection } from "@/components/landing/story-section";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* 1. Hero: Pain + CTA + Demo */}
      <Hero />

      {/* 2. Social Proof: Real story with screenshots */}
      <StorySection />

      {/* 3. Differentiation: Why not Git? */}
      <ComparisonTable />

      {/* 4. How It Works: Learning stages */}
      <ProblemSection />

      {/* 5. Pro Feature Showcase: MCP integration */}
      <MCPShowcase />

      {/* 6. Metrics: Pioneer numbers */}
      <Metrics />

      {/* 7. Final CTA: Install + Pioneer */}
      <FinalCTA />
    </main>
  );
}
```

---

## Summary Checklist

### P0 (Do Today)
- [ ] Add CTA buttons to Hero (above demo)
- [ ] Add "Git doesn't know when AI touched your code. We do." explicit text
- [ ] Add integration logos (Cursor, Copilot, Claude, Windsurf)
- [ ] Fix changelog with real dates or hide from nav
- [ ] Delete/archive fake testimonials file

### P1 (Do This Week)
- [ ] Create comparison table (Git vs Timeline vs SnapBack)
- [ ] Create MCP showcase section
- [ ] Update homepage order
- [ ] Add real VS Code marketplace install count (if available)
- [ ] Add real GitHub stars (if actually 4.5k)

### P2 (Backlog)
- [ ] Create 60-second demo video
- [ ] Add more blog content for SEO
- [ ] Collect real testimonials from Pioneers
- [ ] Add case studies beyond founder story
- [ ] Create OG images for social sharing

---

## Messaging Quick Reference

### One-Liners to Use

| Context | Message |
|---------|---------|
| Hero headline | "Cursor just mass-edited 453 files." |
| Hero subheadline | "Git can't help. SnapBack can." |
| Differentiator | "Git doesn't know when AI touched your code. We do." |
| Value prop | "Never lose work to AI mistakes" |
| Trust signal | "Works with Cursor, Copilot, Claude, and Windsurf" |
| CTA primary | "Install Free for VS Code" |
| CTA secondary | "Become a Pioneer" |

### Messages to Avoid

| Don't Say | Why |
|-----------|-----|
| "We license our API" | Too early, confuses individual devs |
| "Trained on your data" | Sounds creepy without context |
| "Enterprise AI compliance" | Wrong audience for homepage |
| "MCP integration" without context | Jargon that most devs don't know |
