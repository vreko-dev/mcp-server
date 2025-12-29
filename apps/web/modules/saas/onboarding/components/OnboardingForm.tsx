"use client";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { Progress } from "@ui/components/progress";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { withQuery } from "ufo";
import { useIdeContext } from "../hooks/useIdeContext";
import { BackToIdeButton, IdeStatusIndicator } from "./BackToIdeButton";
import { OnboardingStep1 } from "./OnboardingStep1";
import { OnboardingStepCLI } from "./OnboardingStepCLI";

/**
 * Unified Onboarding Form
 *
 * Per /apps/onboarding/implementation.md and wireframes.md:
 * - Profile setup (Step 1)
 * - CLI/Extension setup (Step 2)
 * - Shows "Back to IDE" button when IDE is detected
 * - Adapts messaging based on entry point (extension vs browser)
 */
export function OnboardingForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const ideContext = useIdeContext();

	const stepSearchParam = searchParams.get("step");
	const redirectTo = searchParams.get("redirectTo");
	const extensionId = searchParams.get("extension_id");
	const [currentStep, setCurrentStep] = useState(stepSearchParam ? Number.parseInt(stepSearchParam, 10) : 1);

	const setStep = (step: number) => {
		setCurrentStep(step);
		router.replace(
			withQuery(window.location.pathname, {
				step: step.toString(),
				...(redirectTo && { redirectTo }),
				...(extensionId && { extension_id: extensionId }),
			}),
		);
	};

	const onCompleted = async () => {
		// TODO: Re-enable when onboardingComplete field is added to user schema
		// await authClient.updateUser({
		// 	onboardingComplete: true,
		// });

		await clearCache();
		router.replace(redirectTo ?? "/app");
	};

	const steps = [
		{
			title: "Profile",
			component: <OnboardingStep1 onCompleted={() => setStep(2)} />,
		},
		{
			title: "CLI Setup",
			component: <OnboardingStepCLI onCompleted={onCompleted} onSkip={onCompleted} />,
		},
	];

	return (
		<div>
			{/* IDE Status & Back Button - per wireframes.md */}
			{ideContext.isDetected && (
				<div className="mb-6 flex items-center justify-between">
					<IdeStatusIndicator />
					<BackToIdeButton variant="ghost" size="sm" />
				</div>
			)}

			<h1 className="font-bold text-xl md:text-2xl">
				{extensionId ? "Complete Your Setup" : "Welcome to SnapBack"}
			</h1>
			<p className="mt-2 mb-6 text-foreground/60">
				{extensionId ? "Just a few more steps to protect your code" : "Let's get your account set up"}
			</p>

			{steps.length > 1 && (
				<div className="mb-6 flex items-center gap-3">
					<Progress value={(currentStep / steps.length) * 100} className="h-2" />
					<span className="shrink-0 text-foreground/60 text-xs">
						Step {currentStep} of {steps.length}
					</span>
				</div>
			)}

			{steps[currentStep - 1]?.component ?? null}
		</div>
	);
}
