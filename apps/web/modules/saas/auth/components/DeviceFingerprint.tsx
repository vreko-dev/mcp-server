"use client";

import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect } from "react";

interface DeviceFingerprintProps {
	onFingerprint: (fingerprint: string) => void;
}

export function DeviceFingerprint({ onFingerprint }: DeviceFingerprintProps) {
	useEffect(() => {
		async function generate() {
			try {
				const fp = await getFingerprint();
				onFingerprint(fp);
			} catch (error) {
				console.error("Failed to generate device fingerprint", error);
			}
		}
		generate();
	}, [onFingerprint]);

	return null;
}
