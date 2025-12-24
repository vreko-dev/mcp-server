/**
 * TeamAggregator - Phase 4 Feature
 * Aggregates behavioral metrics across team members for multi-user workspaces.
 */

import type { BehavioralMetadata } from "../../types/vitals.js";

export interface UserMetrics {
	userId: string;
	username: string;
	metadata: BehavioralMetadata;
	timestamp: number;
}

export interface TeamAggregation {
	teamId: string;
	aggregationTime: number;
	memberCount: number;
	metrics: {
		avgAIAcceptanceRate: number;
		avgChurnRate: number;
		avgTestPassRate: number;
		avgSessionDuration: number;
		totalFileSaves: number;
		totalAISuggestions: number;
	};
	distribution: {
		aiAcceptanceRate: DistributionStats;
		churnRate: DistributionStats;
		testPassRate: DistributionStats;
	};
	topContributors: Array<{
		userId: string;
		username: string;
		score: number;
		reason: string;
	}>;
	concerns: TeamConcern[];
}

export interface DistributionStats {
	min: number;
	max: number;
	mean: number;
	median: number;
	stdDev: number;
}

export interface TeamConcern {
	type: "low_test_coverage" | "high_churn" | "low_ai_adoption" | "anomaly";
	severity: "low" | "medium" | "high";
	affectedUsers: string[];
	description: string;
	recommendation: string;
}

export interface UserComparison {
	userId: string;
	username: string;
	metrics: BehavioralMetadata;
	comparison: {
		aiAcceptanceRate: { value: number; vsTeam: number };
		churnRate: { value: number; vsTeam: number };
		testPassRate: { value: number; vsTeam: number };
		sessionDuration: { value: number; vsTeam: number };
	};
	status: "exceeding" | "average" | "below_average" | "concerning";
}

export class TeamAggregator {
	private userMetrics: Map<string, UserMetrics> = new Map();

	constructor(private teamId: string) {}

	recordUserMetrics(userId: string, username: string, metadata: BehavioralMetadata): void {
		this.userMetrics.set(userId, { userId, username, metadata, timestamp: Date.now() });
	}

	getTeamAggregation(): TeamAggregation {
		const users = Array.from(this.userMetrics.values());
		if (users.length === 0) return this.getEmptyAggregation();

		const metrics = this.aggregateMetrics(users);
		const distribution = this.getDistribution(users);

		return {
			teamId: this.teamId,
			aggregationTime: Date.now(),
			memberCount: users.length,
			metrics,
			distribution,
			topContributors: this.getTopContributors(users),
			concerns: this.detectConcerns(users, metrics),
		};
	}

	getUserComparison(userId: string): UserComparison | null {
		const user = this.userMetrics.get(userId);
		if (!user) return null;

		const teamAgg = this.getTeamAggregation();
		const m = user.metadata;
		const t = teamAgg.metrics;

		return {
			userId,
			username: user.username,
			metrics: m,
			comparison: {
				aiAcceptanceRate: { value: m.aiAcceptanceRate, vsTeam: t.avgAIAcceptanceRate },
				churnRate: { value: m.churnRate, vsTeam: t.avgChurnRate },
				testPassRate: { value: m.testPassRate, vsTeam: t.avgTestPassRate },
				sessionDuration: { value: m.sessionDuration, vsTeam: t.avgSessionDuration },
			},
			status: this.determineStatus(m, t),
		};
	}

	/**
	 * Aggregate metrics with cleaner reducer pattern
	 */
	private aggregateMetrics(users: UserMetrics[]) {
		const sum = <K extends keyof BehavioralMetadata>(key: K) =>
			users.reduce((acc, u) => acc + (u.metadata[key] as number), 0);

		const count = users.length;

		return {
			avgAIAcceptanceRate: sum("aiAcceptanceRate") / count,
			avgChurnRate: sum("churnRate") / count,
			avgTestPassRate: sum("testPassRate") / count,
			avgSessionDuration: sum("sessionDuration") / count,
			totalFileSaves: sum("fileSaveCount"),
			totalAISuggestions: sum("aiSuggestionsShown"),
		};
	}

	/**
	 * Get distribution statistics for key metrics
	 */
	private getDistribution(users: UserMetrics[]) {
		const stats = (key: keyof BehavioralMetadata): DistributionStats => {
			const values = users.map((u) => u.metadata[key]).filter((v): v is number => typeof v === "number");

			if (values.length === 0) {
				return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
			}

			const sorted = [...values].sort((a, b) => a - b);
			const mean = values.reduce((a, b) => a + b, 0) / values.length;
			const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

			return {
				min: sorted[0],
				max: sorted[sorted.length - 1],
				mean,
				median: sorted[Math.floor(sorted.length / 2)],
				stdDev: Math.sqrt(variance),
			};
		};

		return {
			aiAcceptanceRate: stats("aiAcceptanceRate"),
			churnRate: stats("churnRate"),
			testPassRate: stats("testPassRate"),
		};
	}

	/**
	 * Identify top contributing team members with scoring
	 */
	private getTopContributors(users: UserMetrics[]): TeamAggregation["topContributors"] {
		const scored = users.map((u) => {
			const m = u.metadata;
			const score =
				m.aiAcceptanceRate * 30 +
				m.testPassRate * 30 +
				(1 - Math.min(m.churnRate / 50, 1)) * 20 +
				(m.sessionDuration / 3600000) * 20;

			const reasons: Record<string, boolean> = {
				"High AI adoption and acceptance": m.aiAcceptanceRate > 0.7,
				"Strong test coverage and quality": m.testPassRate > 0.8,
				"Stable, focused development": m.churnRate < 5,
			};
			const reason = Object.entries(reasons).find(([, v]) => v)?.[0] ?? "Consistent contributor";

			return { userId: u.userId, username: u.username, score, reason };
		});

		return scored.sort((a, b) => b.score - a.score).slice(0, 5);
	}

	/**
	 * Detect team-wide concerns
	 */
	private detectConcerns(users: UserMetrics[], metrics: TeamAggregation["metrics"]): TeamConcern[] {
		const concerns: TeamConcern[] = [];
		const LOW_TEST = users.filter((u) => u.metadata.testPassRate < 0.5);
		const HIGH_CHURN = users.filter((u) => u.metadata.churnRate > 20);

		if (LOW_TEST.length > users.length * 0.3) {
			concerns.push({
				type: "low_test_coverage",
				severity: "high",
				affectedUsers: LOW_TEST.map((u) => u.username),
				description: `${LOW_TEST.length} team members have test pass rates below 50%`,
				recommendation: "Encourage test-driven development and pair programming sessions",
			});
		}

		if (HIGH_CHURN.length > 0) {
			concerns.push({
				type: "high_churn",
				severity: HIGH_CHURN.length > users.length * 0.3 ? "high" : "medium",
				affectedUsers: HIGH_CHURN.map((u) => u.username),
				description: `${HIGH_CHURN.length} team members showing high code churn (>20 lines/min)`,
				recommendation: "Review code complexity and consider refactoring sessions",
			});
		}

		if (metrics.avgAIAcceptanceRate < 0.3) {
			concerns.push({
				type: "low_ai_adoption",
				severity: "medium",
				affectedUsers: users.filter((u) => u.metadata.aiAcceptanceRate < 0.2).map((u) => u.username),
				description: "Team AI acceptance rate is below 30%",
				recommendation: "Provide AI tool training and integrate AI suggestions into workflow",
			});
		}

		return concerns;
	}

	/**
	 * Determine user status relative to team baseline
	 */
	private determineStatus(user: BehavioralMetadata, team: TeamAggregation["metrics"]): UserComparison["status"] {
		const score = [
			user.aiAcceptanceRate >= team.avgAIAcceptanceRate ? 1 : 0,
			user.testPassRate >= team.avgTestPassRate ? 1 : 0,
			user.churnRate <= team.avgChurnRate ? 1 : 0,
		].reduce((a, b) => a + b, 0);

		return score === 3 ? "exceeding" : score === 2 ? "average" : score === 1 ? "below_average" : "concerning";
	}

	private getEmptyAggregation(): TeamAggregation {
		const empty = { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };

		return {
			teamId: this.teamId,
			aggregationTime: Date.now(),
			memberCount: 0,
			metrics: {
				avgAIAcceptanceRate: 0,
				avgChurnRate: 0,
				avgTestPassRate: 0,
				avgSessionDuration: 0,
				totalFileSaves: 0,
				totalAISuggestions: 0,
			},
			distribution: {
				aiAcceptanceRate: empty,
				churnRate: empty,
				testPassRate: empty,
			},
			topContributors: [],
			concerns: [],
		};
	}

	reset(): void {
		this.userMetrics.clear();
	}
}
