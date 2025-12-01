import { db as drizzle } from "@snapback/platform";
/**
 * Type guard to check if drizzle is available
 */
export const isDatabaseAvailable = (): boolean => {
	return drizzle !== null && drizzle !== undefined;
};
