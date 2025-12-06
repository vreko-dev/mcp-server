import { Client } from "@hubspot/api-client";
import { logger } from "@snapback/infrastructure";
import type {
	CreateAssociation,
	CreateCompany,
	CreateContact,
	CreateDeal,
	GetCompany,
	GetContact,
	GetDeal,
	SearchObjects,
	UpdateCompany,
	UpdateContact,
	UpdateDeal,
} from "../../types";

let hubspotClient: Client | null = null;

/**
 * Get the HubSpot client instance with caching
 * @returns HubSpot client instance
 */
export function getHubSpotClient(): Client {
	if (hubspotClient) {
		return hubspotClient;
	}

	const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
	const apiKey = process.env.HUBSPOT_API_KEY;

	if (!accessToken && !apiKey) {
		throw new Error(
			"Missing HubSpot authentication credentials. Please provide either HUBSPOT_ACCESS_TOKEN or HUBSPOT_API_KEY environment variable.",
		);
	}

	const config: any = {};

	if (accessToken) {
		config.accessToken = accessToken;
	}

	if (apiKey) {
		config.developerApiKey = apiKey;
	}

	hubspotClient = new Client(config);
	logger.info("HubSpot client initialized successfully");

	return hubspotClient;
}

/**
 * Create a new contact in HubSpot
 * @param params Contact properties
 * @returns Created contact
 */
export const createContact: CreateContact = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Creating contact in HubSpot", {
			email: params.properties.email,
		});

		// Filter out undefined properties
		const properties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(params.properties)) {
			if (value !== undefined && value !== null) {
				properties[key] = value.toString();
			}
		}

		const response = await client.crm.contacts.basicApi.create({
			properties,
		});

		logger.info("Contact created successfully", {
			id: response.id,
			email: params.properties.email,
		});

		const contactProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				contactProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...contactProperties,
		};
	} catch (error) {
		logger.error("Failed to create contact", {
			error,
			email: params.properties.email,
		});
		throw error;
	}
};

/**
 * Update an existing contact in HubSpot
 * @param params Contact ID and properties to update
 * @returns Updated contact
 */
export const updateContact: UpdateContact = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Updating contact in HubSpot", { id: params.id });

		// Filter out undefined properties
		const properties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(params.properties)) {
			if (value !== undefined && value !== null) {
				properties[key] = value.toString();
			}
		}

		const response = await client.crm.contacts.basicApi.update(params.id, {
			properties,
		});

		logger.info("Contact updated successfully", { id: response.id });

		const contactProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				contactProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...contactProperties,
		};
	} catch (error) {
		logger.error("Failed to update contact", { error, id: params.id });
		throw error;
	}
};

/**
 * Get a contact by ID from HubSpot
 * @param params Contact ID and optional properties to retrieve
 * @returns Contact details
 */
export const getContact: GetContact = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Getting contact from HubSpot", { id: params.id });

		const response = await client.crm.contacts.basicApi.getById(params.id, params.properties);

		logger.info("Contact retrieved successfully", { id: response.id });

		const contactProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				contactProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...contactProperties,
		};
	} catch (error) {
		logger.error("Failed to get contact", { error, id: params.id });
		throw error;
	}
};

/**
 * Create a new company in HubSpot
 * @param params Company properties
 * @returns Created company
 */
export const createCompany: CreateCompany = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Creating company in HubSpot", {
			name: params.properties.name,
		});

		// Filter out undefined properties
		const properties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(params.properties)) {
			if (value !== undefined && value !== null) {
				properties[key] = value.toString();
			}
		}

		const response = await client.crm.companies.basicApi.create({
			properties,
		});

		logger.info("Company created successfully", {
			id: response.id,
			name: params.properties.name,
		});

		const companyProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				companyProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...companyProperties,
		};
	} catch (error) {
		logger.error("Failed to create company", {
			error,
			name: params.properties.name,
		});
		throw error;
	}
};

/**
 * Update an existing company in HubSpot
 * @param params Company ID and properties to update
 * @returns Updated company
 */
export const updateCompany: UpdateCompany = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Updating company in HubSpot", { id: params.id });

		// Filter out undefined properties
		const properties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(params.properties)) {
			if (value !== undefined && value !== null) {
				properties[key] = value.toString();
			}
		}

		const response = await client.crm.companies.basicApi.update(params.id, {
			properties,
		});

		logger.info("Company updated successfully", { id: response.id });

		const companyProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				companyProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...companyProperties,
		};
	} catch (error) {
		logger.error("Failed to update company", { error, id: params.id });
		throw error;
	}
};

/**
 * Get a company by ID from HubSpot
 * @param params Company ID and optional properties to retrieve
 * @returns Company details
 */
export const getCompany: GetCompany = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Getting company from HubSpot", { id: params.id });

		const response = await client.crm.companies.basicApi.getById(params.id, params.properties);

		logger.info("Company retrieved successfully", { id: response.id });

		const companyProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				companyProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...companyProperties,
		};
	} catch (error) {
		logger.error("Failed to get company", { error, id: params.id });
		throw error;
	}
};

/**
 * Create a new deal in HubSpot
 * @param params Deal properties and optional associations
 * @returns Created deal
 */
export const createDeal: CreateDeal = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Creating deal in HubSpot", {
			name: params.properties.dealname,
		});

		// Filter out undefined properties
		const properties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(params.properties)) {
			if (value !== undefined && value !== null) {
				properties[key] = value.toString();
			}
		}

		const response = await client.crm.deals.basicApi.create({
			properties,
		});

		// Handle associations if provided
		if (params.associations && params.associations.length > 0) {
			for (const association of params.associations) {
				await client.crm.associations.v4.basicApi.create(
					"deal",
					response.id,
					association.toType,
					association.toId,
					[
						{
							// @ts-expect-error - Type definitions may not match actual API
							associationCategory: "HUBSPOT_DEFINED",
							// @ts-expect-error - Type definitions may not match actual API
							associationTypeId:
								Number.parseInt(association.associationType, 10) || association.associationType,
						},
					],
				);
			}
		}

		logger.info("Deal created successfully", {
			id: response.id,
			name: params.properties.dealname,
		});

		const dealProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				dealProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...dealProperties,
		};
	} catch (error) {
		logger.error("Failed to create deal", {
			error,
			name: params.properties.dealname,
		});
		throw error;
	}
};

/**
 * Update an existing deal in HubSpot
 * @param params Deal ID and properties to update
 * @returns Updated deal
 */
export const updateDeal: UpdateDeal = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Updating deal in HubSpot", { id: params.id });

		// Filter out undefined properties
		const properties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(params.properties)) {
			if (value !== undefined && value !== null) {
				properties[key] = value.toString();
			}
		}

		const response = await client.crm.deals.basicApi.update(params.id, {
			properties,
		});

		logger.info("Deal updated successfully", { id: response.id });

		const dealProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				dealProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...dealProperties,
		};
	} catch (error) {
		logger.error("Failed to update deal", { error, id: params.id });
		throw error;
	}
};

/**
 * Get a deal by ID from HubSpot
 * @param params Deal ID and optional properties to retrieve
 * @returns Deal details
 */
export const getDeal: GetDeal = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Getting deal from HubSpot", { id: params.id });

		const response = await client.crm.deals.basicApi.getById(params.id, params.properties);

		logger.info("Deal retrieved successfully", { id: response.id });

		const dealProperties: { [key: string]: string } = {};
		for (const [key, value] of Object.entries(response.properties)) {
			if (value !== undefined && value !== null) {
				dealProperties[key] = value.toString();
			}
		}

		return {
			id: response.id,
			...dealProperties,
		};
	} catch (error) {
		logger.error("Failed to get deal", { error, id: params.id });
		throw error;
	}
};

/**
 * Search for objects in HubSpot
 * @param params Search parameters
 * @returns Search results
 */
export const searchObjects: SearchObjects = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Searching objects in HubSpot", {
			objectType: params.objectType,
		});

		const response = await client.crm.objects.searchApi.doSearch(params.objectType, {
			properties: params.properties,
			limit: params.limit,
			after: params.after?.toString(),
		});

		logger.info("Objects search completed successfully", {
			objectType: params.objectType,
			resultsCount: response.results?.length || 0,
		});

		return response;
	} catch (error) {
		logger.error("Failed to search objects", {
			error,
			objectType: params.objectType,
		});
		throw error;
	}
};

/**
 * Create an association between two objects in HubSpot
 * @param params Association parameters
 */
export const createAssociation: CreateAssociation = async (params) => {
	const client = getHubSpotClient();

	try {
		logger.info("Creating association in HubSpot", {
			fromType: params.fromObjectType,
			fromId: params.fromObjectId,
			toType: params.toObjectType,
			toId: params.toObjectId,
		});

		await client.crm.associations.v4.basicApi.create(
			params.fromObjectType,
			params.fromObjectId,
			params.toObjectType,
			params.toObjectId,
			[
				{
					// @ts-expect-error - Type definitions may not match actual API
					associationCategory: "HUBSPOT_DEFINED",
					// @ts-expect-error - Type definitions may not match actual API
					associationTypeId: Number.parseInt(params.associationType, 10) || params.associationType,
				},
			],
		);

		logger.info("Association created successfully", {
			fromType: params.fromObjectType,
			fromId: params.fromObjectId,
			toType: params.toObjectType,
			toId: params.toObjectId,
		});
	} catch (error) {
		logger.error("Failed to create association", { error });
		throw error;
	}
};
