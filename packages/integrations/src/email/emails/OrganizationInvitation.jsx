import { Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
export function OrganizationInvitation({ organizationName, url }) {
	return (
		<Wrapper>
			<Text>
				You've been invited to join {organizationName} on SnapBack. Click the button below to accept the
				invitation.
			</Text>

			<PrimaryButton href={url}>Accept Invitation &rarr;</PrimaryButton>
		</Wrapper>
	);
}
OrganizationInvitation.PreviewProps = {
	organizationName: "Acme Inc",
	url: "#",
};
export default OrganizationInvitation;
