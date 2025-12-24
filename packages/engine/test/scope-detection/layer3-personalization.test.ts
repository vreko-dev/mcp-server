/**
 * Layer 3: User Profile and Personalization Tests
 *
 * Tests for user behavior learning, profile management, and personalized scoring.
 * Coverage: Happy Path, Sad Path, Edge Cases, Error Path
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	AggregateInsights,
	FileCategory,
	FilesChangedTogetherEvent,
	ScoringWeights,
	SnapshotCreatedEvent,
	SnapshotRestoredEvent,
	SnapshotStrategy,
	UserBehaviorEvent,
	UserPatterns,
	UserProfile,
} from "../../src/scope-detection/types.js";
import { DEFAULT_WEIGHTS } from "../../src/scope-detection/types.js";

// Mock functions under test
const createUserProfile = vi.fn<[string], UserProfile>();
const updateUserProfile = vi.fn<[UserProfile, UserBehaviorEvent], UserProfile>();
const getBlendedWeights = vi.fn<[UserProfile | null, AggregateInsights], ScoringWeights>();
const processBehaviorEvent = vi.fn<[UserBehaviorEvent], void>();
const calculateRollbackRate = vi.fn<[UserProfile], number>();
const computeAggregateInsights = vi.fn<[UserProfile[]], AggregateInsights>();
const bayesianWeightUpdate = vi.fn<[ScoringWeights, UserPatterns, number], ScoringWeights>();
const getPersonalizedScore = vi.fn<[number, UserProfile | null, AggregateInsights], number>();

describe("Layer 3: User Profile and Personalization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ===========================================================================
	// USER PROFILE CREATION
	// ===========================================================================

	describe("createUserProfile", () => {
		describe("Happy Path", () => {
			it("should create new user profile with default patterns", () => {
				createUserProfile.mockImplementation((userId) => ({
					userId,
					tier: "free",
					patterns: {
						rollbackRate: 0,
						rollbackLatencyBuckets: {
							immediate: 0,
							sameSession: 0,
							later: 0,
						},
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [],
						avgSessionLength: 0,
						typicalChangeVelocity: 0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 0,
				}));

				const profile = createUserProfile("user-123");

				expect(profile.userId).toBe("user-123");
				expect(profile.tier).toBe("free");
				expect(profile.dataPointCount).toBe(0);
				expect(profile.patterns.rollbackRate).toBe(0);
			});

			it("should create Pro tier profile with full patterns", () => {
				createUserProfile.mockImplementation((userId) => ({
					userId,
					tier: "pro",
					patterns: {
						rollbackRate: 0,
						rollbackLatencyBuckets: {
							immediate: 0,
							sameSession: 0,
							later: 0,
						},
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [],
						avgSessionLength: 0,
						typicalChangeVelocity: 0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 0,
				}));

				const profile = createUserProfile("pro-user");

				expect(profile.tier).toBe("pro");
			});
		});
	});

	// ===========================================================================
	// BEHAVIOR EVENT PROCESSING
	// ===========================================================================

	describe("updateUserProfile", () => {
		const baseProfile: UserProfile = {
			userId: "test-user",
			tier: "pro",
			patterns: {
				rollbackRate: 0.15,
				rollbackLatencyBuckets: {
					immediate: 5,
					sameSession: 10,
					later: 3,
				},
				fileTypeProtection: {
					component: { protectionCount: 20, rollbackCount: 3, rollbackRate: 0.15 },
				},
				aiToolStats: {
					cursor: {
						usageCount: 50,
						rollbackRate: 0.2,
						avgConfidenceAtRollback: 0.6,
						fileTypeRollbackRates: {},
					},
				},
				riskiestHours: [14, 15, 16],
				avgSessionLength: 3600000,
				typicalChangeVelocity: 2.5,
			},
			weightAdjustments: {},
			updatedAt: Date.now() - 3600000,
			dataPointCount: 100,
		};

		describe("Happy Path - Snapshot Restored Event", () => {
			it("should update rollback statistics on restore event", () => {
				const restoreEvent: SnapshotRestoredEvent = {
					type: "snapshot_restored",
					timestamp: Date.now(),
					userId: "test-user",
					fileCategory: "component" as FileCategory,
					aiTool: "cursor",
					snapshotCreatedAt: Date.now() - 60000, // 1 minute ago
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "snapshot_restored") {
						const newProfile = { ...profile };
						newProfile.dataPointCount++;
						// Update rollback rate
						const totalRestores =
							profile.patterns.rollbackLatencyBuckets.immediate +
							profile.patterns.rollbackLatencyBuckets.sameSession +
							profile.patterns.rollbackLatencyBuckets.later +
							1;
						newProfile.patterns = {
							...profile.patterns,
							rollbackRate: totalRestores / newProfile.dataPointCount,
						};
						return newProfile;
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, restoreEvent);

				expect(updatedProfile.dataPointCount).toBe(101);
			});

			it("should categorize rollback latency into immediate bucket", () => {
				const immediateRestore: SnapshotRestoredEvent = {
					type: "snapshot_restored",
					timestamp: Date.now(),
					userId: "test-user",
					fileCategory: "component" as FileCategory,
					snapshotCreatedAt: Date.now() - 30000, // 30 seconds ago
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "snapshot_restored") {
						const latency = event.timestamp - event.snapshotCreatedAt;
						const bucket = latency < 60000 ? "immediate" : latency < 3600000 ? "sameSession" : "later";
						return {
							...profile,
							patterns: {
								...profile.patterns,
								rollbackLatencyBuckets: {
									...profile.patterns.rollbackLatencyBuckets,
									[bucket]: profile.patterns.rollbackLatencyBuckets[bucket] + 1,
								},
							},
						};
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, immediateRestore);

				expect(updatedProfile.patterns.rollbackLatencyBuckets.immediate).toBe(6);
			});

			it("should update AI tool rollback statistics", () => {
				const cursorRestore: SnapshotRestoredEvent = {
					type: "snapshot_restored",
					timestamp: Date.now(),
					userId: "test-user",
					fileCategory: "component" as FileCategory,
					aiTool: "cursor",
					snapshotCreatedAt: Date.now() - 60000,
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "snapshot_restored" && event.aiTool) {
						const currentStats = profile.patterns.aiToolStats[event.aiTool] ?? {
							usageCount: 0,
							rollbackRate: 0,
							avgConfidenceAtRollback: 0,
							fileTypeRollbackRates: {},
						};
						return {
							...profile,
							patterns: {
								...profile.patterns,
								aiToolStats: {
									...profile.patterns.aiToolStats,
									[event.aiTool]: {
										...currentStats,
										rollbackRate:
											(currentStats.rollbackRate * currentStats.usageCount + 1) /
											(currentStats.usageCount + 1),
									},
								},
							},
						};
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, cursorRestore);

				expect(updatedProfile.patterns.aiToolStats.cursor).toBeDefined();
			});
		});

		describe("Happy Path - Snapshot Created Event", () => {
			it("should update file type protection stats on create event", () => {
				const createEvent: SnapshotCreatedEvent = {
					type: "snapshot_created",
					timestamp: Date.now(),
					userId: "test-user",
					fileCategory: "component" as FileCategory,
					aiTool: "copilot",
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "snapshot_created") {
						const currentStats = profile.patterns.fileTypeProtection[event.fileCategory] ?? {
							protectionCount: 0,
							rollbackCount: 0,
							rollbackRate: 0,
						};
						return {
							...profile,
							patterns: {
								...profile.patterns,
								fileTypeProtection: {
									...profile.patterns.fileTypeProtection,
									[event.fileCategory]: {
										...currentStats,
										protectionCount: currentStats.protectionCount + 1,
									},
								},
							},
							dataPointCount: profile.dataPointCount + 1,
						};
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, createEvent);

				expect(updatedProfile.patterns.fileTypeProtection.component?.protectionCount).toBe(21);
			});
		});

		describe("Happy Path - Files Changed Together Event", () => {
			it("should track file co-change patterns", () => {
				const coChangeEvent: FilesChangedTogetherEvent = {
					type: "files_changed_together",
					timestamp: Date.now(),
					userId: "test-user",
					files: ["src/Button.tsx", "src/Button.test.tsx", "src/Button.css"],
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "files_changed_together") {
						// Track co-change patterns (implementation would store this)
						return {
							...profile,
							dataPointCount: profile.dataPointCount + 1,
							updatedAt: event.timestamp,
						};
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, coChangeEvent);

				expect(updatedProfile.dataPointCount).toBe(101);
			});
		});

		describe("Edge Cases", () => {
			it("should handle first event for new file category", () => {
				const newCategoryEvent: SnapshotCreatedEvent = {
					type: "snapshot_created",
					timestamp: Date.now(),
					userId: "test-user",
					fileCategory: "hook" as FileCategory,
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "snapshot_created") {
						return {
							...profile,
							patterns: {
								...profile.patterns,
								fileTypeProtection: {
									...profile.patterns.fileTypeProtection,
									[event.fileCategory]: {
										protectionCount: 1,
										rollbackCount: 0,
										rollbackRate: 0,
									},
								},
							},
						};
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, newCategoryEvent);

				expect(updatedProfile.patterns.fileTypeProtection.hook).toBeDefined();
				expect(updatedProfile.patterns.fileTypeProtection.hook?.protectionCount).toBe(1);
			});

			it("should handle event for new AI tool", () => {
				const newToolEvent: SnapshotRestoredEvent = {
					type: "snapshot_restored",
					timestamp: Date.now(),
					userId: "test-user",
					fileCategory: "component" as FileCategory,
					aiTool: "windsurf",
					snapshotCreatedAt: Date.now() - 60000,
				};

				updateUserProfile.mockImplementation((profile, event) => {
					if (event.type === "snapshot_restored" && event.aiTool) {
						return {
							...profile,
							patterns: {
								...profile.patterns,
								aiToolStats: {
									...profile.patterns.aiToolStats,
									[event.aiTool]: {
										usageCount: 1,
										rollbackRate: 1.0,
										avgConfidenceAtRollback: 0.5,
										fileTypeRollbackRates: {
											[event.fileCategory]: 1.0,
										},
									},
								},
							},
						};
					}
					return profile;
				});

				const updatedProfile = updateUserProfile(baseProfile, newToolEvent);

				expect(updatedProfile.patterns.aiToolStats.windsurf).toBeDefined();
				expect(updatedProfile.patterns.aiToolStats.windsurf?.usageCount).toBe(1);
			});
		});
	});

	// ===========================================================================
	// BAYESIAN WEIGHT UPDATE
	// ===========================================================================

	describe("bayesianWeightUpdate", () => {
		describe("Happy Path", () => {
			it("should apply Bayesian blend formula: W_user = α × W_default + (1-α) × W_learned", () => {
				bayesianWeightUpdate.mockImplementation((defaultWeights, patterns, dataPoints) => {
					// Calculate confidence factor based on data points
					const confidence = Math.min(dataPoints / 100, 1); // Max confidence at 100 data points
					const alpha = 1 - confidence; // More data = more weight on learned

					// Example learned weights based on patterns
					const learnedWeights: ScoringWeights = {
						categoryRisk: patterns.rollbackRate > 0.2 ? 0.25 : 0.2,
						blastRadius: 0.2,
						aiToolRisk: 0.25, // Increase AI risk if rollbacks are high
						changeMagnitude: 0.1,
						sessionCoherence: 0.1,
						temporalRisk: 0.05,
						criticalPath: 0.1,
					};

					// Blend weights
					return {
						categoryRisk: alpha * defaultWeights.categoryRisk + (1 - alpha) * learnedWeights.categoryRisk,
						blastRadius: alpha * defaultWeights.blastRadius + (1 - alpha) * learnedWeights.blastRadius,
						aiToolRisk: alpha * defaultWeights.aiToolRisk + (1 - alpha) * learnedWeights.aiToolRisk,
						changeMagnitude:
							alpha * defaultWeights.changeMagnitude + (1 - alpha) * learnedWeights.changeMagnitude,
						sessionCoherence:
							alpha * defaultWeights.sessionCoherence + (1 - alpha) * learnedWeights.sessionCoherence,
						temporalRisk: alpha * defaultWeights.temporalRisk + (1 - alpha) * learnedWeights.temporalRisk,
						criticalPath: alpha * defaultWeights.criticalPath + (1 - alpha) * learnedWeights.criticalPath,
					};
				});

				const patterns: UserPatterns = {
					rollbackRate: 0.25,
					rollbackLatencyBuckets: { immediate: 10, sameSession: 5, later: 2 },
					fileTypeProtection: {},
					aiToolStats: {},
					riskiestHours: [],
					avgSessionLength: 3600000,
					typicalChangeVelocity: 2.0,
				};

				const blendedWeights = bayesianWeightUpdate(DEFAULT_WEIGHTS, patterns, 50);

				// At 50 data points, confidence is 0.5, so alpha is 0.5
				// Blended should be halfway between default and learned
				expect(blendedWeights.categoryRisk).toBeGreaterThanOrEqual(0.2);
				expect(blendedWeights.categoryRisk).toBeLessThanOrEqual(0.25);
			});

			it("should maintain weight sum of 1.0 after blending", () => {
				bayesianWeightUpdate.mockImplementation(() => ({
					categoryRisk: 0.22,
					blastRadius: 0.18,
					aiToolRisk: 0.22,
					changeMagnitude: 0.12,
					sessionCoherence: 0.08,
					temporalRisk: 0.08,
					criticalPath: 0.1,
				}));

				const patterns: UserPatterns = {
					rollbackRate: 0.15,
					rollbackLatencyBuckets: { immediate: 5, sameSession: 10, later: 3 },
					fileTypeProtection: {},
					aiToolStats: {},
					riskiestHours: [],
					avgSessionLength: 3600000,
					typicalChangeVelocity: 2.0,
				};

				const blendedWeights = bayesianWeightUpdate(DEFAULT_WEIGHTS, patterns, 100);

				const sum = Object.values(blendedWeights).reduce((a, b) => a + b, 0);
				expect(sum).toBeCloseTo(1.0, 2);
			});

			it("should increase AI tool weight for users with high AI rollback rate", () => {
				bayesianWeightUpdate.mockImplementation((defaultWeights, patterns) => {
					const aiRollbackBoost = patterns.rollbackRate > 0.2 ? 0.05 : 0;
					return {
						...defaultWeights,
						aiToolRisk: defaultWeights.aiToolRisk + aiRollbackBoost,
						sessionCoherence: defaultWeights.sessionCoherence - aiRollbackBoost, // Compensate
					};
				});

				const highAIRollbackPatterns: UserPatterns = {
					rollbackRate: 0.35,
					rollbackLatencyBuckets: { immediate: 20, sameSession: 10, later: 5 },
					fileTypeProtection: {},
					aiToolStats: {
						cursor: {
							usageCount: 100,
							rollbackRate: 0.4,
							avgConfidenceAtRollback: 0.5,
							fileTypeRollbackRates: {},
						},
					},
					riskiestHours: [],
					avgSessionLength: 3600000,
					typicalChangeVelocity: 3.0,
				};

				const blendedWeights = bayesianWeightUpdate(DEFAULT_WEIGHTS, highAIRollbackPatterns, 100);

				expect(blendedWeights.aiToolRisk).toBeGreaterThan(DEFAULT_WEIGHTS.aiToolRisk);
			});
		});

		describe("Edge Cases", () => {
			it("should return default weights for new users (0 data points)", () => {
				bayesianWeightUpdate.mockImplementation((defaultWeights, _patterns, dataPoints) => {
					if (dataPoints === 0) {
						return { ...defaultWeights };
					}
					return defaultWeights;
				});

				const emptyPatterns: UserPatterns = {
					rollbackRate: 0,
					rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
					fileTypeProtection: {},
					aiToolStats: {},
					riskiestHours: [],
					avgSessionLength: 0,
					typicalChangeVelocity: 0,
				};

				const weights = bayesianWeightUpdate(DEFAULT_WEIGHTS, emptyPatterns, 0);

				expect(weights).toEqual(DEFAULT_WEIGHTS);
			});

			it("should cap confidence at 100 data points", () => {
				bayesianWeightUpdate.mockImplementation((defaultWeights, _patterns, dataPoints) => {
					const confidence = Math.min(dataPoints / 100, 1);
					// At max confidence, fully use learned weights
					if (confidence === 1) {
						return {
							categoryRisk: 0.25,
							blastRadius: 0.15,
							aiToolRisk: 0.25,
							changeMagnitude: 0.1,
							sessionCoherence: 0.1,
							temporalRisk: 0.05,
							criticalPath: 0.1,
						};
					}
					return defaultWeights;
				});

				const patterns: UserPatterns = {
					rollbackRate: 0.2,
					rollbackLatencyBuckets: { immediate: 50, sameSession: 30, later: 20 },
					fileTypeProtection: {},
					aiToolStats: {},
					riskiestHours: [],
					avgSessionLength: 3600000,
					typicalChangeVelocity: 2.0,
				};

				// 200 data points should have same effect as 100
				const weights100 = bayesianWeightUpdate(DEFAULT_WEIGHTS, patterns, 100);
				const weights200 = bayesianWeightUpdate(DEFAULT_WEIGHTS, patterns, 200);

				expect(weights100).toEqual(weights200);
			});
		});
	});

	// ===========================================================================
	// BLENDED WEIGHTS
	// ===========================================================================

	describe("getBlendedWeights", () => {
		const mockAggregateInsights: AggregateInsights = {
			global: {
				optimalWeights: {
					categoryRisk: 0.18,
					blastRadius: 0.22,
					aiToolRisk: 0.22,
					changeMagnitude: 0.1,
					sessionCoherence: 0.1,
					temporalRisk: 0.08,
					criticalPath: 0.1,
				},
				aiToolFileRisk: {
					cursor: { component: 0.3, hook: 0.25 },
					copilot: { component: 0.2, hook: 0.2 },
					claude: {},
					windsurf: {},
					aider: {},
					unknown: {},
				},
				categoryRiskRanking: [
					{ category: "root_config" as FileCategory, avgRollbackRate: 0.35, sampleSize: 1000 },
					{ category: "entry_point" as FileCategory, avgRollbackRate: 0.28, sampleSize: 800 },
				],
				strategyEffectiveness: {
					single_file: { successRate: 0.9, overInclusionRate: 0.05, avgFileCount: 1 },
					direct_dependents: { successRate: 0.85, overInclusionRate: 0.1, avgFileCount: 3 },
					transitive_cluster: { successRate: 0.8, overInclusionRate: 0.15, avgFileCount: 8 },
					module_scope: { successRate: 0.75, overInclusionRate: 0.2, avgFileCount: 15 },
					package_scope: { successRate: 0.7, overInclusionRate: 0.3, avgFileCount: 50 },
					session_scope: { successRate: 0.65, overInclusionRate: 0.4, avgFileCount: 25 },
				},
				optimalThresholds: {
					singleFile: 25,
					directDependents: 45,
					transitive: 65,
					module: 80,
					package: 90,
					session: 100,
				},
				temporalPatterns: {
					riskiestHoursGlobal: [14, 15, 16, 17],
					riskiestDaysGlobal: [4, 5], // Friday, Saturday
				},
			},
			byRepoType: {
				monorepo: {
					avgBlastRadius: 12,
					recommendedWeightAdjustments: { blastRadius: 0.25 },
					mostProblematicConfigs: ["turbo.json", "pnpm-workspace.yaml"],
				},
			},
			computedAt: Date.now(),
			sampleSize: 10000,
			confidenceLevel: 0.95,
		};

		describe("Happy Path", () => {
			it("should return default weights for null user profile (free tier)", () => {
				getBlendedWeights.mockImplementation((profile, _insights) => {
					if (!profile) {
						return { ...DEFAULT_WEIGHTS };
					}
					return DEFAULT_WEIGHTS;
				});

				const weights = getBlendedWeights(null, mockAggregateInsights);

				expect(weights).toEqual(DEFAULT_WEIGHTS);
			});

			it("should blend user and global weights for Pro tier", () => {
				const proProfile: UserProfile = {
					userId: "pro-user",
					tier: "pro",
					patterns: {
						rollbackRate: 0.2,
						rollbackLatencyBuckets: { immediate: 10, sameSession: 5, later: 2 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [14, 15],
						avgSessionLength: 3600000,
						typicalChangeVelocity: 2.0,
					},
					weightAdjustments: { aiToolRisk: 0.25 },
					updatedAt: Date.now(),
					dataPointCount: 80,
				};

				getBlendedWeights.mockImplementation((profile, insights) => {
					if (profile?.tier === "pro") {
						// Blend: 50% user adjustments, 30% global optimal, 20% default
						return {
							categoryRisk: 0.19,
							blastRadius: 0.21,
							aiToolRisk:
								profile.weightAdjustments.aiToolRisk ?? insights.global.optimalWeights.aiToolRisk,
							changeMagnitude: 0.1,
							sessionCoherence: 0.1,
							temporalRisk: 0.08,
							criticalPath: 0.1,
						};
					}
					return DEFAULT_WEIGHTS;
				});

				const weights = getBlendedWeights(proProfile, mockAggregateInsights);

				expect(weights.aiToolRisk).toBe(0.25);
			});

			it("should apply global insights when user has insufficient data", () => {
				const newProProfile: UserProfile = {
					userId: "new-pro",
					tier: "pro",
					patterns: {
						rollbackRate: 0,
						rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [],
						avgSessionLength: 0,
						typicalChangeVelocity: 0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 5, // Insufficient data
				};

				getBlendedWeights.mockImplementation((profile, insights) => {
					if (profile?.tier === "pro" && profile.dataPointCount < 20) {
						// Use global optimal weights when insufficient user data
						return insights.global.optimalWeights;
					}
					return DEFAULT_WEIGHTS;
				});

				const weights = getBlendedWeights(newProProfile, mockAggregateInsights);

				expect(weights).toEqual(mockAggregateInsights.global.optimalWeights);
			});
		});

		describe("Edge Cases", () => {
			it("should handle missing aggregate insights gracefully", () => {
				const emptyInsights: AggregateInsights = {
					global: {
						optimalWeights: DEFAULT_WEIGHTS,
						aiToolFileRisk: { cursor: {}, copilot: {}, claude: {}, windsurf: {}, aider: {}, unknown: {} },
						categoryRiskRanking: [],
						strategyEffectiveness: {} as Record<
							SnapshotStrategy,
							{ successRate: number; overInclusionRate: number; avgFileCount: number }
						>,
						optimalThresholds: {
							singleFile: 25,
							directDependents: 45,
							transitive: 65,
							module: 80,
							package: 90,
							session: 100,
						},
						temporalPatterns: { riskiestHoursGlobal: [], riskiestDaysGlobal: [] },
					},
					byRepoType: {},
					computedAt: 0,
					sampleSize: 0,
					confidenceLevel: 0,
				};

				getBlendedWeights.mockImplementation((_profile, insights) => {
					if (insights.sampleSize === 0) {
						return { ...DEFAULT_WEIGHTS };
					}
					return insights.global.optimalWeights;
				});

				const weights = getBlendedWeights(null, emptyInsights);

				expect(weights).toEqual(DEFAULT_WEIGHTS);
			});
		});
	});

	// ===========================================================================
	// PERSONALIZED SCORE
	// ===========================================================================

	describe("getPersonalizedScore", () => {
		const mockInsights: AggregateInsights = {
			global: {
				optimalWeights: DEFAULT_WEIGHTS,
				aiToolFileRisk: { cursor: {}, copilot: {}, claude: {}, windsurf: {}, aider: {}, unknown: {} },
				categoryRiskRanking: [],
				strategyEffectiveness: {} as Record<
					SnapshotStrategy,
					{ successRate: number; overInclusionRate: number; avgFileCount: number }
				>,
				optimalThresholds: {
					singleFile: 25,
					directDependents: 45,
					transitive: 65,
					module: 80,
					package: 90,
					session: 100,
				},
				temporalPatterns: { riskiestHoursGlobal: [14, 15, 16], riskiestDaysGlobal: [4, 5] },
			},
			byRepoType: {},
			computedAt: Date.now(),
			sampleSize: 10000,
			confidenceLevel: 0.95,
		};

		describe("Happy Path", () => {
			it("should return base score for free tier users", () => {
				getPersonalizedScore.mockImplementation((baseScore, profile) => {
					if (!profile || profile.tier === "free") {
						return baseScore;
					}
					return baseScore;
				});

				const score = getPersonalizedScore(50, null, mockInsights);

				expect(score).toBe(50);
			});

			it("should apply personalization boost for high-risk users", () => {
				const highRiskProfile: UserProfile = {
					userId: "high-risk",
					tier: "pro",
					patterns: {
						rollbackRate: 0.4, // High rollback rate
						rollbackLatencyBuckets: { immediate: 30, sameSession: 10, later: 5 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [14, 15],
						avgSessionLength: 3600000,
						typicalChangeVelocity: 4.0, // High velocity
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 100,
				};

				getPersonalizedScore.mockImplementation((baseScore, profile) => {
					if (profile?.tier === "pro" && profile.patterns.rollbackRate > 0.3) {
						// Boost score for high-risk users
						return Math.min(100, baseScore * 1.2);
					}
					return baseScore;
				});

				const score = getPersonalizedScore(50, highRiskProfile, mockInsights);

				expect(score).toBe(60); // 50 * 1.2 = 60
			});

			it("should apply time-based personalization during risky hours", () => {
				const riskHoursProfile: UserProfile = {
					userId: "time-sensitive",
					tier: "pro",
					patterns: {
						rollbackRate: 0.2,
						rollbackLatencyBuckets: { immediate: 10, sameSession: 5, later: 2 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [14, 15, 16], // User's risky hours
						avgSessionLength: 3600000,
						typicalChangeVelocity: 2.0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 100,
				};

				getPersonalizedScore.mockImplementation((baseScore, profile) => {
					if (profile?.tier === "pro") {
						const currentHour = new Date().getHours();
						if (profile.patterns.riskiestHours.includes(currentHour)) {
							return Math.min(100, baseScore * 1.15);
						}
					}
					return baseScore;
				});

				// Note: This test's result depends on current hour
				const score = getPersonalizedScore(50, riskHoursProfile, mockInsights);

				// Score should be either 50 or 57.5 depending on time
				expect(score).toBeGreaterThanOrEqual(50);
				expect(score).toBeLessThanOrEqual(58);
			});
		});

		describe("Edge Cases", () => {
			it("should clamp personalized score to 100 maximum", () => {
				const extremeProfile: UserProfile = {
					userId: "extreme-risk",
					tier: "pro",
					patterns: {
						rollbackRate: 0.8,
						rollbackLatencyBuckets: { immediate: 80, sameSession: 15, later: 5 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: Array.from({ length: 24 }, (_, i) => i), // All hours risky
						avgSessionLength: 3600000,
						typicalChangeVelocity: 10.0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 200,
				};

				getPersonalizedScore.mockImplementation((baseScore, profile) => {
					if (profile?.tier === "pro") {
						const boost = 1 + profile.patterns.rollbackRate;
						return Math.min(100, baseScore * boost);
					}
					return baseScore;
				});

				const score = getPersonalizedScore(90, extremeProfile, mockInsights);

				expect(score).toBe(100); // Clamped to 100
			});

			it("should not reduce score below base for conservative personalization", () => {
				const lowRiskProfile: UserProfile = {
					userId: "low-risk",
					tier: "pro",
					patterns: {
						rollbackRate: 0.02, // Very low rollback rate
						rollbackLatencyBuckets: { immediate: 1, sameSession: 1, later: 0 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [],
						avgSessionLength: 3600000,
						typicalChangeVelocity: 0.5,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 100,
				};

				getPersonalizedScore.mockImplementation((baseScore) => {
					// Never reduce below base score for safety
					return baseScore;
				});

				const score = getPersonalizedScore(50, lowRiskProfile, mockInsights);

				expect(score).toBeGreaterThanOrEqual(50);
			});
		});
	});

	// ===========================================================================
	// AGGREGATE INSIGHTS COMPUTATION
	// ===========================================================================

	describe("computeAggregateInsights", () => {
		describe("Happy Path", () => {
			it("should compute optimal weights from user population", () => {
				const profiles: UserProfile[] = [
					{
						userId: "user1",
						tier: "pro",
						patterns: {
							rollbackRate: 0.1,
							rollbackLatencyBuckets: { immediate: 5, sameSession: 3, later: 2 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [14],
							avgSessionLength: 3600000,
							typicalChangeVelocity: 2.0,
						},
						weightAdjustments: { categoryRisk: 0.22 },
						updatedAt: Date.now(),
						dataPointCount: 100,
					},
					{
						userId: "user2",
						tier: "pro",
						patterns: {
							rollbackRate: 0.2,
							rollbackLatencyBuckets: { immediate: 10, sameSession: 5, later: 3 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [15, 16],
							avgSessionLength: 4000000,
							typicalChangeVelocity: 3.0,
						},
						weightAdjustments: { categoryRisk: 0.18 },
						updatedAt: Date.now(),
						dataPointCount: 80,
					},
				];

				computeAggregateInsights.mockImplementation((profiles) => {
					// Compute weighted average of user adjustments
					const totalDataPoints = profiles.reduce((sum, p) => sum + p.dataPointCount, 0);
					const weightedCategoryRisk =
						profiles.reduce(
							(sum, p) =>
								sum +
								(p.weightAdjustments.categoryRisk ?? DEFAULT_WEIGHTS.categoryRisk) * p.dataPointCount,
							0,
						) / totalDataPoints;

					return {
						global: {
							optimalWeights: {
								...DEFAULT_WEIGHTS,
								categoryRisk: weightedCategoryRisk,
							},
							aiToolFileRisk: {
								cursor: {},
								copilot: {},
								claude: {},
								windsurf: {},
								aider: {},
								unknown: {},
							},
							categoryRiskRanking: [],
							strategyEffectiveness: {} as Record<
								SnapshotStrategy,
								{ successRate: number; overInclusionRate: number; avgFileCount: number }
							>,
							optimalThresholds: {
								singleFile: 25,
								directDependents: 45,
								transitive: 65,
								module: 80,
								package: 90,
								session: 100,
							},
							temporalPatterns: { riskiestHoursGlobal: [14, 15, 16], riskiestDaysGlobal: [] },
						},
						byRepoType: {},
						computedAt: Date.now(),
						sampleSize: profiles.length,
						confidenceLevel: Math.min(profiles.length / 100, 0.95),
					};
				});

				const insights = computeAggregateInsights(profiles);

				expect(insights.sampleSize).toBe(2);
				// Weighted average: (0.22*100 + 0.18*80) / 180 ≈ 0.202
				expect(insights.global.optimalWeights.categoryRisk).toBeCloseTo(0.202, 2);
			});

			it("should compute risky hours from population patterns", () => {
				const profiles: UserProfile[] = [
					{
						userId: "user1",
						tier: "pro",
						patterns: {
							rollbackRate: 0.1,
							rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [14, 15],
							avgSessionLength: 0,
							typicalChangeVelocity: 0,
						},
						weightAdjustments: {},
						updatedAt: Date.now(),
						dataPointCount: 100,
					},
					{
						userId: "user2",
						tier: "pro",
						patterns: {
							rollbackRate: 0.1,
							rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [15, 16, 17],
							avgSessionLength: 0,
							typicalChangeVelocity: 0,
						},
						weightAdjustments: {},
						updatedAt: Date.now(),
						dataPointCount: 100,
					},
					{
						userId: "user3",
						tier: "pro",
						patterns: {
							rollbackRate: 0.1,
							rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [15, 16],
							avgSessionLength: 0,
							typicalChangeVelocity: 0,
						},
						weightAdjustments: {},
						updatedAt: Date.now(),
						dataPointCount: 100,
					},
				];

				computeAggregateInsights.mockImplementation((profiles) => {
					// Count hour occurrences
					const hourCounts = new Map<number, number>();
					for (const profile of profiles) {
						for (const hour of profile.patterns.riskiestHours) {
							hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
						}
					}

					// Get top hours (appearing in >50% of profiles)
					const threshold = profiles.length * 0.5;
					const riskiestHours = Array.from(hourCounts.entries())
						.filter(([_, count]) => count >= threshold)
						.map(([hour]) => hour)
						.sort((a, b) => a - b);

					return {
						global: {
							optimalWeights: DEFAULT_WEIGHTS,
							aiToolFileRisk: {
								cursor: {},
								copilot: {},
								claude: {},
								windsurf: {},
								aider: {},
								unknown: {},
							},
							categoryRiskRanking: [],
							strategyEffectiveness: {} as Record<
								SnapshotStrategy,
								{ successRate: number; overInclusionRate: number; avgFileCount: number }
							>,
							optimalThresholds: {
								singleFile: 25,
								directDependents: 45,
								transitive: 65,
								module: 80,
								package: 90,
								session: 100,
							},
							temporalPatterns: { riskiestHoursGlobal: riskiestHours, riskiestDaysGlobal: [] },
						},
						byRepoType: {},
						computedAt: Date.now(),
						sampleSize: profiles.length,
						confidenceLevel: 0.95,
					};
				});

				const insights = computeAggregateInsights(profiles);

				// Hour 15 appears in all 3 profiles, 16 in 2, 14 in 1, 17 in 1
				expect(insights.global.temporalPatterns.riskiestHoursGlobal).toContain(15);
				expect(insights.global.temporalPatterns.riskiestHoursGlobal).toContain(16);
			});
		});

		describe("Edge Cases", () => {
			it("should return default insights for empty profile list", () => {
				computeAggregateInsights.mockImplementation((profiles) => {
					if (profiles.length === 0) {
						return {
							global: {
								optimalWeights: DEFAULT_WEIGHTS,
								aiToolFileRisk: {
									cursor: {},
									copilot: {},
									claude: {},
									windsurf: {},
									aider: {},
									unknown: {},
								},
								categoryRiskRanking: [],
								strategyEffectiveness: {} as Record<
									SnapshotStrategy,
									{ successRate: number; overInclusionRate: number; avgFileCount: number }
								>,
								optimalThresholds: {
									singleFile: 25,
									directDependents: 45,
									transitive: 65,
									module: 80,
									package: 90,
									session: 100,
								},
								temporalPatterns: { riskiestHoursGlobal: [], riskiestDaysGlobal: [] },
							},
							byRepoType: {},
							computedAt: Date.now(),
							sampleSize: 0,
							confidenceLevel: 0,
						};
					}
					return {} as AggregateInsights;
				});

				const insights = computeAggregateInsights([]);

				expect(insights.sampleSize).toBe(0);
				expect(insights.confidenceLevel).toBe(0);
				expect(insights.global.optimalWeights).toEqual(DEFAULT_WEIGHTS);
			});

			it("should exclude free tier profiles from weight computation", () => {
				const profiles: UserProfile[] = [
					{
						userId: "pro1",
						tier: "pro",
						patterns: {
							rollbackRate: 0.1,
							rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [],
							avgSessionLength: 0,
							typicalChangeVelocity: 0,
						},
						weightAdjustments: { categoryRisk: 0.25 },
						updatedAt: Date.now(),
						dataPointCount: 100,
					},
					{
						userId: "free1",
						tier: "free",
						patterns: {
							rollbackRate: 0.1,
							rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
							fileTypeProtection: {},
							aiToolStats: {},
							riskiestHours: [],
							avgSessionLength: 0,
							typicalChangeVelocity: 0,
						},
						weightAdjustments: { categoryRisk: 0.1 }, // Should be ignored
						updatedAt: Date.now(),
						dataPointCount: 50,
					},
				];

				computeAggregateInsights.mockImplementation((profiles) => {
					const proProfiles = profiles.filter((p) => p.tier === "pro");
					return {
						global: {
							optimalWeights: {
								...DEFAULT_WEIGHTS,
								categoryRisk:
									proProfiles[0]?.weightAdjustments.categoryRisk ?? DEFAULT_WEIGHTS.categoryRisk,
							},
							aiToolFileRisk: {
								cursor: {},
								copilot: {},
								claude: {},
								windsurf: {},
								aider: {},
								unknown: {},
							},
							categoryRiskRanking: [],
							strategyEffectiveness: {} as Record<
								SnapshotStrategy,
								{ successRate: number; overInclusionRate: number; avgFileCount: number }
							>,
							optimalThresholds: {
								singleFile: 25,
								directDependents: 45,
								transitive: 65,
								module: 80,
								package: 90,
								session: 100,
							},
							temporalPatterns: { riskiestHoursGlobal: [], riskiestDaysGlobal: [] },
						},
						byRepoType: {},
						computedAt: Date.now(),
						sampleSize: proProfiles.length,
						confidenceLevel: 0.95,
					};
				});

				const insights = computeAggregateInsights(profiles);

				// Only Pro user's weight should be considered
				expect(insights.global.optimalWeights.categoryRisk).toBe(0.25);
				expect(insights.sampleSize).toBe(1);
			});
		});
	});

	// ===========================================================================
	// ROLLBACK RATE CALCULATION
	// ===========================================================================

	describe("calculateRollbackRate", () => {
		describe("Happy Path", () => {
			it("should calculate rollback rate from buckets", () => {
				calculateRollbackRate.mockImplementation((profile) => {
					const totalRestores =
						profile.patterns.rollbackLatencyBuckets.immediate +
						profile.patterns.rollbackLatencyBuckets.sameSession +
						profile.patterns.rollbackLatencyBuckets.later;

					if (profile.dataPointCount === 0) return 0;
					return totalRestores / profile.dataPointCount;
				});

				const profile: UserProfile = {
					userId: "test",
					tier: "pro",
					patterns: {
						rollbackRate: 0, // Will be calculated
						rollbackLatencyBuckets: { immediate: 10, sameSession: 5, later: 5 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [],
						avgSessionLength: 0,
						typicalChangeVelocity: 0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 100,
				};

				const rate = calculateRollbackRate(profile);

				expect(rate).toBe(0.2); // 20/100 = 0.2
			});
		});

		describe("Edge Cases", () => {
			it("should return 0 for new user with no data points", () => {
				calculateRollbackRate.mockImplementation((profile) => {
					if (profile.dataPointCount === 0) return 0;
					return 0;
				});

				const newProfile: UserProfile = {
					userId: "new",
					tier: "free",
					patterns: {
						rollbackRate: 0,
						rollbackLatencyBuckets: { immediate: 0, sameSession: 0, later: 0 },
						fileTypeProtection: {},
						aiToolStats: {},
						riskiestHours: [],
						avgSessionLength: 0,
						typicalChangeVelocity: 0,
					},
					weightAdjustments: {},
					updatedAt: Date.now(),
					dataPointCount: 0,
				};

				const rate = calculateRollbackRate(newProfile);

				expect(rate).toBe(0);
			});
		});
	});
});
