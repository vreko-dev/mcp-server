import { publicProcedure } from "../../orpc/procedures";
import { createDeviceTrial } from "./procedures/create-device-trial";
import { linkDevice } from "./procedures/link-device";

export const deviceTrialsRouter = publicProcedure.router({
	create: createDeviceTrial,
	linkDevice: linkDevice,
});
