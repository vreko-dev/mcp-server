import { protectedProcedure } from "@/orpc/procedures";
import { listApiKeysForUser } from "../services/apikeys-service";

export const listApiKeys = protectedProcedure.handler(async ({ context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Fetch keys via service
	const keys = await listApiKeysForUser(user.id);

	return { keys };
});
