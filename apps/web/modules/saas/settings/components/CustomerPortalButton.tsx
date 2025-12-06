"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { CreditCardIcon } from "lucide-react";
import { toast } from "sonner";

export function CustomerPortalButton({ purchaseId }: { purchaseId: string }) {
	// TODO: Re-enable when payments API is available
	const createPortalLinkMutation = useMutation({
		mutationFn: async (_variables: any) => ({ customerPortalLink: "" }),
	});

	const createCustomerPortal = async () => {
		try {
			const { customerPortalLink } = await createPortalLinkMutation.mutateAsync({
				purchaseId,
				redirectUrl: window.location.href,
			});

			window.location.href = customerPortalLink;
		} catch {
			toast.error("Failed to open customer portal");
		}
	};

	return (
		<Button
			variant="light"
			size="sm"
			onClick={() => createCustomerPortal()}
			loading={createPortalLinkMutation.isPending}
		>
			<CreditCardIcon className="mr-2 size-4" />
			Manage Billing
		</Button>
	);
}
