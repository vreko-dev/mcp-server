import { Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
export function NewsletterSignup({ url }) {
	return (
		<Wrapper>
			<Text>Thanks for signing up for our newsletter! Click the button below to confirm your subscription.</Text>

			<PrimaryButton href={url}>Confirm Subscription &rarr;</PrimaryButton>
		</Wrapper>
	);
}
NewsletterSignup.PreviewProps = {
	url: "#",
};
export default NewsletterSignup;
