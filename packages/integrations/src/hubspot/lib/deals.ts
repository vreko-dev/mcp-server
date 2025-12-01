import { createDeal, getDeal, updateDeal } from "../provider/hubspot/index.js";
import type { CreateDealParams, GetDealParams, HubSpotDeal, UpdateDealParams } from "../types.js";

/**
 * Create a new deal in HubSpot
 * @param params Deal creation parameters
 * @returns Created deal
 */
export async function createHubSpotDeal(params: CreateDealParams): Promise<HubSpotDeal> {
	return await createDeal(params);
}

/**
 * Update an existing deal in HubSpot
 * @param params Deal update parameters
 * @returns Updated deal
 */
export async function updateHubSpotDeal(params: UpdateDealParams): Promise<HubSpotDeal> {
	return await updateDeal(params);
}

/**
 * Get a deal by ID from HubSpot
 * @param params Deal retrieval parameters
 * @returns Deal details
 */
export async function getHubSpotDeal(params: GetDealParams): Promise<HubSpotDeal> {
	return await getDeal(params);
}
