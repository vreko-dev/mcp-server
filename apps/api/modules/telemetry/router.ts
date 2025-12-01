import { proxyEvent } from "./procedures/proxy-event";

export const telemetryRouter = {
	proxyEvent,
};

// Export types
export type TelemetryRouter = typeof telemetryRouter;
