import { os } from "@orpc/server";
import type { OrpcContext } from "../procedures";

export const localeMiddleware = os.$context<OrpcContext>().middleware(async ({ context: _context, next }) => {
	// Always use English locale since i18n is disabled
	const locale = "en";

	return await next({
		context: {
			locale,
		},
	});
});
