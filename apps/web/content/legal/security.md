---
title: Security
description: How SnapBack secures your code, data, and workflows—from architecture to incident response.
sidebar:
  order: 3
last_updated: 2025-11-12
---

# Security

SnapBack is built for **developer safety**. This page outlines our technical and organizational controls. Need specifics (pentest summary, DPA, SCCs)? Email **security@snapback.dev**.

## At-a-Glance

- **Hosting & Edge**: **Vercel and Fly.io** with isolated deployments and immutable artifacts.
- **Encryption**: TLS in transit; AES-256 at rest for databases, object storage, and backups.
- **Auth**: Better Auth with `Secure`, `HttpOnly`, `SameSite=Lax` cookies across subdomains; optional OIDC SSO; step-up for sensitive actions.
- **Least-Privilege**: RBAC, scoped API tokens, short-lived JWTs, **zero-trust** access internally.
- **SDLC**: TDD (red-green-refactor), mandatory reviews, SCA/SAST, reproducible builds, supply-chain pinning.
- **Telemetry**: Security logging (auth, admin actions), anomaly detection, tamper-evident storage.
- **Incidents**: 24×7 on-call; customer notification aligned to legal/contractual obligations.

## Architecture & Data Flow

- **Web app** ↔ **API** (`api.snapback.dev`) over TLS.
- **IDE extensions** use OAuth sessions and scoped tokens to call the API.
- Sensitive operations (policy changes, token issuance, org membership) require step-up auth and are fully audited.
- Secrets reside in managed secret stores; never in code or client storage.

## Data Classification & Minimization

- **Customer Content** is processed only to deliver features you enable, then deleted/minimized per setting.
- **Operational Data** is minimized, redacted at ingestion, and rotated.
- **Analytics** use pseudonymous IDs; event schemas exclude code bodies and secrets; per-workspace disable is available.

## Authentication & Authorization

- OAuth (Google/GitHub) and passwordless options.
- Session cookies: `Secure`, `HttpOnly`, `SameSite=Lax`; CSRF tokens on state-changing routes.
- Roles: Owner/Admin/Member; resource-scoped permissions; full audit trails.

## Application Security

- Input validation, output encoding, CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- OWASP Top 10 covered by coding standards and tests.
- **Remote-safe FS** in extensions; no arbitrary shell by default.
- Pre-commit/CI hooks prevent secret leakage; server-side validators block accidental ingestion.

## Zero-Trust Access to Production

- **No default access** to production data.
- **Just-in-time (JIT)** elevation with approvals; session recording and audit trails.
- Break-glass procedures for emergencies with post-incident review.

## Supply Chain & Build

- **Package policy**: pinned versions via catalog; license checks; integrity verification.
- **CI/CD**: ephemeral build agents; artifact signing; protected environments; manual approval for privileged changes.
- Dependency scanning: SCA (critical/high fail the build); SAST for common sinks.

## Vulnerability Management

- Intake: `security@snapback.dev`.
- Triage SLAs: Critical (24h), High (3d), Medium (14d).
- Disclosure: Coordinated, with advisories and mitigations.
- **Pen-Testing**: Independent third-party at least annually and after material changes; summary available under NDA.

## Backups, DR, & Continuity

- Encrypted backups with rolling retention; periodic restore drills.
- **[Multi-region failover, if configured]**; RTO/RPO targets available to enterprise customers.

## Data Retention & Deletion

- Default log retention **30–90 days**.
- Org owners can request export or deletion; hard-delete performed within standard SLA unless legally prohibited.

## Compliance

- GDPR/UK GDPR-aligned practices; DPA & SCCs on request.
- Vendor reviews and subprocessor agreements in place.
- Analytics via PostHog with GDPR controls and EU hosting options.

## Subprocessors

We maintain a current list at **/legal/subprocessors** (email for copy). Typical vendors include:
- Hosting/edge **Vercel and Fly.io**
- Product analytics **PostHog**
- Payments **[Stripe]**
- Email delivery **[Resend]**
- Error monitoring **[e.g., Sentry]**

## Report a Vulnerability

Email **security@snapback.dev** with steps to reproduce and any proofs of concept. We credit researchers upon request.

---

_Last updated: 2025-11-12_
