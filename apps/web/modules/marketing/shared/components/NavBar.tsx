// apps/web/modules/marketing/shared/components/NavBar.tsx
"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { Logo } from "@shared/components/Logo";
import { Button } from "@ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@ui/components/sheet";
import { cn } from "@ui/lib";
import { MenuIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function NavBar() {
	const { user } = useSession();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleScroll = () => {
			// Transform to floating style after 100px scroll
			const currentScrollY = window.scrollY;
			const scrolled = currentScrollY > 100;
			setIsScrolled(scrolled);
		};

		// Throttle scroll events for better performance
		let ticking = false;
		const throttledHandleScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					handleScroll();
					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener("scroll", throttledHandleScroll, {
			passive: true,
		});
		return () => window.removeEventListener("scroll", throttledHandleScroll);
	}, []);

	useEffect(() => {
		setMobileMenuOpen(false);
	}, [pathname]);

	// Menu items - docs URL changes based on environment
	const docsUrl =
		process.env.NODE_ENV === "development"
			? "http://localhost:3001"
			: "https://docs.snapback.dev";

	const menuItems = [
		{
			label: "Features",
			href: "/#features",
		},
		{
			label: "Pricing",
			href: "/#pricing",
		},
		{
			label: "Docs",
			href: docsUrl,
		},
	];

	// Action items
	const actionItems = {
		signIn: {
			label: "Sign in",
			href: "/auth/login",
		},
		join: {
			label: "Join",
			href: "/#newsletter",
		},
		getStarted: {
			label: "Get Started",
			href: user ? "/app" : "/auth/signup",
		},
	};

	const isMenuItemActive = (href: string) => pathname.startsWith(href);

	return (
		<header
			className={cn(
				"fixed top-0 z-50 w-full transition-all duration-500",
				isScrolled
					? "bg-black/30 backdrop-blur-xl border-b border-white/10"
					: "bg-transparent",
			)}
		>
			<motion.nav
				initial={false}
				animate={{
					paddingTop: isScrolled ? "0.75rem" : "1rem",
					paddingBottom: isScrolled ? "0.75rem" : "1rem",
				}}
				transition={{ duration: 0.3 }}
				className={cn(
					"mx-auto transition-all duration-300",
					isScrolled
						? "mt-4 max-w-5xl rounded-full border border-green/20 bg-black/30 backdrop-blur-xl px-6 py-3 shadow-lg"
						: "border-b border-white/5 bg-black/0 px-8 py-4",
				)}
			>
				<div
					className={cn(
						"flex items-center",
						isScrolled
							? "justify-between"
							: "justify-between max-w-7xl mx-auto",
					)}
				>
					{/* Logo + Text */}
					<motion.div
						className="flex items-center gap-2"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<div className="h-10 w-10 nav-brand">
							<Logo withLabel={false} />
						</div>
						<span className="font-bold text-white">SnapBack</span>
					</motion.div>

					{/* Navigation items - hide some on mobile island */}
					<div
						className={cn(
							"items-center gap-6 hidden lg:flex",
							isScrolled && "gap-4",
						)}
					>
						{menuItems.map((menuItem) => (
							<motion.div
								key={menuItem.href}
								whileHover={{ y: -2 }}
								whileTap={{ y: 0 }}
							>
								<Link
									href={menuItem.href}
									className={cn(
										"text-sm text-white/80 hover:text-green transition-colors duration-200 font-medium",
										isMenuItemActive(menuItem.href)
											? "font-bold text-green"
											: "",
									)}
									prefetch
								>
									{menuItem.label}
								</Link>
							</motion.div>
						))}

						{/* Action Buttons */}
						{!user && (
							<>
								<motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
									<NextLink
										href={actionItems.signIn.href}
										className="text-sm text-white/80 hover:text-white transition-colors duration-200 font-medium"
									>
										{actionItems.signIn.label}
									</NextLink>
								</motion.div>

								<motion.div
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									<NextLink
										href={actionItems.join.href}
										className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-all duration-200 border border-white/20"
									>
										{actionItems.join.label}
									</NextLink>
								</motion.div>
							</>
						)}

						{/* Get Started CTA */}
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<NextLink
								href={actionItems.getStarted.href}
								className="px-4 py-2 bg-green hover:bg-green/90 text-black rounded-full text-sm font-bold transition-all duration-200 shadow-[0_0_15px_rgba(0,255,65,0.3)]"
							>
								{actionItems.getStarted.label}
							</NextLink>
						</motion.div>
					</div>

					<div className="flex items-center gap-3 lg:hidden">
						<Sheet
							open={mobileMenuOpen}
							onOpenChange={(open) => setMobileMenuOpen(open)}
						>
							<SheetTrigger asChild>
								<Button
									className="lg:hidden text-white hover:text-green"
									size="icon"
									variant="ghost"
									aria-label="Menu"
								>
									<MenuIcon className="size-6" />
								</Button>
							</SheetTrigger>
							<SheetContent
								className="w-[280px] bg-black/90 backdrop-blur-xl border-l border-white/10"
								side="right"
							>
								<SheetTitle className="text-white">Menu</SheetTitle>
								<div className="flex flex-col items-start justify-center gap-4 mt-8">
									{menuItems.map((menuItem) => (
										<Link
											key={menuItem.href}
											href={menuItem.href}
											className={cn(
												"block px-4 py-2 font-medium text-lg text-white/80 hover:text-green hover:bg-white/5 transition-colors duration-200 rounded-lg w-full",
												isMenuItemActive(menuItem.href)
													? "font-bold text-green bg-white/5"
													: "",
											)}
											prefetch
										>
											{menuItem.label}
										</Link>
									))}

									<div className="w-full h-px bg-white/10 my-2" />

									{/* Mobile Action Buttons */}
									{!user && (
										<>
											<NextLink
												href={actionItems.signIn.href}
												className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium text-center transition-all duration-200 border border-white/10"
											>
												{actionItems.signIn.label}
											</NextLink>

											<NextLink
												href={actionItems.join.href}
												className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium text-center transition-all duration-200 border border-white/10"
											>
												{actionItems.join.label}
											</NextLink>
										</>
									)}

									{/* Mobile Get Started CTA */}
									<NextLink
										href={actionItems.getStarted.href}
										className="w-full px-4 py-3 bg-green hover:bg-green/90 text-black rounded-lg text-sm font-bold text-center transition-all duration-200 shadow-[0_0_15px_rgba(0,255,65,0.2)]"
									>
										{actionItems.getStarted.label}
									</NextLink>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</motion.nav>
		</header>
	);
}
