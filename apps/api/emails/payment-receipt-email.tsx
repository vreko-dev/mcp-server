/**
 * Payment Receipt Email Template
 * Sent when a payment is successfully processed
 */

import * as React from "react";

interface PaymentReceiptEmailProps {
	amount: string;
	currency: string;
	invoiceUrl?: string;
	supportEmail: string;
	date: string;
}

export default function PaymentReceiptEmail({
	amount,
	currency,
	invoiceUrl,
	supportEmail,
	date,
}: PaymentReceiptEmailProps) {
	return (
		<html lang="en">
			<head />
			<body>
				<h1>Payment Receipt</h1>
				<p>Thank you for your payment.</p>
				<p>
					<strong>Amount:</strong> {currency} {amount}
				</p>
				<p>
					<strong>Date:</strong> {date}
				</p>
				{invoiceUrl && (
					<p>
						<a href={invoiceUrl}>Download Invoice</a>
					</p>
				)}
				<p>
					Questions? Contact{" "}
					<a href={`mailto:${supportEmail}`}>{supportEmail}</a>
				</p>
			</body>
		</html>
	);
}
