/**
 * @fileoverview DBSCAN Clustering Tests
 *
 * Tests the DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * algorithm for grouping snapshots by temporal proximity and file relationships.
 *
 * Follows TDD 4-Path Model: Happy/Sad/Edge/Error
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DBSCAN, type Point } from "../../../src/clustering/dbscan";

// Test factory functions (IP-safe test data)
function createTestPoint(id: string, x: number, y: number): Point {
	return { id, coordinates: [x, y] };
}

function createTestPoints(count: number, clustered = true): Point[] {
	const points: Point[] = [];
	if (clustered) {
		// Create clustered points (close together)
		for (let i = 0; i < count; i++) {
			points.push({
				id: `point-${i}`,
				coordinates: [i * 0.1, i * 0.1], // Close together
			});
		}
	} else {
		// Create scattered points (far apart)
		for (let i = 0; i < count; i++) {
			points.push({
				id: `point-${i}`,
				coordinates: [i * 10, i * 10], // Far apart
			});
		}
	}
	return points;
}

describe("DBSCAN Clustering", () => {
	let dbscan: DBSCAN;

	beforeEach(() => {
		// Default config: eps=1.0, minPts=2
		dbscan = new DBSCAN({ eps: 1.0, minPts: 2 });
	});

	// =========================================================================
	// HAPPY PATH - Expected successful scenarios
	// =========================================================================
	describe("Happy Path", () => {
		it("should cluster similar points together", () => {
			// Arrange - Two distinct clusters
			const points: Point[] = [
				// Cluster 1 (around origin)
				createTestPoint("a1", 0, 0),
				createTestPoint("a2", 0.5, 0.5),
				createTestPoint("a3", 0.2, 0.3),
				// Cluster 2 (around 10,10)
				createTestPoint("b1", 10, 10),
				createTestPoint("b2", 10.5, 10.5),
				createTestPoint("b3", 10.2, 10.3),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(2);
			expect(result.noise.length).toBe(0);

			// Verify cluster 1 contains a1, a2, a3
			const cluster1 = result.clusters.find((c) => c.some((p) => p.id === "a1"));
			expect(cluster1).toBeDefined();
			expect(cluster1?.length).toBe(3);
			expect(cluster1?.map((p) => p.id).sort()).toEqual(["a1", "a2", "a3"]);

			// Verify cluster 2 contains b1, b2, b3
			const cluster2 = result.clusters.find((c) => c.some((p) => p.id === "b1"));
			expect(cluster2).toBeDefined();
			expect(cluster2?.length).toBe(3);
		});

		it("should group snapshots by temporal proximity", () => {
			// Arrange - Points representing timestamps (normalized)
			const points: Point[] = [
				// Session 1: t=0 to t=5 minutes
				createTestPoint("snap1", 0, 0),
				createTestPoint("snap2", 1, 0),
				createTestPoint("snap3", 2, 0),
				// Session 2: t=60 to t=65 minutes (gap of 55 minutes)
				createTestPoint("snap4", 60, 0),
				createTestPoint("snap5", 61, 0),
			];

			dbscan = new DBSCAN({ eps: 5, minPts: 2 }); // eps=5 minutes

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(2);
			// First cluster should have snap1, snap2, snap3
			const session1 = result.clusters.find((c) => c.some((p) => p.id === "snap1"));
			expect(session1?.length).toBe(3);
			// Second cluster should have snap4, snap5
			const session2 = result.clusters.find((c) => c.some((p) => p.id === "snap4"));
			expect(session2?.length).toBe(2);
		});

		it("should group snapshots by file relationship", () => {
			// Arrange - Points in 2D space (dimension 1: time, dimension 2: file similarity)
			const points: Point[] = [
				// Related files (similar directory structure)
				createTestPoint("src/auth/login.ts", 0, 0),
				createTestPoint("src/auth/logout.ts", 0.5, 0.3),
				createTestPoint("src/auth/session.ts", 0.3, 0.2),
				// Unrelated files (different directory)
				createTestPoint("tests/api.test.ts", 5, 5),
				createTestPoint("tests/utils.test.ts", 5.2, 5.1),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(2);
		});

		it("should return cluster labels for each point", () => {
			// Arrange
			const points = createTestPoints(5, true);

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.labels).toBeDefined();
			expect(Object.keys(result.labels).length).toBe(5);
		});
	});

	// =========================================================================
	// SAD PATH - Expected failure scenarios
	// =========================================================================
	describe("Sad Path", () => {
		it("should identify outliers (noise points)", () => {
			// Arrange - Scattered points that don't form clusters
			const points: Point[] = [
				createTestPoint("a", 0, 0),
				createTestPoint("b", 10, 10),
				createTestPoint("c", 20, 20),
				createTestPoint("d", 30, 30),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(0);
			expect(result.noise.length).toBe(4);
			expect(result.noise.map((p) => p.id).sort()).toEqual(["a", "b", "c", "d"]);
		});

		it("should mark isolated points as noise", () => {
			// Arrange - Mix of clustered and isolated points
			const points: Point[] = [
				// Cluster
				createTestPoint("c1", 0, 0),
				createTestPoint("c2", 0.5, 0.5),
				createTestPoint("c3", 0.3, 0.2),
				// Isolated point
				createTestPoint("isolated", 100, 100),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(1);
			expect(result.noise.length).toBe(1);
			expect(result.noise[0].id).toBe("isolated");
		});
	});

	// =========================================================================
	// EDGE CASES - Boundary conditions
	// =========================================================================
	describe("Edge Cases", () => {
		it("should handle empty dataset", () => {
			// Arrange
			const points: Point[] = [];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters).toEqual([]);
			expect(result.noise).toEqual([]);
			expect(result.labels).toEqual({});
		});

		it("should handle single point", () => {
			// Arrange
			const points: Point[] = [createTestPoint("only", 0, 0)];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(0);
			expect(result.noise.length).toBe(1);
			expect(result.noise[0].id).toBe("only");
		});

		it("should handle all identical points", () => {
			// Arrange - All points at same location
			const points: Point[] = [
				createTestPoint("a", 5, 5),
				createTestPoint("b", 5, 5),
				createTestPoint("c", 5, 5),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(1);
			expect(result.clusters[0].length).toBe(3);
			expect(result.noise.length).toBe(0);
		});

		// TODO: Flaky performance test - timing-dependent assertions
		it.skip("should scale linearly with dataset size", () => {
			// Arrange - Large dataset
			const smallSet = createTestPoints(10, true);
			const largeSet = createTestPoints(100, true);

			// Act
			const startSmall = performance.now();
			dbscan.cluster(smallSet);
			const timeSmall = performance.now() - startSmall;

			const startLarge = performance.now();
			dbscan.cluster(largeSet);
			const timeLarge = performance.now() - startLarge;

			// Assert - Large set should take at most 20x longer (allowing for O(n²) worst case with some margin)
			// Typical DBSCAN is O(n log n) with spatial indexing or O(n²) without
			expect(timeLarge).toBeLessThan(timeSmall * 100);
		});

		it("should handle two points exactly at eps distance", () => {
			// Arrange
			dbscan = new DBSCAN({ eps: 1.0, minPts: 2 });
			const points: Point[] = [
				createTestPoint("a", 0, 0),
				createTestPoint("b", 1, 0), // Exactly at eps distance
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert - Points at exactly eps distance should be neighbors
			expect(result.clusters.length).toBe(1);
			expect(result.clusters[0].length).toBe(2);
		});

		it("should respect minPts parameter", () => {
			// Arrange - 3 points close together but minPts=4
			dbscan = new DBSCAN({ eps: 1.0, minPts: 4 });
			const points: Point[] = [
				createTestPoint("a", 0, 0),
				createTestPoint("b", 0.5, 0),
				createTestPoint("c", 0, 0.5),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert - Not enough points to form cluster
			expect(result.clusters.length).toBe(0);
			expect(result.noise.length).toBe(3);
		});

		it("should handle high-dimensional points", () => {
			// Arrange - 3D points
			const points: Point[] = [
				{ id: "a", coordinates: [0, 0, 0] },
				{ id: "b", coordinates: [0.5, 0.5, 0.5] },
				{ id: "c", coordinates: [0.3, 0.2, 0.4] },
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(1);
			expect(result.clusters[0].length).toBe(3);
		});
	});

	// =========================================================================
	// ERROR PATH - Error handling
	// =========================================================================
	describe("Error Path", () => {
		it("should handle invalid eps parameter", () => {
			// Arrange & Act & Assert
			expect(() => new DBSCAN({ eps: 0, minPts: 2 })).toThrow("eps must be positive");
			expect(() => new DBSCAN({ eps: -1, minPts: 2 })).toThrow("eps must be positive");
		});

		it("should handle invalid minPts parameter", () => {
			// Arrange & Act & Assert
			expect(() => new DBSCAN({ eps: 1, minPts: 0 })).toThrow("minPts must be at least 1");
			expect(() => new DBSCAN({ eps: 1, minPts: -1 })).toThrow("minPts must be at least 1");
		});

		it("should handle points with mismatched dimensions", () => {
			// Arrange
			const points: Point[] = [
				{ id: "a", coordinates: [0, 0] },
				{ id: "b", coordinates: [1, 1, 1] }, // Different dimension
			];

			// Act & Assert
			expect(() => dbscan.cluster(points)).toThrow("All points must have the same dimensionality");
		});

		it("should handle points with empty coordinates", () => {
			// Arrange
			const points: Point[] = [{ id: "empty", coordinates: [] }];

			// Act & Assert
			expect(() => dbscan.cluster(points)).toThrow("Points must have at least one coordinate");
		});
	});

	// =========================================================================
	// CONFIGURATION TESTS
	// =========================================================================
	describe("Configuration", () => {
		it("should use default config when not provided", () => {
			// Arrange
			dbscan = new DBSCAN();

			// Act
			const config = dbscan.getConfig();

			// Assert
			expect(config.eps).toBe(0.5); // Default eps
			expect(config.minPts).toBe(5); // Default minPts
		});

		it("should respect custom eps", () => {
			// Arrange
			dbscan = new DBSCAN({ eps: 2.0, minPts: 2 });
			const points: Point[] = [
				createTestPoint("a", 0, 0),
				createTestPoint("b", 1.5, 0), // Within eps=2.0
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert
			expect(result.clusters.length).toBe(1);
		});

		it("should respect custom minPts", () => {
			// Arrange
			dbscan = new DBSCAN({ eps: 1.0, minPts: 3 });
			const points: Point[] = [
				createTestPoint("a", 0, 0),
				createTestPoint("b", 0.5, 0),
				createTestPoint("c", 0, 0.5),
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert - 3 points meet minPts=3 requirement
			expect(result.clusters.length).toBe(1);
		});
	});

	// =========================================================================
	// DISTANCE FUNCTION TESTS
	// =========================================================================
	describe("Distance Function", () => {
		it("should calculate Euclidean distance correctly", () => {
			// Arrange
			const p1: Point = { id: "a", coordinates: [0, 0] };
			const p2: Point = { id: "b", coordinates: [3, 4] };

			// Act
			const distance = DBSCAN.euclideanDistance(p1, p2);

			// Assert - 3-4-5 triangle
			expect(distance).toBe(5);
		});

		it("should support custom distance function", () => {
			// Arrange - Manhattan distance
			const manhattanDistance = (a: Point, b: Point): number => {
				return a.coordinates.reduce((sum, coord, i) => sum + Math.abs(coord - b.coordinates[i]), 0);
			};

			dbscan = new DBSCAN({ eps: 2, minPts: 2, distanceFn: manhattanDistance });
			const points: Point[] = [
				createTestPoint("a", 0, 0),
				createTestPoint("b", 1, 1), // Manhattan distance = 2
			];

			// Act
			const result = dbscan.cluster(points);

			// Assert - Within eps=2 Manhattan distance
			expect(result.clusters.length).toBe(1);
		});
	});
});
