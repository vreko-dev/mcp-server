import { protectedProcedure } from "../../orpc/procedures";
import { createExtensionSession } from "./procedures/create-extension-session.js";

export const extensionRouter = protectedProcedure.router({
	session: createExtensionSession,
});
