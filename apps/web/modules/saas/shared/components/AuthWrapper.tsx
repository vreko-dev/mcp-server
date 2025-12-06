import { Footer } from "@saas/shared/components/Footer";
import { ColorModeToggle } from "@shared/components/ColorModeToggle";
import { Logo } from "@shared/components/Logo";
import { cn } from "@ui/lib";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export function AuthWrapper({ children, contentClass }: PropsWithChildren<{ contentClass?: string }>) {
	return (
		<div className="flex min-h-screen w-full py-6">
			<div className="flex w-full flex-col items-center justify-between gap-8">
				<div className="container">
					<div className="flex items-center justify-between">
						<Link href="/" className="block">
							<Logo wordmark={true} />
						</Link>

						<div className="flex items-center justify-end gap-2">
							<ColorModeToggle />
						</div>
					</div>
				</div>

				<div className="container flex justify-center">
					<main className={cn("w-full max-w-md rounded-3xl bg-card p-6 border lg:p-8", contentClass)}>
						{children}
					</main>
				</div>

				<Footer />
			</div>
		</div>
	);
}
