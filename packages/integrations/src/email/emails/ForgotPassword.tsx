import { Link, Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton.js";
import Wrapper from "../components/Wrapper.js";

export function ForgotPassword({ url, name }: { url: string; name: string }) {
	return (
		<Wrapper>
			<Text>Hi {name}, click the button below to reset your password.</Text>

			<PrimaryButton href={url}>Reset Password &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link in your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

ForgotPassword.PreviewProps = {
	url: "#",
	name: "John Doe",
};

export default ForgotPassword;
