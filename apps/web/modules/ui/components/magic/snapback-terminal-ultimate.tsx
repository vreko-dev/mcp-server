"use client";

import { motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// Terminal base components
const Terminal = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
	<div
		className={`bg-black/95 backdrop-blur-sm rounded-lg border border-green-500/20 shadow-2xl overflow-hidden ${className}`}
	>
		{children}
	</div>
);

const TypingAnimation = ({
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
	const text = children?.toString() || "";

	useEffect(() => {
		const timer = setTimeout(() => {
			let currentIndex = 0;
			const interval = setInterval(() => {
				if (currentIndex <= text.length) {
					setDisplayedText(text.slice(0, currentIndex));
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
};

const AnimatedSpan = ({
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
};

// Custom hook for sound effects
const useSound = () => {
	const playSound = useCallback((type: "typing" | "error" | "success" | "warning" | "click") => {
		// In production, you'd play actual sounds here
		console.log(`🔊 Playing sound: ${type}`);
	}, []);

	return { playSound };
};

// Blinking cursor component
const BlinkingCursor = ({ color = "bg-cyan-400" }: { color?: string }) => (
	<motion.span
		className={`inline-block w-2 h-4 ${color} ml-1`}
		animate={{ opacity: [1, 0] }}
		transition={{
			duration: 0.5,
			repeat: Number.POSITIVE_INFINITY,
			repeatType: "reverse",
		}}
	/>
);

// Interactive prompt component
const InteractivePrompt = ({
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
				{hasInteracted && <span className="text-white ml-2 font-bold">Y</span>}
			</motion.div>

			{!hasInteracted && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.5 }}
					className="absolute -bottom-6 left-0 text-xs text-gray-500"
				>
					{hovering ? "← Click to recover" : `Auto-continuing in ${countdown}...`}
				</motion.div>
			)}
		</div>
	);
};

// Progress indicator
const ProgressBar = ({ progress }: { progress: number }) => (
	<div className="fixed top-0 left-0 w-full h-1 bg-black/20 z-50">
		<motion.div
			className="h-full bg-gradient-to-r from-cyan-400 to-green-400"
			initial={{ width: "0%" }}
			animate={{ width: `${progress}%` }}
			transition={{ duration: 0.5, ease: "easeOut" }}
		/>
	</div>
);

// Diff view component
const DiffLine = ({ type, content, delay }: { type: "remove" | "add"; content: string; delay: number }) => {
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
			initial={{ opacity: 0, x: type === "remove" ? -20 : 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.3 }}
			className={`font-mono text-sm ml-4 ${type === "remove" ? "text-red-400" : "text-green-400"}`}
		>
			{type === "remove" ? "-" : "+"} {content}
		</motion.div>
	);
};

// Main terminal component
export function SnapBackTerminalUltimate() {
	const [stage, setStage] = useState<"init" | "working" | "disaster" | "prompt" | "recovery" | "complete">("init");
	const [progress, setProgress] = useState(0);
	const [isRecovering, setIsRecovering] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);
	const { playSound } = useSound();
	const terminalRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Viewport intersection observer - only start when terminal is fully visible
	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				// Only trigger when terminal is fully visible (threshold 0.8 = 80% visible)
				if (entry?.isIntersecting && entry.intersectionRatio >= 0.8 && !hasStarted) {
					setIsInView(true);
					setHasStarted(true);
				}
			},
			{
				threshold: 0.8, // Trigger when 80% of terminal is visible
				rootMargin: "0px",
			},
		);

		observer.observe(containerRef.current);

		return () => {
			if (containerRef.current) {
				observer.unobserve(containerRef.current);
			}
		};
	}, [hasStarted]);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

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

		const timers = stages.map(({ name, delay }) => setTimeout(() => setStage(name as typeof stage), delay));

		return () => timers.forEach(clearTimeout);
	}, [isInView]);

	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (stage === "prompt" && (e.key === "y" || e.key === "Y")) {
				handleRecovery();
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [stage]);

	const handleRecovery = () => {
		if (!isRecovering) {
			setIsRecovering(true);
			setStage("recovery");
			playSound("success");

			setTimeout(() => setStage("complete"), 8000);
		}
	};

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

	return (
		<>
			<ProgressBar progress={progress} />

			<div ref={containerRef}>
				<Terminal className={`${isMobile ? "text-xs" : "text-sm"} max-w-5xl mx-auto`}>
					<div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/40">
						<div className="flex gap-2">
							<motion.div className="w-3 h-3 rounded-full bg-red-500/80" whileHover={{ scale: 1.2 }} />
							<motion.div className="w-3 h-3 rounded-full bg-yellow-500/80" whileHover={{ scale: 1.2 }} />
							<motion.div className="w-3 h-3 rounded-full bg-green-500/80" whileHover={{ scale: 1.2 }} />
						</div>
						<span className="text-xs text-white/40 ml-2">snapback-terminal</span>
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
								<AnimatedSpan delay={800} className="text-green-400">
									✓ SnapBack initialized successfully
								</AnimatedSpan>
								<AnimatedSpan delay={1200} className="text-white/70">
									🧢 Monitoring: GitHub Copilot, Cursor, Windsurf
								</AnimatedSpan>
								<AnimatedSpan delay={1600} className="text-white/70">
									📸 Auto-checkpoint: Every 5 minutes
								</AnimatedSpan>
								<AnimatedSpan delay={2000} className="text-white/70">
									🔍 Watching 247 files
								</AnimatedSpan>
								<AnimatedSpan delay={2800}>
									<TypingAnimation delay={0} className="text-cyan-400">
										$ snapback status
									</TypingAnimation>
								</AnimatedSpan>
							</>
						)}

						{/* Stage 2: Working */}
						{(stage === "working" ||
							stage === "disaster" ||
							stage === "prompt" ||
							stage === "recovery" ||
							stage === "complete") && (
							<>
								<div className="text-cyan-400">$ snapback status</div>
								<div className="text-green-400">✓ Status: ACTIVELY MONITORING</div>
								<div className="text-white/70">Last checkpoint: 43 seconds ago</div>
								<div className="text-white/70">Files monitored: 247</div>
								<div className="my-2" />
								<AnimatedSpan delay={4000} className="text-yellow-400">
									🤖 AI Activity Detected: Cursor
								</AnimatedSpan>
								<AnimatedSpan delay={4500} className="text-white/70">
									Pattern: Multi-file refactoring
								</AnimatedSpan>
								<AnimatedSpan delay={5000} className="text-white/70">
									Confidence: 94%
								</AnimatedSpan>
								<AnimatedSpan delay={5500} className="text-green-400">
									📸 Auto-checkpoint created: snap_20241028_152345
								</AnimatedSpan>
								<div className="my-2" />
								<AnimatedSpan delay={7000}>
									<TypingAnimation delay={0} className="text-cyan-400">
										$ npm run build
									</TypingAnimation>
								</AnimatedSpan>
								<AnimatedSpan delay={8000} className="text-white/60">
									Building application...
								</AnimatedSpan>
							</>
						)}

						{/* Stage 3: Disaster */}
						{(stage === "disaster" ||
							stage === "prompt" ||
							stage === "recovery" ||
							stage === "complete") && (
							<>
								<AnimatedSpan delay={10000} className="text-red-500 font-bold">
									❌ BUILD FAILED
								</AnimatedSpan>
								<AnimatedSpan delay={10500} className="text-red-400">
									Error: TypeScript compilation failed
								</AnimatedSpan>
								<AnimatedSpan delay={11000} className="text-red-400/80">
									File: src/components/Header.tsx
								</AnimatedSpan>
								<AnimatedSpan delay={11500} className="text-red-400/80">
									Line 42: Unexpected token, expected ","
								</AnimatedSpan>
								<AnimatedSpan delay={12000} className="text-red-400/80">
									47 files affected by AI refactoring
								</AnimatedSpan>
								<div className="my-2" />
								<AnimatedSpan delay={13000} className="text-yellow-500">
									🚨 SnapBack detected build failure
								</AnimatedSpan>
								<AnimatedSpan delay={13500} className="text-cyan-400">
									🔍 Analyzing available checkpoints...
								</AnimatedSpan>
								<AnimatedSpan delay={14500} className="text-green-400">
									✓ Found recovery point: snap_20241028_152345 (2 min ago)
								</AnimatedSpan>
								<AnimatedSpan delay={15500} className="text-white/70">
									Changes: 47 files modified before build failure
								</AnimatedSpan>
							</>
						)}

						{/* Stage 4: Prompt */}
						{(stage === "prompt" || stage === "recovery" || stage === "complete") && (
							<AnimatedSpan delay={17000}>
								<div className="my-2" />
								<InteractivePrompt onAction={handleRecovery} />
							</AnimatedSpan>
						)}

						{/* Stage 5: Recovery */}
						{(stage === "recovery" || stage === "complete") && (
							<>
								<div className="my-2" />
								<AnimatedSpan delay={0} className="text-cyan-400">
									🔄 Restoring from checkpoint...
								</AnimatedSpan>
								<AnimatedSpan delay={1000}>
									<div className="text-white/70 ml-4">Analyzing file diff...</div>
								</AnimatedSpan>
								<AnimatedSpan delay={2000}>
									<div className="text-white/60 ml-4">src/components/Header.tsx:</div>
								</AnimatedSpan>
								<DiffLine type="remove" content="export const Header = () => {" delay={2500} />
								<DiffLine type="remove" content="  const [state, setState] = useState()" delay={2800} />
								<DiffLine type="add" content="export const Header = () => {" delay={3100} />
								<DiffLine
									type="add"
									content="  const [state, setState] = useState(null);"
									delay={3400}
								/>
								<AnimatedSpan delay={4000}>
									<div className="text-white/70 ml-4">✓ Header.tsx restored</div>
								</AnimatedSpan>
								<AnimatedSpan delay={4500}>
									<div className="text-white/70 ml-4">Restoring 46 more files...</div>
								</AnimatedSpan>
								<AnimatedSpan delay={5500} className="text-green-400">
									✓ 47 files restored successfully
								</AnimatedSpan>
								<AnimatedSpan delay={6500}>
									<TypingAnimation delay={0} className="text-cyan-400">
										$ npm run build
									</TypingAnimation>
								</AnimatedSpan>
								<AnimatedSpan delay={7000} className="text-white/60">
									Building application...
								</AnimatedSpan>
							</>
						)}

						{/* Stage 6: Complete */}
						{stage === "complete" && (
							<>
								<AnimatedSpan delay={0} className="text-green-500 font-bold">
									✓ BUILD SUCCESSFUL
								</AnimatedSpan>
								<AnimatedSpan delay={500} className="text-white/70">
									Build completed in 12.3s
								</AnimatedSpan>
								<div className="my-2" />
								<AnimatedSpan delay={1000} className="text-green-400 text-lg">
									🎉 Your code is safe!
								</AnimatedSpan>
								<AnimatedSpan delay={1500} className="text-white/70">
									Recovery completed successfully
								</AnimatedSpan>
								<AnimatedSpan delay={2000} className="text-cyan-400">
									📸 New checkpoint created: snap_20241028_152847
								</AnimatedSpan>
							</>
						)}
					</div>
				</Terminal>
			</div>
		</>
	);
}

// Mobile optimized version
export function SnapBackTerminalMobile() {
	const [stage, setStage] = useState(0);
	const maxStage = 4;

	useEffect(() => {
		const interval = setInterval(() => {
			setStage((prev) => (prev < maxStage ? prev + 1 : prev));
		}, 3000);
		return () => clearInterval(interval);
	}, []);

	return (
		<Terminal className="text-xs max-w-full">
			<div className="p-4 font-mono space-y-2">
				<div className="text-cyan-400">$ snapback status</div>
				<div className="text-green-400">✓ Monitoring active</div>

				{stage >= 1 && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-yellow-400"
					>
						🤖 AI detected: Cursor
					</motion.div>
				)}

				{stage >= 2 && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500">
						❌ Build failed
					</motion.div>
				)}

				{stage >= 3 && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-cyan-400"
					>
						🔄 Restoring...
					</motion.div>
				)}

				{stage >= 4 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="text-green-500 font-bold"
					>
						✓ Code recovered!
					</motion.div>
				)}
			</div>
		</Terminal>
	);
}
