// app/components/trial-detector.tsx
"use client"; // Client component for Next.js 15

import { logger } from "@snapback/infrastructure";
import { useEffect } from "react";
import { getClientFingerprint } from "@/lib/client-fingerprint";

export function TrialDetector() {
	useEffect(() => {
		async function detectDevice() {
			try {
				const fingerprint = await getClientFingerprint();

				// Send to API route
				const response = await fetch("/api/v1/device-trial/check", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(fingerprint),
				});

				if (!response.ok) {
					logger.error("Failed to check device trial status");
					return;
				}

				const data = await response.json();
				logger.debug("Device trial status:", data);
			} catch (error) {
				logger.error("Error detecting device:", { error });
			}
		}

		detectDevice();
	}, []);

	return null;
}
