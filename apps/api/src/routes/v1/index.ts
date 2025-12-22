import { Hono } from "hono";
import keysRoute from "../keys";
import snapshotsRoute from "../snapshots";
import analyzeRoute from "./analyze";
import detectSecretsRoute from "./detect-secrets";
import mcpRoute from "./mcp";
import policyCurrentRoute from "./policy-current";
import policyEvaluateRoute from "./policy-evaluate";
import telemetryIngestRoute from "./telemetry-ingest";

const app = new Hono();

// Mount all v1 routes
app.route("/analyze", analyzeRoute);
app.route("/detect-secrets", detectSecretsRoute);
app.route("/policy/evaluate", policyEvaluateRoute);
app.route("/policy/current", policyCurrentRoute);
app.route("/telemetry/ingest", telemetryIngestRoute);
app.route("/keys", keysRoute);
app.route("/snapshots", snapshotsRoute);
app.route("/mcp", mcpRoute);

export default app;
