import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
export function ApiKeyCreatedEmail({ userName, keyName, keyPreview }) {
	return (
		<Html>
			<Head />
			<Preview>New API key created for your SnapBack account</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>🔑 New API Key Created</Heading>

					<Text style={text}>Hi {userName},</Text>

					<Text style={text}>A new API key "{keyName}" was just created for your account.</Text>

					<Section style={warningBox}>
						<Text style={warningText}>
							⚠️ If you didn't create this key, please revoke it immediately and secure your account.
						</Text>
					</Section>

					<Text style={text}>Key preview: {keyPreview}</Text>

					<Button style={button} href="https://snapback.dev/dashboard/api-keys">
						Manage API Keys
					</Button>
				</Container>
			</Body>
		</Html>
	);
}
// Styles
const main = {
	backgroundColor: "#0A0A0A",
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const container = {
	margin: "0 auto",
	padding: "20px 0 48px",
	width: "580px",
};
const h1 = {
	color: "#10B981",
	fontSize: "24px",
	fontWeight: "bold",
	margin: "0 0 24px 0",
	padding: "0",
};
const text = {
	color: "#FAFAFA",
	fontSize: "16px",
	lineHeight: "24px",
};
const warningBox = {
	backgroundColor: "#7F1D1D",
	border: "1px solid #EF4444",
	borderRadius: "8px",
	padding: "16px",
	margin: "24px 0",
};
const warningText = {
	color: "#FEE2E2",
	fontSize: "16px",
	lineHeight: "24px",
	margin: "0",
};
const button = {
	backgroundColor: "#10B981",
	borderRadius: "8px",
	color: "#000000",
	fontSize: "16px",
	fontWeight: "bold",
	textDecoration: "none",
	textAlign: "center",
	display: "inline-block",
	padding: "12px 24px",
	margin: "24px 0",
};
