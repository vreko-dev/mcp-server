import { Link, Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";

export function NewUser({ url, name }: { url: string; name: string }) {
	return (
		<Wrapper>
			<Text>Welcome {name}! Click the button below to get started.</Text>

			<PrimaryButton href={url}>Get Started &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link in your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

NewUser.PreviewProps = {
	url: "#",
	name: "John Doe",
};

export default NewUser;
