/**
 * Cancellation Email Template
 * Sent when a subscription is canceled
 */

import React from "react";

import React from "react";

interface CancellationEmailProps {
	retentionOffer: string;
	feedbackUrl: string;
	resubscribeUrl: string;
	supportEmail: string;
}

export default function CancellationEmail({
	retentionOffer,
	feedbackUrl,
	resubscribeUrl,
	supportEmail,
}: CancellationEmailProps) {
	return (
		<html lang="en">
			<head />
			<body>
				<h1>We're sorry to see you go</h1>
				<p>Your subscription has been canceled.</p>
				<p>
					<strong>{retentionOffer}</strong>
				</p>
				<p>
					<a href={resubscribeUrl}>Resubscribe Now</a>
				</p>
				<p>
					We'd love to hear your feedback:{" "}
					<a href={feedbackUrl}>Share Feedback</a>
				</p>
				<p>
					Questions? Contact{" "}
					<a href={`mailto:${supportEmail}`}>{supportEmail}</a>
				</p>
			</body>
		</html>
	);
}
