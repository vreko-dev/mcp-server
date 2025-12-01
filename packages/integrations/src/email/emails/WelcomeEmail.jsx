import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
export function WelcomeEmail({ userName, apiKey }) {
	return (
		<Html>
			<Head />
			<Preview>Welcome to SnapBack - Your code is now protected</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={h1}>🧢 SnapBack</Heading>
					</Section>

					<Text style={text}>Hi {userName}!</Text>

					<Text style={text}>Welcome to SnapBack! Your code is now protected from AI-induced disasters.</Text>

					{apiKey && (
						<Section style={codeBlock}>
							<Text style={codeLabel}>Your API Key (save this!):</Text>
							<code style={code}>{apiKey}</code>
						</Section>
					)}

					<Text style={text}>Get started in 3 steps:</Text>

					<Section style={steps}>
						<Text style={step}>1. Install the VS Code extension</Text>
						<Text style={step}>2. Add your API key to the extension</Text>
						<Text style={step}>3. Code fearlessly knowing SnapBack has your back</Text>
					</Section>

					<Section style={buttonContainer}>
						<Button style={button} href="https://snapback.dev/docs/getting-started">
							Get Started Guide
						</Button>
					</Section>

					<Text style={footer}>
						Questions? Join our Discord or reply to this email.
						<br />
						Remember: Every AI change is checkpointed. Recovery is just one click away.
					</Text>
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
const header = {
	padding: "24px 0",
	borderBottom: "1px solid #27272A",
};
const h1 = {
	color: "#10B981",
	fontSize: "24px",
	fontWeight: "bold",
	margin: "0",
	padding: "0",
};
const text = {
	color: "#FAFAFA",
	fontSize: "16px",
	lineHeight: "24px",
};
const codeBlock = {
	backgroundColor: "#111111",
	border: "1px solid #27272A",
	borderRadius: "8px",
	padding: "16px",
	margin: "24px 0",
};
const codeLabel = {
	color: "#FAFAFA",
	fontSize: "14px",
	margin: "0 0 8px 0",
};
const code = {
	color: "#10B981",
	fontFamily: "monospace",
	fontSize: "14px",
};
const buttonContainer = {
	textAlign: "center",
	margin: "24px 0",
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
};
const steps = {
	margin: "24px 0",
};
const step = {
	color: "#FAFAFA",
	fontSize: "16px",
	lineHeight: "24px",
	margin: "8px 0",
};
const footer = {
	color: "#A1A1AA",
	fontSize: "14px",
	lineHeight: "20px",
	textAlign: "center",
	margin: "24px 0 0 0",
};
