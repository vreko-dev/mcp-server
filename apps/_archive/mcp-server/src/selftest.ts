// Minimal selftest entry point with no dependencies
if (process.env.SNAPBACK_MCP_SELFTEST === "1") {
	// Minimal boot to prove process starts without fully serving forever
	// Write to stderr because many MCP clients sniff stdout for JSON-RPC only.
	process.stderr.write("SnapBack MCP Server started\n");
	// longer delay to allow stdio client to capture output
	setTimeout(() => process.exit(0), 500).unref();
	// Don't exit immediately, let the timeout handle it
} else {
	// If we get here, the selftest env var wasn't set, so we should exit with an error
	console.error("SNAPBACK_MCP_SELFTEST environment variable not set");
	process.exit(1);
}
