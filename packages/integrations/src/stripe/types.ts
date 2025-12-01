export interface CreateCheckoutLinkOptions {
	type: "subscription" | "one-time";
	productId: string;
	redirectUrl?: string;
	customerId?: string;
	organizationId?: string;
	userId?: string;
	trialPeriodDays?: number;
	seats?: number;
	email?: string;
}

export type CreateCheckoutLink = (options: CreateCheckoutLinkOptions) => Promise<string | null>;

export interface CreateCustomerPortalLinkOptions {
	customerId: string;
	redirectUrl?: string;
}

export type CreateCustomerPortalLink = (options: CreateCustomerPortalLinkOptions) => Promise<string | null>;

export interface SetSubscriptionSeatsOptions {
	id: string;
	seats: number;
}

export type SetSubscriptionSeats = (options: SetSubscriptionSeatsOptions) => Promise<void>;

export type CancelSubscription = (id: string) => Promise<void>;

export type WebhookHandler = (req: Request) => Promise<Response>;
