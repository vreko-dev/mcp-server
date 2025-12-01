import { Text } from "@react-email/components";
import PrimaryButton from "../components/PrimaryButton";
import Wrapper from "../components/Wrapper";
export function NewUser({ url, name, email }) {
	return (
		<Wrapper>
			<Text>
				Hi {name} ({email}), welcome to SnapBack! Click the button below to get started.
			</Text>

			<PrimaryButton href={url}>Get Started &rarr;</PrimaryButton>
		</Wrapper>
	);
}
NewUser.PreviewProps = {
	url: "#",
	name: "John Doe",
	email: "john@example.com",
};
export default NewUser;
