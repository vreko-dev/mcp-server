"use client";

import { motion } from "motion/react";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

// Terminal base components
const Terminal = memo(
	({
		children,
		className = "",
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div
			className={`bg-black/95 backdrop-blur-sm rounded-lg border border-green-500/20 shadow-2xl overflow-hidden ${className}`}
		>
			{children}
		</div>
	),
);

Terminal.displayName = "Terminal";

const TypingAnimation = memo(
	({
		children,
		delay = 0,
		className = "",
		onComplete,
	}: {
		children: string;
		delay?: number;
		className?: string;
		onComplete?: () => void;
	}) => {
		const [displayedText, setDisplayedText] = useState("");
		const text = useMemo(() => children?.toString() || "", [children]);

		useEffect(() => {
			const timer = setTimeout(() => {
				let currentIndex = 0;
				const interval = setInterval(() => {
					if (currentIndex <= text.length) {
						setDisplayedText(text.substring(0, currentIndex));
						currentIndex++;
					} else {
						clearInterval(interval);
						onComplete?.();
					}
				}, 30);
				return () => clearInterval(interval);
			}, delay);
			return () => clearTimeout(timer);
		}, [text, delay, onComplete]);

		return <div className={className}>{displayedText}</div>;
	},
);

TypingAnimation.displayName = "TypingAnimation";

const AnimatedSpan = memo(
	({
		children,
		delay = 0,
		className = "",
	}: {
		children: React.ReactNode;
		delay?: number;
		className?: string;
	}) => {
		const [visible, setVisible] = useState(false);

		useEffect(() => {
			const timer = setTimeout(() => setVisible(true), delay);
			return () => clearTimeout(timer);
		}, [delay]);

		if (!visible) {
			return null;
		}

		return (
			<motion.div
				initial={{ opacity: 0, x: -10 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.2 }}
				className={className}
			>
				{children}
			</motion.div>
		);
	},
);

AnimatedSpan.displayName = "AnimatedSpan";

// Custom hook for sound effects
const useSound = () => {
	const playSound = useCallback(
		(type: "typing" | "error" | "success" | "warning" | "click") => {
			// In production, you'd play actual sounds here
			console.log(`🔊 Playing sound: ${type}`);
		},
		[],
	);

	return { playSound };
};

// Blinking cursor component
const BlinkingCursor = memo(({ color = "bg-cyan-400" }: { color?: string }) => (
	<motion.span
		className={`inline-block w-2 h-4 ${color} ml-1`}
		animate={{ opacity: [1, 0] }}
		transition={{
			duration: 0.5,
			repeat: Number.POSITIVE_INFINITY,
			repeatType: "reverse",
		}}
	/>
));

BlinkingCursor.displayName = "BlinkingCursor";

// Interactive prompt component
const InteractivePrompt = memo(
	({
		onAction,
		// autoTimeout = 3000, // TODO: Re-enable when auto-timeout feature is implemented
	}: {
		onAction: () => void;
		autoTimeout?: number;
	}) => {
		const [hovering, setHovering] = useState(false);
		const [countdown, setCountdown] = useState(3);
		const [hasInteracted, setHasInteracted] = useState(false);
		const { playSound } = useSound();

		const handleAction = useCallback(() => {
			if (!hasInteracted) {
				setHasInteracted(true);
				playSound("click");
				onAction();
			}
		}, [hasInteracted, playSound, onAction]);

		useEffect(() => {
			if (!hasInteracted) {
				const countdownInterval = setInterval(() => {
					setCountdown((prev) => {
						if (prev <= 1) {
							return 0;
						}
						return prev - 1;
					});
				}, 1000);

				const timeoutId = setTimeout(() => {
					handleAction();
				}, 3000);

				return () => {
					clearInterval(countdownInterval);
					clearTimeout(timeoutId);
				};
			}
		}, [hasInteracted, handleAction]);

		return (
			<div className="relative">
				<motion.div
					className={`
          flex items-center cursor-pointer select-none
          ${hovering ? "bg-cyan-400/10" : ""}
          transition-all duration-200 rounded px-2 -mx-2 py-1
        `}
					onClick={handleAction}
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
					whileTap={{ scale: 0.98 }}
				>
					<span className="text-cyan-400">Recover from checkpoint? (Y/n)</span>
					{!hasInteracted && <BlinkingCursor />}
					{hasInteracted && (
						<span className="text-white ml-2 font-bold">Y</span>
					)}
				</motion.div>

				{!hasInteracted && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 0.5 }}
						className="absolute -bottom-6 left-0 text-xs text-gray-500"
					>
						{hovering
							? "← Click to recover"
							: `Auto-continuing in ${countdown}...`}
					</motion.div>
				)}
			</div>
		);
	},
);

InteractivePrompt.displayName = "InteractivePrompt";

// Progress indicator
const ProgressBar = memo(({ progress }: { progress: number }) => (
	<div className="fixed top-0 left-0 w-full h-1 bg-black/20 z-50">
		<motion.div
			className="h-full bg-gradient-to-r from-cyan-400 to-green-400"
			initial={{ width: "0%" }}
			animate={{ width: `${progress}%` }}
			transition={{ duration: 0.5, ease: "easeOut" }}
		/>
	</div>
));

ProgressBar.displayName = "ProgressBar";

// Diff view component
// const _DiffLine = ({ // TODO: Re-enable when diff view is implemented
// 	type,
// 	content,
// 	delay,
// }: {
// 	type: "remove" | "add";
// 	content: string;
// 	delay: number;
// }) => {
// 	const [visible, setVisible] = useState(false);

// 	useEffect(() => {
// 		const timer = setTimeout(() => setVisible(true), delay);
// 		return () => clearTimeout(timer);
// 	}, [delay]);

// 	if (!visible) {
// 		return null;
// 	}

// 	return (
// 		<motion.div
// 			initial={{ opacity: 0, x: type === "remove" ? -20 : 20 }}
// 			animate={{ opacity: 1, x: 0 }}
// 			transition={{ duration: 0.3 }}
// 			className={`font-mono text-sm ml-4 ${
// 				type === "remove" ? "text-red-400" : "text-green-400"
// 			}`}
// 		>
// 			{type === "remove" ? "-" : "+"} {content}
// 		</motion.div>
// 	);
// };

// Main terminal component
export const SnapBackTerminalUltimate = memo(() => {
	const [stage, setStage] = useState<
		"init" | "working" | "disaster" | "prompt" | "recovery" | "complete"
	>("init");
	const [progress, setProgress] = useState(0);
	const [isRecovering, setIsRecovering] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);
	const { playSound } = useSound();
	const terminalRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Memoized threshold value
	const intersectionThreshold = useMemo(() => 0.8, []);

	// Viewport intersection observer - only start when terminal is fully visible
	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				// Only trigger when terminal is fully visible (threshold 0.8 = 80% visible)
				if (
					entry &&
					entry.isIntersecting &&
					entry.intersectionRatio >= intersectionThreshold &&
					!hasStarted
				) {
					setIsInView(true);
					setHasStarted(true);
				}
			},
			{
				threshold: intersectionThreshold,
				rootMargin: "0px",
			},
		);

		observer.observe(containerRef.current);

		return () => {
			if (containerRef.current) {
				observer.unobserve(containerRef.current);
			}
		};
	}, [hasStarted, intersectionThreshold]);

	// Memoized mobile check function
	const checkMobile = useCallback(() => {
		setIsMobile(window.innerWidth < 768);
	}, []);

	useEffect(() => {
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, [checkMobile]);

	// Progress bar - only start when in view
	useEffect(() => {
		if (!isInView) {
			return;
		}

		const totalDuration = 35000;
		const interval = setInterval(() => {
			setProgress((prev) => {
				if (prev >= 100) {
					clearInterval(interval);
					return 100;
				}
				return prev + 100 / (totalDuration / 100);
			});
		}, 100);

		return () => clearInterval(interval);
	}, [isInView]);

	// Stage progression - only start when in view
	useEffect(() => {
		if (!isInView) {
			return;
		}

		const stages = [
			{ name: "working", delay: 3500 },
			{ name: "disaster", delay: 9500 },
			{ name: "prompt", delay: 17000 },
		];

		const timers = stages.map(({ name, delay }) =>
			setTimeout(() => setStage(name as typeof stage), delay),
		);

		return () => timers.forEach(clearTimeout);
	}, [isInView]);

	// Memoized key press handler
	const handleKeyPress = useCallback(
		(e: KeyboardEvent) => {
			if (stage === "prompt" && (e.key === "y" || e.key === "Y")) {
				handleRecovery();
			}
		},
		[stage],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [handleKeyPress]);

	const handleRecovery = useCallback(() => {
		if (!isRecovering) {
			setIsRecovering(true);
			setStage("recovery");
			playSound("success");

			setTimeout(() => setStage("complete"), 8000);
		}
	}, [isRecovering, playSound]);

	// Auto-scroll terminal as new content appears - aggressive scrolling like a real terminal
	useEffect(() => {
		if (!terminalRef.current) {
			return;
		}

		// Scroll to bottom whenever any content changes
		const scrollToBottom = () => {
			if (terminalRef.current) {
				terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
			}
		};

		// Set up mutation observer to detect any DOM changes in terminal
		const observer = new MutationObserver(scrollToBottom);

		observer.observe(terminalRef.current, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		});

		// Also scroll on stage changes
		scrollToBottom();

		return () => observer.disconnect();
	}, [stage]);

	// Memoized class names
	const terminalClasses = useMemo(
		() => `${isMobile ? "text-xs" : "text-sm"} max-w-5xl mx-auto`,
		[isMobile],
	);

	const progressBarProgress = useMemo(() => progress, [progress]);

	return (
		<>
			<ProgressBar progress={progressBarProgress} />

			<div ref={containerRef}>
				<Terminal className={terminalClasses}>
					<div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/40">
						<div className="flex gap-2">
							<motion.div
								className="w-3 h-3 rounded-full bg-red-500/80"
								whileHover={{ scale: 1.2 }}
							/>
							<motion.div
								className="w-3 h-3 rounded-full bg-yellow-500/80"
								whileHover={{ scale: 1.2 }}
							/>
							<motion.div
								className="w-3 h-3 rounded-full bg-green-500/80"
								whileHover={{ scale: 1.2 }}
							/>
						</div>
						<span className="text-xs text-white/40 ml-2">
							snapback-terminal
						</span>
						<motion.div
							className="ml-auto flex items-center gap-1"
							animate={{ opacity: [0.5, 1, 0.5] }}
							transition={{
								duration: 2,
								repeat: Number.POSITIVE_INFINITY,
							}}
						>
							<div className="w-2 h-2 rounded-full bg-green-400" />
							<span className="text-xs text-green-400">LIVE</span>
						</motion.div>
					</div>

					<div
						ref={terminalRef}
						className="p-4 font-mono text-left h-[600px] overflow-y-auto"
						style={{
							scrollBehavior: "smooth",
							lineHeight: "1.6",
						}}
					>
						{/* Stage 1: Init */}
						{stage === "init" && (
							<>
								<TypingAnimation delay={0} className="text-cyan-400">
									$ snapback init
								</TypingAnimation>
								<TypingAnimation delay={500} className="text-green-400">
									{" ✓ Monitoring enabled for .snapbackrc"}
								</TypingAnimation>
								<TypingAnimation delay={1000} className="text-green-400">
									{" ✓ Protection rules loaded (3 files)"}
								</TypingAnimation>
								<TypingAnimation delay={1500} className="text-green-400">
									{" ✓ Git integration active"}
								</TypingAnimation>
								<AnimatedSpan delay={2000} className="text-cyan-400">
									$ npm run build
								</AnimatedSpan>
							</>
						)}

						{/* Stage 2: Working */}
						{stage === "working" && (
							<>
								<div className="text-cyan-400">$ npm run build</div>
								<div className="text-green-400">&gt; my-app@1.0.0 build</div>
								<div className="text-green-400">&gt; next build</div>
								<br />
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Loaded env from
									.env.local
								</div>
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Using webpack 5.
									Reason: future.webpack5 set to true in next.config.js
									https://nextjs.org/docs/messages/webpack5
								</div>
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Checking
									validity of types...
								</div>
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Creating an
									optimized production build...
								</div>
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Compiled
									successfully
								</div>
								<br />
								<div className="text-white">
									<span className="text-yellow-400">warn</span> - No API_ROUTE
									for /api/checkout detected
								</div>
								<div className="text-white">
									<span className="text-yellow-400">warn</span> - Large
									dependency found: lodash (2.1MB)
								</div>
							</>
						)}

						{/* Stage 3: Disaster */}
						{stage === "disaster" && (
							<>
								<div className="text-cyan-400">$ git push origin main</div>
								<div className="text-green-400">
									Enumerating objects: 25, done.
								</div>
								<div className="text-green-400">
									Counting objects: 100% (25/25), done.
								</div>
								<div className="text-green-400">
									Delta compression using up to 8 threads
								</div>
								<div className="text-green-400">
									Compressing objects: 100% (18/18), done.
								</div>
								<div className="text-green-400">
									Writing objects: 100% (18/18), 3.24 KiB | 3.24 MiB/s, done.
								</div>
								<div className="text-green-400">
									Total 18 (delta 12), reused 0 (delta 0), pack-reused 0
								</div>
								<div className="text-green-400">
									remote: Resolving deltas: 100% (12/12), completed with 7 local
									objects.
								</div>
								<br />
								<div className="text-red-400">
									remote: error: GH006: Protected branch update failed for
									refs/heads/main.
								</div>
								<div className="text-red-400">
									remote: error: At least 1 approving review is required by
									reviewers with write access.
								</div>
								<br />
								<div className="text-red-400">
									💥 <span className="font-bold">BUILD FAILED</span>
								</div>
								<div className="text-red-400">
									💥 <span className="font-bold">CRITICAL ERROR</span>
								</div>
								<br />
								<div className="text-white">
									<span className="text-red-400">error</span> - Deployment
									failed: Required review missing
								</div>
								<div className="text-white">
									<span className="text-red-400">error</span> - Production
									database connection lost
								</div>
								<div className="text-white">
									<span className="text-red-400">error</span> - 50+ users
									currently affected
								</div>
							</>
						)}

						{/* Stage 4: Prompt */}
						{stage === "prompt" && (
							<>
								<div className="text-red-400">
									💥 <span className="font-bold">EMERGENCY RECOVERY MODE</span>
								</div>
								<br />
								<div className="text-white">
									SnapBack has detected a critical failure in your deployment.
								</div>
								<div className="text-white">
									You have automatic checkpoints from 3 minutes ago.
								</div>
								<br />
								<div className="text-white">
									Restore to last known good state?
								</div>
								<br />
								<InteractivePrompt onAction={handleRecovery} />
							</>
						)}

						{/* Stage 5: Recovery */}
						{stage === "recovery" && (
							<>
								<div className="text-green-400">
									🔄 <span className="font-bold">RECOVERY IN PROGRESS</span>
								</div>
								<br />
								<div className="text-white">
									Restoring from checkpoint:{" "}
									<span className="text-cyan-400">
										cp_20231027_1432_main_safe
									</span>
								</div>
								<div className="text-white">
									Created: 3 minutes ago (safe state)
								</div>
								<br />
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Restoring
									package.json (v1.2.3 → v1.2.1)
								</div>
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Restoring
									next.config.js
								</div>
								<div className="text-white">
									<span className="text-cyan-400">info</span> - Restoring
									pages/api/checkout.ts
								</div>
								<br />
								<div className="text-green-400">
									✓ 3 files restored successfully
								</div>
								<div className="text-green-400">✓ Dependencies validated</div>
								<div className="text-green-400">✓ Tests passing</div>
								<br />
								<div className="text-yellow-400">
									⚡ Deploying safe version...
								</div>
							</>
						)}

						{/* Stage 6: Complete */}
						{stage === "complete" && (
							<>
								<div className="text-green-400">
									✅ <span className="font-bold">RECOVERY COMPLETE</span>
								</div>
								<br />
								<div className="text-white">
									System restored to last known good state.
								</div>
								<div className="text-white">
									Production is now running version{" "}
									<span className="text-cyan-400">v1.2.1</span>
								</div>
								<br />
								<div className="text-green-400">✓ 0 users affected</div>
								<div className="text-green-400">✓ 0 data loss</div>
								<div className="text-green-400">✓ 100% uptime maintained</div>
								<br />
								<div className="text-white">
									Lesson learned: Always test payment flows before merging to
									main.
								</div>
								<br />
								<div className="text-cyan-400">$ snapback status</div>
								<div className="text-green-400"> 🛡️ 3 files protected</div>
								<div className="text-green-400">
									{" "}
									💾 12 checkpoints available
								</div>
								<div className="text-green-400"> ⚡ Auto-recovery enabled</div>
							</>
						)}
					</div>
				</Terminal>
			</div>
		</>
	);
});

SnapBackTerminalUltimate.displayName = "SnapBackTerminalUltimate";

// Mobile version of the terminal
export const SnapBackTerminalMobile = memo(() => {
	const [stage, setStage] = useState<
		"init" | "working" | "disaster" | "prompt"
	>("init");
	const { playSound } = useSound();

	useEffect(() => {
		const timers = [
			setTimeout(() => setStage("working"), 2000),
			setTimeout(() => setStage("disaster"), 5000),
			setTimeout(() => setStage("prompt"), 8000),
		];

		return () => timers.forEach(clearTimeout);
	}, []);

	const handleRecovery = () => {
		playSound("success");
		// In a real app, this would trigger the recovery process
	};

	return (
		<div className="bg-black rounded-lg border border-green-500/20 p-4 max-w-md mx-auto">
			<div className="flex items-center gap-2 mb-3">
				<div className="flex gap-1">
					<div className="w-2 h-2 rounded-full bg-red-500/80" />
					<div className="w-2 h-2 rounded-full bg-yellow-500/80" />
					<div className="w-2 h-2 rounded-full bg-green-500/80" />
				</div>
				<span className="text-xs text-white/40">snapback-mobile</span>
			</div>

			<div className="font-mono text-xs h-48 overflow-y-auto">
				{stage === "init" && (
					<div className="text-cyan-400">
						$ snapback init
						<br />
						<span className="text-green-400">✓ Monitoring enabled</span>
					</div>
				)}

				{stage === "working" && (
					<div className="text-cyan-400">
						$ npm run build
						<br />
						<span className="text-green-400">✓ Build successful</span>
					</div>
				)}

				{stage === "disaster" && (
					<div className="text-red-400">
						💥 BUILD FAILED
						<br />
						<span className="text-white">Required review missing</span>
					</div>
				)}

				{stage === "prompt" && (
					<div>
						<div className="text-red-400 mb-2">💥 EMERGENCY RECOVERY</div>
						<div className="text-white text-xs mb-3">
							Restore from 3min ago?
						</div>
						<button
							type="button"
							onClick={handleRecovery}
							className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded transition-colors"
						>
							Recover Now
						</button>
					</div>
				)}
			</div>
		</div>
	);
});

SnapBackTerminalMobile.displayName = "SnapBackTerminalMobile";
