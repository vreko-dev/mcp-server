/**
 * Payment Failed Email Template
 * Sent when a payment attempt fails
 */

import * as React from "react";

interface PaymentFailedEmailProps {
	attemptCount: number;
	updatePaymentUrl: string;
	supportEmail: string;
	warningMessage: string;
}

export default function PaymentFailedEmail({
	attemptCount,
	updatePaymentUrl,
	supportEmail,
	warningMessage,
}: PaymentFailedEmailProps) {
	return (
		<html lang="en">
			<head />
			<body>
				<h1>Payment Failed - Action Required</h1>
				<p>We were unable to process your payment (Attempt {attemptCount}).</p>
				<p>
					<strong>{warningMessage}</strong>
				</p>
				<p>
					<a href={updatePaymentUrl}>Update Payment Method</a>
				</p>
				<p>
					Need help? Contact{" "}
					<a href={`mailto:${supportEmail}`}>{supportEmail}</a>
				</p>
			</body>
		</html>
	);
}
