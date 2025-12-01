import { Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
export function ForgotPassword({ url }) {
	return (
		<Wrapper>
			<Text>
				Click the button below to reset your password. If you didn't request this change, you can safely ignore
				this email.
			</Text>

			<PrimaryButton href={url}>Reset Password &rarr;</PrimaryButton>
		</Wrapper>
	);
}
ForgotPassword.PreviewProps = {
	url: "#",
};
export default ForgotPassword;
