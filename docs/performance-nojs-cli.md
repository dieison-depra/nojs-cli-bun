# Performance Optimization Plan: No.JS vs. State-of-the-Art

> **Nota de Contexto:** Este plano foca em otimizações na camada de **Build/Compilação (CLI)**. Para otimizações na camada de **Runtime (Core/Engine)**, consulte o [Plano de Performance do nojs-bun](../../nojs-bun/performance.md).

Este documento detalha os gargalos identificados no benchmark `js-framework-benchmark` (onde o No.JS performa ~2x pior que Svelte/React) e propõe técnicas de compilação de build para fechar essa lacuna.

## 1. Análise de Gargalos (Bottlenecks)

| Gargalo | Causa Raiz | Impacto |
| :--- | :--- | :--- |
| **Runtime DOM Scanning** | O framework varre o DOM no navegador procurando por atributos (`bind-`, `on-`, `if-`). | **Scripting Time** alto no carregamento inicial. |
| **Individual Listeners** | Cada linha de uma tabela (ex: 1.000 linhas) recebe um listener de evento individual. | **Memory Pressure** e lentidão na criação de elementos. |
| **Naive Loop Updates** | O processamento de listas (`for=`) provavelmente reconstrói o DOM ou faz diffs caros. | **Rendering Latency** em atualizações de listas grandes. |
| **Path Resolution** | Resolvendo `state.user.data.id` em runtime via strings/regex repetidamente. | **CPU Overhead** em aplicações com estado complexo. |

## 2. Técnicas de Mercado vs. Estado Atual

| Técnica | Frameworks | Estado No.JS | Gap |
| :--- | :--- | :--- | :--- |
| **AOT Compilation** | Svelte, Solid | Interpreta em Runtime | **Crítico** |
| **Event Delegation** | React, Inferno | Listeners Individuais | **Alto** |
| **Template Cloning** | Solid, Preact | `innerHTML` ou `createElement` | **Alto** |
| **Static Hoisting** | Vue 3, Marko | Processa tudo como dinâmico | **Médio** |
| **Keyed Diffing** | Svelte, React | Diffing básico/ausente | **Médio** |

## 3. Plano de Implementação (NoJS-CLI)

### P1: Event Delegation Injection
- **O que é:** O build remove atributos `on-click` e os transforma em `data-nojs-event="click"`. Injeta um único script de 10 linhas que captura todos os eventos na raiz.
- **Arquivos:** `src/prebuild/plugins/inject-event-delegation.js`
- **Esforço:** 2/5 (Baixo-Médio)
- **Ganho Esperado:** +20% em "Create Rows" e "Append Rows".

### P2: Template Cloning (Solid.js Style)
- **O que é:** O build identifica fragmentos repetitivos (dentro de `for=`), extrai para um `<template>` oculto e gera um script que usa `node.cloneNode(true)` em vez de parsing de string.
- **Arquivos:** `src/prebuild/plugins/compile-templates.js`
- **Esforço:** 4/5 (Alto)
- **Ganho Esperado:** +40% em performance de criação de DOM.

### P3: Static Tree Hoisting
- **O que é:** Identifica sub-árvores de HTML que não possuem diretivas dinâmicas e as marca com `data-nojs-static`. O runtime pula essas árvores em ciclos de atualização.
- **Arquivos:** `src/prebuild/plugins/hoist-static-content.js`
- **Esforço:** 2/5 (Baixo)
- **Ganho Esperado:** Redução de 15% no TBT (Total Blocking Time).

### P4: AOT Directive Normalization
- **O que é:** Transforma caminhos de estado complexos em índices numéricos ou getters curtos. Ex: `state.user.profile.name` -> `s[0]`.
- **Arquivos:** `src/prebuild/plugins/normalize-directives.js`
- **Esforço:** 3/5 (Médio)
- **Ganho Esperado:** +10% em Scripting Duration.

## 4. Ordem de Priorização (Roadmap)

1.  **Event Delegation (Quick Win):** Maior ganho imediato em memória e tempo de resposta em tabelas grandes.
2.  **Static Hoisting (Low Hanging Fruit):** Fácil de implementar e reduz o trabalho do runtime em páginas densas de conteúdo.
3.  **Template Cloning (Performance Core):** Mudança estrutural necessária para atingir o nível do Svelte/Solid.
4.  **AOT Normalization (Optimization):** Ajuste fino de performance para aplicações enterprise complexas.

## 5. Estimativa de Impacto Consolidado

| Métrica | Status Atual | Com Plano | Melhora |
| :--- | :--- | :--- | :--- |
| **Create 1k Rows** | ~140ms | ~80ms | **~43%** |
| **Replace all rows** | ~160ms | ~90ms | **~44%** |
| **Scripting Time** | Alto (Interpretação) | Baixo (Direto) | **~50%** |
| **Memory usage** | ~40MB | ~25MB | **~35%** |

---
*Nota: Este plano foca em otimizações que podem ser feitas via CLI/Build, minimizando mudanças manuais no código fonte do usuário.*
