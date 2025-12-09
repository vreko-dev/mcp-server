/**
 * @fileoverview DBSCAN Clustering Implementation
 *
 * Density-Based Spatial Clustering of Applications with Noise (DBSCAN)
 * for grouping snapshots by temporal proximity and file relationships.
 *
 * @see https://en.wikipedia.org/wiki/DBSCAN
 */

/**
 * Represents a point in n-dimensional space
 */
export interface Point {
	/** Unique identifier for the point */
	id: string;
	/** Coordinates in n-dimensional space */
	coordinates: number[];
}

/**
 * Result of the DBSCAN clustering algorithm
 */
export interface ClusterResult {
	/** Array of clusters, each cluster is an array of points */
	clusters: Point[][];
	/** Points classified as noise (not belonging to any cluster) */
	noise: Point[];
	/** Map of point ID to cluster label (-1 for noise) */
	labels: Record<string, number>;
}

/**
 * Configuration for DBSCAN algorithm
 */
export interface DBSCANConfig {
	/** Maximum distance between two points for one to be considered in the neighborhood of the other */
	eps: number;
	/** Minimum number of points required to form a dense region (core point) */
	minPts: number;
	/** Custom distance function (defaults to Euclidean distance) */
	distanceFn?: (a: Point, b: Point) => number;
}

/** Marker for unvisited points */
const UNVISITED = -2;
/** Marker for noise points */
const NOISE = -1;

/**
 * DBSCAN Clustering Algorithm
 *
 * Groups points based on density connectivity. Points are classified as:
 * - Core points: Have at least minPts neighbors within eps distance
 * - Border points: Within eps distance of a core point but not core themselves
 * - Noise points: Not within eps distance of any core point
 *
 * @example
 * ```typescript
 * const dbscan = new DBSCAN({ eps: 1.0, minPts: 2 });
 * const result = dbscan.cluster(points);
 * console.log(`Found ${result.clusters.length} clusters and ${result.noise.length} noise points`);
 * ```
 */
export class DBSCAN {
	private readonly eps: number;
	private readonly minPts: number;
	private readonly distanceFn: (a: Point, b: Point) => number;

	/**
	 * Default configuration values
	 */
	private static readonly DEFAULT_EPS = 0.5;
	private static readonly DEFAULT_MIN_PTS = 5;

	/**
	 * Creates a new DBSCAN instance
	 *
	 * @param config - Configuration options
	 * @throws {Error} If eps is not positive
	 * @throws {Error} If minPts is less than 1
	 */
	constructor(config: Partial<DBSCANConfig> = {}) {
		this.eps = config.eps ?? DBSCAN.DEFAULT_EPS;
		this.minPts = config.minPts ?? DBSCAN.DEFAULT_MIN_PTS;
		this.distanceFn = config.distanceFn ?? DBSCAN.euclideanDistance;

		// Validate configuration
		if (this.eps <= 0) {
			throw new Error("eps must be positive");
		}
		if (this.minPts < 1) {
			throw new Error("minPts must be at least 1");
		}
	}

	/**
	 * Performs DBSCAN clustering on the given points
	 *
	 * @param points - Array of points to cluster
	 * @returns ClusterResult containing clusters, noise, and labels
	 * @throws {Error} If points have inconsistent dimensions
	 * @throws {Error} If any point has empty coordinates
	 */
	cluster(points: Point[]): ClusterResult {
		// Handle empty dataset
		if (points.length === 0) {
			return {
				clusters: [],
				noise: [],
				labels: {},
			};
		}

		// Validate points
		this.validatePoints(points);

		// Initialize labels for all points as unvisited
		const labels: Record<string, number> = {};
		for (const point of points) {
			labels[point.id] = UNVISITED;
		}

		const clusters: Point[][] = [];
		let clusterIndex = 0;

		// Process each point
		for (const point of points) {
			// Skip if already processed
			if (labels[point.id] !== UNVISITED) {
				continue;
			}

			// Find neighbors
			const neighbors = this.regionQuery(points, point);

			// Check if core point (has enough neighbors)
			if (neighbors.length < this.minPts) {
				// Mark as noise (may be changed later if border point)
				labels[point.id] = NOISE;
			} else {
				// Start a new cluster
				const cluster = this.expandCluster(points, point, neighbors, labels, clusterIndex);
				clusters.push(cluster);
				clusterIndex++;
			}
		}

		// Collect noise points
		const noise: Point[] = [];
		for (const point of points) {
			if (labels[point.id] === NOISE) {
				noise.push(point);
			}
		}

		return {
			clusters,
			noise,
			labels,
		};
	}

	/**
	 * Expands a cluster from a core point
	 *
	 * @param points - All points
	 * @param corePoint - The core point to expand from
	 * @param neighbors - Initial neighbors of the core point
	 * @param labels - Label map (modified in place)
	 * @param clusterIndex - Current cluster index
	 * @returns Array of points in the cluster
	 */
	private expandCluster(
		points: Point[],
		corePoint: Point,
		neighbors: Point[],
		labels: Record<string, number>,
		clusterIndex: number,
	): Point[] {
		const cluster: Point[] = [corePoint];
		labels[corePoint.id] = clusterIndex;

		// Use a queue for breadth-first expansion
		const queue = [...neighbors];
		const processed = new Set<string>([corePoint.id]);

		while (queue.length > 0) {
			const currentPoint = queue.shift()!;

			// Skip if already in cluster
			if (processed.has(currentPoint.id)) {
				continue;
			}
			processed.add(currentPoint.id);

			const previousLabel = labels[currentPoint.id];

			// If previously noise, add to cluster as border point
			if (previousLabel === NOISE) {
				labels[currentPoint.id] = clusterIndex;
				cluster.push(currentPoint);
				continue;
			}

			// If unvisited, process
			if (previousLabel === UNVISITED) {
				labels[currentPoint.id] = clusterIndex;
				cluster.push(currentPoint);

				// Find neighbors of this point
				const currentNeighbors = this.regionQuery(points, currentPoint);

				// If core point, add its neighbors to the queue
				if (currentNeighbors.length >= this.minPts) {
					for (const neighbor of currentNeighbors) {
						if (!processed.has(neighbor.id)) {
							queue.push(neighbor);
						}
					}
				}
			}
		}

		return cluster;
	}

	/**
	 * Finds all points within eps distance of a given point
	 *
	 * @param points - All points to search
	 * @param centerPoint - The center point
	 * @returns Array of points within eps distance (including the center point)
	 */
	private regionQuery(points: Point[], centerPoint: Point): Point[] {
		const neighbors: Point[] = [];

		for (const point of points) {
			const distance = this.distanceFn(centerPoint, point);
			if (distance <= this.eps) {
				neighbors.push(point);
			}
		}

		return neighbors;
	}

	/**
	 * Validates that all points have consistent dimensions
	 *
	 * @param points - Points to validate
	 * @throws {Error} If points have empty coordinates
	 * @throws {Error} If points have inconsistent dimensions
	 */
	private validatePoints(points: Point[]): void {
		if (points.length === 0) {
			return;
		}

		// Check first point for empty coordinates
		const firstDim = points[0].coordinates.length;
		if (firstDim === 0) {
			throw new Error("Points must have at least one coordinate");
		}

		// Check all points have same dimension
		for (let i = 1; i < points.length; i++) {
			if (points[i].coordinates.length === 0) {
				throw new Error("Points must have at least one coordinate");
			}
			if (points[i].coordinates.length !== firstDim) {
				throw new Error("All points must have the same dimensionality");
			}
		}
	}

	/**
	 * Returns the current configuration
	 *
	 * @returns Current eps and minPts values
	 */
	getConfig(): { eps: number; minPts: number } {
		return {
			eps: this.eps,
			minPts: this.minPts,
		};
	}

	/**
	 * Calculates Euclidean distance between two points
	 *
	 * @param a - First point
	 * @param b - Second point
	 * @returns Euclidean distance
	 */
	static euclideanDistance(a: Point, b: Point): number {
		let sum = 0;
		for (let i = 0; i < a.coordinates.length; i++) {
			const diff = a.coordinates[i] - b.coordinates[i];
			sum += diff * diff;
		}
		return Math.sqrt(sum);
	}
}
