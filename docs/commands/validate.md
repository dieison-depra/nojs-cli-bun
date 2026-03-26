# nojs validate

Validate No.JS templates for common mistakes before shipping.

## Usage

```bash
nojs validate [directory]
nojs v        [directory]
```

If `directory` is omitted, the current working directory is scanned.

## What It Checks

The validator scans every element in all HTML files and applies the following rules:

| Rule | Severity | Description |
|------|----------|-------------|
| `fetch-missing-as` | error | `get=`, `post=`, etc. without `as=` — data won't be accessible |
| `each-missing-in` | error | `each="items"` without the `in` keyword (`each="item in items"`) |
| `foreach-missing-from` | error | `foreach=` without `from=` |
| `model-non-form-element` | warning | `model=` on a non-form element (not `<input>`, `<select>`, `<textarea>`) |
| `bind-html-warning` | warning | `bind-html=` usage — warns about XSS risk if content is untrusted |
| `route-without-route-view` | error | Route templates defined but no `<route-view>` present |
| `validate-outside-form` | warning | `validate=` attribute outside a `<form>` element |
| `event-empty-handler` | warning | `on:click=""` and similar with empty handler |
| `loop-missing-key` | warning | `each=` or `foreach=` loop without a `key=` attribute |
| `duplicate-store-name` | error | Two or more `store=` directives with the same name |

## Output Format

```
✗ index.html:12  [fetch-missing-as] <div get="/api/users"> is missing the "as" attribute.
⚠ index.html:34  [bind-html-warning] bind-html may expose XSS if content is untrusted.
✗ pages/home.tpl:5  [each-missing-in] each="items" — missing "in" keyword.

3 issue(s) found — 2 error(s), 1 warning(s)
```

Exits with code `1` if any errors are found (warnings do not affect the exit code).

## Example

```bash
# Validate current project
nojs validate

# Validate a specific directory
nojs validate ./dist
```

## Adding Custom Rules

Custom rules are not yet supported via config. To add project-specific checks, open an issue or see [Creating Plugins](../prebuild/creating-plugins.md) for the prebuild equivalent.
