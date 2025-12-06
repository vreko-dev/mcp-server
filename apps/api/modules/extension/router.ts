import { protectedProcedure } from "../../orpc/procedures";
import { createExtensionSession } from "./procedures/create-extension-session";

export const extensionRouter = protectedProcedure.router({
	session: createExtensionSession,
});
