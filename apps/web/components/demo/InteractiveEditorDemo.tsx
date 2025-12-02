'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ============================================
// Types
// ============================================
type DemoState = 'idle' | 'ai_editing' | 'error' | 'restored';

interface TimelineEntry {
  id: string;
  time: string;
  description: string;
  type: 'manual' | 'auto' | 'ai' | 'error';
  code: string;
  canRestore: boolean;
}

// ============================================
// Constants
// ============================================
const CODE_INITIAL = `export const config = {
  database: "postgres://localhost:5432/myapp",
  apiKey: process.env.API_KEY,
  debug: false,
  timeout: 30000
}`;

const CODE_BROKEN = `export const config = {
  // Refactored for better modularity
  database: getDbUrl(),
  apiKey: "sk-1234567890abcdef",
  debug: true,
  timeout: 5000,
  logging: {
    level: "verbose",
    format: "json"
  }
}`;

const formatTime = (date: Date = new Date()) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// ============================================
// Sub-components
// ============================================

// Traffic Light Button
const TrafficLight = ({ color }: { color: 'red' | 'yellow' | 'green' }) => {
  const colors = {
    red: 'bg-[#FF5F56]',
    yellow: 'bg-[#FFBD2E]',
    green: 'bg-[#27CA40]',
  };
  return (
    <div
      className={`w-3 h-3 rounded-full ${colors[color]} transition-transform hover:scale-110`}
    />
  );
};

// File Status Badge
const FileStatus = ({ status }: { status: 'saved' | 'modified' | 'error' }) => {
  const styles = {
    saved: 'bg-emerald-500/25 text-emerald-300',
    modified: 'bg-yellow-500/25 text-yellow-300',
    error: 'bg-red-500/25 text-red-300',
  };
  const labels = {
    saved: 'Saved',
    modified: 'Modified',
    error: 'Error',
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// Code Display with Line Numbers
const CodeDisplay = ({ code, isTyping }: { code: string; isTyping: boolean }) => {
  const lines = code.split('\n');

  return (
    <div className="flex font-mono text-[11px] sm:text-xs md:text-sm leading-relaxed overflow-x-auto">
      {/* Line Numbers - Hidden on mobile, show on tablet+ */}
      <div className="hidden sm:flex select-none pr-1.5 sm:pr-2 md:pr-4 text-right text-zinc-600 border-r border-zinc-800 mr-1.5 sm:mr-2 md:mr-4 flex-shrink-0 text-[9px] sm:text-[10px] md:text-sm">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Code Content */}
      <div className="flex-1 text-zinc-100 overflow-x-auto pl-0.5 sm:pl-0">
        <pre className="whitespace-pre-wrap text-[11px] sm:text-xs md:text-sm font-mono">
          {code}
          <span
            className={`inline-block w-0.5 h-2.5 sm:h-3 md:h-4 bg-emerald-500 ml-0.5 align-text-bottom ${
              isTyping ? '' : 'animate-pulse'
            }`}
          />
        </pre>
      </div>
    </div>
  );
};

// Timeline Entry Component
const TimelineEntryComponent = ({
  entry,
  isSelected,
  onRestore,
}: {
  entry: TimelineEntry;
  isSelected: boolean;
  onRestore: () => void;
}) => {
  const dotStyles = {
    manual: 'bg-emerald-500/20 text-emerald-400',
    auto: 'bg-zinc-800 text-zinc-500',
    ai: 'bg-purple-500/20 text-purple-400',
    error: 'bg-red-500/20 text-red-400',
  };

  const icons = {
    manual: '●',
    auto: '○',
    ai: '🤖',
    error: '❌',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        group relative flex items-start gap-3 p-3 rounded-lg transition-colors duration-200
        ${entry.canRestore ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}
        ${
          isSelected
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : entry.canRestore
              ? 'hover:bg-zinc-800/50 border border-transparent'
              : 'border border-zinc-700/50 bg-zinc-950/50'
        }
      `}
      onClick={entry.canRestore ? onRestore : undefined}
      role="button"
      tabIndex={entry.canRestore ? 0 : -1}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && entry.canRestore) onRestore();
      }}
      aria-label={`${entry.description} at ${entry.time}${entry.canRestore ? ', click to restore' : ' (not restorable)'}`}
    >
      {/* Dot */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
          transition-transform duration-200 ${entry.canRestore ? 'group-hover:scale-110' : ''}
          ${dotStyles[entry.type]}
        `}
      >
        {icons[entry.type]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono text-zinc-600 mb-0.5">
          {entry.time}
        </div>
        <div
          className={`text-[13px] truncate ${
            entry.type === 'error' ? 'text-red-400' :
            entry.type === 'ai' ? 'text-purple-400' :
            'text-zinc-400'
          }`}
        >
          {entry.description}
        </div>
        {!entry.canRestore && (
          <div className="text-[11px] text-zinc-600 mt-1">
            Not restorable
          </div>
        )}
      </div>

      {/* Restore Button - Always visible on mobile, shows on hover on desktop */}
      {entry.canRestore && (
        <motion.button
          initial={{ opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          className={`
            absolute right-2 sm:right-3 top-1/2 -translate-y-1/2
            px-2 sm:px-2.5 py-1 text-[9px] sm:text-[11px] font-medium
            bg-emerald-500 text-black rounded
            opacity-100 sm:opacity-0 sm:group-hover:opacity-100
            transition-opacity duration-200 flex-shrink-0
          `}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRestore();
          }}
        >
          <span className="hidden sm:inline">Restore</span>
          <span className="sm:hidden">Restore</span>
        </motion.button>
      )}
    </motion.div>
  );
};

// AI Typing Indicator
const AITypingIndicator = ({ visible }: { visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5
                   bg-purple-500/25 border border-purple-400/50 rounded-md"
      >
        <span className="text-xs text-purple-300 font-medium">🤖 AI editing</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-purple-300 rounded-full"
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Error Overlay
const ErrorOverlay = ({ visible }: { visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 p-3
                   bg-red-500/20 border-t border-red-400/50
                   font-mono text-[13px] text-red-300"
      >
        <strong className="text-red-200">Error:</strong> Cannot find name 'getDbUrl'. Did you mean 'getDB'?
      </motion.div>
    )}
  </AnimatePresence>
);

// Restored Badge
const RestoredBadge = ({ visible }: { visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        className="absolute inset-0 flex items-center justify-center z-10"
      >
        <div className="px-6 py-3 bg-emerald-500 rounded-xl text-black font-semibold text-lg shadow-2xl">
          ✓ Restored in 47ms
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ============================================
// Main Component
// ============================================
export function InteractiveEditorDemo() {
  // State
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [code, setCode] = useState(CODE_INITIAL);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showRestoredBadge, setShowRestoredBadge] = useState(false);

  // Refs for demo loop control
  const demoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const demoStateRef = useRef<DemoState>('idle');

  // Sync ref with state
  useEffect(() => {
    demoStateRef.current = demoState;
  }, [demoState]);
  useEffect(() => {
    const now = Date.now();
    setTimeline([
      {
        id: 'initial-1',
        time: formatTime(new Date(now - 120000)),
        description: 'Session started',
        type: 'manual',
        code: CODE_INITIAL,
        canRestore: true,
      },
      {
        id: 'initial-2',
        time: formatTime(new Date(now - 60000)),
        description: 'Auto-snapshot',
        type: 'auto',
        code: CODE_INITIAL,
        canRestore: true,
      },
    ]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  // Add timeline entry
  const addTimelineEntry = useCallback((
    entry: Omit<TimelineEntry, 'id' | 'time'>
  ) => {
    const newEntry: TimelineEntry = {
      ...entry,
      id: crypto.randomUUID(),
      time: formatTime(),
    };
    setTimeline((prev) => [newEntry, ...prev].slice(0, 8)); // Keep max 8 entries
    return newEntry;
  }, []);

  // Typewriter effect - simplified to avoid closure issues
  const typeCode = useCallback(async (targetCode: string): Promise<void> => {
    setIsTyping(true);
    setCode(''); // Clear immediately

    // Simulate typing by gradually showing the code
    const chars = targetCode.split('');
    for (let i = 0; i < chars.length; i++) {
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          setCode(chars.slice(0, i + 1).join(''));
          resolve();
        }, 20);
        typingIntervalRef.current = timeoutId;
      });
    }

    setIsTyping(false);
  }, []);

  // Handle restore action
  const handleRestore = useCallback((entry: TimelineEntry) => {
    // Stop any ongoing demo
    if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    setSelectedId(entry.id);
    setDemoState('restored');
    setCode(entry.code);
    setShowRestoredBadge(true);
    setIsTyping(false);

    // Return to idle state after animation
    // Key fix: Always transition to 'idle' instead of staying in error state
    demoTimeoutRef.current = setTimeout(() => {
      setShowRestoredBadge(false);
      setDemoState('idle'); // This closes the error overlay if it was visible
      setSelectedId(null);
    }, 2500);
  }, []);

  // Create manual snapshot
  const handleCreateSnapshot = useCallback(() => {
    addTimelineEntry({
      description: 'Manual snapshot',
      type: 'manual',
      code: code,
      canRestore: true,
    });
  }, [addTimelineEntry]);

  // Demo step
  const runDemoStep = useCallback(async () => {
    if (!isPlaying) return;

    try {
      // Step 1: AI starts editing
      setDemoState('ai_editing');
      addTimelineEntry({
        description: '🤖 AI editing...',
        type: 'ai',
        code: CODE_INITIAL,
        canRestore: false,
      });

      // Auto-snapshot after brief delay
      await new Promise<void>((r) => {
        demoTimeoutRef.current = setTimeout(r, 500);
      });

      if (!isPlaying) return;

      addTimelineEntry({
        description: 'Auto-snapshot',
        type: 'auto',
        code: CODE_INITIAL,
        canRestore: true,
      });

      // Type the modified code
      await typeCode(CODE_BROKEN);

      if (!isPlaying) return;

      // Brief pause
      await new Promise<void>((r) => {
        demoTimeoutRef.current = setTimeout(r, 800);
      });

      if (!isPlaying) return;

      // Step 2: Error state
      setDemoState('error');

      addTimelineEntry({
        description: '❌ Build failed',
        type: 'error',
        code: CODE_BROKEN,
        canRestore: false,
      });

      // Wait before auto-restore
      await new Promise<void>((r) => {
        demoTimeoutRef.current = setTimeout(r, 4000);
      });

      if (!isPlaying) return;

      // Step 3: Auto-restore
      setSelectedId('initial-1');
      setDemoState('restored');
      setCode(CODE_INITIAL);
      setShowRestoredBadge(true);
      setIsTyping(false);

      // Wait for restore animation
      await new Promise<void>((r) => {
        demoTimeoutRef.current = setTimeout(r, 2500);
      });

      if (!isPlaying) return;

      // Reset to idle
      setShowRestoredBadge(false);
      setDemoState('idle');
      setSelectedId(null);
    } catch (err) {
      console.error('[DEMO] Demo step error:', err);
      setDemoState('idle');
    }
  }, [isPlaying, addTimelineEntry, typeCode]);

  // Start/stop demo loop
  useEffect(() => {
    // Only schedule if we're playing, idle, and have timeline
    if (isPlaying && demoState === 'idle' && timeline.length > 0) {
      demoTimeoutRef.current = setTimeout(() => {
        runDemoStep();
      }, 2000);
    }

    return () => {
      // Only clear if we're explicitly not playing or state isn't idle
      if (!isPlaying || demoState !== 'idle') {
        if (demoTimeoutRef.current) {
          clearTimeout(demoTimeoutRef.current);
        }
      }
    };
  }, [isPlaying, demoState, timeline.length, runDemoStep]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      // Pause
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setIsPlaying(false);
    } else {
      // Resume
      setIsPlaying(true);
      setDemoState('idle');
    }
  };

  // Compute derived state
  const fileStatus: 'saved' | 'modified' | 'error' =
    demoState === 'error' ? 'error' :
    demoState === 'ai_editing' ? 'modified' : 'saved';

  const statusIndicatorClass =
    demoState === 'error' ? 'bg-red-500 shadow-red-500/50' :
    demoState === 'ai_editing' ? 'bg-purple-500 shadow-purple-500/50 animate-pulse' :
    demoState === 'restored' ? 'bg-emerald-500 shadow-emerald-500/50' :
    'bg-emerald-500';

  const statusText =
    demoState === 'error' ? '❌ Build failed' :
    demoState === 'ai_editing' ? '🤖 AI editing detected' :
    demoState === 'restored' ? '✓ Restored in 47ms' :
    'Protected';

  const statusTextClass =
    demoState === 'error' ? 'text-red-400' :
    demoState === 'ai_editing' ? 'text-purple-400' :
    demoState === 'restored' ? 'text-emerald-400' :
    'text-zinc-400';

  const windowBorderClass =
    demoState === 'error' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]' :
    demoState === 'ai_editing' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' :
    demoState === 'restored' ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' :
    'border-zinc-800';

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 md:px-0">
      {/* Main Window */}
      <motion.div
        className={`
          rounded-lg md:rounded-xl overflow-hidden border transition-all duration-300
          bg-zinc-900 ${windowBorderClass}
        `}
        animate={demoState === 'error' ? { x: [0, -4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 bg-zinc-900 border-b border-zinc-800 gap-0.5 sm:gap-2">
          <div className="flex gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
            <TrafficLight color="red" />
            <TrafficLight color="yellow" />
            <TrafficLight color="green" />
          </div>
          <div className="flex items-center gap-0.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-[8px] sm:text-[11px] md:text-[13px] font-medium text-zinc-500 font-mono truncate">
              config.ts
            </span>
            <FileStatus status={fileStatus} />
          </div>
          <div className="w-[20px] sm:w-[30px] md:w-[52px] flex-shrink-0" /> {/* Spacer for centering */}
        </div>

        {/* Content - Stack vertically on mobile and tablet */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_280px] min-h-[240px] sm:min-h-[280px] md:min-h-[360px]">
          {/* Editor Panel */}
          <div className="relative bg-[#0d1117] border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-hidden min-h-[160px] sm:min-h-[200px]">
            <div className="p-1.5 sm:p-3 md:p-5 h-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <CodeDisplay code={code} isTyping={isTyping} />
            </div>

            <AITypingIndicator visible={demoState === 'ai_editing'} />
            <ErrorOverlay visible={demoState === 'error'} />
            <RestoredBadge visible={showRestoredBadge} />

            {/* Flash effect on restore */}
            <AnimatePresence>
              {demoState === 'restored' && (
                <motion.div
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 bg-emerald-500 pointer-events-none"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Timeline Panel */}
          <div className="bg-zinc-950 flex flex-col min-h-[140px] sm:min-h-[160px] lg:min-h-auto">
            <div className="px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-[9px] sm:text-[11px] md:text-[13px] font-semibold text-zinc-300 border-b border-zinc-800 flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
              <span>🕐</span>
              <span className="hidden sm:inline">SnapBack Timeline</span>
              <span className="sm:hidden">Timeline</span>
            </div>

            {/* Timeline List with scroll indicator */}
            <div className="relative flex-1 min-h-[80px] sm:min-h-[100px]">
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden p-0.5 sm:p-1.5 md:p-2
                           scrollbar scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-900"
              >
                <AnimatePresence mode="popLayout">
                  {timeline.map((entry) => (
                    <TimelineEntryComponent
                      key={entry.id}
                      entry={entry}
                      isSelected={entry.id === selectedId}
                      onRestore={() => handleRestore(entry)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Scroll fade indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-4 sm:h-6 md:h-8 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between flex-wrap px-1.5 sm:px-3 md:px-4 py-1 sm:py-2 md:py-2.5 bg-zinc-900 border-t border-zinc-800 gap-0.5 sm:gap-2">
          <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2.5 min-w-0 order-1">
            <div
              className={`w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full shadow-lg flex-shrink-0 ${statusIndicatorClass}`}
            />
            <span className={`text-[8px] sm:text-[10px] md:text-xs font-medium transition-colors truncate ${statusTextClass}`}>
              {statusText}
            </span>
          </div>
          <button
            onClick={handleCreateSnapshot}
            className="px-1.5 sm:px-2.5 md:px-3 py-1 md:py-1.5 text-[8px] sm:text-[10px] md:text-xs font-medium text-zinc-400
                       border border-zinc-700 rounded-md
                       hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600
                       transition-all duration-200 flex-shrink-0 order-2 whitespace-nowrap"
          >
            <span className="hidden sm:inline">📸 Create Snapshot</span>
            <span className="sm:hidden">📸 Snap</span>
          </button>
        </div>
      </motion.div>

      {/* Demo Controls */}
      <div className="flex items-center justify-between mt-2 sm:mt-3 md:mt-4 px-0 gap-1 sm:gap-2 flex-wrap">
        <button
          onClick={handleTogglePlay}
          className={`
            flex items-center gap-0.5 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-[9px] sm:text-xs md:text-sm font-medium
            border rounded-lg transition-all duration-200 flex-shrink-0
            ${
              isPlaying
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }
          `}
        >
          <span>{isPlaying ? '⏸' : '▶'}</span>
          <span className="hidden sm:inline">{isPlaying ? 'Pause Demo' : 'Play Demo'}</span>
          <span className="sm:hidden">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <span className="text-[8px] sm:text-[10px] md:text-xs text-zinc-600 text-center flex-1 px-1">
          <span className="hidden sm:inline">Click any timeline entry to restore</span>
          <span className="sm:hidden">Tap to restore</span>
        </span>
      </div>
    </div>
  );
}
