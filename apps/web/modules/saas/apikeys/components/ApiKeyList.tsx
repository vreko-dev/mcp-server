"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { AlertCircle, Clock, KeyIcon, PlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/api-client";
import { CreateApiKeyModal } from "./CreateApiKeyModal";
import { RevokeConfirmDialog } from "./RevokeConfirmDialog";

interface ApiKey {
	id: string;
	name: string;
	keyPreview: string;
	lastUsedAt: Date | null;
	createdAt: Date;
	revokedAt: Date | null;
	organizationId?: string | null;
	userId: string;
}

interface ApiKeyListProps {
	apiKeys: ApiKey[];
	onRefresh?: () => void;
}

function formatLastUsed(lastUsedAt: Date | null): string {
	if (!lastUsedAt) {
		return "Never used";
	}

	const now = new Date();
	const diff = now.getTime() - new Date(lastUsedAt).getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days === 0) {
		return "Today";
	}
	if (days === 1) {
		return "1 day ago";
	}
	if (days < 30) {
		return `${days} days ago`;
	}

	return new Date(lastUsedAt).toLocaleDateString();
}

export function ApiKeyList({ apiKeys, onRefresh }: ApiKeyListProps) {
	const [isPending, startTransition] = useTransition();
	const [revokedKeys, setRevokedKeys] = useState<Set<string>>(new Set());

	const handleRevoke = (id: string, name: string) => {
		startTransition(async () => {
			try {
				const response = await api.apiKeys.revoke({
					id,
				});

				if (response.error) {
					throw new Error(response.error.message);
				}

				setRevokedKeys((prev) => new Set(prev).add(id));
				toast.success(`API key "${name}" revoked successfully`);
				if (onRefresh) {
					onRefresh();
				}
			} catch (error) {
				toast.error("Failed to revoke API key", {
					description: error instanceof Error ? error.message : "Unknown error",
				});
			}
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span className="flex items-center gap-2">
						<KeyIcon className="h-5 w-5 text-[var(--snapback-green)]" />
						API Keys
					</span>
					<CreateApiKeyModal
						onKeyCreated={onRefresh}
						trigger={
							<Button
								size="sm"
								className="bg-[var(--snapback-green)] hover:bg-[var(--snapback-green)]/90"
							>
								<PlusIcon className="h-4 w-4 mr-2" />
								Create API Key
							</Button>
						}
					/>
				</CardTitle>
				<CardDescription>Manage your API keys for SnapBack tools</CardDescription>
			</CardHeader>
			<CardContent>
				{apiKeys.length === 0 ? (
					<div className="text-center py-12">
						<KeyIcon className="h-16 w-16 mx-auto mb-4 text-neutral-700" />
						<h3 className="text-lg font-semibold text-white mb-2">No API Keys Yet</h3>
						<p className="text-neutral-400 mb-6">
							Create your first API key to start using SnapBack protection
						</p>
						<CreateApiKeyModal
							onKeyCreated={onRefresh}
							trigger={
								<Button className="bg-[var(--snapback-green)] hover:bg-[var(--snapback-green)]/90">
									<PlusIcon className="h-4 w-4 mr-2" />
									Create API Key
								</Button>
							}
						/>
					</div>
				) : (
					<div className="space-y-3">
						{apiKeys.map((apiKey) => {
							const isRevoked = revokedKeys.has(apiKey.id) || apiKey.revokedAt;

							return (
								<div
									key={apiKey.id}
									className="group relative overflow-hidden rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] p-4 transition-all hover:border-[var(--snapback-green)]/50 hover:shadow-lg hover:shadow-[var(--snapback-green)]/5"
								>
									<div className="flex items-center justify-between gap-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<div className="font-medium text-white">{apiKey.name}</div>
												{isRevoked && (
													<Badge status="error" className="text-xs">
														Revoked
													</Badge>
												)}
												{apiKey.organizationId && (
													<Badge status="info" className="text-xs">
														Organization
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-4 text-sm text-neutral-400">
												<code className="font-mono">{apiKey.keyPreview}</code>
												{apiKey.lastUsedAt ? (
													<span className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{formatLastUsed(apiKey.lastUsedAt)}
													</span>
												) : (
													<span className="flex items-center gap-1 text-neutral-500">
														<AlertCircle className="h-3 w-3" />
														Never used
													</span>
												)}
											</div>
										</div>
										<RevokeConfirmDialog
											keyName={apiKey.name}
											onConfirm={() => handleRevoke(apiKey.id, apiKey.name)}
											disabled={isPending || !!isRevoked}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
