import { createLogoUploadUrl } from "./procedures/create-logo-upload-url";
import { generateOrganizationSlug } from "./procedures/generate-organization-slug";
import { getById } from "./procedures/get-by-id";

export const organizationsRouter = {
	generateSlug: generateOrganizationSlug,
	createLogoUploadUrl,
	getById,
};
