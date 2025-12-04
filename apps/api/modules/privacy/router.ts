import { protectedProcedure } from "../../orpc/procedures";
import {
	deleteMyData,
	exportMyData,
	getRetentionInfo,
	updatePreferences,
} from "./procedures";

export const privacyRouter = protectedProcedure.router({
	"my-data": exportMyData,
	"delete-my-data": deleteMyData,
	preferences: updatePreferences,
	retention: getRetentionInfo,
});
