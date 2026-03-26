# Contributing to NoJS CLI

Thank you for your interest in contributing to the NoJS CLI! Whether you're fixing a bug, adding a feature, improving documentation, or suggesting an enhancement — every contribution makes the tool better for everyone.

This guide will walk you through everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Code Conventions](#code-conventions)
- [Contribution Workflows](#contribution-workflows)
  - [Adding a New Command](#adding-a-new-command)
  - [Adding a Prebuild Plugin](#adding-a-prebuild-plugin)
  - [Adding a Validation Rule](#adding-a-validation-rule)
  - [Fixing a Bug](#fixing-a-bug)
  - [Documentation Only](#documentation-only)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Quality Gates](#quality-gates)
- [Version Management](#version-management)
- [The NoJS Ecosystem](#the-nojs-ecosystem)
- [Need Help?](#need-help)

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

---

## Getting Started

NoJS CLI is the official command-line tool for the [No.JS](https://github.com/ErickXavier/no-js) framework. It provides commands for scaffolding projects, optimizing HTML for production, running a dev server with live reload, validating templates, and managing plugins.

| Repository | Package | Purpose |
| --- | --- | --- |
| [NoJS-CLI](https://github.com/ErickXavier/NoJS-CLI) | `@erickxavier/nojs-cli` | CLI tool (this repo) |
| [no-js](https://github.com/ErickXavier/no-js) | `@erickxavier/no-js` | The core framework |
| [nojs-lsp](https://github.com/ErickXavier/nojs-lsp) | `nojs-lsp` | VS Code language server extension |

---

## Project Structure

```plaintext
src/
├── cli.js              # CLI entry point — argument parsing, command routing
├── commands/           # Top-level command handlers (init, prebuild, dev, validate, plugin)
├── init/               # Project scaffolding templates and interactive wizard
├── prebuild/           # HTML optimization plugins (resource hints, sitemap, OG tags, etc.)
├── dev/                # Dev server (HTTP + SSE live reload)
├── validate/           # Template validation rules
└── plugin/             # Plugin manager (CDN + npm)

__tests__/              # Jest unit tests
bin/
└── nojs.js             # Executable entry point
```

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Setup

```bash
# Clone and install
git clone https://github.com/ErickXavier/NoJS-CLI.git
cd NoJS-CLI
npm install

# Run tests
npm test

# Run the CLI locally
node bin/nojs.js --help
node bin/nojs.js init ./test-app
node bin/nojs.js dev ./test-app
```

---

## Code Conventions

| Convention | Example |
| --- | --- |
| Plain JavaScript (no transpilation) | ES modules with Node.js built-ins |
| One file per command handler | `src/commands/init.js`, `src/commands/dev.js` |
| Modular plugin architecture | Each prebuild plugin in its own file under `src/prebuild/` |
| Validation rules as individual functions | Each rule in `src/validate/` |
| Colored terminal output | Use ANSI escape codes for status messages |
| No external runtime dependencies | Rely on Node.js built-in modules (`fs`, `path`, `http`, `crypto`) |
| Descriptive error messages | Include the file path, line number, or command context |

### General

- Keep functions small and focused
- Write tests for all new functionality
- Never use `eval()` or `Function()` on user-provided input
- Validate and sanitize all file paths — prevent path traversal

---

## Contribution Workflows

### Adding a New Command

- [ ] Create the command handler in `src/commands/<name>.js`
- [ ] Add the command module under `src/<name>/` for its logic
- [ ] Register the command in `src/cli.js` (argument parsing + routing)
- [ ] Add unit tests in `__tests__/`
- [ ] Update the README with the new command's usage, options, and alias
- [ ] Update the CHANGELOG

### Adding a Prebuild Plugin

- [ ] Create the plugin in `src/prebuild/<plugin-name>.js`
- [ ] Register it in the prebuild pipeline (`src/commands/prebuild.js` or equivalent)
- [ ] Add unit tests in `__tests__/`
- [ ] Update the README's prebuild section with the new plugin
- [ ] Update the CHANGELOG

### Adding a Validation Rule

- [ ] Add the rule function in `src/validate/`
- [ ] Register it in the validation runner
- [ ] Add unit tests in `__tests__/`
- [ ] Update the README's validate section with the new rule
- [ ] Update the CHANGELOG

### Fixing a Bug

- [ ] Write a **failing test** that reproduces the bug
- [ ] Fix the bug
- [ ] Verify **all existing tests** still pass (`npm test`)

### Documentation Only

- [ ] Update the relevant section in `README.md`
- [ ] If applicable, update the CHANGELOG

---

## Branch & Commit Conventions

### Branch Naming

Create your branch from `main` using one of these prefixes:

| Prefix | Use for |
| --- | --- |
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring (no behavior change) |
| `chore/` | Tooling, deps, CI, config |

Examples: `feat/watch-mode`, `fix/dev-server-mime`, `docs/plugin-usage`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```plaintext
<type>: <short description>

[optional body]
```

**Types:**

| Type | Purpose |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Maintenance (deps, CI, tooling) |
| `test` | Adding or updating tests |

**Examples:**

```plaintext
feat: add --watch flag to dev server command
fix: prevent path traversal in static file serving
docs: add plugin manager usage examples
test: add coverage for prebuild speculation rules plugin
```

---

## Pull Request Guidelines

1. **One concern per PR** — don't mix unrelated changes
2. **Describe what and why** — your PR description should explain the change and the reasoning behind it
3. **Link related issues** — use `Closes #123` or `Fixes #456` in the description
4. **Ensure all quality gates pass** before requesting review (see below)
5. **Keep it reviewable** — if a change is large, consider splitting it into smaller PRs
6. **Respond to feedback** — address review comments promptly and push updates

---

## Quality Gates

All of the following must pass before a PR can be merged.

| Gate | Command |
| --- | --- |
| Unit tests | `npm test` |
| No lint errors | Code follows project conventions |
| CLI runs without errors | `node bin/nojs.js --help` |

### Quick Verification

Run this before pushing:

```bash
npm test && node bin/nojs.js --help
```

---

## Version Management

- The CLI version lives in `package.json`
- The CLI version must **always match** the framework version across the ecosystem
- **Contributors should NOT bump versions** — maintainers handle version bumps and releases

---

## The NoJS Ecosystem

The CLI is part of a larger ecosystem. Changes to the CLI may need coordination with other repos:

| Tool | Repository | Relationship |
| --- | --- | --- |
| [No.JS](https://github.com/ErickXavier/no-js) | Core framework | CLI validates against framework directives |
| [NoJS-LSP](https://github.com/ErickXavier/nojs-lsp) | VS Code extension | LSP shares validation rules with CLI |
| [NoJS-MCP](https://github.com/ErickXavier/nojs-mcp) | MCP server | MCP may invoke CLI commands |

---

## Need Help?

- **Questions?** Open a [Discussion](https://github.com/ErickXavier/no-js/discussions) on GitHub
- **Found a bug?** Open an [Issue](https://github.com/ErickXavier/NoJS-CLI/issues) with a minimal reproduction
- **First-time contributor?** Look for issues labeled [`good first issue`](https://github.com/ErickXavier/NoJS-CLI/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

We appreciate every contribution, no matter how small. Welcome aboard!
