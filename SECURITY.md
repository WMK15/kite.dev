# Security Policy

Kite.dev handles OAuth flows, GitHub App webhooks, Notion integration data, and provider credentials. If you believe you have found a security issue, please report it privately.

## Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Report them privately to:

- `development.wmk@gmail.com`

This is a placeholder contact and should be replaced by maintainers with a real private reporting channel.

When you report an issue, include as much of the following as you can:

- a clear description of the vulnerability
- affected components or files
- reproduction steps, if safe and practical
- likely impact
- any suggested mitigation or patch

## Responsible Disclosure

Please:

- give maintainers a reasonable opportunity to investigate and address the issue before public disclosure
- avoid accessing, changing, or exporting data that does not belong to you
- avoid actions that could affect service availability or third-party systems
- keep proof-of-concept material narrowly scoped to demonstrating the issue safely

## Areas That Need Extra Care

Security-sensitive parts of this repository include:

- OAuth callback handling and token exchange flows
- GitHub App webhook verification and event processing
- Notion webhook and page update flows
- storage and handling of access tokens, secrets, and private keys
- logging and observability paths that could expose sensitive values
- database changes affecting credentials, audit trails, or webhook delivery records

## Support Expectations

This repository does not currently promise:

- a bug bounty programme
- guaranteed response times
- guaranteed remediation timelines
- production support obligations

Maintainers should keep this file aligned with the actual security process used by the project.
