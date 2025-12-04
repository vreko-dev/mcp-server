import { protectedProcedure } from "../../orpc/procedures";
import {
	createSnapshot,
	deleteSnapshot,
	getSnapshot,
	listSnapshots,
	restoreSnapshot,
} from "./procedures";

export const snapshotsRouter = protectedProcedure.router({
	create: createSnapshot,
	list: listSnapshots,
	get: getSnapshot,
	delete: deleteSnapshot,
	restore: restoreSnapshot,
});
