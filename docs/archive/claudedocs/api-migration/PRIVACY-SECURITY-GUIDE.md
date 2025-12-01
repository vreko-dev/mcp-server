# SnapBack Privacy & Security Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-02
**Audience**: All users, developers, compliance teams

---

## Table of Contents

1. [Privacy Principles](#privacy-principles)
2. [What Data is Collected](#what-data-is-collected)
3. [What Data is NEVER Collected](#what-data-is-never-collected)
4. [Opt-In Flow](#opt-in-flow)
5. [Data Retention & Deletion](#data-retention--deletion)
6. [Security Best Practices](#security-best-practices)
7. [Compliance](#compliance)
8. [Frequently Asked Questions](#frequently-asked-questions)

---

## Privacy Principles

### Core Commitment: Privacy-First Architecture

SnapBack is built on three foundational privacy principles:

**1. Local-First Processing**

-   All source code analysis happens on your machine
-   File contents NEVER leave your computer
-   Code remains under your complete control

**2. Metadata-Only Transmission**

-   Only anonymous operation statistics sent to API
-   No identifiable code, paths, or sensitive data transmitted
-   Metadata is aggregated and anonymized

**3. Explicit Opt-In**

-   API integration is disabled by default
-   Users must actively enable data collection
-   Clear consent flow with detailed explanations
-   Easy opt-out at any time

### Privacy by Design

```
┌─────────────────────────────────────────────────┐
│  YOUR MACHINE (100% Private)                    │
│  ┌───────────────────────────────────────────┐  │
│  │  Source Code                              │  │
│  │  • Analyzed locally                       │  │
│  │  • Stored locally                         │  │
│  │  • NEVER transmitted                      │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Metadata Generation                      │  │
│  │  • Count lines changed                    │  │
│  │  • Calculate risk scores                  │  │
│  │  • Extract statistics                     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓ (opt-in only)
              Metadata Only (no code)
                      ↓
┌─────────────────────────────────────────────────┐
│  SnapBack API (Metadata Only)                   │
│  • Anonymous statistics                         │
│  • Risk scores                                  │
│  • Operation counts                             │
│  • NO source code or identifiers                │
└─────────────────────────────────────────────────┘
```

---

## What Data is Collected

### Metadata Transmitted (When Opted-In)

**Checkpoint Metadata**:

```json
{
	"timestamp": 1696233600000,
	"operation_type": "checkpoint_created",
	"file_count": 3,
	"total_additions": 120,
	"total_deletions": 36,
	"risk_score": 0.35,
	"severity": "medium",
	"file_types": [".ts", ".json"],
	"client_type": "vscode",
	"client_version": "1.2.0",
	"session_id": "anonymous-uuid-v4"
}
```

**What This Tells Us**:

-   How many files were changed (count only)
-   How many lines were added/removed (counts only)
-   Risk assessment scores (numeric values)
-   File type extensions (e.g., `.ts`, `.json`)
-   Client software version (for compatibility)
-   Anonymous session identifier (random UUID)

**What This Does NOT Tell Us**:

-   File names or paths
-   Actual code or content
-   Variable names or function names
-   Comments or documentation
-   Your identity or project details

---

### Anonymous Identifiers

**Session ID**:

-   Generated randomly on first use (UUIDv4)
-   Used to correlate events in same session
-   Cannot be linked to user identity
-   Rotates periodically (every 30 days)

**Example**:

```typescript
// Generated locally
const sessionId = crypto.randomUUID(); // "a3f5c2d1-8b4e-4f2a-9c3d-1e5a7b9c4d2f"

// Stored locally only
localStorage.setItem("snapback_session_id", sessionId);

// Sent with API requests
await apiClient.createCheckpoint({
	metadata: {
		session_id: sessionId, // Anonymous, no personal link
	},
});
```

---

### Usage Analytics (Opt-In)

**Event Tracking**:

```json
{
	"event": "checkpoint.created",
	"properties": {
		"trigger": "auto",
		"duration_ms": 245,
		"client_type": "vscode"
	},
	"timestamp": 1696233600000
}
```

**Collected Events**:

-   `checkpoint.created` - When checkpoints are created
-   `risk.analyzed` - When risk analysis is performed
-   `error.occurred` - When errors happen (error type only)
-   `feature.used` - When specific features are used

**NOT Collected**:

-   User actions unrelated to SnapBack
-   File editing history
-   Keystrokes or clipboard data
-   Screen contents or screenshots

---

## What Data is NEVER Collected

### Absolute Privacy Guarantees

**Source Code & Content**:

-   ❌ File contents
-   ❌ Code snippets
-   ❌ Variable names
-   ❌ Function names
-   ❌ Class names
-   ❌ Comments
-   ❌ String literals
-   ❌ Documentation

**File System Information**:

-   ❌ File paths
-   ❌ Directory structures
-   ❌ File names
-   ❌ Project names
-   ❌ Repository URLs

**Personal Information**:

-   ❌ User names
-   ❌ Email addresses
-   ❌ IP addresses (anonymized by default)
-   ❌ Machine identifiers
-   ❌ GPS location
-   ❌ Device serial numbers

**Credentials & Secrets**:

-   ❌ API keys
-   ❌ Passwords
-   ❌ Tokens
-   ❌ Certificates
-   ❌ SSH keys
-   ❌ Environment variables

**Business Information**:

-   ❌ Client names
-   ❌ Project names
-   ❌ Business logic
-   ❌ Trade secrets
-   ❌ Proprietary algorithms

---

### Technical Enforcement

**Code-Level Safeguards**:

```typescript
// Example: Metadata sanitization
function sanitizeMetadata(data: any): SafeMetadata {
	// Whitelist approach - only allow known safe fields
	return {
		timestamp: data.timestamp,
		file_count: data.file_count, // Count only, no names
		total_additions: data.total_additions, // Count only
		total_deletions: data.total_deletions, // Count only
		risk_score: data.risk_score, // Numeric score only
		severity: data.severity, // Enum value
		file_types: data.file_types?.map((ext) =>
			ext.replace(/[^.a-z0-9]/gi, "")
		), // Extensions only
		// Everything else is explicitly excluded
	};
}

// Example: PII removal
function removePII(properties: Record<string, any>): Record<string, any> {
	const sanitized = { ...properties };

	// Blacklist known PII fields
	const piiFields = [
		"filePath",
		"absolutePath",
		"fileName",
		"dirName",
		"userName",
		"userEmail",
		"userId",
		"displayName",
		"apiKey",
		"token",
		"password",
		"secret",
		"key",
		"content",
		"code",
		"snippet",
		"value",
		"text",
	];

	for (const field of piiFields) {
		delete sanitized[field];
	}

	return sanitized;
}
```

**Network-Level Safeguards**:

```typescript
// Example: Request validation before transmission
async function sendToAPI(payload: any) {
	// Step 1: Validate structure
	const validated = MetadataSchema.parse(payload);

	// Step 2: Scan for potential PII
	const payloadString = JSON.stringify(validated);

	// Check for file paths (Unix or Windows)
	if (payloadString.match(/[\/\\][\w-]+[\/\\]/)) {
		throw new Error("Potential file path detected in payload");
	}

	// Check for email addresses
	if (payloadString.match(/[\w.-]+@[\w.-]+\.\w+/)) {
		throw new Error("Potential email address detected in payload");
	}

	// Check for code snippets (function/class keywords)
	if (
		payloadString.match(
			/\b(function|class|const|let|var|def|public|private)\b/
		)
	) {
		throw new Error("Potential code detected in payload");
	}

	// Step 3: Send only if validation passes
	await fetch(API_URL, {
		method: "POST",
		body: JSON.stringify(validated),
	});
}
```

---

## Opt-In Flow

### Default State: API Disabled

**Out of the Box**:

-   API integration is **disabled by default**
-   All processing happens **locally only**
-   No data transmitted anywhere
-   Full functionality available offline

### Enabling API Integration

**Step 1: User Initiates Opt-In**

```
VS Code Extension:
Settings → SnapBack → Enable API Integration

CLI:
$ snapback auth configure

MCP:
Configuration file: snapback.config.json
```

**Step 2: Clear Consent Dialog**

```
┌────────────────────────────────────────────────┐
│  Enable SnapBack API Integration?             │
├────────────────────────────────────────────────┤
│                                                │
│  What this enables:                            │
│  ✓ Enhanced risk analysis                     │
│  ✓ Cross-device checkpoint syncing            │
│  ✓ Advanced analytics and insights            │
│                                                │
│  What we collect (metadata only):              │
│  • File change counts (not content)           │
│  • Risk scores and severity levels            │
│  • Anonymous usage statistics                 │
│                                                │
│  What we NEVER collect:                        │
│  • Your source code or file contents          │
│  • File paths or project names                │
│  • Personal information or credentials        │
│                                                │
│  Privacy Details: snapback.dev/privacy        │
│                                                │
│  [Enable API]  [No Thanks]  [Learn More]      │
└────────────────────────────────────────────────┘
```

**Step 3: API Key Configuration**

```
┌────────────────────────────────────────────────┐
│  Configure API Access                          │
├────────────────────────────────────────────────┤
│                                                │
│  API Key: [sb_live_****************]           │
│           [Generate New Key]                   │
│                                                │
│  Your API key is stored securely in:           │
│  ~/.snapback/credentials                       │
│                                                │
│  [Save]  [Cancel]                              │
└────────────────────────────────────────────────┘
```

**Step 4: Confirmation**

```
✓ API Integration Enabled

SnapBack will now sync metadata to enhance your experience.
Remember: Your source code stays on your machine.

View collected data: snapback.dev/dashboard
Disable anytime: Settings → SnapBack → Disable API
```

---

### Opt-Out Anytime

**Immediate Opt-Out**:

```
VS Code: Settings → SnapBack → Disable API Integration
CLI: $ snapback auth disable
MCP: Remove API key from config
```

**What Happens on Opt-Out**:

-   API calls stop immediately
-   All features continue working locally
-   No data loss
-   Previously sent metadata remains (see Data Deletion)

---

## Data Retention & Deletion

### Retention Policies

| Data Type             | Retention Period | Purpose              |
| --------------------- | ---------------- | -------------------- |
| Checkpoint metadata   | 90 days          | Historical analysis  |
| Risk analysis results | 30 days          | Recent trends        |
| Usage events          | 7 days           | Short-term analytics |
| API access logs       | 365 days         | Security auditing    |

**Automatic Deletion**:

-   Data older than retention period is automatically deleted
-   No manual action required
-   Deletion is permanent and irreversible

---

### Manual Data Deletion

**Delete All Data**:

```bash
# Via CLI
$ snapback data delete --confirm

# Via API
curl -X DELETE https://api.snapback.dev/v1/sessions/:session_id \
  -H "Authorization: Bearer $SNAPBACK_API_KEY"
```

**Delete Specific Data**:

```bash
# Delete checkpoints older than 30 days
$ snapback data delete checkpoints --older-than 30d

# Delete all risk analyses
$ snapback data delete risk-analyses --all
```

**GDPR Data Subject Request**:

```
Email: privacy@snapback.dev
Subject: GDPR Data Deletion Request

We will:
1. Verify your identity
2. Delete all associated data within 30 days
3. Confirm deletion via email
```

---

## Security Best Practices

### API Key Management

**Generation**:

```bash
# Generate API key with limited scope
$ snapback auth generate-key \
  --name "Production VS Code" \
  --scope "checkpoints:write,risk:read" \
  --expires-in 90d
```

**Storage**:

```bash
# Store in environment variable (recommended)
export SNAPBACK_API_KEY="sb_live_1234567890abcdef"

# OR in secure credential store
# macOS Keychain
security add-generic-password \
  -a $USER \
  -s snapback_api_key \
  -w "sb_live_1234567890abcdef"

# Windows Credential Manager
cmdkey /generic:snapback_api_key \
  /user:$env:USERNAME \
  /pass:"sb_live_1234567890abcdef"
```

**Rotation**:

```bash
# Rotate every 90 days
$ snapback auth rotate-key \
  --key-id key_abc123 \
  --transition-days 7
```

**Revocation**:

```bash
# Immediately revoke compromised key
$ snapback auth revoke-key --key-id key_abc123
```

---

### Network Security

**TLS/SSL Encryption**:

-   All API requests use HTTPS (TLS 1.3)
-   Certificate pinning for mobile clients
-   Strong cipher suites only

**Request Signing**:

```typescript
// All requests are signed with API key
const signature = crypto
	.createHmac("sha256", apiKey)
	.update(JSON.stringify(payload))
	.digest("hex");

await fetch(API_URL, {
	headers: {
		Authorization: `Bearer ${apiKey}`,
		"X-Signature": signature,
		"X-Timestamp": Date.now(),
	},
});
```

**Rate Limiting**:

-   Prevents brute force attacks
-   Protects against DDoS
-   Fair usage enforcement

---

### Local Data Security

**Encrypted Storage** (Optional):

```typescript
// Enable local encryption for sensitive checkpoints
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

class EncryptedStorage {
	private encryptionKey: Buffer;

	constructor() {
		// Use user-provided passphrase
		this.encryptionKey = crypto.scryptSync(
			process.env.SNAPBACK_PASSPHRASE || "default",
			"salt",
			32
		);
	}

	async save(checkpoint: Checkpoint): Promise<void> {
		const iv = randomBytes(16);
		const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);

		const encrypted = Buffer.concat([
			cipher.update(JSON.stringify(checkpoint), "utf8"),
			cipher.final(),
		]);

		const authTag = cipher.getAuthTag();

		await fs.writeFile(
			"checkpoint.enc",
			JSON.stringify({
				iv: iv.toString("hex"),
				authTag: authTag.toString("hex"),
				data: encrypted.toString("hex"),
			})
		);
	}
}
```

**File Permissions**:

```bash
# Restrict access to snapback data directory
chmod 700 ~/.snapback
chmod 600 ~/.snapback/credentials

# Verify permissions
ls -la ~/.snapback
# drwx------  ~/.snapback
# -rw-------  ~/.snapback/credentials
```

---

## Compliance

### GDPR Compliance

**Right to Access**:

-   View all collected data: `https://snapback.dev/dashboard`
-   Export data: `$ snapback data export --format json`

**Right to Rectification**:

-   Update incorrect metadata via API
-   Contact support for corrections

**Right to Erasure ("Right to be Forgotten")**:

-   Delete all data: `$ snapback data delete --confirm`
-   Email request: `privacy@snapback.dev`

**Right to Data Portability**:

-   Export in JSON, CSV, or XML format
-   Machine-readable standard formats

**Right to Object**:

-   Opt-out at any time via settings
-   No penalties or loss of local functionality

---

### CCPA Compliance (California Consumer Privacy Act)

**Disclosure**:

-   Clear notice of data collection in consent dialog
-   Detailed privacy policy at `snapback.dev/privacy`

**Opt-Out**:

-   "Do Not Sell My Personal Information" link
-   Easy opt-out mechanism in settings

**Data Deletion**:

-   Request deletion via email or CLI
-   30-day response time

---

### SOC 2 Type II (In Progress)

**Security Controls**:

-   Encryption in transit and at rest
-   Access controls and audit logging
-   Incident response procedures
-   Regular security audits

---

## Frequently Asked Questions

### Can SnapBack see my source code?

**No.** SnapBack never transmits or stores your source code. All code analysis happens locally on your machine. Only anonymous metadata (line counts, risk scores) is sent to the API when you opt-in.

---

### What if I accidentally enable API integration?

You can disable it immediately in settings. No source code was transmitted, only metadata. You can also request deletion of any collected metadata via `$ snapback data delete`.

---

### How is my API key stored?

API keys are stored in:

-   **VS Code**: Secure credential storage (Keychain/Credential Manager)
-   **CLI**: `~/.snapback/credentials` with 600 permissions
-   **MCP**: Configuration file with restricted access

---

### Can I see exactly what data is being sent?

**Yes.** Enable debug logging:

```bash
# VS Code: Settings → SnapBack → Debug Logging
# CLI:
$ snapback --debug create-checkpoint

# Output shows exact API payloads:
[DEBUG] API Request:
{
  "timestamp": 1696233600000,
  "file_count": 3,
  "total_additions": 120,
  "risk_score": 0.35
}
```

---

### What happens if the API is compromised?

Even in a worst-case API breach scenario:

-   ✓ Your source code is safe (it was never transmitted)
-   ✓ Your file paths are safe (they were never sent)
-   ✓ Your credentials are safe (they were never collected)
-   ⚠️ Metadata (line counts, risk scores) may be exposed
-   ⚠️ Anonymous session IDs may be exposed (not linked to you)

---

### Can SnapBack track my location?

**No.** SnapBack does not collect:

-   GPS coordinates
-   IP addresses (anonymized by default)
-   Time zones
-   Geolocation data

---

### How do I verify SnapBack's privacy claims?

**Transparency Measures**:

-   **Open Source**: Core processing code is open source (verify locally)
-   **Network Monitoring**: Use tools like Wireshark to inspect API traffic
-   **Debug Mode**: Enable logging to see exact API payloads
-   **Third-Party Audits**: Annual security audits by independent firms

**Verification Steps**:

```bash
# Step 1: Enable network monitoring
$ sudo tcpdump -i any -A 'host api.snapback.dev'

# Step 2: Create a checkpoint with known content
$ echo "function test() { return 'SECRET_123'; }" > test.js
$ snapback create-checkpoint test.js

# Step 3: Verify network traffic does NOT contain "SECRET_123"
# You should only see metadata (file counts, risk scores)
```

---

### What about IP address logging?

**IP addresses are anonymized by default:**

-   Last octet removed (192.168.1.XXX)
-   Used only for rate limiting and abuse prevention
-   Not stored long-term
-   Not used for tracking or analytics

**Disable IP logging entirely:**

```bash
# Via settings
SNAPBACK_ANONYMIZE_IP=true
```

---

### Can I use SnapBack in a corporate environment?

**Yes.** SnapBack is designed for enterprise use:

-   **On-Premises Deployment**: Self-host the API
-   **Air-Gapped Mode**: Disable API, run 100% locally
-   **SSO Integration**: Enterprise authentication
-   **Compliance Certifications**: SOC 2, GDPR, CCPA

**Enterprise Configuration**:

```bash
# Use self-hosted API
export SNAPBACK_API_URL="https://snapback.yourcompany.com/api"

# OR disable API entirely for air-gapped networks
export SNAPBACK_API_ENABLED=false
```

---

### How often is this privacy policy updated?

This guide is updated whenever privacy practices change. You will be notified via:

-   In-app notification
-   Email (if provided)
-   Changelog at `snapback.dev/privacy/changelog`

Last updated: 2025-10-02

---

## Contact & Support

**Privacy Questions**:

-   Email: privacy@snapback.dev
-   Response time: 24-48 hours

**Security Issues**:

-   Email: security@snapback.dev
-   Bug bounty program: `snapback.dev/security/bounty`

**Data Deletion Requests**:

-   Email: privacy@snapback.dev
-   Subject: "GDPR Data Deletion Request"
-   Response time: 30 days

**General Support**:

-   Email: support@snapback.dev
-   Community: `discord.gg/snapback`
-   Documentation: `docs.snapback.dev`

---

## Transparency Report

We publish quarterly transparency reports detailing:

-   Number of data deletion requests
-   Security incidents (if any)
-   Third-party data sharing (none)
-   Government requests (if any)

Latest report: `snapback.dev/transparency/2025-q4`

---

**Your privacy is our priority. If you have any concerns, please contact us at privacy@snapback.dev.**
