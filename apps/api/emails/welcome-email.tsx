/**
 * Welcome Email Template
 * Sent when a user subscribes to a plan
 */

import React from "react";

import React from "react";

interface WelcomeEmailProps {
	plan: string;
	features: string[];
	dashboardUrl: string;
	supportEmail: string;
}

export default function WelcomeEmail({
	plan,
	features,
	dashboardUrl,
	supportEmail,
}: WelcomeEmailProps) {
	return (
		<html lang="en">
			<head />
			<body>
				<h1>Welcome to SnapBack {plan}!</h1>
				<p>Thank you for subscribing. Your plan includes:</p>
				<ul>
					{features.map((feature, index) => (
						<li key={index}>{feature}</li>
					))}
				</ul>
				<p>
					<a href={dashboardUrl}>Go to Dashboard</a>
				</p>
				<p>
					Need help? Contact us at{" "}
					<a href={`mailto:${supportEmail}`}>{supportEmail}</a>
				</p>
			</body>
		</html>
	);
}
