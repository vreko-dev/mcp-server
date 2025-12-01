import { protectedProcedure } from "../../orpc/procedures";
import { getRulesBundle } from "./procedures";

export const rulesRouter = protectedProcedure.router({
	getBundle: getRulesBundle,
});
