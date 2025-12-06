import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

interface WaitlistConfirmationEmailProps {
	queuePosition: number;
	email: string;
}

export function WaitlistConfirmationEmail({ queuePosition, email }: WaitlistConfirmationEmailProps) {
	const previewText = `You're #${queuePosition} on the SnapBack waitlist!`;

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Text style={logo}>⚡ SnapBack</Text>
						<Text style={tagline}>
							Code Breaks.
							<br />
							Snap Back.
						</Text>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Heading style={h1}>🎉 You're on the list!</Heading>

						<Text style={paragraph}>
							Welcome to the SnapBack Private Alpha. You're moving fast, and we're building the safety net
							so AI can't break your code.
						</Text>

						{/* Queue Position - Large and Prominent */}
						<Section style={queueBox}>
							<Text style={queueLabel}>Your Queue Position</Text>
							<Text style={queueNumber}>#{queuePosition}</Text>
						</Section>

						{/* Timeline */}
						<Section style={timeline}>
							<Text style={timelineHeading}>What Happens Next</Text>

							<Section style={timelineItem}>
								<Text style={timelineStep}>📧 Now</Text>
								<Text style={timelineText}>
									You're confirmed! Check your queue position and complete tasks to jump ahead.
								</Text>
							</Section>

							<Section style={timelineItem}>
								<Text style={timelineStep}>⏰ Within 24 hours</Text>
								<Text style={timelineText}>
									We'll send you installation instructions and your exclusive alpha access key.
								</Text>
							</Section>

							<Section style={timelineItem}>
								<Text style={timelineStep}>🚀 Launch Day</Text>
								<Text style={timelineText}>
									Get 6 months of SnapBack Pro free. No credit card needed.
								</Text>
							</Section>
						</Section>

						{/* Queue Tasks */}
						<Section style={tasksSection}>
							<Text style={tasksHeading}>⚡ Jump the Queue</Text>
							<Text style={tasksSubheading}>Complete these tasks to move up in line</Text>

							<Section style={taskItem}>
								<Text style={taskIcon}>⭐</Text>
								<Section style={taskContent}>
									<Text style={taskTitle}>Star on GitHub</Text>
									<Text style={taskDescription}>Show us some love on GitHub</Text>
								</Section>
								<Text style={taskPoints}>+50 points</Text>
							</Section>

							<Section style={taskItem}>
								<Text style={taskIcon}>▶️</Text>
								<Section style={taskContent}>
									<Text style={taskTitle}>Watch 60s Demo</Text>
									<Text style={taskDescription}>See SnapBack in action</Text>
								</Section>
								<Text style={taskPoints}>+25 points</Text>
							</Section>

							<Section style={taskItem}>
								<Text style={taskIcon}>📸</Text>
								<Section style={taskContent}>
									<Text style={taskTitle}>Make a Snapshot</Text>
									<Text style={taskDescription}>Try the extension early</Text>
								</Section>
								<Text style={taskPoints}>+100 points</Text>
							</Section>
						</Section>

						{/* CTA Button */}
						<Section style={buttonContainer}>
							<Button
								style={button}
								href={`${process.env.NEXT_PUBLIC_APP_URL}/waitlist?email=${encodeURIComponent(email)}`}
							>
								View Your Dashboard
							</Button>
						</Section>

						<Hr style={hr} />

						{/* Footer */}
						<Text style={footer}>
							Questions? Reply to this email or visit{" "}
							<a href={`${process.env.NEXT_PUBLIC_APP_URL}/docs`} style={link}>
								our docs
							</a>
							.
						</Text>

						<Text style={footer}>
							You're receiving this because you joined the SnapBack waitlist with {email}.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

export default WaitlistConfirmationEmail;

// Styles
const main = {
	backgroundColor: "#0A0A0A",
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
	margin: "0 auto",
	padding: "20px 0 48px",
	maxWidth: "600px",
};

const header = {
	padding: "32px 20px",
	textAlign: "center" as const,
};

const logo = {
	fontSize: "32px",
	fontWeight: "bold",
	color: "#FFFFFF",
	margin: "0 0 8px 0",
};

const tagline = {
	fontSize: "14px",
	color: "#A0A0A0",
	margin: "0",
};

const content = {
	padding: "0 20px",
};

const h1 = {
	color: "#FFFFFF",
	fontSize: "32px",
	fontWeight: "bold",
	margin: "32px 0 16px 0",
	textAlign: "center" as const,
};

const paragraph = {
	fontSize: "16px",
	lineHeight: "24px",
	color: "#D4D4D4",
	margin: "16px 0",
};

const queueBox = {
	backgroundColor: "#111111",
	border: "2px solid #00FF41",
	borderRadius: "12px",
	padding: "32px",
	margin: "32px 0",
	textAlign: "center" as const,
};

const queueLabel = {
	fontSize: "14px",
	color: "#A0A0A0",
	margin: "0 0 8px 0",
	textTransform: "uppercase" as const,
	letterSpacing: "1px",
};

const queueNumber = {
	fontSize: "56px",
	fontWeight: "bold",
	color: "#00FF41",
	margin: "0",
};

const timeline = {
	margin: "32px 0",
};

const timelineHeading = {
	fontSize: "20px",
	fontWeight: "bold",
	color: "#FFFFFF",
	margin: "0 0 24px 0",
};

const timelineItem = {
	marginBottom: "20px",
};

const timelineStep = {
	fontSize: "14px",
	fontWeight: "600",
	color: "#00FF41",
	margin: "0 0 4px 0",
};

const timelineText = {
	fontSize: "14px",
	lineHeight: "20px",
	color: "#D4D4D4",
	margin: "0",
};

const tasksSection = {
	backgroundColor: "#111111",
	borderRadius: "12px",
	padding: "24px",
	margin: "32px 0",
	border: "1px solid #333333",
};

const tasksHeading = {
	fontSize: "20px",
	fontWeight: "bold",
	color: "#FFFFFF",
	margin: "0 0 4px 0",
};

const tasksSubheading = {
	fontSize: "14px",
	color: "#A0A0A0",
	margin: "0 0 24px 0",
};

const taskItem = {
	display: "flex",
	alignItems: "center",
	padding: "16px",
	backgroundColor: "#0A0A0A",
	borderRadius: "8px",
	border: "1px solid #333333",
	marginBottom: "12px",
};

const taskIcon = {
	fontSize: "24px",
	marginRight: "16px",
	minWidth: "40px",
};

const taskContent = {
	flex: "1",
};

const taskTitle = {
	fontSize: "16px",
	fontWeight: "600",
	color: "#FFFFFF",
	margin: "0 0 4px 0",
};

const taskDescription = {
	fontSize: "14px",
	color: "#A0A0A0",
	margin: "0",
};

const taskPoints = {
	fontSize: "14px",
	fontWeight: "600",
	color: "#00FF41",
	marginLeft: "16px",
};

const buttonContainer = {
	textAlign: "center" as const,
	margin: "32px 0",
};

const button = {
	backgroundColor: "#00FF41",
	borderRadius: "8px",
	color: "#000000",
	fontSize: "16px",
	fontWeight: "600",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "14px 32px",
};

const hr = {
	borderColor: "#333333",
	margin: "32px 0",
};

const footer = {
	color: "#A0A0A0",
	fontSize: "12px",
	lineHeight: "18px",
	margin: "12px 0",
};

const link = {
	color: "#00FF41",
	textDecoration: "underline",
};
