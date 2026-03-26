# No.JS — Post-Build Optimization Roadmap

Análise das oportunidades de scripts post-build para melhorar métricas de SEO,
Core Web Vitals e UX em projetos que usam o framework No.JS.

**Escopo:** somente scripts que rodam após `build.js`, sem alterações no source
do framework. Zero breaking changes. Dependências já presentes (`jsdom`, `glob`).

**Contexto:** dois scripts já existem (PRs #33 e #35):
- `inject-resource-hints.js` — preload/preconnect/prefetch de APIs e route templates
- `inject-head-attrs.js` — title, description, canonical, JSON-LD estáticos

---

## Mapa de métricas

| Sigla | Métrica | Impacto em |
|---|---|---|
| LCP | Largest Contentful Paint | Velocidade percebida do maior elemento visível |
| CLS | Cumulative Layout Shift | Estabilidade visual durante carregamento |
| FCP | First Contentful Paint | Primeiro pixel de conteúdo na tela |
| INP | Interaction to Next Paint | Responsividade a interações |
| TTFB | Time to First Byte | Velocidade de resposta do servidor / rede |
| TTI | Time to Interactive | Quando o JS termina de processar e a página responde |
| SEO | Indexabilidade | Conteúdo visível para crawlers sem executar JS |

---

## Oportunidades identificadas

---

### B1 — Image Optimization: lazy-load, decode, preload e alt

**O que está acontecendo hoje:**
Imagens dentro de templates e no body HTML não têm nenhuma instrução de carregamento.
O browser as baixa todas de uma vez, competindo com recursos críticos.

**O que o script faria:**
1. Adicionar `loading="lazy"` em toda `<img>` sem atributo `loading` explícito
2. Adicionar `decoding="async"` em imagens fora do crítico (não-LCP)
3. Detectar imagens candidatas a LCP (primeira `<img>` significativa, ou com classes
   como `hero`, `featured`, `banner`) e injetar `<link rel="preload" as="image">`
4. Emitir warning no console para `<img>` sem `alt` (SEO + acessibilidade)
5. Injetar `width` e `height` padrão se ausentes (previne CLS)

**Padrões detectados no codebase:**
- `<img>` dentro de `<template>` elements (uso comum em loops e routes)
- `bind-src` em imagens → detectável com seletor `img[bind-src]` para log de aviso

**Arquivo do script:** `scripts/optimize-images.js`

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 0 |
| Linhas do script | ~180 |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| LCP | Alto — preload da imagem hero chega antes do parser |
| CLS | Médio — width/height reserva o espaço antes do load |
| FCP | Médio — lazy load libera banda para recursos críticos |
| SEO | Baixo — `alt` warnings previnem penalidade de acessibilidade |

**Ganho final:** Impacto direto no score do Lighthouse LCP, que é o maior peso no
Performance score (25% da pontuação). Sites com hero image tipicamente ganham
8–20 pontos de Performance Score só com preload correto da LCP image.

---

### B2 — Inline Critical CSS de animações

**O que está acontecendo hoje:**
O framework injeta keyframes de animação em `<head>` via JS em runtime
(`src/animations.js` linhas 11–31). Isso significa que qualquer elemento com
`animate=`, `animate-enter=` ou `transition=` pisca/desaparece antes de receber
a animação, porque o CSS só existe após o JS executar.

**O que o script faria:**
1. Escanear todos os atributos `animate`, `animate-enter`, `animate-leave`, `transition`
2. Coletar o conjunto minimal de keyframes usados no documento
3. Injetar `<style data-nojs="animations">` em `<head>` com somente os keyframes
   necessários — o runtime detecta o tag e não injeta duplicata

**Keyframes disponíveis no source:**
`fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`, `slideInLeft`, `slideInRight`,
`zoomIn`, `zoomOut`, `bounceIn`, `bounceOut` (10 animações × ~5 linhas CSS cada)

**Arquivo do script:** `scripts/inline-animation-css.js`

**Mudança necessária no framework:** Pequena — em `src/animations.js`, antes de
injetar o `<style>`, verificar se `document.head.querySelector('[data-nojs="animations"]')`
já existe e pular se sim. Isso é 3 linhas de mudança, sem breaking change.

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 1 (`src/animations.js`) |
| Linhas no framework | 3 (guarda de duplicata) |
| Linhas do script | ~120 |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| FCP | Médio — animações ficam disponíveis antes do JS |
| CLS | Médio — elimina flash de conteúdo não-animado |
| TTI | Baixo — menos trabalho de injeção no runtime |

**Ganho final:** Elimina FOUC (Flash of Unstyled Content) em páginas que usam
animações em elementos acima do fold. Melhora Score de CLS em ~0.02–0.05.

---

### B3 — Preload de arquivos de locale (i18n)

**O que está acontecendo hoje:**
O sistema de i18n (`src/i18n.js`, `src/directives/i18n.js`) carrega arquivos
de tradução via `fetch` em runtime, bloqueando a primeira renderização de
qualquer conteúdo que use `t=` ou `bind-t`. A configuração do `loadPath` é
feita em `NoJS.config({ i18n: { loadPath: "..." } })` e é estática.

**O que o script faria:**
1. Extrair `loadPath` e `defaultLocale` do `NoJS.config(...)` inline nos HTML files
2. Injetar `<link rel="preload" href="/locales/en.json" as="fetch" crossorigin>`
   para o locale padrão
3. Injetar `<link rel="prefetch">` para os locales secundários declarados
4. Se `<html lang="">` estiver vazio, preencher com o `defaultLocale`

**Padrões detectados:**
```js
// Detectável com regex no <script> do HTML
NoJS.i18n({ loadPath: '/locales/{locale}.json', defaultLocale: 'pt' })
```

**Arquivo do script:** Extensão de `inject-resource-hints.js` (PR #33) ou script
separado `scripts/inject-i18n-hints.js`

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 0 |
| Linhas do script | ~100 |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| FCP | Alto — locale carrega em paralelo com JS, não após |
| TTFB percebido | Médio — evita waterfall JS→fetch locale→render |
| SEO | Baixo — `<html lang="">` preenchido corretamente |

**Ganho final:** Em sites multilíngue com `t=` na hero section, o FCP pode
melhorar 200–600ms eliminando o waterfall de fetch do locale.

---

### B4 — Injeção de `<link rel="dns-prefetch">` para o domínio base da API

**O que está acontecendo hoje:**
O `inject-resource-hints.js` já injeta `preconnect` para origens cross-origin
detectadas em `get=` estáticos. Mas o atributo `base=` do framework define a
URL raiz de todas as chamadas — e esse domínio não é coberto.

**O que o script faria:**
1. Detectar `<body base="https://api.example.com">` ou
   `NoJS.config({ baseApiUrl: '...' })` no HTML
2. Injetar `<link rel="preconnect" href="https://api.example.com">`
3. Injetar `<link rel="dns-prefetch" href="https://api.example.com">` como
   fallback para browsers mais antigos

**Arquivo do script:** Extensão de `inject-resource-hints.js` (PR #33)

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 0 |
| Linhas adicionais no script existente | ~40 |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| TTFB | Médio — DNS e TLS para a API começam antes do primeiro `get=` |
| LCP | Baixo-médio — se o conteúdo LCP vier de uma API, ganha 50–200ms |

**Ganho final:** Melhoria discreta mas consistente. Em mobile com DNS lento,
pode representar 100–300ms de diferença na primeira chamada de API.

---

### B5 — Critical CSS para estados show/hide antes do JS

**O que está acontecendo hoje:**
Os directives `if=`, `show=` e `hide=` adicionam `display:none` via JS em
runtime. Antes do JS executar, todos os elementos condicionais são visíveis
ao mesmo tempo, causando um flash de conteúdo incorreto.

Exemplo: um modal com `if="showModal"` aparece por um frame antes do JS
processar e escondê-lo — CLS + UX ruim.

**O que o script faria:**
1. Escanear `[if]`, `[show]`, `[hide]` em elementos
2. Para expressões claramente falsas em tempo de build (ex: `if="false"`,
   `show="0"`, `hide="true"`), injetar `hidden` attribute diretamente
3. Injetar CSS minimal em `<head>`:
   ```css
   [data-nojs-pending] { visibility: hidden; }
   ```
4. Adicionar `data-nojs-pending` em elementos com `if=`, `show=`, `hide=`
   para que fiquem invisíveis até o runtime remover o atributo (mudança no framework)

**Mudança necessária no framework:** Em `src/directives/conditionals.js`, após
processar o directive, remover `data-nojs-pending` do elemento. 4–5 linhas,
sem breaking change.

**Arquivo do script:** `scripts/inject-visibility-css.js`

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 1 (`src/directives/conditionals.js`) |
| Linhas no framework | 4–5 |
| Linhas do script | ~80 |
| Breaking changes | Nenhum — atributo ignorado se framework não o remover |

| Métrica | Melhora esperada |
|---|---|
| CLS | Alto — elimina flash de conteúdo condicional |
| FCP | Baixo — reduz repaint inicial |
| UX | Alto — experiência sem "piscar" no load |

**Ganho final:** CLS é o segundo maior fator no Performance Score do Lighthouse.
Eliminar flashes de modais, dropdowns e seções condicionais pode mover um
CLS de 0.15 para < 0.1 (fronteira "good" do Core Web Vitals).

---

### B6 — Sitemap de rotas e `robots.txt` hints

**O que está acontecendo hoje:**
O framework tem um sistema de rotas completo (`<template route="/path">`),
mas não gera nenhum artefato de descoberta de rotas para crawlers.

**O que o script faria:**
1. Escanear todos `<template route="...">` em todos os HTML da dist
2. Excluir rotas com `guard=` (protegidas, não devem ser indexadas)
3. Excluir wildcards (`route="*"`)
4. Gerar `dist/sitemap.xml` com as rotas descobertas
5. Gerar ou complementar `dist/robots.txt` com `Sitemap:` directive
6. Injetar `<link rel="canonical">` nas rotas que ainda não têm (vide PR #35)

**Arquivo do script:** `scripts/generate-sitemap.js`

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 0 |
| Linhas do script | ~160 |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| SEO (indexabilidade) | Alto — crawlers descobrem todas as rotas automaticamente |
| SEO (canonical) | Médio — evita conteúdo duplicado em SPAs com hash mode |

**Ganho final:** Impacto direto em indexação. Sites sem sitemap têm crawl budget
desperdiçado. Com sitemap, o Google descobre rotas novas em horas ao invés de
dias/semanas.

---

### B7 — Preload de skeleton templates referenciados em `loading=`

**O que está acontecendo hoje:**
O atributo `skeleton=` (PR #29 / M3) e `loading=` em `get=` apontam para
`<template id="...">` que existem no DOM mas cujo CSS não é precarregado.
Se o CSS do skeleton estiver em arquivo externo, ele chega tarde e o skeleton
aparece sem estilo por um frame.

**O que o script faria:**
1. Escanear `[loading]`, `[skeleton]`, `[error]`, `[empty]`, `[success]`
2. Coletar os IDs de templates referenciados (`loading="#skeleton"`)
3. Para cada template referenciado, verificar se contém classes CSS
4. Injetar `<link rel="preload" as="style">` para stylesheets que contêm
   essas classes (detectável via padrões de classe como `.skeleton-*`)
5. Gerar inline CSS mínimo para estilos de skeleton comuns

**Arquivo do script:** `scripts/inject-template-hints.js`

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 0 |
| Linhas do script | ~130 |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| CLS | Médio — skeleton aparece estilizado imediatamente |
| FCP | Baixo — CSS do skeleton disponível antes do request |
| UX percebida | Médio — loading states polidos desde o primeiro frame |

**Ganho final:** Melhora a percepção de performance. Skeletons sem estilo
são piores do que sem skeleton — usuários percebem o "flash" como um bug.

---

### B8 — Injeção de Open Graph e Twitter Card tags

**O que está acontecendo hoje:**
O script `inject-head-attrs.js` (PR #35) cobre `page-title`, `page-description`,
`page-canonical` e `page-jsonld`. Mas parsers de compartilhamento social
(Facebook, LinkedIn, Twitter/X, WhatsApp) leem tags Open Graph e Twitter Card,
que não são cobertas.

**O que o script faria:**
Reconhecer atributos `page-og-*` e `page-twitter-*` em body directives:

```html
<div hidden
  page-og-title="'Sneaker X | My Store'"
  page-og-description="'The best sneaker of the year'"
  page-og-image="'https://cdn.mystore.com/og-sneaker.jpg'"
  page-og-type="'product'">
</div>
```

E injetar:
```html
<meta property="og:title" content="Sneaker X | My Store">
<meta property="og:description" content="The best sneaker of the year">
<meta property="og:image" content="https://cdn.mystore.com/og-sneaker.jpg">
<meta property="og:type" content="product">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Sneaker X | My Store">
```

**Arquivo do script:** Extensão do `inject-head-attrs.js` (PR #35)

| Dimensão | Estimativa |
|---|---|
| Arquivos do framework alterados | 0 |
| Linhas adicionais no script existente | ~80 |
| Novos atributos de directive no M1 | 5–6 novos atributos (`page-og-*`) |
| Breaking changes | Nenhum |

| Métrica | Melhora esperada |
|---|---|
| SEO social | Alto — previews corretos em compartilhamentos |
| CTR (taxa de clique) | Médio-alto — links com imagem OG têm CTR até 3× maior |

**Ganho final:** Direto em conversão e tráfego. Um link compartilhado no
WhatsApp/LinkedIn com imagem e título corretos converte significativamente
mais do que um link sem preview.

---

## Tabela de priorização

| # | Script | Esforço | Impacto | Métricas | Status recomendado |
|---|---|---|---|---|---|
| B3 | Preload i18n locale | Baixo (100 L) | Alto | FCP, TTFB | **Novo PR** |
| B4 | DNS prefetch de base API | Baixíssimo (40 L) | Médio | TTFB, LCP | **Extensão PR #33** |
| B1 | Image lazy + preload LCP | Médio (180 L) | Alto | LCP, CLS, FCP | **Novo PR** |
| B6 | Sitemap de rotas | Médio (160 L) | Alto | SEO indexação | **Novo PR** |
| B8 | Open Graph / Twitter Card | Baixo (80 L) | Alto | SEO social, CTR | **Extensão PR #35** |
| B2 | Inline CSS de animações | Médio (120 L + 3 L framework) | Médio | FCP, CLS | **Novo PR** |
| B5 | CSS para show/hide pendente | Baixo (80 L + 5 L framework) | Alto | CLS, UX | **Novo PR** |
| B7 | Preload de skeleton CSS | Médio (130 L) | Médio | CLS, UX | **Novo PR** |

---

## Estimativa de ganho consolidado

Aplicando todos os itens acima em um projeto típico (SPA com rotas, API, i18n,
animações):

| Métrica | Antes | Após | Ganho estimado |
|---|---|---|---|
| LCP | 3.5s | 2.0–2.5s | −30–40% |
| CLS | 0.15–0.20 | 0.05–0.08 | −50–65% |
| FCP | 2.8s | 1.8–2.2s | −20–35% |
| Performance Score (Lighthouse) | 55–65 | 75–85 | +15–25 pontos |
| Indexação de rotas | parcial | completa | +100% discovery |
| CTR via social | base | +50–200% | (depende de volume) |

> **Nota:** os números acima são estimativas baseadas em benchmarks públicos de
> técnicas similares. O ganho real depende do projeto específico — content-heavy
> sites ganham mais em LCP; SPAs com muitos condicionais ganham mais em CLS.

---

## Dependências e pré-requisitos

Todos os scripts usam somente o que já é `devDependency` no projeto:

| Dependência | Uso | Já presente? |
|---|---|---|
| `jsdom` | Parse e manipulação de HTML | ✅ |
| `glob` | Descoberta de arquivos | ✅ |
| `fs` (Node built-in) | Leitura/escrita de arquivos | ✅ |
| `path` (Node built-in) | Resolução de paths | ✅ |

Os scripts B2 e B5 requerem pequenas adições no source do framework
(3–5 linhas cada, sem breaking changes).

---

*Análise gerada em 2026-03-24 — baseada no source da branch `main` do repositório
`ErickXavier/no-js`.*
