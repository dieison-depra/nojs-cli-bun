# nojs init

Scaffold a new No.JS project using an interactive wizard.

## Usage

```bash
nojs init [directory]
nojs i   [directory]
```

If `directory` is omitted, the project is generated in the current folder.

## What It Creates

```
<project>/
  index.html              ← entry point with No.JS loaded from CDN
  nojs.config.json        ← CLI project config (tracks installed plugins)
  pages/                  ← (if SPA routing is enabled)
    home.tpl
    about.tpl
  locales/                ← (if i18n is enabled)
    en.json               ← one file per locale
  assets/                 ← empty, ready for images / fonts
```

## Wizard Questions

The wizard prompts for:

1. **Project name** — appears in `<title>` and in the generated manifest
2. **API base URL** — optional; sets `<html base="...">` so all `get=`, `post=` etc. are relative to it
3. **Enable SPA routing?** — creates `pages/` with two starter templates and wires up `<template route>` tags
4. **Enable i18n?** — creates `locales/` and prompts for locale codes (e.g. `en`, `pt-BR`)
5. **Default locale** — (only if i18n) the initial active language

## Generated `index.html`

A minimal example with routing and i18n enabled:

```html
<!DOCTYPE html>
<html lang="en" i18n-config="locales/{locale}.json" i18n-default="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My App</title>
  <script src="https://cdn.no-js.dev/" defer></script>
</head>
<body base="https://api.example.com">

  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>

  <route-view></route-view>

  <template route="/">
    <div get="/data" as="items">
      <ul each="item in items"><li bind="item.name"></li></ul>
    </div>
  </template>

  <template route="/about">
    <h1 bind="'About'"></h1>
  </template>

</body>
</html>
```

## nojs.config.json

After `init`, a `nojs.config.json` is created to track plugins installed via `nojs plugin install`:

```json
{
  "name": "my-app",
  "plugins": []
}
```

This file is managed automatically by the `plugin` command.
