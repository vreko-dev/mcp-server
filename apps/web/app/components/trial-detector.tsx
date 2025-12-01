// app/components/trial-detector.tsx
"use client"; // Client component for Next.js 15

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
					console.error("Failed to check device trial status");
					return;
				}

				const data = await response.json();
				console.log("Device trial status:", data);
			} catch (error) {
				console.error("Error detecting device:", { error });
			}
		}

		detectDevice();
	}, []);

	return null;
}
