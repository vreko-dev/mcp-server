# DNS Configuration for Local Development

This guide explains how to set up DNS for local development with SnapBack. The development environment uses subdomains to route traffic to different services:

- `snapback.dev` - Marketing site
- `console.snapback.dev` - Web application (console)
- `docs.snapback.dev` - Documentation site
- `api.snapback.dev` - API service
- `mcp.snapback.dev` - MCP server

## macOS Instructions

### Option 1: Using dnsmasq (Recommended)

1. Install dnsmasq using Homebrew:
   ```bash
   brew install dnsmasq
   ```

2. Create the dnsmasq configuration directory:
   ```bash
   sudo mkdir -p /usr/local/etc
   ```

3. Configure dnsmasq to resolve `.dev` domains to localhost:
   ```bash
   echo 'address=/.dev/127.0.0.1' | sudo tee -a /usr/local/etc/dnsmasq.conf
   ```

4. Start dnsmasq:
   ```bash
   sudo brew services start dnsmasq
   ```

5. Configure macOS to use dnsmasq for `.dev` domains:
   ```bash
   sudo mkdir -p /etc/resolver
   echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/dev
   ```

### Option 2: Manual /etc/hosts (Fallback)

If you prefer not to use dnsmasq, you can manually add entries to `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Add the following lines:
```
127.0.0.1 snapback.dev
127.0.0.1 console.snapback.dev
127.0.0.1 docs.snapback.dev
127.0.0.1 api.snapback.dev
127.0.0.1 mcp.snapback.dev
```

## Linux Instructions

### Using dnsmasq

1. Install dnsmasq:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install dnsmasq

   # CentOS/RHEL/Fedora
   sudo yum install dnsmasq
   # or
   sudo dnf install dnsmasq
   ```

2. Configure dnsmasq to resolve `.dev` domains:
   ```bash
   echo 'address=/.dev/127.0.0.1' | sudo tee /etc/dnsmasq.d/dev.conf
   ```

3. Start and enable dnsmasq:
   ```bash
   sudo systemctl start dnsmasq
   sudo systemctl enable dnsmasq
   ```

4. Configure your system to use dnsmasq:
   ```bash
   echo 'nameserver 127.0.0.1' | sudo tee /etc/resolv.conf
   ```

Note: On some distributions, NetworkManager may overwrite `/etc/resolv.conf`. In that case, configure NetworkManager to use dnsmasq:
   ```bash
   echo 'dns=dnsmasq' | sudo tee -a /etc/NetworkManager/NetworkManager.conf
   sudo systemctl restart NetworkManager
   ```

## Windows Instructions

### Using the Hosts File

1. Open Notepad as Administrator
2. Open the file: `C:\Windows\System32\drivers\etc\hosts`
3. Add the following lines:
   ```
   127.0.0.1 snapback.dev
   127.0.0.1 console.snapback.dev
   127.0.0.1 docs.snapback.dev
   127.0.0.1 api.snapback.dev
   127.0.0.1 mcp.snapback.dev
   ```
4. Save the file

## Verification Commands

After setting up DNS, verify the configuration:

```bash
# Test DNS resolution
nslookup snapback.dev
nslookup console.snapback.dev
nslookup docs.snapback.dev
nslookup api.snapback.dev
nslookup mcp.snapback.dev

# Or using ping
ping snapback.dev
ping console.snapback.dev
```

You should see responses pointing to `127.0.0.1`.

## Starting the Development Environment

Once DNS is configured, start the development environment:

```bash
make dev
# or
pnpm dev
```

Then access the services at their respective URLs:
- Marketing site: http://snapback.dev
- Console: http://console.snapback.dev
- Documentation: http://docs.snapback.dev
- API: http://api.snapback.dev
- MCP: http://mcp.snapback.dev

## Troubleshooting

If you encounter issues:

1. **DNS not resolving**:
   - Flush DNS cache:
     - macOS: `sudo dscacheutil -flushcache`
     - Linux: `sudo systemctl restart dnsmasq` or `sudo systemctl restart NetworkManager`
     - Windows: `ipconfig /flushdns`

2. **Permission denied**:
   - Ensure you're running commands with appropriate privileges (sudo on Unix-like systems)

3. **Services not accessible**:
   - Check that all services are running: `make logs`
   - Verify ports are not blocked by firewall

4. **Changes not taking effect**:
   - Restart the development environment: `make down && make dev`
