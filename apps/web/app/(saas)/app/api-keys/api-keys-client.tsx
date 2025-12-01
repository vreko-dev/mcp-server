"use client";

import { PageHeader } from "@saas/shared/components/PageHeader";
import { useState } from "react";
import {
	useApiKeys,
	useCreateApiKey,
	useRevokeApiKey,
} from "@/hooks/use-api-keys";
import { matchResource } from "@/lib/resource";

export function ApiKeysClient() {
	const apiKeysR = useApiKeys();
	const createKeyMutation = useCreateApiKey();
	const revokeKeyMutation = useRevokeApiKey();

	const [keyName, setKeyName] = useState("");
	const [rateLimit, setRateLimit] = useState(100);
	const [newKeyFullKey, setNewKeyFullKey] = useState<string | null>(null);

	const handleCreateKey = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!keyName.trim()) {
			return;
		}

		try {
			const result = await createKeyMutation.mutateAsync({
				name: keyName,
				rateLimitPerMinute: rateLimit,
			});

			// Show the full key to user (only time they'll see it!)
			setNewKeyFullKey(result.fullKey);
			setKeyName("");
		} catch (err) {
			console.error("Failed to create API key", err as Error);
		}
	};

	const handleRevokeKey = async (keyId: string) => {
		try {
			await revokeKeyMutation.mutateAsync({ keyId });
		} catch (err) {
			console.error("Failed to revoke API key", err as Error);
		}
	};

	return (
		<main className="space-y-6">
			<PageHeader
				title="API Keys"
				subtitle="Manage your API keys for SnapBack protection tools"
			/>

			{newKeyFullKey && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<h3 className="font-semibold text-yellow-800 mb-2">
						⚠️ Save your API key now!
					</h3>
					<p className="text-sm text-yellow-700 mb-3">
						This is the only time you'll see the full key. Copy it and store it
						securely.
					</p>
					<div className="bg-white p-3 rounded border border-yellow-300 font-mono text-sm break-all">
						{newKeyFullKey}
					</div>
					<button
						type="button"
						onClick={() => {
							navigator.clipboard.writeText(newKeyFullKey);
							alert("Copied to clipboard!");
						}}
						className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
					>
						Copy to Clipboard
					</button>
					<button
						type="button"
						onClick={() => setNewKeyFullKey(null)}
						className="mt-3 ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
					>
						I've Saved It
					</button>
				</div>
			)}

			<div className="bg-white p-6 rounded-lg shadow">
				<h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
				<form onSubmit={handleCreateKey} className="space-y-4">
					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700"
						>
							Key Name
						</label>
						<input
							type="text"
							id="name"
							value={keyName}
							onChange={(e) => setKeyName(e.target.value)}
							required
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							placeholder="e.g., Production, Development, CI/CD"
						/>
					</div>
					<div>
						<label
							htmlFor="rateLimit"
							className="block text-sm font-medium text-gray-700"
						>
							Rate Limit (requests per minute)
						</label>
						<input
							type="number"
							id="rateLimit"
							value={rateLimit}
							onChange={(e) => setRateLimit(Number(e.target.value))}
							min="1"
							max="5000"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						/>
					</div>
					<button
						type="submit"
						disabled={createKeyMutation.isPending}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
					>
						{createKeyMutation.isPending ? "Generating..." : "Generate API Key"}
					</button>
				</form>
			</div>

			<div className="bg-white p-6 rounded-lg shadow">
				<h2 className="text-xl font-semibold mb-4">Your API Keys</h2>
				{matchResource(apiKeysR, {
					loading: () => (
						<div className="space-y-4">
							{[
								<div
									key="loading-skeleton-1"
									className="p-4 border rounded-lg animate-pulse"
								>
									<div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
									<div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
									<div className="h-3 bg-gray-200 rounded w-1/3" />
								</div>,
								<div
									key="loading-skeleton-2"
									className="p-4 border rounded-lg animate-pulse"
								>
									<div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
									<div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
									<div className="h-3 bg-gray-200 rounded w-1/3" />
								</div>,
								<div
									key="loading-skeleton-3"
									className="p-4 border rounded-lg animate-pulse"
								>
									<div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
									<div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
									<div className="h-3 bg-gray-200 rounded w-1/3" />
								</div>,
							]}
						</div>
					),
					empty: () => (
						<p className="text-gray-500">
							You haven't created any API keys yet.
						</p>
					),
					error: (error) => (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
							<p>Error loading API keys: {error.message}</p>
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
							>
								Retry
							</button>
						</div>
					),
					ready: (keys) =>
						keys.length === 0 ? (
							<p className="text-gray-500">
								You haven't created any API keys yet.
							</p>
						) : (
							<div className="space-y-4">
								{keys.map((key) => (
									<div key={key.id} className="p-4 border rounded-lg">
										<div className="flex justify-between items-center">
											<div>
												<h3 className="font-medium">{key.name}</h3>
												<p className="text-sm text-gray-500">
													Preview: {key.keyPreview}
												</p>
												<p className="text-sm text-gray-500">
													Created:{" "}
													{new Date(key.createdAt).toLocaleDateString()}
												</p>
												{key.scopes && key.scopes.length > 0 && (
													<p className="text-xs text-gray-500">
														Scopes: {key.scopes.join(", ")}
													</p>
												)}
												{key.revokedAt && (
													<p className="text-xs text-red-500 font-semibold">
														REVOKED:{" "}
														{new Date(key.revokedAt).toLocaleDateString()}
													</p>
												)}
											</div>
											{!key.revokedAt && (
												<button
													type="button"
													onClick={() => handleRevokeKey(key.id)}
													disabled={revokeKeyMutation.isPending}
													className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
												>
													{revokeKeyMutation.isPending
														? "Revoking..."
														: "Revoke"}
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						),
				})}
			</div>
		</main>
	);
}
