"use client";

import { usePioneerProgress } from "./use-pioneer-progress";

export interface ReferralStats {
	referralCode: string;
	referralUrl: string;
	stats: {
		totalSignups: number;
		activatedSignups: number;
		pointsEarned: number;
	};
	referrals: {
		username: string;
		status: "pending" | "activated";
		signedUpAt: string;
	}[];
}

/**
 * Hook to get referral stats for the current pioneer.
 * Currently derives basic info from pioneer profile.
 * TODO: Add dedicated /pioneer/referrals API endpoint for full stats.
 */
export function useReferrals() {
	const { data: progressData, isLoading, error } = usePioneerProgress();

	const data: ReferralStats | null = progressData?.pioneer
		? {
				referralCode: progressData.pioneer.referralCode,
				referralUrl: `https://snapback.dev/join/${progressData.pioneer.referralCode}`,
				stats: {
					totalSignups: 0, // TODO: Fetch from API
					activatedSignups: 0, // TODO: Fetch from API
					pointsEarned: 0, // TODO: Fetch from API
				},
				referrals: [], // TODO: Fetch from API
			}
		: null;

	return { data, isLoading, error };
}
