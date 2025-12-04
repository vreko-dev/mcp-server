# Dashboard Components: Implementation Guide
## Benefit-Driven Design with Aceternity/Magic UI

This guide provides ready-to-use component patterns for the new dashboard design.

---

## Component 1: Hero Card (Protection Status)

### Purpose
Establish emotional context immediately: "What's your protection status?"

### Code Example

```tsx
"use client";

import { Spotlight } from "@marketing/components/ui/aceternity/spotlight";
import { m } from "motion/react";
import { ShieldAlert } from "lucide-react";

interface DashboardHeroCardProps {
  threatsPreventedCount: number;
  protectionLevelPercent: number;
  confidenceLevel: "excellent" | "good" | "warning";
  period: "week" | "month";
  onViewDetails?: () => void;
  onViewWins?: () => void;
}

export function DashboardHeroCard({
  threatsPreventedCount,
  protectionLevelPercent,
  confidenceLevel,
  period,
  onViewDetails,
  onViewWins,
}: DashboardHeroCardProps) {
  const confidenceColor = {
    excellent: "text-green-400",
    good: "text-blue-400",
    warning: "text-amber-400",
  }[confidenceLevel];

  const confidenceEmoji = {
    excellent: "✨",
    good: "⭐",
    warning: "⚠️",
  }[confidenceLevel];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-snapback-green/30 bg-gradient-to-br from-snapback-green/10 via-slate-900 to-slate-950 p-8 md:p-12">
      {/* Optional: Background Effect */}
      <Spotlight
        className="left-0 top-0 md:left-60 md:top-20"
        fill="rgba(16, 185, 129, 0.15)"
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <m.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="text-4xl"
            >
              🛡️
            </m.div>
            <h1 className="text-3xl font-bold text-white">
              You're Protected
            </h1>
          </div>
          <p className="text-snapback-green/80 text-sm uppercase tracking-wider">
            This {period}
          </p>
        </m.div>

        {/* Main Metric */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="space-y-3">
            <div className="text-6xl font-bold text-snapback-green">
              {threatsPreventedCount}
            </div>
            <p className="text-lg text-slate-300">
              Security Risks Prevented
            </p>
            <p className="text-sm text-slate-500">
              That could have cost you hours of debugging
            </p>
          </div>
        </m.div>

        {/* Status Lines */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4 mb-8 border-t border-snapback-green/20 pt-6"
        >
          {/* Protection Level */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Protection Level</span>
            <div className="flex items-center gap-3">
              <div className="w-40 h-2 bg-slate-700 rounded-full overflow-hidden">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${protectionLevelPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-snapback-green to-emerald-300"
                />
              </div>
              <span className="text-snapback-green font-bold">
                {protectionLevelPercent}%
              </span>
            </div>
          </div>

          {/* Confidence */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Your Confidence</span>
            <span className={`text-lg font-bold flex items-center gap-2 ${confidenceColor}`}>
              {confidenceEmoji}
              {confidenceLevel === "excellent"
                ? "Excellent"
                : confidenceLevel === "good"
                  ? "Good"
                  : "Warning"}
            </span>
          </div>
        </m.div>

        {/* CTA Buttons */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap gap-3"
        >
          <button
            onClick={onViewDetails}
            className="px-6 py-2 rounded-lg bg-snapback-green/20 text-snapback-green hover:bg-snapback-green/30 transition-colors font-medium"
          >
            View Details
          </button>
          <button
            onClick={onViewWins}
            className="px-6 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
          >
            Recent Wins
          </button>
        </m.div>
      </div>
    </div>
  );
}
```

### Usage in Page
```tsx
<DashboardHeroCard
  threatsPreventedCount={12}
  protectionLevelPercent={98}
  confidenceLevel="excellent"
  period="week"
  onViewWins={() => scrollToWins()}
/>
```

### Animations
- Icon: Continuous rotation (3s)
- Container: Entrance fade + scale (400ms)
- Progress bar: Width animation (1500ms) on mount
- Buttons: Staggered entrance (200ms apart)

---

## Component 2: Benefit Metric Card

### Purpose
Display a single benefit metric with animated number and context.

### Code Example

```tsx
"use client";

import { BentoGridItem } from "@marketing/components/ui/bento-grid";
import NumberTicker from "@ui/components/magic/number-ticker";
import { m } from "motion/react";
import { ReactNode } from "react";

interface BenefitMetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  unit?: string;
  subtext: string;
  trend?: {
    direction: "up" | "down";
    amount: number;
    period: string;
  };
  color?: "green" | "blue" | "amber" | "purple";
  header?: ReactNode;
  index?: number;
}

export function BenefitMetricCard({
  icon,
  label,
  value,
  unit = "",
  subtext,
  trend,
  color = "green",
  header,
  index = 0,
}: BenefitMetricCardProps) {
  const colorClasses = {
    green: "hover:border-snapback-green/50",
    blue: "hover:border-blue-500/50",
    amber: "hover:border-amber-500/50",
    purple: "hover:border-purple-500/50",
  };

  const iconColorClasses = {
    green: "text-snapback-green",
    blue: "text-blue-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: "easeOut",
      }}
    >
      <BentoGridItem
        className={`flex flex-col justify-between ${colorClasses[color]}`}
        header={
          header && (
            <m.div
              whileHover={{ scale: 1.05 }}
              className="h-20 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg flex items-center justify-center"
            >
              {header}
            </m.div>
          )
        }
        icon={
          <m.div
            whileHover={{ scale: 1.2, rotate: 10 }}
            className={`text-3xl ${iconColorClasses[color]}`}
          >
            {icon}
          </m.div>
        }
        title={
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                <NumberTicker
                  value={value}
                  duration={2000}
                  className="text-3xl font-bold"
                />
              </span>
              {unit && (
                <span className="text-lg text-slate-400">{unit}</span>
              )}
            </div>
          </div>
        }
        description={
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{subtext}</p>
            {trend && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={`text-sm font-medium flex items-center gap-1 ${
                  trend.direction === "up"
                    ? "text-snapback-green"
                    : "text-red-400"
                }`}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.amount}
                {trend.amount > 1 ? "h" : "%"} {trend.period}
              </m.div>
            )}
          </div>
        }
      />
    </m.div>
  );
}
```

### Usage Examples
```tsx
{/* Time Saved */}
<BenefitMetricCard
  icon="⏱️"
  label="Time Saved"
  value={4}
  unit="hours"
  subtext="In debugging & recovery"
  trend={{ direction: "up", amount: 0.8, period: "vs last week" }}
  color="green"
  index={0}
/>

{/* Threats Prevented */}
<BenefitMetricCard
  icon="🛡️"
  label="Threats Caught"
  value={12}
  subtext="5 security, 4 breaking changes, 3 config errors"
  color="blue"
  index={1}
/>

{/* AI Iterations */}
<BenefitMetricCard
  icon="🤖"
  label="AI Iterations"
  value={2}
  unit="avg/session"
  subtext="Safe usage pattern"
  trend={{ direction: "down", amount: 0.4, period: "vs last week" }}
  color="purple"
  index={2}
/>
```

### Micro-Interactions
1. **Entry Animation:** Staggered fade + slide up
2. **Number Ticker:** Counts from 0 to final value (2s)
3. **Icon Hover:** Scale 1.2x + rotate 10°
4. **Card Hover:** Inherited from BentoGridItem (y-8px lift, glow)
5. **Trend Display:** Fade in after number completes

---

## Component 3: Recent Wins Timeline

### Purpose
Narrative display of recent successes, recoveries, and prevents.

### Code Example

```tsx
"use client";

import { m } from "motion/react";
import { AlertCircle, CheckCircle, RotateCcw, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Win {
  id: string;
  timestamp: Date;
  type: "restore" | "prevention" | "threat-detection";
  fileName: string;
  description: string;
  timeSaved?: number;
  severity?: "low" | "medium" | "high";
}

interface RecentWinsTimelineProps {
  wins: Win[];
  onWinClick?: (win: Win) => void;
}

export function RecentWinsTimeline({
  wins,
  onWinClick,
}: RecentWinsTimelineProps) {
  const getWinIcon = (type: string) => {
    switch (type) {
      case "restore":
        return <RotateCcw className="w-5 h-5 text-snapback-green" />;
      case "prevention":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "threat-detection":
        return <Zap className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getWinColor = (type: string) => {
    switch (type) {
      case "restore":
        return "border-snapback-green/30 bg-snapback-green/5";
      case "prevention":
        return "border-amber-500/30 bg-amber-500/5";
      case "threat-detection":
        return "border-red-500/30 bg-red-500/5";
      default:
        return "border-blue-500/30 bg-blue-500/5";
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-amber-400";
      case "low":
        return "text-green-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recent Wins & Recoveries</h2>
        <span className="text-sm text-slate-500">{wins.length} this week</span>
      </div>

      <div className="space-y-3">
        {wins.map((win, index) => (
          <m.div
            key={win.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: "easeOut",
            }}
            whileHover={{ x: 4 }}
            onClick={() => onWinClick?.(win)}
            className={`rounded-lg border p-4 cursor-pointer transition-all ${getWinColor(win.type)}`}
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getWinIcon(win.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-semibold text-white truncate">
                      {win.description}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {win.fileName}
                    </p>
                  </div>
                  {win.severity && (
                    <span
                      className={`text-xs font-medium flex-shrink-0 ${getSeverityColor(win.severity)}`}
                    >
                      {win.severity.charAt(0).toUpperCase() +
                        win.severity.slice(1)}
                    </span>
                  )}
                </div>

                {/* Footer: Time Info + Impact */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    📅 {formatDistanceToNow(win.timestamp, {
                      addSuffix: true,
                    })}
                  </span>
                  {win.timeSaved && (
                    <m.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-snapback-green font-semibold"
                    >
                      Saved you ~{win.timeSaved}m
                    </m.span>
                  )}
                </div>
              </div>
            </div>
          </m.div>
        ))}
      </div>

      {wins.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p>No recent wins yet. Create a snapshot to get started!</p>
        </div>
      )}
    </div>
  );
}
```

### Usage
```tsx
<RecentWinsTimeline
  wins={[
    {
      id: "1",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: "restore",
      fileName: "dashboard.tsx",
      description: "Restored dashboard.tsx",
      timeSaved: 23,
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      type: "prevention",
      fileName: "config/auth.ts",
      description: "Prevented breaking change",
      severity: "high",
    },
  ]}
  onWinClick={(win) => console.log("Clicked:", win)}
/>
```

### Micro-Interactions
1. **Staggered Entry:** Each card slides in from left (100ms apart)
2. **Hover State:** Subtle x-translate right (4px)
3. **Time Display:** Fade in after entry animation
4. **Severity Badge:** Color-coded indicator

---

## Component 4: Collapsible Section

### Purpose
Progressive disclosure of advanced metrics.

### Code Example

```tsx
"use client";

import { m } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface CollapsibleMetricsProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleMetrics({
  title,
  icon,
  children,
  defaultOpen = false,
}: CollapsibleMetricsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/20">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <span className="font-semibold text-white">{title}</span>
        </div>
        <m.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </m.div>
      </button>

      {/* Content */}
      <m.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="overflow-hidden border-t border-slate-700"
      >
        <div className="px-6 py-4 space-y-3">{children}</div>
      </m.div>
    </div>
  );
}
```

### Usage
```tsx
<CollapsibleMetrics title="System Health" icon="⚙️">
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span className="text-slate-400">API Latency (p95)</span>
      <span className="text-snapback-green">120ms ✓</span>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-400">Dashboard TTFB</span>
      <span className="text-snapback-green">0.8s ✓</span>
    </div>
  </div>
</CollapsibleMetrics>
```

---

## Layout Assembly: Complete Dashboard Page

```tsx
"use client";

import { DashboardHeroCard } from "./components/DashboardHeroCard";
import { BenefitMetricCard } from "./components/BenefitMetricCard";
import { RecentWinsTimeline } from "./components/RecentWinsTimeline";
import { CollapsibleMetrics } from "./components/CollapsibleMetrics";
import { BentoGrid } from "@marketing/components/ui/bento-grid";

export default function EnhancedDashboard({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <DashboardHeroCard
        threatsPreventedCount={metrics.threatsPreventedThisWeek}
        protectionLevelPercent={metrics.protectionLevelPercent}
        confidenceLevel={metrics.confidenceLevel}
        period="week"
      />

      {/* Metrics Row 1: Impact Metrics */}
      <BentoGrid className="md:grid-cols-3">
        <BenefitMetricCard
          icon="⏱️"
          label="Time Saved"
          value={metrics.debuggingHoursSavedThisWeek}
          unit="hours"
          subtext="In debugging & recovery"
          trend={{
            direction: "up",
            amount: metrics.hoursSavedVsLastWeek,
            period: "vs last week",
          }}
          color="green"
          index={0}
        />
        <BenefitMetricCard
          icon="🛡️"
          label="Threats Caught"
          value={metrics.threatsPreventedThisWeek}
          subtext={`${metrics.securityVulnerabilitiesPrevented} security,
                     ${metrics.breakingChangesCaught} breaking,
                     ${metrics.configErrorsPrevented} config errors`}
          color="blue"
          index={1}
        />
        <BenefitMetricCard
          icon="🤖"
          label="AI Iterations"
          value={metrics.averageAIIterations}
          unit="avg/session"
          subtext="Safe usage pattern"
          trend={{
            direction: "down",
            amount: Math.abs(metrics.aiIterationsVsLastWeek),
            period: "vs last week",
          }}
          color="purple"
          index={2}
        />
      </BentoGrid>

      {/* Metrics Row 2: Success Metrics */}
      <BentoGrid className="md:grid-cols-3">
        <BenefitMetricCard
          icon="✅"
          label="Success Rate"
          value={metrics.restoreSuccessRate * 100}
          unit="%"
          subtext="When you need it, it works"
          color="green"
          index={3}
        />
        <BenefitMetricCard
          icon="⚠️"
          label="False Positives"
          value={metrics.falsePositiveRate * 100}
          unit="%"
          subtext="Fewer interruptions, more signal"
          color="amber"
          index={4}
        />
        <BenefitMetricCard
          icon="⭐"
          label="Confidence Boost"
          value={metrics.confidenceBoost}
          unit="%"
          subtext="Higher than last week"
          color="purple"
          index={5}
        />
      </BentoGrid>

      {/* Recent Wins Timeline */}
      <RecentWinsTimeline wins={metrics.recentWins} />

      {/* Collapsible Advanced Sections */}
      <div className="space-y-4">
        <CollapsibleMetrics title="System Health" icon="⚙️">
          <div className="space-y-3 text-sm">
            <MetricRow
              label="API Latency (p95)"
              value="120ms"
              status="excellent"
            />
            <MetricRow
              label="Dashboard TTFB"
              value="0.8s"
              status="excellent"
            />
            <MetricRow
              label="Worker Jobs"
              value="12 pending"
              status="warning"
            />
          </div>
        </CollapsibleMetrics>

        <CollapsibleMetrics title="Storage Usage" icon="💾">
          <StorageProgressBar
            used={metrics.checkpointsUsed}
            limit={metrics.checkpointLimit}
          />
        </CollapsibleMetrics>

        <CollapsibleMetrics title="API Activity" icon="📊">
          <div className="text-sm text-slate-400">
            Current: {metrics.apiActivity} req/day
          </div>
        </CollapsibleMetrics>
      </div>
    </div>
  );
}

// Helper components
function MetricRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "excellent" | "warning" | "error";
}) {
  const statusColor = {
    excellent: "text-snapback-green",
    warning: "text-amber-500",
    error: "text-red-500",
  }[status];

  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${statusColor}`}>{value}</span>
    </div>
  );
}

function StorageProgressBar({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const percent = (used / limit) * 100;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-400">Used</span>
        <span className="text-white">{used.toLocaleString()} snapshots</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full transition-all ${
            percent > 90
              ? "bg-red-500"
              : percent > 80
                ? "bg-amber-500"
                : "bg-snapback-green"
          }`}
        />
      </div>
      <div className="text-xs text-slate-500">
        {percent.toFixed(0)}% of {limit.toLocaleString()}
      </div>
    </div>
  );
}
```

---

## Animation Timing Guide

| Animation | Duration | Delay | Type |
|-----------|----------|-------|------|
| Hero card entrance | 400ms | 0ms | Fade + Scale |
| Protection level bar | 1500ms | 300ms | Width animate |
| Metric cards | 500ms | 100ms per card | Fade + Y-slide |
| Number ticker | 2000ms | After card | Count animation |
| Trend indicators | 300ms | 500ms | Fade in |
| Recent wins | 400ms | 100ms per item | Slide + Fade |
| Collapsible | 300ms | On click | Height + Chevron |

---

## Accessibility Checklist

- ✅ `prefers-reduced-motion`: Disable all animations
- ✅ ARIA labels on animated numbers ("Time Saved: 4.2 hours")
- ✅ Semantic HTML: `<section>`, `<article>`, `<h2>`-`<h3>` hierarchy
- ✅ Keyboard navigation: Tab through all interactive elements
- ✅ Color contrast: Verify 4.5:1 ratio for text
- ✅ Motion duration: Max 400ms for reduced-motion users
- ✅ Focus indicators: Visible on buttons and interactive cards

---

**Last Updated:** 2025-12-04
**Framework:** Next.js 15, Framer Motion, Aceternity/Magic UI
