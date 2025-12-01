import { protectedProcedure } from "../../orpc/procedures";
import { analyzeRisk } from "./procedures/analyze-risk";

export const riskRouter = protectedProcedure.router({
	analyze: analyzeRisk,
});
