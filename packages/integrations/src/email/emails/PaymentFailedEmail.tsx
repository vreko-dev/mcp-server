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

interface PaymentFailedEmailProps {
	attemptCount: number;
	updatePaymentUrl: string;
	supportEmail: string;
	warningMessage: string;
}

export default function PaymentFailedEmail({
	attemptCount = 1,
	updatePaymentUrl = "https://snapback.dev/settings/billing",
	supportEmail = "support@snapback.dev",
	warningMessage = "Please update your payment method to continue your subscription.",
}: PaymentFailedEmailProps) {
	const isUrgent = attemptCount >= 3;

	return (
		<Html>
			<Head />
			<Preview>
				{isUrgent
					? "URGENT: Payment Failed - Action Required"
					: "Payment Failed - Please Update Payment Method"}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>
						{isUrgent ? "⚠️ URGENT: " : ""}Payment Failed
					</Heading>
					<Text style={text}>
						We were unable to process your payment for SnapBack. Your
						subscription benefits are at risk.
					</Text>

					<Section style={isUrgent ? urgentWarningSection : warningSection}>
						<Text style={isUrgent ? urgentWarningText : warningText}>
							{warningMessage}
						</Text>
						{isUrgent && (
							<Text style={urgentWarningText}>
								This is attempt {attemptCount} of 3. After 3 failed attempts,
								your account will be suspended.
							</Text>
						)}
					</Section>

					<Section style={ctaSection}>
						<Link href={updatePaymentUrl} style={button}>
							Update Payment Method
						</Link>
					</Section>

					<Hr style={hr} />

					<Section style={infoSection}>
						<Heading style={h2}>Common Payment Issues:</Heading>
						<Text style={text}>
							• Insufficient funds in your account
							<br />• Expired credit card
							<br />• Card declined by your bank
							<br />• Incorrect billing information
							<br />
						</Text>
						<Text style={text}>
							Most payment issues can be resolved by updating your payment
							method or contacting your bank.
						</Text>
					</Section>

					<Hr style={hr} />

					<Section style={helpSection}>
						<Heading style={h2}>Need Help?</Heading>
						<Text style={text}>
							If you're experiencing technical difficulties or have questions
							about your billing, our support team is here to help.
						</Text>
						<Text style={text}>
							<Link href={`mailto:${supportEmail}`} style={link}>
								{supportEmail}
							</Link>
						</Text>
					</Section>

					<Hr style={hr} />

					<Text style={footer}>
						Don't want to continue? You can{" "}
						<Link href={`${updatePaymentUrl}?action=cancel`} style={link}>
							cancel your subscription
						</Link>{" "}
						at any time.
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

const warningSection = {
	padding: "24px 40px",
	backgroundColor: "#fef3c7",
	margin: "24px 40px",
	borderRadius: "8px",
	borderLeft: "4px solid #f59e0b",
};

const urgentWarningSection = {
	padding: "24px 40px",
	backgroundColor: "#fee2e2",
	margin: "24px 40px",
	borderRadius: "8px",
	borderLeft: "4px solid #dc2626",
};

const warningText = {
	color: "#92400e",
	fontSize: "16px",
	fontWeight: "bold" as const,
	margin: "0",
};

const urgentWarningText = {
	color: "#991b1b",
	fontSize: "16px",
	fontWeight: "bold" as const,
	margin: "0 0 8px 0",
};

const ctaSection = {
	padding: "24px 40px",
	textAlign: "center" as const,
};

const button = {
	backgroundColor: "#dc2626",
	borderRadius: "6px",
	color: "#fff",
	fontSize: "16px",
	fontWeight: "bold",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "12px 24px",
};

const infoSection = {
	padding: "0 40px",
	marginTop: "24px",
};

const helpSection = {
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
