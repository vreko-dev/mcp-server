import { Link, Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";

export function OrganizationInvitation({
	url,
	name,
	organizationName,
}: {
	url: string;
	name: string;
	organizationName: string;
}) {
	return (
		<Wrapper>
			<Text>
				Hi {name}, you've been invited to join {organizationName} on SnapBack. Click the button below to accept
				the invitation.
			</Text>

			<PrimaryButton href={url}>Accept Invitation &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link in your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

OrganizationInvitation.PreviewProps = {
	url: "#",
	name: "John Doe",
	organizationName: "Acme Inc",
};

export default OrganizationInvitation;
