import { protectedProcedure } from "../../orpc/procedures";
import { clearExpiredCooldowns, getCooldownStatus, listCooldowns } from "./procedures";

export const cooldownsRouter = protectedProcedure.router({
	get: getCooldownStatus,
	list: listCooldowns,
	clearExpired: clearExpiredCooldowns,
});
