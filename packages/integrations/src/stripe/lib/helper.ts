// @ts-expect-error - Config types should be available after build
import { type Config, config } from "@snapback/config";
import type { PurchaseSchema } from "@snapback/platform/db/zod";
import type { z } from "zod";

const plans: Config["payments"]["plans"] = config.payments.plans as unknown as Config["payments"]["plans"];

type PlanId = keyof typeof config.payments.plans;
type PurchaseWithoutTimestamps = Omit<z.infer<typeof PurchaseSchema>, "createdAt" | "updatedAt">;

function getActivePlanFromPurchases(purchases?: PurchaseWithoutTimestamps[]) {
	const subscriptionPurchase = purchases?.find((purchase) => purchase.type === "SUBSCRIPTION");

	if (subscriptionPurchase) {
		const planEntry = Object.entries(plans).find(([_key, plan]: [string, any]) =>
			(plan.prices as Array<any>)?.some(
				(price: { productId: string }) => price.productId === subscriptionPurchase.productId,
			),
		);

		return {
			id: planEntry?.[0] as PlanId | undefined,
			price: (planEntry?.[1] as any)?.prices?.find(
				(price: { productId: string }) => price.productId === subscriptionPurchase.productId,
			),
			status: subscriptionPurchase.status,
			purchaseId: subscriptionPurchase.id,
		};
	}

	const oneTimePurchase = purchases?.find((purchase) => purchase.type === "ONE_TIME");

	if (oneTimePurchase) {
		const planEntry = Object.entries(plans).find(([_key, plan]: [string, any]) =>
			(plan.prices as Array<any>)?.some(
				(price: { productId: string }) => price.productId === oneTimePurchase.productId,
			),
		);

		return {
			id: planEntry?.[0] as PlanId | undefined,
			price: (planEntry?.[1] as any)?.prices?.find(
				(price: { productId: string }) => price.productId === oneTimePurchase.productId,
			),
			status: "active",
			purchaseId: oneTimePurchase.id,
		};
	}

	const freePlan = Object.entries(plans).find(([_key, plan]: [string, any]) => (plan as any).isFree);

	return freePlan
		? {
				id: freePlan[0] as PlanId,
				status: "active",
			}
		: null;
}

export function createPurchasesHelper(purchases: PurchaseWithoutTimestamps[]) {
	const activePlan = getActivePlanFromPurchases(purchases);

	const hasSubscription = (planIds?: PlanId[] | PlanId) => {
		return !!activePlan && (Array.isArray(planIds) ? planIds.includes(activePlan.id!) : planIds === activePlan.id);
	};

	const hasPurchase = (planId: PlanId) => {
		return !!purchases?.some((purchase) =>
			(Object.entries(plans).find(([id]) => id === planId)?.[1] as any)?.prices?.some(
				(price: { productId: string }) => price.productId === purchase.productId,
			),
		);
	};

	return { activePlan, hasSubscription, hasPurchase };
}
