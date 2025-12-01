# SnapBack-Site Architecture Visualization

## Current State Diagram

```mermaid
graph TD
    subgraph "Main Repository (Git Repo 1)"
        ROOT[SnapBack-Site Root<br/>pnpm@10.14.0 + Turbo 2.5.6]

        subgraph "apps/"
            WEB[apps/web<br/>Next.js 15 SaaS<br/>@repo/web]
        end

        subgraph "packages/ (9 packages)"
            API[api<br/>HONO + oRPC]
            AUTH[auth<br/>Better Auth]
            DB[database<br/>Drizzle]
            I18N[i18n]
            LOGS[logs]
            MAIL[mail]
            PAY[payments]
            STOR1[storage]
            UTIL[utils]
        end

        subgraph "config/"
            CONF[config<br/>Feature flags]
        end

        subgraph "tooling/"
            TS[typescript configs]
            TW[tailwind config]
            SCR[scripts]
        end

        ROOT --> WEB
        ROOT --> API
        ROOT --> AUTH
        ROOT --> DB
        ROOT --> CONF
        ROOT --> TS
    end

    subgraph "⚠️ Nested Repository (Git Repo 2)"
        CLIENTS[clients/snapback-clients<br/>pnpm@9.12.0 + Turbo]

        subgraph "clients/apps/"
            CLI[cli<br/>@snapback/cli]
            MCP[mcp-server<br/>@snapback/mcp]
            VSC1[vscode<br/>v0.1.0 Full]
        end

        subgraph "clients/packages/"
            CORE[core<br/>Guardian logic]
            CONT[contracts<br/>Zod schemas]
            STOR2[storage<br/>DUPLICATE]
            TELE[telemetry]
            CONF2[config<br/>DUPLICATE]
        end

        CLIENTS --> CLI
        CLIENTS --> MCP
        CLIENTS --> VSC1
        CLIENTS --> CORE
    end

    subgraph "⚠️ Standalone Applications"
        SBDEV[sbapback.dev<br/>Next.js Marketing<br/>npm - no lockfile]
        EXT[extensions/vscode<br/>v0.0.1 Skeleton<br/>DUPLICATE]
    end

    ROOT -.->|nested| CLIENTS
    ROOT -.->|isolated| SBDEV
    ROOT -.->|isolated| EXT

    style CLIENTS fill:#ff9999
    style SBDEV fill:#ffcc99
    style EXT fill:#ffcc99
    style STOR2 fill:#ff6666
    style CONF2 fill:#ff6666
    style VSC1 fill:#99ff99
```

## Recommended Target State

```mermaid
graph TD
    subgraph "Unified Monorepo"
        ROOT[SnapBack-Site Root<br/>pnpm@10.14.0 + Turbo 2.5.6]

        subgraph "apps/ (5 applications)"
            WEB[web<br/>SaaS Application<br/>@snapback/web]
            MARK[marketing<br/>Marketing Site<br/>@snapback/marketing]
            CLI[cli<br/>CLI Tool<br/>@snapback/cli]
            MCP[mcp-server<br/>MCP Integration<br/>@snapback/mcp-server]
            EXT[extension<br/>VS Code Extension<br/>@snapback/extension]
        end

        subgraph "packages/ (12 packages)"
            API[api]
            AUTH[auth]
            DB[database]
            CORE[snapback-core<br/>Guardian logic]
            CONT[snapback-contracts<br/>Zod schemas]
            TELE[snapback-telemetry]
            I18N[i18n]
            LOGS[logs]
            MAIL[mail]
            PAY[payments]
            STOR[storage<br/>Unified]
            UTIL[utils]
        end

        subgraph "config/"
            CONF[config<br/>Unified]
        end

        subgraph "tooling/"
            TS[typescript<br/>Project refs enabled]
            TW[tailwind]
            SCR[scripts]
        end

        ROOT --> WEB
        ROOT --> MARK
        ROOT --> CLI
        ROOT --> MCP
        ROOT --> EXT
        ROOT --> API
        ROOT --> AUTH
        ROOT --> DB
        ROOT --> CORE
        ROOT --> CONT
        ROOT --> TELE
        ROOT --> CONF
        ROOT --> TS

        WEB --> API
        WEB --> AUTH
        WEB --> DB
        MARK --> UTIL
        CLI --> CORE
        CLI --> STOR
        MCP --> CORE
        MCP --> CONT
        EXT --> CORE
        EXT --> TELE
        API --> DB
        API --> AUTH
        CORE --> CONT
    end

    style ROOT fill:#99ccff
    style WEB fill:#99ff99
    style MARK fill:#99ff99
    style CLI fill:#99ff99
    style MCP fill:#99ff99
    style EXT fill:#99ff99
    style CORE fill:#ffff99
    style CONT fill:#ffff99
    style TELE fill:#ffff99
```

## Migration Flow

```mermaid
flowchart LR
    subgraph "Phase 1: Consolidation"
        P1A[Move sbapback.dev<br/>→ apps/marketing]
        P1B[Consolidate VS Code<br/>Delete extensions/vscode<br/>Keep clients version]
        P1C[Update workspace config]

        P1A --> P1B --> P1C
    end

    subgraph "Phase 2: Flatten Clients"
        P2A[Move apps/<br/>cli, mcp-server, vscode<br/>→ apps/]
        P2B[Move packages/<br/>core, contracts, telemetry<br/>→ packages/]
        P2C[Merge duplicates<br/>storage, config]
        P2D[Update imports]

        P2A --> P2B --> P2C --> P2D
    end

    subgraph "Phase 3: Build Optimization"
        P3A[Enable TS<br/>project references]
        P3B[Optimize<br/>turbo.json]
        P3C[Configure<br/>vitest workspace]

        P3A --> P3B --> P3C
    end

    subgraph "Phase 4: Polish"
        P4A[Unify namespace<br/>→ @snapback/*]
        P4B[Update docs]
        P4C[CI/CD optimization]

        P4A --> P4B --> P4C
    end

    P1C --> P2A
    P2D --> P3A
    P3C --> P4A

    style P1A fill:#ffcc99
    style P1B fill:#ffcc99
    style P2A fill:#99ccff
    style P2B fill:#99ccff
    style P3A fill:#99ff99
    style P3B fill:#99ff99
    style P4A fill:#ffff99
```

## Build Dependency Graph (Current)

```mermaid
graph LR
    subgraph "Main Monorepo Build"
        DB_GEN[database:generate]
        DB_BUILD[database:build]
        AUTH_BUILD[auth:build]
        API_BUILD[api:build]
        WEB_BUILD[web:build]

        DB_GEN --> DB_BUILD
        DB_BUILD --> AUTH_BUILD
        DB_BUILD --> API_BUILD
        AUTH_BUILD --> API_BUILD
        API_BUILD --> WEB_BUILD
    end

    subgraph "⚠️ Isolated: clients/snapback-clients"
        CORE_BUILD[core:build]
        CONT_BUILD[contracts:build]
        CLI_BUILD[cli:build]
        MCP_BUILD[mcp-server:build]
        VSC_BUILD[vscode:build]

        CONT_BUILD --> CORE_BUILD
        CORE_BUILD --> CLI_BUILD
        CORE_BUILD --> MCP_BUILD
        CORE_BUILD --> VSC_BUILD
    end

    subgraph "⚠️ Isolated: sbapback.dev"
        MARK_BUILD[marketing:build]
    end

    style CORE_BUILD fill:#ff9999
    style CONT_BUILD fill:#ff9999
    style CLI_BUILD fill:#ff9999
    style MCP_BUILD fill:#ff9999
    style VSC_BUILD fill:#ff9999
    style MARK_BUILD fill:#ffcc99
```

## Build Dependency Graph (Target)

```mermaid
graph LR
    subgraph "Unified Build Pipeline"
        DB_GEN[database:generate]
        DB_BUILD[database:build]
        CORE_BUILD[snapback-core:build]
        CONT_BUILD[snapback-contracts:build]
        AUTH_BUILD[auth:build]
        API_BUILD[api:build]
        TELE_BUILD[snapback-telemetry:build]

        WEB_BUILD[web:build]
        MARK_BUILD[marketing:build]
        CLI_BUILD[cli:build]
        MCP_BUILD[mcp-server:build]
        EXT_BUILD[extension:build]

        DB_GEN --> DB_BUILD
        CONT_BUILD --> CORE_BUILD

        DB_BUILD --> AUTH_BUILD
        DB_BUILD --> API_BUILD
        CORE_BUILD --> CLI_BUILD
        CORE_BUILD --> MCP_BUILD
        CORE_BUILD --> EXT_BUILD

        AUTH_BUILD --> API_BUILD
        API_BUILD --> WEB_BUILD

        TELE_BUILD --> EXT_BUILD
    end

    style DB_GEN fill:#ff9999
    style WEB_BUILD fill:#99ff99
    style MARK_BUILD fill:#99ff99
    style CLI_BUILD fill:#99ff99
    style MCP_BUILD fill:#99ff99
    style EXT_BUILD fill:#99ff99
```

## Package Dependency Matrix

### Current State

| Package                  | Depends On                | Used By                          |
| ------------------------ | ------------------------- | -------------------------------- |
| **database**             | -                         | auth, api, web                   |
| **auth**                 | database                  | api, web                         |
| **api**                  | database, auth            | web                              |
| **web**                  | api, auth, database       | -                                |
| **⚠️ clients/core**      | contracts (separate repo) | cli, mcp, vscode (separate repo) |
| **⚠️ clients/contracts** | -                         | core (separate repo)             |

### Target State

| Package                | Depends On                        | Used By                    |
| ---------------------- | --------------------------------- | -------------------------- |
| **database**           | -                                 | auth, api, web             |
| **snapback-contracts** | -                                 | snapback-core              |
| **snapback-core**      | snapback-contracts                | cli, mcp-server, extension |
| **auth**               | database                          | api, web                   |
| **api**                | database, auth                    | web                        |
| **web**                | api, auth, database               | -                          |
| **marketing**          | utils, ui                         | -                          |
| **cli**                | snapback-core, storage            | -                          |
| **mcp-server**         | snapback-core, snapback-contracts | -                          |
| **extension**          | snapback-core, snapback-telemetry | -                          |

## Performance Comparison

```mermaid
graph LR
    subgraph "Current: Cold Build"
        C1[Main repo<br/>~5min]
        C2[clients repo<br/>~2min]
        C3[sbapback.dev<br/>~3min]
        C4[Total: ~10min<br/>Serial]
    end

    subgraph "Target: Cold Build"
        T1[Unified build<br/>~6min<br/>Parallel]
    end

    subgraph "Current: Incremental"
        I1[Changed package<br/>~2min<br/>Rebuild dependents]
    end

    subgraph "Target: Incremental"
        T2[Changed package<br/>~20sec<br/>TS project refs<br/>Turbo cache]
    end

    style C4 fill:#ff9999
    style T1 fill:#99ff99
    style I1 fill:#ffcc99
    style T2 fill:#99ff99
```

## TypeScript Project References Flow

```mermaid
graph TD
    subgraph "Without Project References (Current)"
        W1[Change in database/]
        W2[tsc rebuilds database]
        W3[tsc rebuilds ALL<br/>dependent packages<br/>from source]
        W4[Total: ~2min]

        W1 --> W2 --> W3 --> W4

        style W4 fill:#ff9999
    end

    subgraph "With Project References (Target)"
        P1[Change in database/]
        P2[tsc --build rebuilds<br/>database + emits .d.ts]
        P3[Dependent packages use<br/>.d.ts files<br/>No recompilation needed]
        P4[Total: ~20sec]

        P1 --> P2 --> P3 --> P4

        style P4 fill:#99ff99
    end
```

## Workspace Configuration Evolution

### Current: Split Workspaces

```yaml
# Main: pnpm-workspace.yaml
packages:
  - config
  - apps/*          # Only web
  - packages/*      # 9 packages
  - tooling/*

# Clients: pnpm-workspace.yaml (separate)
packages:
  - apps/*          # cli, mcp-server, vscode
  - packages/*      # core, contracts, storage, telemetry, config
```

### Target: Unified Workspace

```yaml
# pnpm-workspace.yaml
packages:
    - config
    - apps/* # web, marketing, cli, mcp-server, extension
    - packages/* # All 12 packages unified
    - tooling/*

catalogs:
    default:
        react: 19.1.1
        typescript: 5.9.2
        vitest: 3.2.4
        # Centralized version management
```

## Summary Statistics

### Current State

-   **Git Repositories**: 3 (main + nested clients + potential submodules)
-   **Package Managers**: 2 (pnpm in main + clients, npm in sbapback.dev)
-   **Total Apps**: 5 (web, sbapback.dev, cli, mcp-server, 2x vscode)
-   **Total Packages**: 14 (9 main + 5 clients, with duplicates)
-   **Duplicate Applications**: 1 (VS Code extension)
-   **Duplicate Packages**: 2 (storage, config)
-   **Build Tools**: 2 Turbo configs (main + clients)

### Target State

-   **Git Repositories**: 1 (unified)
-   **Package Managers**: 1 (pnpm)
-   **Total Apps**: 5 (web, marketing, cli, mcp-server, extension)
-   **Total Packages**: 12 (unified, no duplicates)
-   **Duplicate Applications**: 0
-   **Duplicate Packages**: 0
-   **Build Tools**: 1 unified Turbo config

### Expected Improvements

-   **Setup Time**: 50% reduction (single repo clone + install)
-   **Build Time (Cold)**: 40% reduction (parallel builds, unified cache)
-   **Build Time (Incremental)**: 6x improvement (20sec vs 2min)
-   **CI/CD Duration**: 50% reduction (unified pipeline)
-   **Maintenance Overhead**: 70% reduction (single source of truth)
