/**
 * Step-Up Authentication Modal
 * Prompts user to re-authenticate with passkey/TOTP for sensitive operations
 */

"use client";

import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { AlertTriangleIcon, KeyIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";

interface StepUpModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	action?: string; // Description of the action requiring step-up
}

export function StepUpModal({
	isOpen,
	onClose,
	onSuccess,
	action = "this action",
}: StepUpModalProps) {
	const [method, setMethod] = useState<"passkey" | "totp" | null>(null);
	const [totpCode, setTotpCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handlePasskeyVerify = async () => {
		setIsVerifying(true);
		setError(null);

		try {
			// Step 1: Get WebAuthn challenge from backend
			const challengeResponse = await fetch("/api/security/passkey/challenge", {
				method: "POST",
				credentials: "include",
			});

			if (!challengeResponse.ok) {
				throw new Error("Failed to generate challenge");
			}

			const { challenge, rpId, timeout } = await challengeResponse.json();

			// Step 2: Convert challenge to Uint8Array for WebAuthn
			const challengeBuffer = Uint8Array.from(
				atob(challenge.replace(/-/g, "+").replace(/_/g, "/")),
				(c) => c.charCodeAt(0),
			);

			// Step 3: Use WebAuthn API to sign challenge with passkey
			const credential = await navigator.credentials.get({
				publicKey: {
					challenge: challengeBuffer,
					rpId: rpId,
					userVerification: "required",
					timeout: timeout,
				},
			});

			if (!credential || credential.type !== "public-key") {
				throw new Error("Passkey verification cancelled or failed");
			}

			// Step 4: Convert credential to base64 for transport
			const publicKeyCredential = credential as PublicKeyCredential;
			const response =
				publicKeyCredential.response as AuthenticatorAssertionResponse;

			const passkeyResponse = {
				id: publicKeyCredential.id,
				rawId: btoa(
					String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId)),
				),
				response: {
					authenticatorData: btoa(
						String.fromCharCode(...new Uint8Array(response.authenticatorData)),
					),
					clientDataJSON: btoa(
						String.fromCharCode(...new Uint8Array(response.clientDataJSON)),
					),
					signature: btoa(
						String.fromCharCode(...new Uint8Array(response.signature)),
					),
					userHandle: response.userHandle
						? btoa(String.fromCharCode(...new Uint8Array(response.userHandle)))
						: null,
				},
				type: publicKeyCredential.type,
			};

			// Step 5: Send signed credential to backend for verification
			const stepUpResponse = await fetch("/api/security/reauth", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: "passkey",
					passkeyResponse: passkeyResponse,
					challenge: challenge, // Include original challenge for verification
				}),
			});

			const stepUpData = await stepUpResponse.json();

			if (!stepUpResponse.ok) {
				throw new Error(stepUpData.error || "Verification failed");
			}

			onSuccess();
			onClose();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Passkey verification failed",
			);
		} finally {
			setIsVerifying(false);
		}
	};

	const handleTotpVerify = async () => {
		if (!totpCode || totpCode.length !== 6) {
			setError("Please enter a valid 6-digit code");
			return;
		}

		setIsVerifying(true);
		setError(null);

		try {
			// Call our step-up endpoint
			const response = await fetch("/api/security/reauth", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: "totp",
					credential: totpCode,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Verification failed");
			}

			// Check if passkey enrollment is now required
			if (data.passkeyEnrollmentRequired) {
				setError(
					"⚠️ You've used TOTP once. Please enroll a passkey for enhanced security.",
				);
				// Show enrollment prompt
				setTimeout(() => {
					window.location.href = "/settings/security/passkey";
				}, 3000);
			}

			onSuccess();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Verification failed");
		} finally {
			setIsVerifying(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md" data-testid="stepup-modal">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldCheckIcon className="size-5 text-primary" />
						Confirm Your Identity
					</DialogTitle>
					<DialogDescription>
						Please verify your identity to proceed with {action}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{error && (
						<Alert variant="error">
							<AlertTriangleIcon className="size-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{!method && (
						<div className="space-y-3">
							<Button
								variant="secondary"
								className="w-full"
								onClick={() => setMethod("passkey")}
							>
								<KeyIcon className="mr-2 size-4" />
								Verify with Passkey
							</Button>

							<Button
								variant="light"
								className="w-full"
								data-testid="stepup-method-totp"
								onClick={() => setMethod("totp")}
							>
								<ShieldCheckIcon className="mr-2 size-4" />
								Verify with Authenticator
							</Button>
						</div>
					)}

					{method === "passkey" && (
						<div className="space-y-4">
							<p className="text-muted-foreground text-sm">
								Use your passkey (Face ID, Touch ID, or security key) to verify
								your identity.
							</p>
							<div className="flex gap-2">
								<Button
									variant="light"
									onClick={() => setMethod(null)}
									disabled={isVerifying}
								>
									Back
								</Button>
								<Button
									variant="secondary"
									className="flex-1"
									data-testid="verify-passkey"
									onClick={handlePasskeyVerify}
									loading={isVerifying}
								>
									<KeyIcon className="mr-2 size-4" />
									Verify with Passkey
								</Button>
							</div>
						</div>
					)}

					{method === "totp" && (
						<div className="space-y-4">
							<div>
								<label
									htmlFor="totp-code"
									className="mb-2 block font-medium text-sm"
								>
									Authenticator Code
								</label>
								<Input
									id="totp-code"
									data-testid="totp-code-input"
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									maxLength={6}
									placeholder="000000"
									value={totpCode}
									onChange={(e) =>
										setTotpCode(e.target.value.replace(/\D/g, ""))
									}
									autoComplete="one-time-code"
									className="text-center text-2xl tracking-widest"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									variant="light"
									onClick={() => setMethod(null)}
									disabled={isVerifying}
								>
									Back
								</Button>
								<Button
									variant="secondary"
									className="flex-1"
									data-testid="verify-totp"
									onClick={handleTotpVerify}
									loading={isVerifying}
									disabled={totpCode.length !== 6}
								>
									Verify Code
								</Button>
							</div>
						</div>
					)}

					<p className="text-center text-muted-foreground text-xs">
						This verification is valid for 5 minutes
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
