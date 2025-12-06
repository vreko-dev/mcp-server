"use client";
// 🚨 AI-CONTEXT: React 19.1.1 Client Component (Error Boundary cannot be RSC)
// 📐 ARCHITECTURE: ErrorBoundary Component
// PURPOSE: Catch render/runtime errors in client subtree and render fallback
// DEPENDENCIES: React class component lifecycle (getDerivedStateFromError, componentDidCatch)
// CONSTRAINTS: Must be a client component; logging wired via console/Sentry integration
// 🚫 ERROR HANDLING: Do not swallow errors silently; keep fallback accessible
// 🤖 AI-HELPER: Related files: modules/marketing/components/*, modules/ui/components/*
import type React from "react";
import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error", { error });
		console.error("Error details:", errorInfo);

		// If Sentry is available, report the error
		if (typeof window !== "undefined" && (window as any).Sentry) {
			(window as any).Sentry.captureException(error, {
				contexts: {
					react: {
						componentStack: errorInfo.componentStack,
					},
				},
			});
		}
	}

	override render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="min-h-screen flex items-center justify-center bg-background">
						<div className="text-center max-w-md mx-auto px-6">
							<h2 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h2>
							<p className="text-muted-foreground mb-6">
								We apologize for the inconvenience. Please try refreshing the page.
							</p>
							<button
								onClick={() => this.setState({ hasError: false })}
								className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
								type="button"
							>
								Try again
							</button>
						</div>
					</div>
				)
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
