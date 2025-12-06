import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

interface PaymentReceiptEmailProps {
	amount: string;
	currency: string;
	invoiceUrl?: string;
	supportEmail: string;
	date: string;
}

export default function PaymentReceiptEmail({
	amount = "0.00",
	currency = "USD",
	invoiceUrl,
	supportEmail = "support@snapback.dev",
	date = new Date().toLocaleDateString(),
}: PaymentReceiptEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Payment Receipt - ${amount} - SnapBack</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>Payment Receipt</Heading>
					<Text style={text}>
						Thank you for your payment! Your SnapBack subscription is active and your code is protected.
					</Text>

					<Section style={receiptSection}>
						<table style={table}>
							<tbody>
								<tr>
									<td style={labelCell}>Amount Paid:</td>
									<td style={valueCell}>
										${amount} {currency}
									</td>
								</tr>
								<tr>
									<td style={labelCell}>Date:</td>
									<td style={valueCell}>{date}</td>
								</tr>
								<tr>
									<td style={labelCell}>Service:</td>
									<td style={valueCell}>SnapBack Subscription</td>
								</tr>
							</tbody>
						</table>
					</Section>

					{invoiceUrl && (
						<Section style={ctaSection}>
							<Link href={invoiceUrl} style={button}>
								View Full Invoice
							</Link>
						</Section>
					)}

					<Hr style={hr} />

					<Section style={infoSection}>
						<Heading style={h2}>Your Subscription Benefits:</Heading>
						<Text style={text}>
							✅ Unlimited snapshots
							<br />✅ Cloud backup enabled
							<br />✅ Advanced AI detection
							<br />✅ Priority support
							<br />
						</Text>
					</Section>

					<Hr style={hr} />

					<Text style={footer}>
						Questions about your bill? Contact us at{" "}
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
	fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const receiptSection = {
	padding: "24px 40px",
	backgroundColor: "#f6f9fc",
	margin: "24px 40px",
	borderRadius: "8px",
};

const table = {
	width: "100%",
};

const labelCell = {
	color: "#6b7280",
	fontSize: "14px",
	paddingBottom: "12px",
	width: "40%",
};

const valueCell = {
	color: "#333",
	fontSize: "16px",
	fontWeight: "bold" as const,
	paddingBottom: "12px",
	textAlign: "right" as const,
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

const infoSection = {
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
