# Security Policy

## Supported Versions

We actively support the following versions of SnapBack with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SnapBack seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**security@snapback.dev**

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### What to Expect

After you submit a report, we will:

1. **Acknowledge receipt** within 48 hours
2. **Assess the vulnerability** and determine its impact and severity
3. **Work on a fix** and keep you informed of our progress
4. **Release a patch** and publicly acknowledge your responsible disclosure (if you wish)

### Disclosure Policy

We follow a **coordinated disclosure** approach:

- We request that you give us a reasonable amount of time to fix the vulnerability before public disclosure
- We will work with you to understand and resolve the issue promptly
- We will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)
- We will credit you in our release notes and security advisories

### Security Best Practices

When using SnapBack, we recommend:

1. **Keep your software up to date** - Always use the latest stable version
2. **Use strong API keys** - Generate cryptographically secure API keys and rotate them regularly
3. **Protect your `.env` files** - Never commit sensitive environment variables to version control
4. **Enable file protection** - Use SnapBack's three-level protection system for critical files
5. **Review AI-generated changes** - Always review changes made by AI assistants before committing
6. **Monitor for secrets** - Use SnapBack's built-in secret detection to prevent accidental exposure

### Security Features

SnapBack includes several security features:

- **Secret Detection** - Automatically identifies API keys, passwords, and tokens in your code
- **Privacy-First Design** - File contents never leave your machine unless explicitly configured
- **Path Hashing** - File paths are hashed before transmission to protect directory structure
- **Content Validation** - Prevents accidental content leakage with built-in safeguards
- **Local-First Storage** - All snapshots stored locally in encrypted SQLite database

### Hall of Fame

We would like to thank the following individuals for responsibly disclosing security vulnerabilities:

*No vulnerabilities have been reported yet.*

---

For general security questions or concerns that are not vulnerabilities, please contact us at support@snapback.dev.
