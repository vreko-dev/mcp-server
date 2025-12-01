import "better-auth";

declare module "better-auth" {
	interface User {
		onboardingComplete?: boolean;
	}

	interface Session {
		user: {
			id: string;
			email: string;
			name?: string;
			image?: string;
			username?: string;
			role?: string;
			emailVerified?: boolean;
			twoFactorEnabled?: boolean;
			onboardingComplete?: boolean;
		};
	}
}
