import { Hono } from "hono";
import v1Routes from "./v1/index";
import workspaceSafety from "./workspace-safety";

const app = new Hono();

// Mount all API versions
app.route("/v1", v1Routes);

// Workspace safety endpoint (v1.1)
app.route("/workspace/safety", workspaceSafety);

export default app;
