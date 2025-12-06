import { Link, Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";

export function NewsletterSignup({ url, name }: { url: string; name: string }) {
	return (
		<Wrapper>
			<Text>Hi {name}, thanks for subscribing to our newsletter! Click the button below to confirm.</Text>

			<PrimaryButton href={url}>Confirm Subscription &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link in your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

NewsletterSignup.PreviewProps = {
	url: "#",
	name: "John Doe",
};

export default NewsletterSignup;
