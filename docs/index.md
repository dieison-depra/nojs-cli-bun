# NoJS CLI — Documentation

Welcome to the NoJS CLI documentation. Use the links below to navigate to the topic you need.

## Getting Started

- [Getting Started](getting-started.md) — Install the CLI, scaffold your first project, run the dev server

## Commands

- [Commands Overview](commands/index.md) — All five commands at a glance
  - [init](commands/init.md) — Scaffold a new No.JS project
  - [prebuild](commands/prebuild.md) — Run build-time optimization plugins
  - [dev](commands/dev.md) — Local development server with live reload
  - [validate](commands/validate.md) — Validate templates for No.JS mistakes
  - [plugin](commands/plugin.md) — Search, install, and manage plugins

## Prebuild System

- [Prebuild Overview](prebuild/index.md) — How the plugin pipeline works
  - [Built-in Plugins Reference](prebuild/plugins.md) — All 26 plugins documented
  - [Creating Plugins](prebuild/creating-plugins.md) — Write and distribute your own plugins

## Reference

- [Configuration](configuration.md) — `nojs-prebuild.config.js` and `nojs.config.json` reference
- [Build Optimization Research](build-optimization-research.md) — T1–T18 technique analysis
- [Build Optimization Roadmap](build-optimization-roadmap.md) — B-series and T-series roadmap
- [Implementation Plan](implementation-plan.md) — Branch plan and test conventions
- [Dependency Analysis](dependency-analysis.md) — Security risk and replaceability review of all external dependencies
