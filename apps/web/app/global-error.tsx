"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Global error:", error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				<div className="flex min-h-screen flex-col items-center justify-center p-4">
					<div className="max-w-md text-center">
						<h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
						<p className="mb-6 text-gray-600">
							We've been notified and are working on a fix.
						</p>
						<button
							type="button"
							onClick={() => reset()}
							className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							Try again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
