import { Hono } from "hono";
import keysRoute from "../keys.js";
import snapshotsRoute from "../snapshots.js";
import analyzeRoute from "./analyze.js";
import detectSecretsRoute from "./detect-secrets.js";
import policyCurrentRoute from "./policy-current.js";
import policyEvaluateRoute from "./policy-evaluate.js";
import telemetryIngestRoute from "./telemetry-ingest.js";

const app = new Hono();

// Mount all v1 routes
app.route("/analyze", analyzeRoute);
app.route("/detect-secrets", detectSecretsRoute);
app.route("/policy/evaluate", policyEvaluateRoute);
app.route("/policy/current", policyCurrentRoute);
app.route("/telemetry/ingest", telemetryIngestRoute);
app.route("/keys", keysRoute);
app.route("/snapshots", snapshotsRoute);

export default app;
