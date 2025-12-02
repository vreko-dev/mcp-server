"use client";
import { CommandPalette } from "@marketing/components/ui/command-palette";
import { MagneticHover } from "@marketing/components/ui/magnetic-hover";
import { useMobileOptimization } from "@marketing/hooks/use-mobile-optimization";
import { useMobilePerformance } from "@marketing/hooks/use-mobile-performance";
import { Logo } from "@shared/components/Logo";
// import { ASSETS } from "@marketing/lib/assets"
import { X } from "lucide-react";
import { m, useMotionValueEvent, useScroll } from "motion/react";
// import Image from "next/image"
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const Navbar = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCommandOpen, setIsCommandOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const { scrollYProgress } = useScroll();

	// Refs for click-outside detection
	const menuRef = useRef<HTMLDivElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Scroll detection for navbar transformation
	useMotionValueEvent(scrollYProgress, "change", (current) => {
		if (typeof current === "number") {
			// Trigger much earlier - as soon as any scroll happens
			setIsScrolled(current > 0.01);
		}
	});

	// Mobile optimization hooks
	const { isMobile /*shouldReduceAnimations*/ } = useMobileOptimization();
	const { lockScroll, unlockScroll } = useMobilePerformance();

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	const closeMenu = () => {
		setIsMenuOpen(false);
	};

	// Handle scroll lock on mobile when menu is open
	useEffect(() => {
		if (isMobile && isMenuOpen) {
			lockScroll();
		} else {
			unlockScroll();
		}

		// Cleanup function to ensure scroll is unlocked
		return () => {
			unlockScroll();
		};
	}, [isMobile, isMenuOpen, lockScroll, unlockScroll]);

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				isMenuOpen &&
				menuRef.current &&
				menuButtonRef.current &&
				!menuRef.current.contains(e.target as Node) &&
				!menuButtonRef.current.contains(e.target as Node)
			) {
				closeMenu();
			}
		};

		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen]);

	// Command palette keyboard shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setIsCommandOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	// Helper to get docs URL for subdomain routing (hydration-safe)
	const [docsUrl, setDocsUrl] = useState("/docs"); // Default to internal docs route

	useEffect(() => {
		if (typeof window !== "undefined") {
			// Check if we're in local development
			const isLocalhost =
				window.location.hostname === "localhost" ||
				window.location.hostname === "127.0.0.1";

			if (isLocalhost) {
				// For local development, use port 3001 for docs app
				// This works when running: pnpm --filter @snapback/docs dev --port 3001
				setDocsUrl("http://localhost:3001");
			} else {
				// For production, use the docs subdomain
				const rootDomain =
					process.env.NEXT_PUBLIC_ROOT_DOMAIN || "snapback.dev";
				setDocsUrl(`https://new-docs.${rootDomain}`);
			}
		}
	}, []);

	const navItems = [
		{ href: "/features", label: "Features" },
		{ href: "/pricing", label: "Pricing" },
		{ href: docsUrl, label: "Docs", external: true },
		// { href: "#security", label: "Security" }, // SOC2 - not yet available for alpha
		// { href: "#compliance", label: "Compliance" }, // Not yet available for alpha
	];

	return (
		<>
			{/* Frosted glass floating navbar with scroll behavior */}
			<m.nav
				className={`fixed top-0 left-0 right-0 z-50 w-full ${
					isScrolled ? "scrolled" : ""
				}`}
				initial={isMounted ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
				animate={{
					opacity: 1,
					y: 0,
					paddingTop: isScrolled ? "1rem" : "0.5rem",
				}}
				transition={{
					duration: 0.7,
					ease: [0.16, 1, 0.3, 1],
				}}
				aria-label="Main navigation"
			>
				<m.div
					className={`mx-auto transition-all duration-700 ease-out ${
						isScrolled ? "max-w-fit px-6 py-2" : "container px-4 py-2"
					}`}
					animate={{
						scale: isScrolled ? 0.95 : 1,
					}}
					transition={{
						duration: 0.7,
						ease: [0.16, 1, 0.3, 1],
					}}
				>
					<div
						className={`backdrop-blur-md bg-black/50 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] transition-all duration-700 ${
							isScrolled
								? "rounded-full border border-emerald-500/30"
								: "rounded-2xl border border-transparent"
						}`}
						style={{
							transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
						}}
					>
						<div
							className="relative flex items-center justify-between px-3 py-2 lg:pointer-events-auto"
							role="button"
							tabIndex={0}
							onClick={(e) => {
								// On mobile, clicking anywhere on the navbar (except links) opens menu
								if (window.innerWidth < 1024) {
									const target = e.target as HTMLElement;
									// Don't trigger if clicking on a link or button
									if (
										!target.closest("a") &&
										!target.closest("button") &&
										!isMenuOpen
									) {
										toggleMenu();
									}
								}
							}}
							onKeyDown={(e) => {
								// Handle keyboard interaction for accessibility
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									if (window.innerWidth < 1024 && !isMenuOpen) {
										toggleMenu();
									}
								}
							}}
						>
							{/* Logo + Wordmark with vertical centering */}
							<m.div
								className="flex items-center"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								<Link
									href="/"
									aria-label="SnapBack home"
									onClick={() => {
										// Don't close menu if we're opening it
										if (!isMenuOpen) {
											return;
										}
										closeMenu();
									}}
								>
									<m.div
										animate={{
											width: isScrolled ? "3.3rem" : "10.8rem",
											height: isScrolled ? "3rem" : "3rem",
										}}
										transition={{
											duration: 0.7,
											ease: [0.16, 1, 0.3, 1],
										}}
									>
										<Logo
											wordmark={true}
											withLabel={false}
											wordmarkSize="normal"
										/>
									</m.div>
								</Link>
							</m.div>

							{/* Desktop Navigation - Enhanced with magnetic hover and spacing */}
							<div className="hidden lg:flex items-center space-x-8">
								{navItems.map((item) => (
									<MagneticHover key={item.href} strength={0.3} radius={20}>
										<a
											href={item.href}
											className="text-white/70 hover:text-white transition-all duration-300 font-medium text-sm relative group px-4 py-3"
											{...((item as any).external
												? {
														/*target: "_blank", rel: "noopener noreferrer"*/
													}
												: {})}
											onClick={(e) => {
												// External links (like docs subdomain) should navigate normally
												if ((item as any).external) {
													return;
												}

												// Use Lenis for smooth scrolling if available
												if (
													typeof window !== "undefined" &&
													(window as any).lenis
												) {
													e.preventDefault();
													(window as any).lenis.scrollTo(item.href, {
														offset: -80,
														duration: 1.5,
														easing: (t: number) =>
															Math.min(1, 1.001 - 2 ** (-10 * t)),
													});
												}
												closeMenu();
											}}
										>
											{item.label}
											<span className="absolute -bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-primary to-secondary scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
										</a>
									</MagneticHover>
								))}

								{/* Login Button - Added to the right side */}
								<MagneticHover strength={0.3} radius={20}>
									<Link
										href="vscode:extension/MarcelleLabs.snapback-vscode"
										target="_blank"
										rel="noopener noreferrer"
										className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-all duration-200 relative group"
										onClick={closeMenu}
									>
										Install for VS Code
										<span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
									</Link>
								</MagneticHover>
							</div>

							{/* Mobile Menu Button - Simplified without motion components */}
							<button
								ref={menuButtonRef}
								type="button"
								className="lg:hidden p-3 text-white/70 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/5"
								onClick={toggleMenu}
								aria-label={isMenuOpen ? "Close menu" : "Open menu"}
								aria-expanded={isMenuOpen}
							>
								{isMenuOpen ? (
									<X className="w-6 h-6" />
								) : (
									<span className="w-6 h-6 flex items-center justify-center">
										{/* Invisible hamburger icon - maintains tap target but removes visual indicator */}
									</span>
								)}
							</button>
						</div>
					</div>
				</m.div>
			</m.nav>

			{/* Mobile Menu Overlay - frosted glass style */}
			{isMenuOpen && (
				<div className="fixed inset-0 z-40 lg:hidden">
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-black/50 backdrop-blur-sm"
						onClick={closeMenu}
						aria-hidden="true"
					/>

					{/* Mobile Menu - Using fixed positioning with top offset */}
					<div
						ref={menuRef}
						className="fixed top-20 left-4 right-4 md:left-8 md:right-8 backdrop-blur-md bg-black/50 border border-white/[0.1] rounded-2xl shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-50"
						role="menu"
						aria-label="Mobile navigation menu"
					>
						<div className="p-6">
							{/* Mobile Navigation Items */}
							<div className="space-y-4 mb-6">
								{navItems.map((item) => (
									<div key={item.href}>
										<a
											href={item.href}
											className="block text-white/70 hover:text-white transition-colors duration-200 font-medium py-3 text-lg" // Increased text size for better mobile UX
											{...((item as any).external
												? {
														/*target: "_blank", rel: "noopener noreferrer"*/
													}
												: {})}
											onClick={(e) => {
												// External links (like docs subdomain) should navigate normally
												if ((item as any).external) {
													closeMenu();
													return;
												}

												// Use Lenis for smooth scrolling if available
												if (
													typeof window !== "undefined" &&
													(window as any).lenis
												) {
													e.preventDefault();
													(window as any).lenis.scrollTo(item.href, {
														offset: -80,
														duration: 1.5,
														easing: (t: number) =>
															Math.min(1, 1.001 - 2 ** (-10 * t)),
													});
												}
												closeMenu();
											}}
											role="menuitem"
										>
											{item.label}
										</a>
									</div>
								))}
							</div>

							{/* Mobile CTA - Sign In button only */}
							<div className="pt-4 border-t border-white/10">
								<a
									href="https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode"
									target="_blank"
									rel="noopener noreferrer"
									className="w-full px-4 py-3 text-sm font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-all duration-200 block text-center"
									onClick={closeMenu}
								>
									Install Extension
								</a>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Command Palette */}
			<CommandPalette isOpen={isCommandOpen} onOpenChange={setIsCommandOpen} />
		</>
	);
};

export default Navbar;
