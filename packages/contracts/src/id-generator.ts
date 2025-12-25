import { nanoid } from "nanoid";

/**
 * Generate a unique ID with optional prefix
 * @param prefix Optional prefix for the ID (e.g., 'user', 'session')
 * @returns Unique ID string
 */
export function generateId(prefix?: string): string {
	const id = nanoid();
	return prefix ? `${prefix}-${id}` : id;
}

/**
 * Slugify a description for use in snapshot IDs
 * Converts "Before fixing auth flow" to "before-fixing-auth-flow"
 */
function slugify(description: string, maxLength = 30): string {
	return description
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric
		.replace(/\s+/g, "-") // Spaces to hyphens
		.replace(/-+/g, "-") // Collapse hyphens
		.replace(/^-|-$/g, "") // Trim hyphens
		.slice(0, maxLength);
}

/**
 * Generate a snapshot ID in the standard format
 * Format with description: snapshot-<slug>-<timestamp>-<random>
 * Format without: snapshot-<timestamp>-<random>
 * @param description Optional human-readable description
 * @returns Snapshot ID string
 */
export function generateSnapshotId(description?: string): string {
	if (description && description.length > 0) {
		const slug = slugify(description);
		if (slug.length > 0) {
			return `snapshot-${slug}-${Date.now()}-${nanoid(9)}`;
		}
	}
	return `snapshot-${Date.now()}-${nanoid(9)}`;
}
