import { useState } from "react";

interface TrialKeyResponse {
	success: boolean;
	apiKey?: string;
	expiresAt?: string;
	trialUserId?: string;
	error?: string;
}

export function useTrialKey() {
	const [isLoading, setIsLoading] = useState(false);
	const [trialKey, setTrialKey] = useState<TrialKeyResponse | null>(null);

	const generateTrialKey = async (source: string) => {
		setIsLoading(true);
		setTrialKey(null);

		try {
			const response = await fetch("/api/v1/trial-key", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ source }),
			});

			const data: TrialKeyResponse = await response.json();
			setTrialKey(data);
			return data;
		} catch (_error) {
			const errorResponse: TrialKeyResponse = {
				success: false,
				error: "Failed to generate trial key",
			};
			setTrialKey(errorResponse);
			return errorResponse;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		generateTrialKey,
		isLoading,
		trialKey,
	};
}
