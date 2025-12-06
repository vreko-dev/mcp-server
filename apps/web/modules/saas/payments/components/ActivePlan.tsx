"use client";

import { usePlanData } from "@saas/payments/hooks/plan-data";
import { usePurchases } from "@saas/payments/hooks/purchases";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { BadgeCheckIcon, CheckIcon } from "lucide-react";
import { CustomerPortalButton } from "../../settings/components/CustomerPortalButton";
import { SubscriptionStatusBadge } from "../../settings/components/SubscriptionStatusBadge";

export function ActivePlan({ organizationId }: { organizationId?: string; seats?: number }) {
	const { planData } = usePlanData();
	const { activePlan } = usePurchases(organizationId);

	if (!activePlan) {
		return null;
	}

	const activePlanData = planData[activePlan.id as keyof typeof planData];

	if (!activePlanData) {
		return null;
	}

	const price = "price" in activePlan ? activePlan.price : null;

	return (
		<SettingsItem title="Active Plan">
			<div className="rounded-lg border p-4">
				<div className="">
					<div className="flex items-center gap-2">
						<BadgeCheckIcon className="size-6 text-primary" />
						<h4 className="font-bold text-lg text-primary">
							<span>{activePlanData.title}</span>
						</h4>
						{activePlan.status && <SubscriptionStatusBadge status={activePlan.status} />}
					</div>

					{!!activePlanData.features?.length && (
						<ul className="mt-2 grid list-none gap-2 text-sm">
							{activePlanData.features.map((feature, key) => (
								<li key={key} className="flex items-center justify-start">
									<CheckIcon className="mr-2 size-4 text-primary" />
									<span>{feature}</span>
								</li>
							))}
						</ul>
					)}

					{price ? (
						<strong
							className="mt-2 block font-medium text-2xl lg:text-3xl"
							data-test="price-table-plan-price"
						>
							{new Intl.NumberFormat("en-US", {
								style: "currency",
								currency: (price as any).currency,
							}).format((price as any).amount)}
							{typeof price === "object" && price !== null && "interval" in price ? (
								<span className="font-normal text-xs opacity-60">
									{" / "}
									{(price as any).interval === "month"
										? `month${((price as any).intervalCount ?? 1) > 1 ? "s" : ""}`
										: `year${((price as any).intervalCount ?? 1) > 1 ? "s" : ""}`}
								</span>
							) : null}
							{organizationId &&
							typeof price === "object" &&
							price !== null &&
							"seatBased" in price &&
							(price as any).seatBased ? (
								<span className="font-normal text-xs opacity-60">
									{" / "}
									per seat
								</span>
							) : null}
						</strong>
					) : null}
				</div>

				{typeof activePlan === "object" &&
				activePlan !== null &&
				"purchaseId" in activePlan &&
				(activePlan as any).purchaseId ? (
					<div className="mt-4 flex justify-end">
						<div className="flex w-full flex-col flex-wrap gap-2 md:flex-row">
							<CustomerPortalButton purchaseId={(activePlan as any).purchaseId} />
						</div>
					</div>
				) : null}
			</div>
		</SettingsItem>
	);
}
