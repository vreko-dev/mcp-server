import { OrganizationForm } from "@saas/admin/component/organizations/OrganizationForm";
import { getAdminPath } from "@saas/admin/lib/links";
import { Button } from "@ui/components/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

// STUB: @snapback/auth - requires backend API
// This page requires backend authentication to fetch organization data

export default async function OrganizationFormPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ backTo?: string }>;
}) {
	const { id } = await params;
	const { backTo } = await searchParams;

	return (
		<div>
			<div className="mb-2 flex justify-start">
				<Button variant="link" size="sm" asChild className="px-0">
					<Link href={backTo ?? getAdminPath("/organizations")}>
						<ArrowLeftIcon className="mr-1.5 size-4" />
						Back to Organizations
					</Link>
				</Button>
			</div>
			<OrganizationForm organizationId={id} />
		</div>
	);
}
