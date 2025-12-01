Pick the E2E driver: WDIO for VS Code UI + Playwright for visuals (recommended), or all‑in on one?

Mutation testing: okay to run nightly on Tier‑1 modules and gate releases on Mutation Score?

Auto Save support: do you want explicit tests for each VS Code Auto Save mode (off, afterDelay, onFocusChange, onWindowChange)?

Multi‑root: confirm it’s in scope for v1—if yes, I’ll add it to Tier‑1 integration.

Telemetry: enforce a “no PII” contract test (whitelisted keys only)?

Perf budgets: lock budgets at avg < 50ms, p95 < 100ms for snapshot‑on‑save in CI?

CI OS matrix: keep Linux/macOS/Windows for integration, or limit to Linux for PRs and run full matrix on nightly?