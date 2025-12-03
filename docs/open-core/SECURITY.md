# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of these methods:

### Via GitHub Security Advisories

1. Go to the [Security tab](https://github.com/snapback-dev/snapback-oss/security)
2. Click "Report a vulnerability"
3. Fill out the form with as much detail as possible

### Via Email

Send an email to: **security@snapback.dev**

Please include:
* Description of the vulnerability
* Steps to reproduce
* Potential impact
* Suggested fix (if any)

## Response Timeline

* **Acknowledgment**: Within 48 hours
* **Initial Assessment**: Within 5 business days
* **Fix Development**: Depends on severity
  * Critical: 1-7 days
  * High: 7-14 days
  * Medium: 14-30 days
  * Low: 30-90 days
* **Public Disclosure**: After fix is released

## Security Update Process

1. **Triage**: We assess the severity and impact
2. **Development**: We develop and test a fix
3. **Private Fix**: We may share the fix with major dependents
4. **Public Release**: We release the security patch
5. **Disclosure**: We publish a security advisory

## Security Best Practices

When using SnapBack:

* **Keep Updated**: Always use the latest version
* **Environment Variables**: Never commit `.env` files
* **API Keys**: Rotate API keys regularly
* **File Permissions**: Ensure `.snapback/` directory is properly secured
* **VS Code Extension**: Only install from official marketplace

## Scope

This security policy applies to:

* `@snapback/sdk`
* `@snapback/core`
* `@snapback/contracts`
* `@snapback/config`
* `@snapback/events`
* `@snapback/cli`
* `snapback-vscode` extension

## Out of Scope

* Vulnerabilities in dependencies (report to the dependency maintainer)
* Social engineering attacks
* Denial of service via abusive usage

## Recognition

We maintain a hall of fame for security researchers who responsibly disclose vulnerabilities. With your permission, we'll credit you in:

* Security advisory
* Release notes
* SECURITY.md file

## Bug Bounty

We currently do not offer a bug bounty program, but we greatly appreciate responsible disclosure and will publicly recognize contributors.

## GPG Key

For encrypted communication, use our GPG key:

```
[GPG Key would be added here]
```

## Questions?

If you have questions about this security policy, please contact security@snapback.dev
