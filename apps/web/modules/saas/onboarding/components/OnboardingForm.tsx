"use client";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { Progress } from "@ui/components/progress";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { withQuery } from "ufo";
import { OnboardingStep1 } from "./OnboardingStep1";
import { OnboardingStepCLI } from "./OnboardingStepCLI";

export function OnboardingForm() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const stepSearchParam = searchParams.get("step");
	const redirectTo = searchParams.get("redirectTo");
	const [currentStep, setCurrentStep] = useState(stepSearchParam ? Number.parseInt(stepSearchParam, 10) : 1);

	const setStep = (step: number) => {
		setCurrentStep(step);
		router.replace(
			withQuery(window.location.pathname, {
				step: step.toString(),
				...(redirectTo && { redirectTo }),
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
			<h1 className="font-bold text-xl md:text-2xl">Welcome to SnapBack</h1>
			<p className="mt-2 mb-6 text-foreground/60">Let's get your account set up</p>

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
