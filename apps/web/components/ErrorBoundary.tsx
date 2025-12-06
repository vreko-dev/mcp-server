"use client";

import { Button } from "@ui/components/button";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Uncaught error in component:", error);
		console.error("Error details:", errorInfo);
		// In production, you might want to log this to your error reporting service
	}

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
					<h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
					<p className="text-neutral-300 mb-4">
						We're sorry, but something unexpected happened. Please try again.
					</p>
					<Button onClick={() => this.setState({ hasError: false })} variant="outline">
						Try Again
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
