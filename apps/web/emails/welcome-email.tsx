import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";

interface WelcomeEmailProps {
	plan: string;
	features: string[];
	dashboardUrl: string;
	supportEmail: string;
}

export default function WelcomeEmail({
	plan = "Solo",
	features = [],
	dashboardUrl = "https://snapback.dev/dashboard",
	supportEmail = "support@snapback.dev",
}: WelcomeEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>
				Welcome to SnapBack {plan}! Your code safety net is ready.
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>🧢 Welcome to SnapBack!</Heading>
					<Text style={text}>
						Thanks for subscribing to SnapBack{" "}
						<strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>!
						Your code is now protected with intelligent snapshot technology.
					</Text>

					<Section style={featuresSection}>
						<Heading style={h2}>Your Plan Features:</Heading>
						<ul style={featuresList}>
							{features.map((feature, index) => (
								<li key={index} style={featureItem}>
									{feature}
								</li>
							))}
						</ul>
					</Section>

					<Section style={ctaSection}>
						<Link href={dashboardUrl} style={button}>
							Go to Dashboard
						</Link>
					</Section>

					<Hr style={hr} />

					<Section style={quickStartSection}>
						<Heading style={h2}>Quick Start Guide:</Heading>
						<Text style={text}>
							<strong>1. Install the VS Code Extension</strong>
							<br />
							Search for "SnapBack" in the VS Code marketplace
						</Text>
						<Text style={text}>
							<strong>2. Configure Your Workspace</strong>
							<br />
							Set protection levels for critical files
						</Text>
						<Text style={text}>
							<strong>3. Let AI Work Safely</strong>
							<br />
							Every change is automatically protected and recoverable
						</Text>
					</Section>

					<Hr style={hr} />

					<Text style={footer}>
						Need help? Contact us at{" "}
						<Link href={`mailto:${supportEmail}`} style={link}>
							{supportEmail}
						</Link>
						<br />
						<br />
						SnapBack - Code Breaks. SnapBack.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	padding: "20px 0 48px",
	marginBottom: "64px",
};

const h1 = {
	color: "#333",
	fontSize: "24px",
	fontWeight: "bold",
	margin: "40px 0",
	padding: "0 40px",
};

const h2 = {
	color: "#333",
	fontSize: "18px",
	fontWeight: "bold",
	margin: "24px 0 16px",
};

const text = {
	color: "#333",
	fontSize: "16px",
	lineHeight: "26px",
	padding: "0 40px",
};

const featuresSection = {
	padding: "0 40px",
	marginTop: "24px",
};

const featuresList = {
	margin: "0",
	padding: "0 0 0 20px",
};

const featureItem = {
	color: "#333",
	fontSize: "16px",
	lineHeight: "26px",
	marginBottom: "8px",
};

const ctaSection = {
	padding: "24px 40px",
	textAlign: "center" as const,
};

const button = {
	backgroundColor: "#000000",
	borderRadius: "6px",
	color: "#fff",
	fontSize: "16px",
	fontWeight: "bold",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "12px 24px",
};

const quickStartSection = {
	padding: "0 40px",
	marginTop: "24px",
};

const hr = {
	borderColor: "#e6ebf1",
	margin: "20px 0",
};

const footer = {
	color: "#8898aa",
	fontSize: "14px",
	lineHeight: "24px",
	padding: "0 40px",
	marginTop: "32px",
};

const link = {
	color: "#556cd6",
	textDecoration: "underline",
};
