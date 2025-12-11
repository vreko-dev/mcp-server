graph TD
    subgraph "VS Code Host"
        Editor[Active Text Editor]
        Command[Command Palette]
        VSCodeAuth[VS Code Auth API]
    end

    subgraph "SnapBack Extension"
        subgraph "Pioneer Layer"
            PAuth[PioneerAuth]
            PGate[PioneerGatekeeper]
            PPoints[PointsTracker]
            PStatus[StatusBarItem]
        end

        subgraph "Engine Layer"
            Burst[BurstDetector]
            Protect[ProtectionManager]
            Graph[GraphEngine]
            Cooldown[CooldownCache]
        end

        subgraph "Storage Layer"
            Storage[StorageManager]
            Blob[BlobStore]
            Snap[SnapshotStore]
            Config[ConfigStore]
            Audit[AuditLog]
        end

        subgraph "UI Layer"
            Sidebar[SidebarProvider]
            Tutorial[InteractiveTutorial]
        end

        subgraph "Telemetry"
            PH[PostHog]
            Scrub[PII Scrubber]
        end
    end

    subgraph "File System"
        FS_Blobs[blobs/]
        FS_Snaps[snapshots/]
        FS_Audit[audit.jsonl]
    end

    subgraph "Backend API (Stub)"
        API[/api/pioneer/*]
    end

    %% Pioneer flows
    VSCodeAuth -->|OAuth| PAuth
    PAuth -->|Profile| PGate
    PGate -->|State Change| PStatus
    PGate -->|State Change| Sidebar

    %% Engine flows
    Editor -->|OnDidChange| Burst
    Editor -->|OnWillSave| Protect
    Burst -->|Trigger| Protect
    Protect -->|Check Tier| PGate
    Protect -->|Check Level| Config
    Protect -->|Analyze| Graph
    Graph -->|Check Tier| PGate
    Protect -->|Debounce| Cooldown
    Protect -->|Persist| Storage

    %% Storage flows
    Storage -->|Write| Blob
    Storage -->|Write| Snap
    Storage -->|Log| Audit
    Blob -->|Raw| FS_Blobs
    Snap -->|JSON| FS_Snaps
    Audit -->|Append| FS_Audit

    %% UI flows
    Sidebar -->|Read| Storage
    Tutorial -->|Handoff| Storage
    Tutorial -->|Reveal| Sidebar

    %% Telemetry
    PAuth -.->|Event| Scrub
    PPoints -.->|Event| Scrub
    Protect -.->|Event| Scrub
    Storage -.->|Event| Scrub
    Scrub -->|Sanitized| PH

    %% Backend (future)
    PAuth -.->|Sync| API
    PPoints -.->|Sync| API
