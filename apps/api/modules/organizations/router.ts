import { createLogoUploadUrl } from "./procedures/create-logo-upload-url.js";
import { generateOrganizationSlug } from "./procedures/generate-organization-slug.js";
import { getById } from "./procedures/get-by-id.js";

export const organizationsRouter = {
	generateSlug: generateOrganizationSlug,
	createLogoUploadUrl,
	getById,
};
