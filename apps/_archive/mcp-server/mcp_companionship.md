# SnapBack MCP Companion Implementation Spec

> **Approach**: A+C Hybrid (Companion MCP + Extension-First Context Injection)
> **Goal**: SnapBack as the context layer for AI coding - not a router, but the brain
> **Effort**: M (1 week)
> **Demo Ready**: ✅

---

## Executive Summary

SnapBack MCP operates as a **companion** alongside other MCPs, providing codebase context, protection capabilities, and intelligent suggestions. The VS Code extension handles auto-configuration, with CLI as a fallback for non-VS Code users.

**Key Insight**: Don't own the pipe. Own the context. If `get_context` returns genuinely useful information, LLMs will *want* to call it.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER'S AI ENVIRONMENT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │  Claude Desktop │     │     Cursor      │     │   Other Client  │      │
│   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘      │
│            │                       │                       │               │
│            └───────────────────────┼───────────────────────┘               │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      MCP Configuration                               │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │  │
│   │  │   snapback   │  │  filesystem  │  │    github    │  ... others   │  │
│   │  │  (COMPANION) │  │  (standard)  │  │  (standard)  │               │  │
│   │  └──────┬───────┘  └──────────────┘  └──────────────┘               │  │
│   └─────────┼───────────────────────────────────────────────────────────┘  │
│             │                                                               │
│             ▼                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     SNAPBACK MCP SERVER                              │  │
│   │                                                                      │  │
│   │  Tools:                                                              │  │
│   │  ├── snapback.get_context      (FREE)  - Codebase understanding     │  │
│   │  ├── snapback.analyze_risk     (FREE)  - Change risk analysis       │  │
│   │  ├── snapback.create_checkpoint (PRO)  - Safety snapshots           │  │
│   │  ├── snapback.list_checkpoints  (PRO)  - Available snapshots        │  │
│   │  └── snapback.restore_checkpoint(PRO)  - Recovery                   │  │
│   │                                                                      │  │
│   │  Transport: STDIO (spawned by AI client)                            │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         INSTALLATION PATHS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Path A: VS Code Extension (Primary - Zero Config)                         │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  1. User installs extension from marketplace                        │  │
│   │  2. Extension activates → detects AI clients                        │  │
│   │  3. Extension auto-writes MCP config to detected clients            │  │
│   │  4. Done - AI assistants can now call snapback.* tools              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   Path B: CLI (Fallback - Non-VS Code Users)                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  1. npm install -g @snapback/cli                                    │  │
│   │  2. snapback init                                                   │  │
│   │  3. CLI detects AI clients → writes MCP config                      │  │
│   │  4. Done                                                            │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   Path C: Manual (Documentation - Edge Cases)                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  1. User follows docs to manually add MCP config                    │  │
│   │  2. Points to npx @snapback/mcp or installed binary                 │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: AI Client Detection & Configuration

### Supported AI Clients

| Client | Config Location | Format | Priority |
|--------|----------------|--------|----------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) | JSON | P0 |
| | `%APPDATA%\Claude\claude_desktop_config.json` (Windows) | | |
| | `~/.config/Claude/claude_desktop_config.json` (Linux) | | |
| Cursor | `~/.cursor/mcp.json` | JSON | P0 |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | JSON | P1 |
| Continue | `~/.continue/config.json` | JSON | P2 |

### Config Detection Module

```typescript
// packages/mcp-config/src/detect.ts

import { homedir, platform } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export interface AIClientConfig {
  name: string;
  configPath: string;
  exists: boolean;
  hasSnapback: boolean;
  format: 'claude' | 'cursor' | 'windsurf' | 'continue';
}

export interface DetectionResult {
  clients: AIClientConfig[];
  detected: AIClientConfig[];
  needsSetup: AIClientConfig[];
}

const CLIENT_CONFIGS: Record<string, (home: string) => string[]> = {
  claude: (home) => {
    switch (platform()) {
      case 'darwin':
        return [join(home, 'Library/Application Support/Claude/claude_desktop_config.json')];
      case 'win32':
        return [join(process.env.APPDATA || '', 'Claude/claude_desktop_config.json')];
      default:
        return [join(home, '.config/Claude/claude_desktop_config.json')];
    }
  },
  cursor: (home) => [join(home, '.cursor/mcp.json')],
  windsurf: (home) => [join(home, '.codeium/windsurf/mcp_config.json')],
  continue: (home) => [join(home, '.continue/config.json')],
};

export function detectAIClients(): DetectionResult {
  const home = homedir();
  const clients: AIClientConfig[] = [];

  for (const [name, getPaths] of Object.entries(CLIENT_CONFIGS)) {
    const paths = getPaths(home);

    for (const configPath of paths) {
      const exists = existsSync(configPath);
      let hasSnapback = false;

      if (exists) {
        try {
          const content = JSON.parse(readFileSync(configPath, 'utf-8'));
          hasSnapback = checkForSnapback(content, name as AIClientConfig['format']);
        } catch {
          // Invalid JSON, treat as no snapback
        }
      }

      clients.push({
        name: formatClientName(name),
        configPath,
        exists,
        hasSnapback,
        format: name as AIClientConfig['format'],
      });
    }
  }

  const detected = clients.filter(c => c.exists);
  const needsSetup = detected.filter(c => !c.hasSnapback);

  return { clients, detected, needsSetup };
}

function checkForSnapback(config: unknown, format: AIClientConfig['format']): boolean {
  if (!config || typeof config !== 'object') return false;

  switch (format) {
    case 'claude':
    case 'cursor':
      return 'mcpServers' in config &&
             typeof (config as Record<string, unknown>).mcpServers === 'object' &&
             'snapback' in ((config as Record<string, unknown>).mcpServers as Record<string, unknown>);
    case 'continue':
      // Continue uses different structure
      return false; // TODO: Implement
    default:
      return false;
  }
}

function formatClientName(name: string): string {
  const names: Record<string, string> = {
    claude: 'Claude Desktop',
    cursor: 'Cursor',
    windsurf: 'Windsurf',
    continue: 'Continue',
  };
  return names[name] || name;
}
```

### Config Writer Module

```typescript
// packages/mcp-config/src/write.ts

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { AIClientConfig } from './detect';

export interface SnapbackMCPConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function getSnapbackMCPConfig(options: {
  apiKey?: string;
  useBinary?: boolean;
}): SnapbackMCPConfig {
  const { apiKey, useBinary = false } = options;

  // Prefer npx for auto-updates, binary for offline/performance
  if (useBinary) {
    return {
      command: 'snapback-mcp', // Assumes binary in PATH
      args: [],
      env: apiKey ? { SNAPBACK_API_KEY: apiKey } : undefined,
    };
  }

  return {
    command: 'npx',
    args: ['-y', '@snapback/mcp'],
    env: apiKey ? { SNAPBACK_API_KEY: apiKey } : undefined,
  };
}

export function writeClientConfig(
  client: AIClientConfig,
  mcpConfig: SnapbackMCPConfig
): { success: boolean; error?: string; backup?: string } {
  try {
    // Ensure directory exists
    mkdirSync(dirname(client.configPath), { recursive: true });

    // Read existing config or create new
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(readFileSync(client.configPath, 'utf-8'));
    } catch {
      // File doesn't exist or invalid JSON, start fresh
    }

    // Create backup
    const backup = `${client.configPath}.backup.${Date.now()}`;
    if (Object.keys(config).length > 0) {
      writeFileSync(backup, JSON.stringify(config, null, 2));
    }

    // Add/update snapback config based on format
    switch (client.format) {
      case 'claude':
      case 'cursor':
        config.mcpServers = {
          ...(config.mcpServers as Record<string, unknown> || {}),
          snapback: mcpConfig,
        };
        break;
      // Add other formats as needed
    }

    // Write updated config
    writeFileSync(client.configPath, JSON.stringify(config, null, 2));

    return { success: true, backup };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function removeSnapbackConfig(client: AIClientConfig): { success: boolean; error?: string } {
  try {
    const config = JSON.parse(readFileSync(client.configPath, 'utf-8'));

    if (config.mcpServers?.snapback) {
      delete config.mcpServers.snapback;
      writeFileSync(client.configPath, JSON.stringify(config, null, 2));
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Part 2: VS Code Extension Auto-Configuration

### Extension Activation Hook

```typescript
// apps/vscode/src/mcp/auto-configure.ts

import * as vscode from 'vscode';
import { detectAIClients, writeClientConfig, getSnapbackMCPConfig } from '@snapback/mcp-config';
import { telemetry } from '../telemetry';

export async function autoConfigureMCP(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('snapback');

  // Check if auto-configure is enabled (default: true)
  if (!config.get<boolean>('mcp.autoEnable', true)) {
    return;
  }

  // Check if we've already configured (don't re-prompt)
  const hasConfigured = context.globalState.get<boolean>('mcp.configured');
  if (hasConfigured) {
    return;
  }

  // Detect AI clients
  const detection = detectAIClients();

  if (detection.detected.length === 0) {
    // No AI clients found, nothing to do
    telemetry.track('mcp_auto_configure_no_clients');
    return;
  }

  if (detection.needsSetup.length === 0) {
    // All detected clients already have SnapBack
    telemetry.track('mcp_auto_configure_already_setup', {
      clients: detection.detected.map(c => c.name),
    });
    await context.globalState.update('mcp.configured', true);
    return;
  }

  // Show prompt to user
  const clientNames = detection.needsSetup.map(c => c.name).join(', ');
  const response = await vscode.window.showInformationMessage(
    `SnapBack detected ${clientNames}. Enable AI protection integration?`,
    'Enable',
    'Not Now',
    'Never Ask'
  );

  telemetry.track('mcp_auto_configure_prompt_shown', {
    clients: detection.needsSetup.map(c => c.name),
    response: response || 'dismissed',
  });

  if (response === 'Never Ask') {
    await config.update('mcp.autoEnable', false, vscode.ConfigurationTarget.Global);
    return;
  }

  if (response !== 'Enable') {
    return;
  }

  // Configure all detected clients
  await configureClients(detection.needsSetup, context);
}

async function configureClients(
  clients: AIClientConfig[],
  context: vscode.ExtensionContext
): Promise<void> {
  const results: Array<{ client: string; success: boolean; error?: string }> = [];

  // Get API key if user is authenticated
  const apiKey = await getStoredApiKey(context);

  const mcpConfig = getSnapbackMCPConfig({ apiKey });

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Configuring SnapBack MCP...',
      cancellable: false,
    },
    async (progress) => {
      for (const client of clients) {
        progress.report({ message: `Setting up ${client.name}...` });

        const result = writeClientConfig(client, mcpConfig);
        results.push({
          client: client.name,
          success: result.success,
          error: result.error,
        });
      }
    }
  );

  // Report results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    const names = successful.map(r => r.client).join(', ');
    vscode.window.showInformationMessage(
      `✓ SnapBack enabled for ${names}. Restart your AI assistant to activate.`
    );
  }

  if (failed.length > 0) {
    const names = failed.map(r => r.client).join(', ');
    vscode.window.showWarningMessage(
      `Could not configure ${names}. Run 'snapback init' manually or check docs.`
    );
  }

  telemetry.track('mcp_auto_configure_complete', {
    successful: successful.map(r => r.client),
    failed: failed.map(r => r.client),
  });

  // Mark as configured
  await context.globalState.update('mcp.configured', true);
}

async function getStoredApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  // Try to get from secure storage
  const secrets = context.secrets;
  return secrets.get('snapback.apiKey');
}
```

### Extension Settings

```json
// apps/vscode/package.json (contributes.configuration)
{
  "snapback.mcp.autoEnable": {
    "type": "boolean",
    "default": true,
    "description": "Automatically configure SnapBack MCP for detected AI assistants (Claude, Cursor, etc.)"
  },
  "snapback.mcp.preferBinary": {
    "type": "boolean",
    "default": false,
    "description": "Use installed binary instead of npx for MCP server (faster startup, requires manual updates)"
  }
}
```

### Extension Commands

```typescript
// apps/vscode/src/commands/mcp.ts

import * as vscode from 'vscode';
import { detectAIClients, writeClientConfig, removeSnapbackConfig, getSnapbackMCPConfig } from '@snapback/mcp-config';

export function registerMCPCommands(context: vscode.ExtensionContext): void {
  // Command: Configure MCP manually
  context.subscriptions.push(
    vscode.commands.registerCommand('snapback.mcp.configure', async () => {
      const detection = detectAIClients();

      if (detection.detected.length === 0) {
        vscode.window.showInformationMessage(
          'No AI assistants detected. Install Claude Desktop or Cursor first.'
        );
        return;
      }

      const items = detection.detected.map(client => ({
        label: client.name,
        description: client.hasSnapback ? '✓ Configured' : 'Not configured',
        picked: !client.hasSnapback,
        client,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select AI assistants to configure',
      });

      if (!selected || selected.length === 0) return;

      const apiKey = await context.secrets.get('snapback.apiKey');
      const mcpConfig = getSnapbackMCPConfig({ apiKey });

      for (const item of selected) {
        const result = writeClientConfig(item.client, mcpConfig);
        if (result.success) {
          vscode.window.showInformationMessage(`✓ Configured ${item.client.name}`);
        } else {
          vscode.window.showErrorMessage(`Failed to configure ${item.client.name}: ${result.error}`);
        }
      }
    })
  );

  // Command: Show MCP status
  context.subscriptions.push(
    vscode.commands.registerCommand('snapback.mcp.status', async () => {
      const detection = detectAIClients();

      const items = detection.clients.map(client => {
        let status = '⚪ Not installed';
        if (client.exists && client.hasSnapback) status = '🟢 Active';
        else if (client.exists) status = '🟡 Needs setup';

        return `${client.name}: ${status}`;
      });

      vscode.window.showQuickPick(items, {
        placeHolder: 'SnapBack MCP Status',
        canPickMany: false,
      });
    })
  );

  // Command: Disable MCP for a client
  context.subscriptions.push(
    vscode.commands.registerCommand('snapback.mcp.disable', async () => {
      const detection = detectAIClients();
      const configured = detection.detected.filter(c => c.hasSnapback);

      if (configured.length === 0) {
        vscode.window.showInformationMessage('SnapBack MCP is not configured for any AI assistants.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        configured.map(c => ({ label: c.name, client: c })),
        { placeHolder: 'Select AI assistant to disable SnapBack for' }
      );

      if (!selected) return;

      const result = removeSnapbackConfig(selected.client);
      if (result.success) {
        vscode.window.showInformationMessage(`✓ Disabled SnapBack for ${selected.client.name}`);
      } else {
        vscode.window.showErrorMessage(`Failed: ${result.error}`);
      }
    })
  );
}
```

---

## Part 3: CLI Implementation

### CLI Entry Point

```typescript
// apps/cli/src/commands/init.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { detectAIClients, writeClientConfig, getSnapbackMCPConfig } from '@snapback/mcp-config';

export const initCommand = new Command('init')
  .description('Initialize SnapBack MCP for your AI assistants')
  .option('--force', 'Overwrite existing configurations')
  .option('--api-key <key>', 'API key for Pro features')
  .action(async (options) => {
    console.log(chalk.bold('\n🔒 SnapBack MCP Setup\n'));

    // Step 1: Detect AI clients
    const spinner = ora('Detecting AI assistants...').start();
    const detection = detectAIClients();
    spinner.stop();

    if (detection.detected.length === 0) {
      console.log(chalk.yellow('No AI assistants detected.'));
      console.log('\nSupported clients:');
      console.log('  • Claude Desktop - https://claude.ai/download');
      console.log('  • Cursor - https://cursor.sh');
      console.log('  • Windsurf - https://codeium.com/windsurf');
      console.log('\nInstall one of these, then run `snapback init` again.');
      process.exit(0);
    }

    // Step 2: Show detection results
    console.log(chalk.green(`✓ Found ${detection.detected.length} AI assistant(s):\n`));

    for (const client of detection.detected) {
      const status = client.hasSnapback
        ? chalk.green('✓ Already configured')
        : chalk.yellow('○ Needs setup');
      console.log(`  ${client.name}: ${status}`);
    }
    console.log();

    // Step 3: Determine what needs configuration
    const needsSetup = options.force
      ? detection.detected
      : detection.needsSetup;

    if (needsSetup.length === 0) {
      console.log(chalk.green('All AI assistants already have SnapBack configured!'));
      console.log('\nRun with --force to reconfigure.\n');
      showNextSteps();
      process.exit(0);
    }

    // Step 4: Confirm with user
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Configure SnapBack for ${needsSetup.map(c => c.name).join(', ')}?`,
        default: true,
      },
    ]);

    if (!proceed) {
      console.log('\nSetup cancelled.');
      process.exit(0);
    }

    // Step 5: Get API key if not provided
    let apiKey = options.apiKey || process.env.SNAPBACK_API_KEY;

    if (!apiKey) {
      const { wantApiKey } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'wantApiKey',
          message: 'Do you have a SnapBack API key for Pro features?',
          default: false,
        },
      ]);

      if (wantApiKey) {
        const { key } = await inquirer.prompt([
          {
            type: 'password',
            name: 'key',
            message: 'Enter your API key:',
            mask: '*',
          },
        ]);
        apiKey = key;
      }
    }

    // Step 6: Configure each client
    console.log();
    const mcpConfig = getSnapbackMCPConfig({ apiKey });

    for (const client of needsSetup) {
      const clientSpinner = ora(`Configuring ${client.name}...`).start();

      const result = writeClientConfig(client, mcpConfig);

      if (result.success) {
        clientSpinner.succeed(`${client.name} configured`);
        if (result.backup) {
          console.log(chalk.dim(`    Backup: ${result.backup}`));
        }
      } else {
        clientSpinner.fail(`${client.name} failed: ${result.error}`);
      }
    }

    // Step 7: Show next steps
    console.log();
    showNextSteps();
  });

function showNextSteps(): void {
  console.log(chalk.bold('Next Steps:\n'));
  console.log('  1. Restart your AI assistant (Claude Desktop, Cursor, etc.)');
  console.log('  2. Ask your AI: "What does SnapBack know about this project?"');
  console.log('  3. Before risky changes, ask: "Create a SnapBack checkpoint"\n');

  console.log(chalk.dim('Available tools your AI can now use:'));
  console.log(chalk.dim('  • snapback.get_context      - Understand your codebase'));
  console.log(chalk.dim('  • snapback.analyze_risk     - Assess change risks'));
  console.log(chalk.dim('  • snapback.create_checkpoint - Create safety snapshots (Pro)'));
  console.log(chalk.dim('  • snapback.restore_checkpoint - Recover from mistakes (Pro)\n'));

  console.log(chalk.blue('Get an API key: https://console.snapback.dev/settings/api-keys\n'));
}
```

### CLI Status Command

```typescript
// apps/cli/src/commands/status.ts

import { Command } from 'commander';
import chalk from 'chalk';
import { detectAIClients } from '@snapback/mcp-config';

export const statusCommand = new Command('status')
  .description('Show SnapBack MCP configuration status')
  .action(async () => {
    console.log(chalk.bold('\n🔒 SnapBack MCP Status\n'));

    const detection = detectAIClients();

    console.log('AI Assistants:\n');

    for (const client of detection.clients) {
      let icon = '⚪';
      let status = 'Not installed';

      if (client.exists && client.hasSnapback) {
        icon = '🟢';
        status = 'Active';
      } else if (client.exists) {
        icon = '🟡';
        status = 'Installed (needs setup)';
      }

      console.log(`  ${icon} ${client.name}: ${status}`);
      if (client.exists) {
        console.log(chalk.dim(`     ${client.configPath}`));
      }
    }

    console.log();

    if (detection.needsSetup.length > 0) {
      console.log(chalk.yellow(`Run 'snapback init' to configure ${detection.needsSetup.length} client(s).\n`));
    } else if (detection.detected.length > 0) {
      console.log(chalk.green('All detected AI assistants are configured!\n'));
    } else {
      console.log(chalk.dim('Install Claude Desktop or Cursor to get started.\n'));
    }
  });
```

### CLI Main Entry

```typescript
// apps/cli/src/index.ts

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';

const program = new Command()
  .name('snapback')
  .description('SnapBack CLI - AI code protection')
  .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(statusCommand);

// Future commands
// program.addCommand(snapshotCommand);
// program.addCommand(restoreCommand);

program.parse();
```

---

## Part 4: MCP Server Tools

### Tool: get_context (The Star of the Show)

```typescript
// apps/mcp-server/src/tools/get-context.ts

import { z } from 'zod';
import type { MCPTool } from '../types';

const GetContextInputSchema = z.object({
  workspacePath: z.string().optional().describe('Path to workspace (auto-detected if not provided)'),
  focusFiles: z.array(z.string()).optional().describe('Specific files to analyze'),
});

export const getContextTool: MCPTool = {
  name: 'snapback.get_context',
  description: `RECOMMENDED: Call this FIRST before modifying any code.

Returns critical context about the codebase including:
- Sensitive files to avoid modifying without explicit instruction
- Current architectural issues (dependency cycles, high complexity)
- Files with recent AI-generated changes (higher risk of issues)
- Recommended patterns and anti-patterns for this codebase
- Active protection status and recent snapshots

This helps you make safer, more informed coding decisions.`,

  inputSchema: GetContextInputSchema,
  tier: 'free',

  handler: async ({ workspacePath, focusFiles }, ctx) => {
    const workspace = workspacePath || ctx.workspacePath;

    if (!workspace) {
      return {
        error: 'No workspace detected. Please provide workspacePath.',
      };
    }

    // Gather context from various analyzers
    const [
      sensitiveFiles,
      architectureIssues,
      recentAIChanges,
      patterns,
      protectionStatus,
    ] = await Promise.all([
      analyzeSensitiveFiles(workspace),
      analyzeArchitecture(workspace),
      getRecentAIChanges(workspace),
      analyzePatterns(workspace),
      getProtectionStatus(workspace),
    ]);

    return {
      workspace,

      // Files that are dangerous to modify
      sensitive_files: sensitiveFiles,

      // Current architectural issues
      architecture: {
        dependency_cycles: architectureIssues.cycles,
        high_complexity_files: architectureIssues.complexFiles,
        large_files: architectureIssues.largeFiles,
      },

      // Files recently modified by AI (be extra careful)
      recent_ai_changes: recentAIChanges,

      // Patterns to follow/avoid
      patterns: {
        recommended: patterns.recommended,
        avoid: patterns.avoid,
      },

      // SnapBack protection status
      protection: {
        enabled: protectionStatus.enabled,
        recent_snapshots: protectionStatus.recentSnapshots,
        last_snapshot_age: protectionStatus.lastSnapshotAge,
      },

      // Actionable suggestions
      suggestions: generateSuggestions({
        sensitiveFiles,
        architectureIssues,
        recentAIChanges,
        focusFiles,
      }),
    };
  },
};

// Implementation functions (simplified - expand as needed)

async function analyzeSensitiveFiles(workspace: string): Promise<string[]> {
  const sensitive: string[] = [];

  // Check for common sensitive patterns
  const patterns = [
    'auth', 'security', 'config', 'secrets',
    'migration', '.env', 'credentials',
  ];

  // TODO: Implement actual file scanning
  // For now, return common patterns found

  return sensitive;
}

async function analyzeArchitecture(workspace: string): Promise<{
  cycles: string[][];
  complexFiles: Array<{ file: string; complexity: number }>;
  largeFiles: Array<{ file: string; lines: number }>;
}> {
  // TODO: Use madge for dependency cycles
  // TODO: Use complexity analysis

  return {
    cycles: [],
    complexFiles: [],
    largeFiles: [],
  };
}

async function getRecentAIChanges(workspace: string): Promise<Array<{
  file: string;
  changedAt: string;
  aiTool: string;
}>> {
  // Query local SnapBack storage for recent AI-detected changes
  // TODO: Implement

  return [];
}

async function analyzePatterns(workspace: string): Promise<{
  recommended: string[];
  avoid: string[];
}> {
  // Analyze codebase for patterns
  // TODO: Implement pattern detection

  return {
    recommended: [
      'Use TypeScript strict mode',
      'Prefer async/await over callbacks',
      'Use Zod for runtime validation',
    ],
    avoid: [
      'Avoid any type',
      'Do not modify files in .snapbackprotected',
      'Avoid circular dependencies',
    ],
  };
}

async function getProtectionStatus(workspace: string): Promise<{
  enabled: boolean;
  recentSnapshots: number;
  lastSnapshotAge: string | null;
}> {
  // Query SnapBack protection status
  // TODO: Implement

  return {
    enabled: true,
    recentSnapshots: 5,
    lastSnapshotAge: '2 minutes ago',
  };
}

function generateSuggestions(context: {
  sensitiveFiles: string[];
  architectureIssues: unknown;
  recentAIChanges: unknown[];
  focusFiles?: string[];
}): string[] {
  const suggestions: string[] = [];

  if (context.sensitiveFiles.length > 0) {
    suggestions.push(
      `⚠️ ${context.sensitiveFiles.length} sensitive file(s) detected. Avoid modifying without explicit instruction.`
    );
  }

  if (context.recentAIChanges.length > 0) {
    suggestions.push(
      `ℹ️ ${context.recentAIChanges.length} file(s) were recently modified by AI. Review carefully before making additional changes.`
    );
  }

  suggestions.push(
    '💡 Create a checkpoint before making significant changes: use snapback.create_checkpoint'
  );

  return suggestions;
}
```

### Tool: analyze_risk

```typescript
// apps/mcp-server/src/tools/analyze-risk.ts

import { z } from 'zod';
import type { MCPTool } from '../types';

const AnalyzeRiskInputSchema = z.object({
  files: z.array(z.string()).describe('Files being modified'),
  changes: z.string().optional().describe('Description of planned changes'),
  diff: z.string().optional().describe('Git-style diff of changes'),
});

export const analyzeRiskTool: MCPTool = {
  name: 'snapback.analyze_risk',
  description: `Analyze the risk level of planned code changes.

Call this BEFORE applying changes to understand potential issues:
- Breaking change detection
- Dependency impact analysis
- Complexity increase warnings
- Test coverage gaps

Returns a risk score and specific recommendations.`,

  inputSchema: AnalyzeRiskInputSchema,
  tier: 'free',

  handler: async ({ files, changes, diff }, ctx) => {
    // Local analysis (free tier)
    const localAnalysis = await analyzeLocally(files, diff);

    // If user has API key, enhance with server-side analysis
    if (ctx.apiKey) {
      try {
        const serverAnalysis = await analyzeWithServer(files, diff, ctx.apiKey);
        return mergeAnalysis(localAnalysis, serverAnalysis);
      } catch {
        // Fall back to local-only
      }
    }

    return localAnalysis;
  },
};

async function analyzeLocally(files: string[], diff?: string) {
  let riskScore = 0;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check file types
  for (const file of files) {
    if (file.includes('auth') || file.includes('security')) {
      riskScore += 30;
      issues.push(`${file}: Security-related file modification`);
    }
    if (file.includes('config') || file.endsWith('.env')) {
      riskScore += 20;
      issues.push(`${file}: Configuration file modification`);
    }
    if (file.includes('migration')) {
      riskScore += 25;
      issues.push(`${file}: Database migration - ensure reversibility`);
    }
  }

  // Analyze diff if provided
  if (diff) {
    if (diff.includes('delete') || diff.includes('remove')) {
      riskScore += 15;
      issues.push('Destructive operations detected');
    }
    if (diff.length > 5000) {
      riskScore += 10;
      issues.push('Large changeset - consider breaking into smaller commits');
    }
  }

  // Cap risk score
  riskScore = Math.min(100, riskScore);

  // Generate recommendations
  if (riskScore > 50) {
    recommendations.push('Create a checkpoint before applying: snapback.create_checkpoint');
  }
  if (riskScore > 30) {
    recommendations.push('Review changes carefully before committing');
  }
  recommendations.push('Run tests after applying changes');

  return {
    risk_score: riskScore,
    risk_level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
    issues,
    recommendations,
    files_analyzed: files.length,
  };
}

async function analyzeWithServer(files: string[], diff: string | undefined, apiKey: string) {
  // Call backend API for enhanced analysis
  // This includes IP-protected algorithms
  const response = await fetch('https://api.snapback.dev/v1/analyze/risk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files, diff }),
  });

  if (!response.ok) {
    throw new Error('Server analysis failed');
  }

  return response.json();
}

function mergeAnalysis(local: unknown, server: unknown) {
  // Merge local and server analysis, preferring server insights
  return {
    ...local,
    ...server,
    enhanced: true,
  };
}
```

### Tool: create_checkpoint (Pro)

```typescript
// apps/mcp-server/src/tools/create-checkpoint.ts

import { z } from 'zod';
import type { MCPTool } from '../types';

const CreateCheckpointInputSchema = z.object({
  files: z.array(z.string()).optional().describe('Specific files to checkpoint (defaults to all tracked)'),
  message: z.string().optional().describe('Description of why this checkpoint was created'),
  tags: z.array(z.string()).optional().describe('Tags for organization'),
});

export const createCheckpointTool: MCPTool = {
  name: 'snapback.create_checkpoint',
  description: `Create a safety checkpoint before making risky changes.

Use this BEFORE:
- Refactoring multiple files
- Applying AI-suggested changes you're uncertain about
- Modifying configuration or infrastructure files
- Any operation you might want to undo

Returns a checkpoint ID that can be used with snapback.restore_checkpoint.

**Requires Pro tier.**`,

  inputSchema: CreateCheckpointInputSchema,
  tier: 'pro',

  handler: async ({ files, message, tags }, ctx) => {
    if (!ctx.apiKey) {
      return {
        error: 'API key required for Pro features',
        upgrade_url: 'https://console.snapback.dev/upgrade',
      };
    }

    // Verify Pro tier
    const tier = await verifyTier(ctx.apiKey);
    if (tier !== 'pro') {
      return {
        error: 'Pro tier required for checkpoints',
        current_tier: tier,
        upgrade_url: 'https://console.snapback.dev/upgrade',
      };
    }

    // Create checkpoint via extension IPC or direct storage
    const checkpoint = await createCheckpoint({
      workspacePath: ctx.workspacePath,
      files,
      message: message || 'AI-requested checkpoint',
      tags: tags || ['ai-checkpoint'],
      trigger: 'mcp',
    });

    return {
      checkpoint_id: checkpoint.id,
      files_included: checkpoint.fileCount,
      total_size: formatBytes(checkpoint.totalSize),
      created_at: checkpoint.createdAt,
      message: checkpoint.message,

      // Help text for the AI
      restore_instruction: `To restore this checkpoint, use: snapback.restore_checkpoint with id "${checkpoint.id}"`,
    };
  },
};

async function verifyTier(apiKey: string): Promise<'free' | 'pro'> {
  // Verify with backend
  const response = await fetch('https://api.snapback.dev/v1/auth/verify', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) return 'free';

  const { tier } = await response.json();
  return tier;
}

async function createCheckpoint(options: {
  workspacePath: string;
  files?: string[];
  message: string;
  tags: string[];
  trigger: string;
}) {
  // TODO: Implement via extension IPC or direct blob storage
  // For now, mock response

  return {
    id: `chk_${Date.now()}`,
    fileCount: options.files?.length || 10,
    totalSize: 1024 * 50,
    createdAt: new Date().toISOString(),
    message: options.message,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
```

---

## Part 5: Package Structure

```
packages/
├── mcp-config/                    # NEW: Shared config detection/writing
│   ├── src/
│   │   ├── detect.ts              # AI client detection
│   │   ├── write.ts               # Config file writing
│   │   ├── types.ts               # Shared types
│   │   └── index.ts               # Public exports
│   ├── package.json
│   └── tsconfig.json
│
apps/
├── cli/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── init.ts            # snapback init
│   │   │   └── status.ts          # snapback status
│   │   └── index.ts               # CLI entry point
│   ├── package.json
│   └── tsconfig.json
│
├── vscode/
│   ├── src/
│   │   ├── mcp/
│   │   │   └── auto-configure.ts  # Extension auto-config
│   │   └── commands/
│   │       └── mcp.ts             # Manual MCP commands
│
├── mcp-server/                    # Already exists - enhance tools
│   ├── src/
│   │   └── tools/
│   │       ├── get-context.ts     # The star tool
│   │       ├── analyze-risk.ts    # Enhanced
│   │       └── create-checkpoint.ts # Pro feature
```

---

## Part 6: Testing Strategy

### Unit Tests

```typescript
// packages/mcp-config/src/__tests__/detect.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAIClients } from '../detect';
import * as fs from 'fs';

vi.mock('fs');
vi.mock('os', () => ({
  homedir: () => '/Users/test',
  platform: () => 'darwin',
}));

describe('detectAIClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects Claude Desktop when config exists', () => {
    vi.mocked(fs.existsSync).mockImplementation((path) =>
      path.toString().includes('Claude')
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const result = detectAIClients();

    expect(result.detected).toHaveLength(1);
    expect(result.detected[0].name).toBe('Claude Desktop');
    expect(result.detected[0].hasSnapback).toBe(false);
  });

  it('detects existing SnapBack configuration', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      mcpServers: {
        snapback: { command: 'npx', args: ['@snapback/mcp'] },
      },
    }));

    const result = detectAIClients();

    expect(result.detected[0].hasSnapback).toBe(true);
    expect(result.needsSetup).toHaveLength(0);
  });

  it('handles missing config files gracefully', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = detectAIClients();

    expect(result.detected).toHaveLength(0);
    expect(result.needsSetup).toHaveLength(0);
  });
});
```

### Integration Tests

```typescript
// apps/cli/src/__tests__/init.integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('snapback init', () => {
  let tempDir: string;
  let originalHome: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'snapback-test-'));
    originalHome = process.env.HOME!;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(tempDir, { recursive: true });
  });

  it('configures Claude Desktop when detected', () => {
    // Create Claude config directory
    const claudeDir = join(tempDir, 'Library/Application Support/Claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'claude_desktop_config.json'), '{}');

    // Run init (non-interactive)
    execSync('echo "y" | snapback init', {
      env: { ...process.env, HOME: tempDir },
      encoding: 'utf-8',
    });

    // Verify config was written
    const config = JSON.parse(
      readFileSync(join(claudeDir, 'claude_desktop_config.json'), 'utf-8')
    );

    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers.snapback).toBeDefined();
    expect(config.mcpServers.snapback.command).toBe('npx');
  });
});
```

### E2E Tests

```typescript
// apps/mcp-server/src/__tests__/tools.e2e.test.ts

import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP Tools E2E', () => {
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@snapback/mcp'],
    });

    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('get_context returns valid structure', async () => {
    const result = await client.callTool({
      name: 'snapback.get_context',
      arguments: { workspacePath: process.cwd() },
    });

    expect(result.content).toBeDefined();
    const content = JSON.parse(result.content[0].text);

    expect(content.workspace).toBeDefined();
    expect(content.patterns).toBeDefined();
    expect(content.protection).toBeDefined();
  });

  it('analyze_risk returns risk assessment', async () => {
    const result = await client.callTool({
      name: 'snapback.analyze_risk',
      arguments: {
        files: ['src/auth.ts'],
        changes: 'Modifying authentication logic',
      },
    });

    const content = JSON.parse(result.content[0].text);

    expect(content.risk_score).toBeGreaterThan(0);
    expect(content.risk_level).toMatch(/low|medium|high/);
  });
});
```

---

## Part 7: Acceptance Criteria

### Phase 1: Foundation (Days 1-2)

- [ ] `@snapback/mcp-config` package created with detect/write modules
- [ ] Unit tests for detection on macOS, Windows, Linux paths
- [ ] Unit tests for config writing with backup
- [ ] Handles malformed JSON gracefully

### Phase 2: CLI (Days 3-4)

- [ ] `snapback init` works end-to-end
- [ ] `snapback status` shows correct detection
- [ ] Interactive prompts work correctly
- [ ] Non-interactive mode (CI/scripts) works with --yes flag
- [ ] Published to npm as `@snapback/cli`

### Phase 3: Extension Integration (Days 4-5)

- [ ] Auto-configure triggers on first extension activation
- [ ] User can disable via settings
- [ ] Manual commands work (configure, status, disable)
- [ ] Telemetry tracks configuration success/failure

### Phase 4: MCP Tools Enhancement (Days 5-7)

- [ ] `get_context` returns useful, actionable information
- [ ] `analyze_risk` works locally (free tier)
- [ ] `analyze_risk` enhances with server analysis (pro tier)
- [ ] `create_checkpoint` requires and validates pro tier
- [ ] All tools have comprehensive descriptions that guide LLM behavior

### Demo Ready Checklist

- [ ] Fresh user can install extension → AI assistants auto-configured
- [ ] User can say "What does SnapBack know about this project?" → useful response
- [ ] User can say "Analyze the risk of modifying auth.ts" → risk assessment
- [ ] Pro user can say "Create a checkpoint before I refactor" → checkpoint created
- [ ] Error messages are helpful and include upgrade URLs where appropriate

---

## Part 8: Telemetry Events

```typescript
// Event tracking for the MCP companion feature

// Detection & Configuration
'mcp_auto_configure_no_clients'      // No AI clients found
'mcp_auto_configure_already_setup'   // All clients already configured
'mcp_auto_configure_prompt_shown'    // User shown the prompt
'mcp_auto_configure_complete'        // Configuration completed
'mcp_cli_init_started'               // CLI init command started
'mcp_cli_init_completed'             // CLI init command completed
'mcp_manual_configure'               // Manual configuration via command

// Tool Usage
'mcp_tool_called'                    // Any MCP tool called
  // Properties: tool_name, tier, success, duration_ms
'mcp_get_context_called'             // get_context specifically
'mcp_analyze_risk_called'            // analyze_risk specifically
'mcp_checkpoint_created'             // Checkpoint created via MCP
'mcp_checkpoint_restored'            // Checkpoint restored via MCP

// Errors
'mcp_config_write_failed'            // Failed to write config
'mcp_tool_error'                     // Tool execution error
'mcp_auth_failed'                    // API key validation failed
```

---

## Quick Start for Implementation

```bash
# 1. Create the mcp-config package
mkdir -p packages/mcp-config/src
cd packages/mcp-config

# 2. Initialize package
cat > package.json << 'EOF'
{
  "name": "@snapback/mcp-config",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest"
  }
}
EOF

# 3. Implement detect.ts, write.ts, index.ts

# 4. Add to CLI
cd ../../apps/cli
pnpm add @snapback/mcp-config

# 5. Add to VS Code extension
cd ../vscode
pnpm add @snapback/mcp-config

# 6. Test the flow
pnpm build
snapback init
```

---

## Summary

This spec provides everything needed to implement the A+C hybrid approach:

1. **Detection** - Find Claude Desktop, Cursor, etc.
2. **Configuration** - Write MCP config automatically
3. **Extension-First** - Zero-config for VS Code users
4. **CLI Fallback** - `snapback init` for others
5. **Context Tools** - Make `get_context` so useful LLMs want to call it
6. **Testing** - Unit, integration, and E2E coverage
7. **Telemetry** - Track adoption and issues

The key insight remains: **own the context, not the pipe**. If your tools return genuinely useful information, AI assistants will use them without needing to route everything through you.
