import { createAssociation } from "../provider/hubspot/index.js";
import type { CreateAssociationParams } from "../types.js";

/**
 * Create an association between a contact and a company
 * @param contactId The contact ID
 * @param companyId The company ID
 * @returns Promise that resolves when association is created
 */
export async function associateContactWithCompany(contactId: string, companyId: string): Promise<void> {
	const params: CreateAssociationParams = {
		fromObjectType: "contact",
		fromObjectId: contactId,
		toObjectType: "company",
		toObjectId: companyId,
		associationType: "contact_to_company",
	};

	return await createAssociation(params);
}

/**
 * Create an association between a contact and a deal
 * @param contactId The contact ID
 * @param dealId The deal ID
 * @returns Promise that resolves when association is created
 */
export async function associateContactWithDeal(contactId: string, dealId: string): Promise<void> {
	const params: CreateAssociationParams = {
		fromObjectType: "contact",
		fromObjectId: contactId,
		toObjectType: "deal",
		toObjectId: dealId,
		associationType: "contact_to_deal",
	};

	return await createAssociation(params);
}

/**
 * Create an association between a company and a deal
 * @param companyId The company ID
 * @param dealId The deal ID
 * @returns Promise that resolves when association is created
 */
export async function associateCompanyWithDeal(companyId: string, dealId: string): Promise<void> {
	const params: CreateAssociationParams = {
		fromObjectType: "company",
		fromObjectId: companyId,
		toObjectType: "deal",
		toObjectId: dealId,
		associationType: "company_to_deal",
	};

	return await createAssociation(params);
}

/**
 * Create a custom association between two objects
 * @param params Association parameters
 * @returns Promise that resolves when association is created
 */
export async function createCustomAssociation(params: CreateAssociationParams): Promise<void> {
	return await createAssociation(params);
}
