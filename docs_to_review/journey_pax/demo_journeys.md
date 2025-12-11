## Demo User Journeys

### Core Activation Funnel
| # | Journey | Surfaces | Status |
|---|---------|----------|--------|
| 1 | Waitlist → Email verify → Welcome | Web | 🔴 Missing endpoint |
| 2 | Install Extension → OAuth → First Protected Save | Extension + Web | ⚠️ Partial |
| 3 | Dashboard → Create API Key → Copy Key | Web + API | 🔴 Wiring gap |

### Extension Protection Journeys
| # | Journey | Status |
|---|---------|--------|
| 4 | Save file → AutoDecisionEngine → Snapshot created | ✅ Ready |
| 5 | AI burst detected → Notification → Snapshot | ✅ Ready |
| 6 | View snapshot history → Compare → Restore | ✅ Ready |
| 7 | Manual snapshot → Name → Confirm | ✅ Ready |

### MCP Intelligence Journeys
| # | Journey | Tool | Tier |
|---|---------|------|------|
| 8 | AI asks "is this risky?" → `analyze_risk` → Risk score + factors | Free |
| 9 | AI checks deps → `check_dependencies` → Vulnerability report | Free |
| 10 | AI creates checkpoint → `create_checkpoint` → Snapshot ID | Pro |
| 11 | AI lists checkpoints → `list_checkpoints` → Snapshot list | Pro |
| 12 | AI restores code → `restore_checkpoint` → Files restored | Pro |
| 13 | AI gets docs → `ctx7.get-library-docs` → Documentation | Free |

### CLI Journeys
| # | Journey | Command | Tier |
|---|---------|---------|------|
| 14 | Dev checks staged files → `snapback check --staged` → Risk report | Free |
| 15 | Dev creates snapshot → `snapback snapshot create` → Local snapshot | Free |
| 16 | Dev lists snapshots → `snapback snapshot list` → History | Free |
| 17 | Dev restores snapshot → `snapback snapshot restore <id>` → Files restored | Free |
| 18 | CI/CD gate → `snapback scan --ci --fail-on error` → Exit code | Pro |

### Rollback Validation (Pro)
| # | Journey | Surface | Status |
|---|---------|---------|--------|
| 19 | Request rollback → Dependency analysis (madge) → Safety score | API | 🔴 Missing |
| 20 | MCP restore → Validate first → Warn on breaking changes | MCP | 🔴 Missing |

### Dashboard Intelligence
| # | Journey | Status |
|---|---------|--------|
| 21 | View metrics → Snapshots/Recoveries/AI detection rate | 🟡 Mock data |
| 22 | View AI tool breakdown → Detection by tool | 🟡 Mock data |
| 23 | View activity feed → Recent events | 🟡 Mock data |

---

## Demo-Critical Path (Minimum Viable)

```
1. Waitlist signup         → Need: /api/waitlist
2. OAuth + API key         → Need: ORPC wiring
3. Extension first save    → Ready
4. MCP analyze_risk        → Ready (needs key)
5. MCP create_checkpoint   → Ready (needs key)
6. CLI snapshot restore    → Ready (needs key)
7. Dashboard shows data    → Need: Real data fetchers
```

**Blockers to clear: 3** (waitlist, ORPC, dashboard data)
