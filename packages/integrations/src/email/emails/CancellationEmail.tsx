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

interface CancellationEmailProps {
	retentionOffer: string;
	feedbackUrl: string;
	resubscribeUrl: string;
	supportEmail: string;
}

export default function CancellationEmail({
	retentionOffer = "Get 25% off if you resubscribe within 7 days",
	feedbackUrl = "https://snapback.dev/feedback",
	resubscribeUrl = "https://snapback.dev/pricing",
	supportEmail = "support@snapback.dev",
}: CancellationEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>
				We're sorry to see you go - Your SnapBack subscription has been canceled
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>We're Sorry to See You Go</Heading>
					<Text style={text}>
						Your SnapBack subscription has been successfully canceled. We wanted
						to take a moment to thank you for trying SnapBack.
					</Text>

					<Section style={infoSection}>
						<Heading style={h2}>What Happens Next:</Heading>
						<Text style={text}>
							• Your subscription benefits will continue until the end of your
							current billing period
							<br />• You'll be downgraded to the free tier with 1,000 snapshots
							<br />• Cloud backup will be disabled (local snapshots are
							preserved)
							<br />• You can reactivate anytime without losing your data
						</Text>
					</Section>

					<Section style={offerSection}>
						<Heading style={h2}>Special Offer</Heading>
						<Text style={text}>
							Changed your mind? <strong>{retentionOffer}</strong>
						</Text>
						<Link href={resubscribeUrl} style={button}>
							Resubscribe Now
						</Link>
					</Section>

					<Hr style={hr} />

					<Section style={feedbackSection}>
						<Heading style={h2}>We'd Love Your Feedback</Heading>
						<Text style={text}>
							Help us improve SnapBack by sharing why you canceled. It only
							takes 2 minutes and helps us serve developers better.
						</Text>
						<Link href={feedbackUrl} style={feedbackLink}>
							Share Your Feedback
						</Link>
					</Section>

					<Hr style={hr} />

					<Text style={footer}>
						Have questions? Contact us at{" "}
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

const infoSection = {
	padding: "0 40px",
	marginTop: "24px",
};

const offerSection = {
	padding: "24px 40px",
	textAlign: "center" as const,
	backgroundColor: "#f6f9fc",
	margin: "24px 40px",
	borderRadius: "8px",
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
	marginTop: "16px",
};

const feedbackSection = {
	padding: "0 40px",
	marginTop: "24px",
};

const feedbackLink = {
	color: "#556cd6",
	fontSize: "16px",
	textDecoration: "underline",
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
