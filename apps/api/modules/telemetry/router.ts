import { identify } from "./procedures/identify";
import { proxyEvent } from "./procedures/proxy-event";

export const telemetryRouter = {
	proxyEvent,
	identify,
};

// Export types
export type TelemetryRouter = typeof telemetryRouter;
