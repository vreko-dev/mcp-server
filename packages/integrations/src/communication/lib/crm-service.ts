import { logger } from "@snapback/infrastructure";
import { createContact as createHubSpotContact } from "../../hubspot/index";
import type { HubSpotContact } from "../../hubspot/types";

export interface CRMContact {
	id: string;
	email?: string;
	firstname?: string;
	lastname?: string;
	[key: string]: string | undefined;
}

export async function createContact(contactData: Partial<HubSpotContact>): Promise<CRMContact> {
	try {
		logger.info("Creating contact in CRM", { email: contactData.email });

		const hubspotContact = await createHubSpotContact({
			properties: contactData,
		});

		logger.info("Contact created successfully", {
			contactId: hubspotContact.id,
		});

		return {
			id: hubspotContact.id || "",
			email: hubspotContact.email,
			firstname: hubspotContact.firstname,
			lastname: hubspotContact.lastname,
		};
	} catch (error) {
		logger.error("Failed to create contact in CRM", {
			error,
			email: contactData.email,
		});
		throw error;
	}
}
