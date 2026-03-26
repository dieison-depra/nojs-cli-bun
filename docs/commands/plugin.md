# nojs plugin

Search, install, update, and remove No.JS plugins.

## Usage

```bash
nojs plugin <subcommand> [name]
nojs p      <subcommand> [name]
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `search <query>` | Search official and npm registries |
| `install <name>` | Install a plugin |
| `update <name>` | Update an installed plugin |
| `remove <name>` | Uninstall a plugin |
| `list` | List installed plugins |

## Installing Plugins

### Official Plugins (CDN)

Official plugins are distributed via `cdn.no-js.dev`. They are fetched, their SHA-384 hash is verified, and the script is saved locally.

```bash
nojs plugin install nojs-plugin-charts
```

### npm Plugins

Prefix the package name with `npm:` to install from the npm registry using the local `npm` binary:

```bash
nojs plugin install npm:my-custom-nojs-plugin
```

This runs `npm install <package>` in your project directory and registers the plugin in `nojs.config.json`.

## Plugin Registry (`nojs.config.json`)

Installed plugins are tracked in `nojs.config.json`:

```json
{
  "name": "my-app",
  "plugins": [
    {
      "name": "nojs-plugin-charts",
      "source": "cdn",
      "version": "1.2.0",
      "integrity": "sha384-abc123..."
    }
  ]
}
```

The `integrity` field stores the SHA-384 hash of the plugin file for security verification on subsequent updates.

## Security

- Package names are validated against a strict regex before any shell execution — only lowercase alphanumeric, hyphens, dots, tildes, and scoped names (`@scope/name`) are allowed.
- CDN plugins have their SHA-384 hash verified before being written to disk.
- Only `execFileSync` with an explicit arguments array is used (no shell string interpolation).

## Example Session

```bash
$ nojs plugin search chart
Searching for "chart"...

  nojs-plugin-charts (official)
    Interactive charts for No.JS using Chart.js

Found 1 plugin(s).

$ nojs plugin install nojs-plugin-charts
Installing nojs-plugin-charts...
✓ Installed nojs-plugin-charts@1.2.0

$ nojs plugin list
Installed plugins:
  nojs-plugin-charts@1.2.0 (cdn)

$ nojs plugin remove nojs-plugin-charts
✓ Removed nojs-plugin-charts
```
