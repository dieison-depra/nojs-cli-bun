# Plano de backport: no-js-erick → nojs-cli-bun

Origem da análise: main local do repo `no-js-erick`
(fork: `dieison-depra/no-js`, upstream: `ErickXavier/no-js`)

Os scripts standalone do no-js-erick têm lógica mais defensiva e detalhada do que
os plugins equivalentes no nojs-cli-bun. Este documento mapeia o que portar e como.

---

## 1. `inject-head-attrs` — ALTA PRIORIDADE

O plugin CLI (`src/prebuild/plugins/inject-head-attrs.js`, 103 linhas) corresponde
ao script `scripts/inject-head-attrs.js` da main do erick (220 linhas). Faltam duas
áreas inteiras.

### 1.1 Body directives (PR #27 — `src/directives/head.js`)

**Problema:** a main do erick inclui quatro novos atributos de corpo: `page-title`,
`page-description`, `page-canonical` e `page-jsonld`. São colocados em elementos
`<div hidden page-title="'Sobre'">` no body. O script standalone os detecta e
injeta no `<head>` em build time. O plugin CLI não os suporta.

**O que portar:** antes de processar `<template route>`, varrer o documento por:
```js
// :not(template[route]) para não confundir com route template attrs
for (const el of doc.querySelectorAll("[page-title]:not(template[route])")) {
  const val = extractLiteral(el.getAttribute("page-title"));
  if (val == null) continue;
  setOrUpdate(head, doc, "title", val);
}
// idem page-description, page-canonical, page-jsonld
```

`page-jsonld`: o conteúdo JSON fica no texto do elemento, não no atributo:
```js
for (const el of doc.querySelectorAll("[page-jsonld]:not(template[route])")) {
  const json = (el.textContent || "").trim();
  if (!json) continue;
  setOrUpdateJsonLd(head, doc, json);
}
```

**Referência:** `scripts/inject-head-attrs.js` linhas 124–157.

### 1.2 Lógica isSpaDefault / isOnlyTemplate para múltiplos templates

**Problema:** o plugin CLI aplica apenas `template[route="/"]` como fallback SPA.
O script erick aplica todos os `<template route>` encontrados no arquivo com a
seguinte lógica de precedência:

```
isSpaDefault = (tpl === defaultTpl)   // defaultTpl = route="/" ou primeiro
isOnlyTemplate = (routeTemplates.length === 1)
se não (isSpaDefault || isOnlyTemplate) → skip
```

Isso permite SSG: arquivos HTML com um único `<template route="/about">` injetam
os metadados corretamente.

**O que portar:**
```js
const routeTemplates = [...doc.querySelectorAll("template[route]")];
const defaultTpl =
  routeTemplates.find(t => t.getAttribute("route") === "/") || routeTemplates[0];

for (const tpl of routeTemplates) {
  const isSpaDefault = tpl === defaultTpl;
  const isOnlyTemplate = routeTemplates.length === 1;
  if (!isSpaDefault && !isOnlyTemplate) continue;
  // aplicar attrs
}
```

**Referência:** `scripts/inject-head-attrs.js` linhas 169–208.

### 1.3 Body directive tem precedência sobre route template attr

**Problema:** se um `page-title` de body já foi injetado, o attr de `<template route>`
não deve sobrescrever.

**O que portar:** antes de aplicar cada attr da route template, verificar se o body
já injetou:
```js
if (titleVal != null && !doc.querySelector("[page-title]:not(template[route])")) {
  setOrUpdate(head, doc, "title", titleVal);
}
```

**Referência:** `scripts/inject-head-attrs.js` linhas 183–207.

---

## 2. `inline-animation-css` — ALTA PRIORIDADE

### Problema
O cli-bun usa apenas `querySelectorAll` no DOM ao vivo. O conteúdo de
`<template route="...">`, `<template if="...">` etc. **não faz parte do DOM
renderizado** — portanto animações declaradas dentro desses templates não são
detectadas, e o keyframe não é injetado no `<head>`.

### O que portar
Adicionar uma segunda passada sobre todos os `<template>` do documento,
escaneando o `outerHTML` com regex para encontrar atributos `animate=`,
`animate-enter=` e `animate-leave=`.

### Referência (scripts/inline-animation-css.js, linhas 85–95)
```js
for (const tpl of document.querySelectorAll("template")) {
  const content = tpl.outerHTML;
  for (const attr of ANIM_ATTRS) {
    const re = new RegExp(`${attr}="([^"]+)"`, "g");
    let m;
    while ((m = re.exec(content)) !== null) {
      names.add(m[1].trim());
    }
  }
}
```

### Como aplicar no plugin
Após o loop `querySelectorAll` existente em `process()`, adicionar esse segundo
loop. O Set `names` é compartilhado, então duplicatas são descartadas
automaticamente.

---

## 3. `optimize-images` — ALTA PRIORIDADE

### 3.1 `isInsideTemplate()` guard

**Problema:** o plugin atual seleciona `img[src]`, ignorando que imagens dentro
de `<template>` (rotas, condicionais, loops) não são renderizadas diretamente.
Injetar `loading="lazy"` ou preload nelas é incorreto.

**O que portar:** filtrar imagens com `el.closest("template")` antes de qualquer
processamento de atributos e preload. O warn de `alt` pode incidir em todas
(inclusive dentro de templates), pois é só diagnóstico.

### 3.2 `bind-src` detection no LCP

**Problema:** se o LCP candidate tem `bind-src` (src dinâmico resolvido em
runtime), o src final não é conhecido em build time — injetar preload com o valor
literal seria incorreto.

**O que portar:**
```js
if (img === lcpImage) {
  if (img.hasAttribute("bind-src")) {
    console.warn(`[optimize-images] LCP candidate has dynamic bind-src in ${filePath} — preload skipped`);
  } else {
    // preload existente
  }
}
```

### 3.3 `isDynamicSrc()` guard

**Problema:** src com `{interpolation}` (ex: `src="/img/{name}.png"`) também não
deve gerar preload.

**O que portar:** antes de criar o `<link rel="preload">`, verificar:
```js
if (src && !src.includes("{")) { /* injetar preload */ }
```

### 3.4 Class-based LCP promotion

**Problema:** o plugin usa `images[0]` ou `config.lcpSelector` para determinar o
LCP. Imagens com classes semânticas como `hero`, `featured`, `banner` ou `lcp`
deveriam ser promovidas automaticamente, independente de posição no DOM.

**O que portar:**
```js
const LCP_CLASS_RE = /\bhero\b|\bfeatured\b|\bbanner\b|\blcp\b/i;

function detectLcpCandidate(images, lcpSelector, doc) {
  if (lcpSelector) return doc.querySelector(lcpSelector);
  for (const img of images) {
    if (LCP_CLASS_RE.test(img.getAttribute("class") || "")) return img;
  }
  return images[0] ?? null;
}
```

### 3.5 Remove `loading="lazy"` indevido do LCP

**Problema:** se um dev marcou o LCP com `loading="lazy"` manualmente, o plugin
não desfaz. Isso prejudica o LCP score.

**O que portar:**
```js
if (img === lcpImage && img.getAttribute("loading") === "lazy") {
  img.removeAttribute("loading");
}
```

### 3.6 Preload no início do `<head>`

**Problema:** `head.appendChild(link)` coloca o preload no final do `<head>`,
depois de stylesheets e scripts. O ideal é que apareça o mais cedo possível.

**O que portar:** trocar `head.appendChild` por:
```js
head.insertBefore(link, head.firstChild);
```

### 3.7 `alt` warning — MÉDIA PRIORIDADE

**O que portar:** após processar cada imagem, emitir warning se não tiver `alt`:
```js
if (!img.hasAttribute("alt")) {
  const src = img.getAttribute("src") || img.getAttribute("bind-src") || "(unknown)";
  console.warn(`[optimize-images] missing alt on <img src="${src}"> in ${filePath}`);
}
```
Usar o `filePath` disponível no contexto `{ filePath }` do `process()`.

---

## 4. `generate-sitemap` — ALTA PRIORIDADE

### 4.1 `{param}` syntax exclusion

**Problema:** o plugin atual exclui `:param` mas não exclui `{slug}` — a sintaxe
de segmento dinâmico com chaves usada pelo No.JS.

**O que portar:** adicionar à função `isIndexableRoute`:
```js
if (/\{[^}]+\}/.test(route)) return false;
```

### 4.2 Wildcard parcial

**Problema:** o plugin exclui só `route !== "*"`, mas não exclui `/products/*` ou
qualquer rota com wildcard não-exato.

**O que portar:**
```js
if (route.includes("*")) return false;
```

### 4.3 `guard=` exclusion

**Problema:** rotas protegidas com `guard=` não devem ser indexadas por crawlers,
mas o plugin as inclui no sitemap.

**O que portar:** na coleta de templates:
```js
if (tpl.hasAttribute("guard")) continue;
```

### 4.4 `robots.txt` generation/update — MÉDIA PRIORIDADE

**O que portar:** no `finalize()`, após escrever o `sitemap.xml`, verificar se
`robots.txt` existe no `outputDir`:
- Se existir: adicionar `Sitemap: {baseUrl}/sitemap.xml` se não estiver presente.
- Se não existir: criar com conteúdo padrão `User-agent: *\nAllow: /\nSitemap: ...`.

### 4.5 Route sorting — MÉDIA PRIORIDADE

**O que portar:** ao construir o array de URLs para o XML:
```js
const urls = [...routes].sort().filter(...).map(...)
```

---

## 5. `inject-template-hints` — BAIXA PRIORIDADE

### 5.1 `tpl.content` guard

**Problema:** o plugin faz `tpl.querySelectorAll("[class]")` diretamente. Em
parsers que respeitam a spec do DOM, `<template>` tem um `DocumentFragment` em
`.content`, e chamar `querySelectorAll` na tag `<template>` em si pode retornar
zero resultados.

**Observação:** `linkedom` pode ou não suportar `.content` em `<template>`.
Verificar antes de implementar.

**O que portar (se aplicável):**
```js
const tpl = doc.getElementById(id);
const root = tpl?.content ?? tpl;
for (const el of root?.querySelectorAll("[class]") ?? []) { ... }
```

---

## `inject-visibility-css` — SEM ALTERAÇÕES ✅

O cli-bun usa `el.closest("template")` que é funcionalmente equivalente e mais
limpo que o loop manual do erick. Nenhuma portagem necessária.

---

## Ordem de implementação sugerida

```
1. inject-head-attrs     → body directives + isSpaDefault/isOnlyTemplate + precedência
2. inline-animation-css  → scan de <template> via regex
3. optimize-images       → isInsideTemplate + bind-src + isDynamicSrc + LCP class + remove lazy + insertBefore
4. generate-sitemap      → {param} + wildcard parcial + guard= + robots.txt + sort
5. optimize-images       → alt warning
6. inject-template-hints → tpl.content guard (verificar suporte linkedom primeiro)
```

---

## Arquivos a modificar

| Arquivo | Itens |
|---------|-------|
| `src/prebuild/plugins/inject-head-attrs.js` | itens 1.1–1.3 |
| `src/prebuild/plugins/inline-animation-css.js` | item 2 |
| `src/prebuild/plugins/optimize-images.js` | itens 3.1–3.7 |
| `src/prebuild/plugins/generate-sitemap.js` | itens 4.1–4.5 |
| `src/prebuild/plugins/inject-template-hints.js` | item 5.1 (condicional) |
| `__tests__/prebuild.test.js` | novos casos de teste para cada item |

---

## Referência dos scripts originais

`scripts/inject-head-attrs.js` (220 linhas) → main
`scripts/inject-resource-hints.js` (109 linhas) → main (já mapeado no CLI)
`scripts/inline-animation-css.js` → branch `feat/build-inline-animation-css`
`scripts/optimize-images.js` → branch `feat/build-optimize-images`
`scripts/generate-sitemap.js` → branch `feat/build-generate-sitemap`
`scripts/inject-template-hints.js` → branch `feat/build-inject-template-hints`
`src/directives/head.js` → main (novos atributos de corpo: page-title, page-description, page-canonical, page-jsonld)

Repo local: `/Users/dieisondepra/workspace/playground/no-js-erick`
