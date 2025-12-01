---
title: Privacy Policy
description: How SnapBack collects, uses, and protects personal data across our web app, API, and IDE extensions.
sidebar:
  order: 1
last_updated: 2025-11-12
---

# Privacy Policy

_Effective date: 2025-11-12_

SnapBack ("**we**," "**us**," "**our**") provides developer safety tooling across the SnapBack web app, `api.snapback.dev`, and our IDE extensions ("**Services**"). This Privacy Policy explains what we collect, why we collect it, and how you can control your data.

> Summary
> - We collect the minimum necessary account data, operational telemetry, and optional analytics to run the Services.
> - We **do not** train foundation models on your private code or content without explicit opt-in.
> - Secure cross-subdomain session cookies; granular opt-outs for telemetry/analytics.
> - Access, export, or delete your data via the dashboard's **Privacy Center** or **privacy@snapback.dev**.

---

## 1) Scope

This Policy covers data processed when you use our website, API, dashboards, and IDE extensions. It does not apply to third-party services you connect (e.g., GitHub/Google), which have their own policies.

## 2) What We Collect

**2.1 Account & Organization Data**
- Name, email, password hash or OAuth identifiers (Google/GitHub), organization/workspace name, role.
- Billing contact and subscription details (processed by our payment provider; we store tokens/IDs, not full card data).

**2.2 Product Usage & Telemetry**
- API requests (timestamps, endpoints, status codes), extension events (activation, errors, feature flags), and security logs (auth success/failure, device/approximate IP at city level).
- **Content you send** to the Services (e.g., code snippets for specific features) is processed to provide functionality and for fraud/abuse detection. Diagnostic captures are configurable.

**2.3 Analytics (PostHog)**
- Pseudonymous event data (feature usage, funnels, performance).
- **Not collected into analytics:** code/content bodies, repository sources, or secrets.
- Respect for "Do Not Track" where feasible plus per-workspace toggles. Cookies/local storage support session continuity, CSRF, and attribution.

**2.4 Device/Network Metadata**
- Browser/OS or IDE version, locale, time zone, IP-derived coarse geolocation (city/state/country), referrer.

## 3) How We Use Data

- Provide, operate, secure, and troubleshoot the Services.
- Personalize features, run A/B tests, measure performance.
- Communicate about changes, billing, security notices, and support.
- Comply with law, enforce terms, and prevent abuse.
- **Model training:** no Customer Content used to train foundation models without explicit opt-in.

## 4) Legal Bases (EEA/UK)

Contract necessity, legitimate interests (product improvement, fraud prevention), consent (where required, e.g., certain cookies/analytics), and legal obligations.

## 5) Sharing & Disclosures

We share data with subprocessors **only as necessary** to provide the Services and **subject to data protection terms/DPAs** where legally required. Typical vendors include:
- Hosting/edge **Vercel and Fly.io**; telemetry/observability; email delivery **[e.g., Resend]**; product analytics **(PostHog)**; payments **[e.g., Stripe]**; error reporting; authentication (OAuth via Google/GitHub; Better Auth server-side).
We may disclose data to comply with law, respond to lawful requests, or protect rights, safety, and property. In a merger/acquisition, we'll notify you of changes to control or practices.

## 6) International Transfers

We may transfer data internationally using approved safeguards (e.g., EU Standard Contractual Clauses). Some vendors participate in the EU-U.S. Data Privacy Framework or offer GDPR-aligned terms.

## 7) Retention

- Account/billing data: while your account is active and as needed for compliance.
- Security logs: typically **30–90 days**.
- Analytics events: up to **13 months**; aggregated reports may be retained longer.
- Feature-processed content: retained only as needed for that feature, then deleted/minimized per setting.

## 8) Your Rights & Controls

Manage privacy settings, DSAR requests (access/export/delete), sessions, and tokens in the **Privacy Center**. You can also email **privacy@snapback.dev**. EEA/UK users may contact their supervisory authority.

## 9) California Privacy (CPRA)

We do not sell personal information. We honor rights to know, delete, correct, and opt-out of certain sharing. Use the **Privacy Center** or contact **privacy@snapback.dev**.

## 10) Cookies & Similar Tech

We use strictly necessary cookies (auth/session/CSRF), functional preferences, and analytics cookies (PostHog). See **/cookies** for the current list and controls.

## 11) Children

We do not knowingly collect personal data from individuals under 16. If you believe a child has provided personal data, contact us for deletion.

## 12) Changes

We'll post updates here and adjust the "last_updated" date. Material changes will be communicated via email or in-app.

## 13) Contact

**SnapBack Privacy** — **privacy@snapback.dev**
Controller: **Marcelle Labs LLC, 229 SE Douglas St, Ste 210, Lees Summit, MO 64063**
DPA/SCCs: **dpa@snapback.dev**

---
