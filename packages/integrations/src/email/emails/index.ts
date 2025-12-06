import { ApiKeyCreatedEmail } from "./ApiKeyCreatedEmail";
import { EmailVerification } from "./EmailVerification";
import { ForgotPassword } from "./ForgotPassword";
import { MagicLink } from "./MagicLink";
import { NewsletterSignup } from "./NewsletterSignup";
import { NewUser } from "./NewUser";
import { OrganizationInvitation } from "./OrganizationInvitation";
import { WelcomeEmail } from "./WelcomeEmail";

export const emails = {
	emailVerification: EmailVerification,
	forgotPassword: ForgotPassword,
	magicLink: MagicLink,
	newUser: NewUser,
	newsletterSignup: NewsletterSignup,
	organizationInvitation: OrganizationInvitation,
	apiKeyCreated: ApiKeyCreatedEmail,
	welcome: WelcomeEmail,
};
