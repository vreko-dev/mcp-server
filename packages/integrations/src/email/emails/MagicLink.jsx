import { Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
export function MagicLink({ url }) {
	return (
		<Wrapper>
			<Text>Click the button below to sign in to your account.</Text>

			<PrimaryButton href={url}>Sign In &rarr;</PrimaryButton>
		</Wrapper>
	);
}
MagicLink.PreviewProps = {
	url: "#",
};
export default MagicLink;
