import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { orpcClient } from "./orpc-client.js";

export const orpc = createTanstackQueryUtils(orpcClient);
