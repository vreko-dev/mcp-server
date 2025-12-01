import { createApiKey } from "./procedures/create-api-key";
import { listApiKeys } from "./procedures/list-api-keys";
import { revokeApiKey } from "./procedures/revoke-api-key";

export const apiKeysRouter = {
	create: createApiKey,
	list: listApiKeys,
	revoke: revokeApiKey,
};
