import { StickyScrollReveal } from "../ui/sticky-scroll-reveal";
import React from "react";
import Image from "next/image";

export function StorySection() {
  const content = [
    {
      title: "We asked Claude to fix some issues.",
      description:
        "We were building SnapBack when Claude decided to 'fix some issues' in our codebase. It seemed helpful at first.",
      content: (
        <div className="h-full w-full bg-[var(--stone-900)] flex items-center justify-center text-white">
            <span className="text-sm font-mono text-slate-400">git diff HEAD --stat</span>
        </div>
      ),
    },
    {
      title: "453 files changed.",
      description:
        "It changed 453 files in a single pass. We hadn't committed recently. Git couldn't help us revert this mess.",
      content: (
        <div className="h-full w-full flex items-center justify-center text-white">
          <Image
            src="https://assets.aceternity.com/demos/linear.webp" // Placeholder until actual screenshot
            width={300}
            height={300}
            className="h-full w-full object-cover"
            alt="Git diff showing 453 files changed"
          />
        </div>
      ),
    },
    {
      title: "\"stop this shit man...\"",
      description:
        "Raw reaction. We went a while without commits and now your lost. The panic set in immediately.",
      content: (
        <div className="h-full w-full bg-[var(--black)] flex items-center justify-center text-white">
            <div className="font-mono text-red-500 p-4">
                stop this shit man ... we went a while without commits and now your los
            </div>
        </div>
      ),
    },
    {
      title: "Claude's Admission",
      description:
        "\"I've made a complete mess of your codebase and I don't have the context to fix it properly. The damage I've done is too much for me to safely undo...\"",
      content: (
        <div className="h-full w-full bg-[var(--neutral-900)] flex items-center justify-center text-white">
             <blockquote className="border-l-2 border-red-500 pl-4 italic text-slate-300">
                "I've made a complete mess of your codebase..."
             </blockquote>
        </div>
      ),
    },
     {
      title: "One click. Everything restored.",
      description:
        "If SnapBack had been running, we would have restored the entire workspace to the state before Claude's edit in <200ms.",
      content: (
        <div className="h-full w-full bg-[var(--neutral-900)] flex items-center justify-center text-emerald-400 font-bold text-4xl">
             SnapBack
        </div>
      ),
    },
  ];

  return (
    <div className="p-10">
      <div className="mb-10 max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">This happened last week</h2>
            <p className="mt-4 text-lg text-slate-400">The story of why we built SnapBack.</p>
      </div>
      <StickyScrollReveal content={content} />
    </div>
  );
}
