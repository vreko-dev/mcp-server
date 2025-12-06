"use client";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { Progress } from "@ui/components/progress";
import { useSearchParams } from "next/navigation";
// import { withQuery } from "ufo"; // TODO: Re-enable when multi-step onboarding is implemented
import { OnboardingStep1 } from "./OnboardingStep1";

export function OnboardingForm() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const stepSearchParam = searchParams.get("step");
	const redirectTo = searchParams.get("redirectTo");
	const onboardingStep = stepSearchParam ? Number.parseInt(stepSearchParam, 10) : 1;

	// biome-ignore lint/correctness/noUnusedVariables: Will be used with more steps
	// const setStep = (step: number) => {
	// 	router.replace(
	// 		withQuery(window.location.search ?? "", {
	// 			step,
	// 		}),
	// 	);
	// };

	const onCompleted = async () => {
		// TODO: Re-enable when onboardingComplete field is added to user schema
		// await // authClient.updateUser({
		// 	onboardingComplete: true,
		// });

		await clearCache();
		router.replace(redirectTo ?? "/app");
	};

	const steps = [
		{
			component: <OnboardingStep1 onCompleted={() => onCompleted()} />,
		},
	];

	return (
		<div>
			<h1 className="font-bold text-xl md:text-2xl">Welcome to SnapBack</h1>
			<p className="mt-2 mb-6 text-foreground/60">Let's get your account set up</p>

			{steps.length > 1 && (
				<div className="mb-6 flex items-center gap-3">
					<Progress value={(onboardingStep / steps.length) * 100} className="h-2" />
					<span className="shrink-0 text-foreground/60 text-xs">
						Step {onboardingStep} of {steps.length}
					</span>
				</div>
			)}

			{steps[onboardingStep - 1]?.component ?? null}
		</div>
	);
}
