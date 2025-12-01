import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { MailCheckIcon } from "lucide-react";

export function OrganizationInvitationAlert({
	className,
}: {
	className?: string;
}) {
	return (
		<Alert variant="primary" className={className}>
			<MailCheckIcon />
			<AlertTitle>Pending Invitation</AlertTitle>
			<AlertDescription>
				You have been invited to join an organization. Check your email for
				details.
			</AlertDescription>
		</Alert>
	);
}
