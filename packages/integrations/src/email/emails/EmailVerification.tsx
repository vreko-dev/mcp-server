import { Link, Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";

export function EmailVerification({ url, name }: { url: string; name: string }) {
	return (
		<Wrapper>
			<Text>Hi {name}, please verify your email address by clicking the button below.</Text>

			<PrimaryButton href={url}>Confirm Email &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link in your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

EmailVerification.PreviewProps = {
	url: "#",
	name: "John Doe",
};

export default EmailVerification;
