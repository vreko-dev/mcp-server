/**
 * Safeguard 6: Compatibility Shim (Safeguards 6 & 7 combined)
 *
 * Per TDD_CORE.md: Provides v1 backward compat + percentage-based rollout
 * Allows gradual migration without immediate 100% deployment
 */

/**
 * Percentage-based rollout
 * Deterministic: same user always gets same result
 */
export class PercentageBasedRollout {
	/**
	 * Check if feature is enabled for given user
	 * Uses consistent hashing for determinism
	 */
	isEnabledForUser(userId: string, percentage: number): boolean {
		if (percentage <= 0) return false;
		if (percentage >= 100) return true;

		// Hash userId to 0-100 consistently
		const hash = this.hashUserId(userId);
		return hash < percentage;
	}

	/**
	 * Consistent hash function (0-100)
	 * Same userId always produces same hash
	 */
	private hashUserId(userId: string): number {
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			hash = (hash << 5) - hash + userId.charCodeAt(i);
			hash = hash & hash; // Convert to 32-bit integer
		}

		// Convert to 0-100
		return Math.abs(hash % 100);
	}
}

/**
 * V1 Backward Compatibility Shim
 * Allows v2 to accept v1-formatted requests
 */
export class ConfigV1CompatibilityShim {
	async readV1Format(_filePath: string): Promise<any | null> {
		// TODO: Implement v1 format detection and parsing
		return null;
	}

	async handleLegacyRequest(v1Request: any): Promise<any> {
		// TODO: Convert v1 request to v2 format internally
		return v1Request;
	}
}
