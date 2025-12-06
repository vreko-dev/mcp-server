import { Link, Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";

export function MagicLink({ url, name }: { url: string; name: string }) {
	return (
		<Wrapper>
			<Text>Hi {name}, click the button below to sign in.</Text>

			<PrimaryButton href={url}>Sign In &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link in your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

MagicLink.PreviewProps = {
	url: "#",
	name: "John Doe",
};

export default MagicLink;
