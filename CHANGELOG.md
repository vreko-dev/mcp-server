# vreko-mcp-server

## 3.1.1

### Patch Changes

- @vreko/mcp@0.1.2

## 3.1.0

### Minor Changes

- **CLI activation flow and MCP server hardening**

  Platform activation surface and MCP stability improvements:
  - `vr init` is now additive: re-running preserves existing config unless `--force` is passed
  - Supervisor install added to `postinstall` and `preuninstall` lifecycle hooks
  - Per-edit ingress breadcrumb wired so the daemon records edits attributed to the correct AI tool (R-SEAM-4, R-FIX-3)
  - Daemon connection probe timeout decoupled from per-request RPC timeout
  - MCP server: null-safety guards added for optional session array fields
  - MCP server: daemon version injected at build time via tsup `define` for accurate health reporting

### Patch Changes

- Updated dependencies []:
  - @vreko/mcp@0.1.1

## 2.1.0

### Minor Changes

- **Platform Version Alignment**: Coordinated release with platform v1.6.0
- Part of prevention layer release - collision avoidance system positioning
- No breaking changes - fully compatible with v2.0.1

## 2.0.1

### Patch Changes

- docs: Updated README with professional hero banner
- docs: Fixed GitHub repository URLs to point to mcp-server repo
- docs: Fixed Discord invite link
- fix: Added files field to package.json to exclude dev files from npm
- chore: Added .npmignore and .gitattributes for clean package publishing

## 2.0.0

### Major Changes

- Initial public release of Vreko MCP Server
- Streamable HTTP transport for AI assistant integration
- Security features (P0 fixes implemented)
- Docker deployment support with Fly.io configuration
