import { autoProvision } from "./procedures/auto-provision";
import { createApiKey } from "./procedures/create-api-key";
import { listApiKeys } from "./procedures/list-api-keys";
import { revokeApiKey } from "./procedures/revoke-api-key";

export const apiKeysRouter = {
	autoProvision,
	create: createApiKey,
	list: listApiKeys,
	revoke: revokeApiKey,
};
