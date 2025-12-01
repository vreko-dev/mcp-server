import type { Client } from "@hubspot/api-client";

// HubSpot Object Types
export type HubSpotObjectType = "contacts" | "companies" | "deals" | "tickets" | string;

// HubSpot Contact Properties
export interface HubSpotContact {
	id?: string;
	email?: string;
	firstname?: string;
	lastname?: string;
	phone?: string;
	company?: string;
	website?: string;
	lifecyclestage?: string;
	createdate?: string;
	lastmodifieddate?: string;
	[key: string]: string | undefined;
}

// HubSpot Company Properties
export interface HubSpotCompany {
	id?: string;
	name?: string;
	domain?: string;
	phone?: string;
	address?: string;
	city?: string;
	state?: string;
	zip?: string;
	country?: string;
	numberofemployees?: string;
	annualrevenue?: string;
	industry?: string;
	createdate?: string;
	lastmodifieddate?: string;
	[key: string]: string | undefined;
}

// HubSpot Deal Properties
export interface HubSpotDeal {
	id?: string;
	dealname?: string;
	dealstage?: string;
	pipeline?: string;
	closedate?: string;
	amount?: string;
	dealtype?: string;
	createdate?: string;
	lastmodifieddate?: string;
	[key: string]: string | undefined;
}

// Function parameter types
export interface CreateContactParams {
	properties: Partial<HubSpotContact>;
}

export interface UpdateContactParams {
	id: string;
	properties: Partial<HubSpotContact>;
}

export interface GetContactParams {
	id: string;
	properties?: string[];
}

export interface CreateCompanyParams {
	properties: Partial<HubSpotCompany>;
}

export interface UpdateCompanyParams {
	id: string;
	properties: Partial<HubSpotCompany>;
}

export interface GetCompanyParams {
	id: string;
	properties?: string[];
}

export interface CreateDealParams {
	properties: Partial<HubSpotDeal>;
	associations?: Array<{
		toId: string;
		toType: HubSpotObjectType;
		associationType: string;
	}>;
}

export interface UpdateDealParams {
	id: string;
	properties: Partial<HubSpotDeal>;
}

export interface GetDealParams {
	id: string;
	properties?: string[];
}

export interface SearchObjectsParams {
	objectType: HubSpotObjectType;
	filterGroups?: Array<{
		filters: Array<{
			propertyName: string;
			operator: string;
			value: string;
		}>;
	}>;
	properties?: string[];
	limit?: number;
	after?: number;
}

export interface CreateAssociationParams {
	fromObjectType: HubSpotObjectType;
	fromObjectId: string;
	toObjectType: HubSpotObjectType;
	toObjectId: string;
	associationType: string;
}

// Function types
export type CreateContact = (params: CreateContactParams) => Promise<HubSpotContact>;
export type UpdateContact = (params: UpdateContactParams) => Promise<HubSpotContact>;
export type GetContact = (params: GetContactParams) => Promise<HubSpotContact>;
export type CreateCompany = (params: CreateCompanyParams) => Promise<HubSpotCompany>;
export type UpdateCompany = (params: UpdateCompanyParams) => Promise<HubSpotCompany>;
export type GetCompany = (params: GetCompanyParams) => Promise<HubSpotCompany>;
export type CreateDeal = (params: CreateDealParams) => Promise<HubSpotDeal>;
export type UpdateDeal = (params: UpdateDealParams) => Promise<HubSpotDeal>;
export type GetDeal = (params: GetDealParams) => Promise<HubSpotDeal>;
export type SearchObjects = (params: SearchObjectsParams) => Promise<any>;
export type CreateAssociation = (params: CreateAssociationParams) => Promise<void>;
export type WebhookHandler = (req: Request) => Promise<Response>;

// HubSpot Client
export interface HubSpotClient {
	client: Client;
}
