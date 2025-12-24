# Quick Apply: P0 Fixes

These are copy-paste ready code changes for the critical fixes.

---

## Fix 1: Updated Hero.tsx

Replace the entire Hero.tsx file with this version that includes CTAs:

```tsx
// apps/web/modules/marketing/home/components/Hero.tsx
"use client";

import { AlphaBadge } from "@marketing/components/ui/alpha-badge";
import { siteSpec } from "@marketing/config/site-config";
import { HeroDemo } from "@marketing/home/components/hero-demo";
import { MobileHero } from "@marketing/home/components/MobileHero";
import { useIsMobile } from "@marketing/hooks/use-mobile";
import { Shield } from "lucide-react";
import { motion } from "motion/react";
import { animations } from "@/lib/animations";

export function Hero() {
  const heroContent = siteSpec.pages.home.sections.hero.content;
  const isMobile = useIsMobile();

  // Show mobile-optimized hero for mobile devices
  if (isMobile) {
    return (
      <section className="relative w-full min-h-screen flex flex-col bg-[#0A0A0A] overflow-x-hidden">
        {/* Main Content Layer */}
        <div className="relative z-20 container mx-auto flex-grow flex flex-col items-center pt-32 pb-12">
          <motion.div variants={animations.fadeInUp} className="mb-6 flex justify-center">
            <AlphaBadge />
          </motion.div>
          <MobileHero />
        </div>

        {/* Bottom Trust Bar */}
        <div className="relative z-20 container mx-auto px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center justify-center gap-2 text-sm text-text-tertiary border-t border-white/5 pt-8"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="h-2 w-2 rounded-full bg-green shadow-[0_0_10px_#34D399]"
            />
            <span>{heroContent.primary_cta.subtext}</span>
          </motion.div>
        </div>
      </section>
    );
  }

  // Desktop: Interactive demo with CTAs
  return (
    <section className="relative w-full min-h-screen flex flex-col bg-[#0A0A0A] overflow-x-hidden">
      {/* Main Content Layer - Centered */}
      <div className="relative z-20 container mx-auto px-4 flex-grow flex flex-col items-center pt-32 pb-12">
        <motion.div
          className="max-w-6xl mx-auto w-full flex flex-col items-center"
          initial="initial"
          animate="animate"
          variants={{
            animate: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {/* Alpha announcement */}
          <motion.div variants={animations.fadeInUp} className="mb-4 md:mb-6 flex justify-center">
            <AlphaBadge />
          </motion.div>

          {/* Main headline - Bigger, bolder typography */}
          <motion.h1
            variants={animations.fadeInUp}
            className="text-center text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6 md:mb-8 drop-shadow-2xl"
          >
            <span className="text-text-primary">Cursor just mass-edited 453 files.</span>
          </motion.h1>

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

          {/* KEY DIFFERENTIATOR - Make it explicit */}
          <motion.p
            variants={animations.fadeInUp}
            className="text-center text-base md:text-lg text-[#888888] mb-6"
          >
            Git doesn't know when AI touched your code.{" "}
            <span className="text-white font-medium">We do.</span>
          </motion.p>

          {/* CTA Buttons - PRIMARY ACTION ABOVE THE FOLD */}
          <motion.div
            variants={animations.fadeInUp}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <a
              href={heroContent.primary_cta.href}
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
          <motion.div
            id="demo"
            variants={animations.fadeInUp}
            className="w-full max-w-5xl mx-auto mb-4 md:mb-6 relative scroll-mt-8"
          >
            <HeroDemo />

            {/* Interaction Hint Below Demo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="mt-4 text-center text-sm text-[#A0A0A0] flex items-center justify-center gap-2"
            >
              <span>↓ Click 'Snap Back' to undo the damage</span>
            </motion.div>
          </motion.div>

          {/* Founder Story (Secondary) */}
          <motion.p
            variants={animations.fadeInUp}
            className="text-center text-xs md:text-sm text-green-500/70 max-w-2xl mx-auto leading-relaxed mb-6 px-4 font-mono opacity-60 hover:opacity-100 transition-opacity"
          >
            {heroContent.founder_story}
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom Trust Bar */}
      <div className="relative z-20 container mx-auto px-4 pb-8 flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm text-text-tertiary px-4 border-t border-white/5 pt-8 w-full"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green" />
            <span>{heroContent.trust_line}</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-border-subtle" />
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="h-2 w-2 rounded-full bg-green shadow-[0_0_10px_#34D399]"
            />
            <span>{heroContent.primary_cta.subtext}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

---

## Fix 2: Updated changelog/page.tsx

Replace with real dates (adjust version numbers to match your actual releases):

```tsx
// apps/web/app/(marketing)/changelog/page.tsx
import { ChangelogSection } from "@marketing/changelog/components/ChangelogSection";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

export const metadata: Metadata = {
  title: "Changelog | SnapBack - Latest Updates & Release Notes",
  description:
    "Stay updated with SnapBack releases, feature improvements, bug fixes, and product roadmap. See what's new in AI code protection.",
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
            changes: [
              "🚀 Improved AI detection accuracy for Claude Code sessions",
              "⚡ Reduced snapshot creation time to <150ms",
              "🔧 Fixed session grouping edge case with rapid saves",
              "📊 Added real-time protection metrics to status bar",
            ],
          },
          {
            date: "2025-01-08",
            changes: [
              "✨ Added Windsurf AI detection support",
              "🔒 Enhanced privacy: metadata-only telemetry by default",
              "🐛 Fixed restore confirmation dialog on Windows",
              "📝 Improved snapshot labels with semantic context",
            ],
          },
          {
            date: "2025-01-02",
            changes: [
              "🎉 New MCP integration for Claude Code",
              "🔄 Added session time-travel for multi-file restores",
              "⚡ Performance: 40% faster activation time",
              "🛡️ Added burst edit detection for rapid AI changes",
            ],
          },
          {
            date: "2024-12-20",
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

---

## Fix 3: Delete or rename Testimonials.tsx

Run this command to backup the file:

```bash
# In your project root
mv apps/web/modules/marketing/home/components/Testimonials.tsx \
   apps/web/modules/marketing/home/components/Testimonials.tsx.bak
```

Or delete it entirely since it's not being used:

```bash
rm apps/web/modules/marketing/home/components/Testimonials.tsx
```

---

## Verification Checklist

After applying these changes:

1. [ ] Run `pnpm dev` and check localhost
2. [ ] Verify CTA buttons appear above the fold
3. [ ] Verify "Git doesn't know when AI touched your code. We do." is visible
4. [ ] Verify integration logos (Cursor, Copilot, Claude, Windsurf) are visible
5. [ ] Click "Install Free for VS Code" - should open VS Code marketplace
6. [ ] Click "See How It Works ↓" - should scroll to demo
7. [ ] Visit /changelog - should show 2025 dates
8. [ ] Mobile view: CTAs should stack vertically

---

## Quick Visual Test

Your hero should now look like:

```
┌─────────────────────────────────────────────────────┐
│                   [Private Alpha]                    │
│                                                      │
│        Cursor just mass-edited 453 files.           │
│                                                      │
│          Git can't help. SnapBack can.              │
│                                                      │
│   Git doesn't know when AI touched your code. We do.│
│                                                      │
│   [Install Free for VS Code]  [See How It Works ↓]  │
│                                                      │
│   Works with: Cursor • Copilot • Claude • Windsurf  │
│                                                      │
│              ┌──────────────────────┐               │
│              │                      │               │
│              │   INTERACTIVE DEMO   │               │
│              │                      │               │
│              └──────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

Compare to current (no CTA above demo):

```
┌─────────────────────────────────────────────────────┐
│                   [Private Alpha]                    │
│                                                      │
│        Cursor just mass-edited 453 files.           │
│                                                      │
│          Git can't help. SnapBack can.              │
│                                                      │
│              ┌──────────────────────┐               │
│              │                      │               │
│              │   INTERACTIVE DEMO   │  ← User has   │
│              │                      │    to scroll  │
│              └──────────────────────┘    to find    │
│                                          install    │
└─────────────────────────────────────────────────────┘
```
