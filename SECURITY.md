# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.10.x  | :white_check_mark: |
| 1.9.x   | :white_check_mark: |
| < 1.9   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in NoJS CLI, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **<contact@no-js.dev>** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The affected version(s)
- Any potential impact assessment

### What to expect

- **Acknowledgment** within 48 hours of your report
- **Status update** within 7 days with an assessment and expected timeline
- **Fix and disclosure** coordinated with you before any public announcement

### Scope

The following areas are in scope for the CLI:

- **Command injection** via user-supplied arguments or config values passed to shell commands
- **Path traversal** in the dev server static file serving, `init` scaffolding, or `prebuild` file operations
- **Arbitrary file read/write** through crafted `nojs.config.json` values or plugin installation paths
- **Config loading** — unsafe deserialization or code execution when reading project configuration files
- **Plugin manager** — integrity bypass, unsigned code execution, or registry confusion in plugin install/update flows
- **Dev server** — request smuggling, header injection, or unauthorized access to files outside the served directory

### Out of scope

- Vulnerabilities in third-party dependencies (report those to the respective maintainers)
- Issues requiring physical access to the user's machine
- Social engineering attacks
- Denial of service via resource exhaustion on localhost dev server (local-only by design)

## Security Measures

NoJS CLI implements the following security measures:

### Path traversal protection (dev server)

- All requested file paths are resolved and validated against the served root directory before any file is read or served
- Directory traversal sequences (`../`) are neutralized by path resolution and boundary checks

### Safe config loading

- Project configuration (`nojs.config.json`) is parsed as plain JSON — no code execution during config loading
- Config values are validated and sanitized before use in file operations or command arguments

### Plugin integrity

- Official CDN plugins receive SRI integrity hashes (sha384) computed at install time
- Plugin file paths are validated to prevent writing outside the project directory
