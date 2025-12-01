import { ApiKeyCreatedEmail } from "./ApiKeyCreatedEmail.js";
import { EmailVerification } from "./EmailVerification.js";
import { ForgotPassword } from "./ForgotPassword.js";
import { MagicLink } from "./MagicLink.js";
import { NewsletterSignup } from "./NewsletterSignup.js";
import { NewUser } from "./NewUser.js";
import { OrganizationInvitation } from "./OrganizationInvitation.js";
import { WelcomeEmail } from "./WelcomeEmail.js";

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
