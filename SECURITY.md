# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Code2MP4, please report it privately.

**Do not open a public issue.**

Email security@code2mp4.com with details. We will respond within 48 hours with:
- Confirmation of receipt
- An estimated timeline for a fix
- Whether you'll be credited in the release notes

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main branch) | ✅ |
| < 1.0.0 | ❌ (pre-release) |

## Scope

Security issues in scope include:
- Remote code execution via user input
- Authentication bypass
- Exposure of user project data
- Prompt injection leading to unintended agent behavior

Issues NOT in scope:
- Vulnerabilities in third-party agent CLIs (Claude Code, OpenCode, etc.)
- Vulnerabilities in HyperFrames or its dependencies
- DoS via resource exhaustion (the tool runs locally)

## Disclosure

We follow responsible disclosure. After a fix is released, we will publish a security advisory with:
- Description of the vulnerability
- Affected versions
- How to upgrade
- Credit to the reporter (if desired)
