"use client";

/**
 * Error boundary for documentation pages
 *
 * Catches errors during MDX compilation, .source generation failures,
 * and other runtime errors in the documentation.
 */
export default function DocsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<div className="max-w-md w-full space-y-4">
				<h2 className="text-2xl font-bold text-emerald-400">Documentation Error</h2>
				<p className="text-gray-400">{error.message || "An error occurred while loading this page."}</p>
				{error.digest && <p className="text-sm text-gray-500">Error ID: {error.digest}</p>}
				<div className="flex gap-2">
					<button
						type="button"
						onClick={reset}
						className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
					>
						Try Again
					</button>
					<a
						href="/docs"
						className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
					>
						Back to Docs
					</a>
				</div>
			</div>
		</div>
	);
}
