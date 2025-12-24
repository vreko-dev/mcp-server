# SnapBack MCP Server - Fly.io Deployment Guide

## Prerequisites

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   export FLYCTL_INSTALL="$HOME/.fly"
   export PATH="$FLYCTL_INSTALL/bin:$PATH"
   ```

2. Authenticate with Fly:
   ```bash
   fly auth login
   ```

## Deployment Steps

### 1. Navigate to the Monorepo Root
```bash
# Make sure you're in the root of the snapback.dev repository
cd /path/to/snapback.dev
```

### 2. Create a New Fly App (First Time Only)
```bash
# Create the app using the MCP server's fly.toml
fly launch --config apps/mcp-server/fly.toml --no-deploy
```

When prompted:
- Choose a unique app name (e.g., `snapback-mcp-server-username`)
- Select a region close to you
- Skip setting up a PostgreSQL database
- Skip setting up Redis
- Skip deploying for now

### 3. Configure the App (if needed)
The `fly.toml` file has already been created with appropriate settings:
- Uses the Dockerfile for building
- Configures HTTP service on port 3000
- Sets appropriate resource limits
- Configures auto-scaling

### 4. Deploy the App
```bash
# IMPORTANT: Deploy from monorepo root with --config flag
fly deploy --config apps/mcp-server/fly.toml
```

### 5. Check Deployment Status
```bash
fly status
```

### 6. View Application Logs
```bash
fly logs
```

## Configuration

### Environment Variables
Set any required environment variables:
```bash
fly secrets set --config apps/mcp-server/fly.toml SNAPBACK_API_KEY=your-api-key-here
fly secrets set --config apps/mcp-server/fly.toml SNAPBACK_API_URL=https://api.snapback.dev
```

### Scaling
To scale the application:
```bash
fly scale count 1
fly scale vm shared-cpu-1x
```

## Connecting Claude Desktop to Your Deployed MCP Server

Update your Claude Desktop configuration file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "snapback": {
      "command": "curl",
      "args": [
        "-N",
        "-X",
        "POST",
        "https://snapback-mcp-server-username.fly.dev/stdin"
      ],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here",
        "SNAPBACK_API_URL": "https://api.snapback.dev",
        "NODE_ENV": "production"
      }
    }
  }
}
```

Note: You'll need to replace `snapback-mcp-server-username` with your actual Fly app name.

## Health Checks

The deployed MCP server includes health check endpoints:
- `GET /health` - Basic health check
- `GET /version` - Returns server version and name

## Troubleshooting

### Common Issues

1. **"launch manifest was created for a app, but this is a NodeJS app"**
   - **Cause**: Running deployment from wrong directory
   - **Fix**: Always run `fly deploy` from the monorepo root with `--config apps/mcp-server/fly.toml`
   - The Dockerfile needs access to workspace packages, so it must build from the root

2. **Build Failures**
   - Check that all dependencies are properly specified in package.json
   - Ensure the Dockerfile copies all necessary files
   - Verify you're running from the monorepo root

3. **Runtime Errors**
   - Check logs: `fly logs --config apps/mcp-server/fly.toml`
   - Verify environment variables are set correctly

4. **Connection Issues**
   - Ensure the Fly app is running: `fly status --config apps/mcp-server/fly.toml`
   - Check firewall settings if using custom networking

### Useful Commands

```bash
# View logs
fly logs

# Restart the application
fly restart

# Scale to zero (stop all instances)
fly scale count 0

# Scale to one (start one instance)
fly scale count 1

# View application status
fly status

# SSH into the machine
fly ssh console

# List secrets
fly secrets list

# Set a secret
fly secrets set KEY=value

# Unset a secret
fly secrets unset KEY
```

## Cost Considerations

Fly.io offers a generous free tier:
- Up to 3 shared-cpu-1x VMs (512MB RAM)
- 160GB outbound data transfer
- Free private IPv4 and IPv6 addresses

For the SnapBack MCP server, the default configuration should fit well within the free tier.

## Security

- All environment variables are encrypted at rest
- Traffic is encrypted in transit via HTTPS
- The application runs in an isolated environment
- Regular security updates are applied to the base image

## Updating the Deployment

To deploy new versions:

1. Commit your changes to the repository
2. From the monorepo root, run:
   ```bash
   fly deploy --config apps/mcp-server/fly.toml
   ```
3. Fly will automatically build and deploy the new version

For zero-downtime deployments, Fly automatically handles rolling updates.