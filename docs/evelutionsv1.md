
    1 # Roadmap de Evoluções e Inovações: nojs-cli-bun
    2
    3 Este documento detalha oportunidades de evolução para o `nojs-cli-bun`, baseando-se no estado da arte de
      frameworks modernos (Astro, Qwik, Svelte, Angular, React, Vue, SolidJS) e nas exigências de Core Web Vitals, A11y,
      Segurança e SEO para 2024-2026.
    4
    5 ---
    6
    7 ## 1. Acessibilidade (a11y) Proativa e Cognitiva
    8
    9 Além do linting básico, a próxima fronteira foca na automação inteligente do contexto de acessibilidade.
   10
   11 -   **Amostragem de Contraste Dinâmico:** Implementar análise de cores computadas (incluindo variáveis CSS e
      herança) para garantir conformidade WCAG 2.1 em tempo de build, simulando daltonismo e baixa visão.
   12 -   **Auto-Geração de Alt-Text via LLM Local:** Utilizar modelos de visão locais (executados via Bun/Wasm) para
      sugerir descrições para imagens sem `alt`, marcando-as para revisão humana em vez de deixá-las inacessíveis.
   13 -   **Contextual Reduced Motion:** Plugin para injetar automaticamente `@media (prefers-reduced-motion)` em blocos
      de animação detectados, garantindo que o site respeite as preferências do sistema operacional sem esforço manual
      do desenvolvedor.
   14
   15 ## 2. Segurança e Integridade (Defesa em Profundidade)
   16
   17 Elevar o nível de proteção para mitigar ataques de supply chain e XSS moderno.
   18
   19 -   **Trusted Types Policy Injection:** Automatizar a criação e aplicação de políticas de [Trusted
      Types](https://web.dev/trusted-types/) para blindar qualquer manipulação de DOM residual contra injeções.
   20 -   **Permissions-Policy Automation:** Gerar dinamicamente metatags ou cabeçalhos de `Permissions-Policy` (antigo
      Feature Policy) para desabilitar APIs sensíveis (câmera, microfone, geolocalização) que não são utilizadas pelo
      projeto.
   21 -   **Zod-driven HTML Validation:** Validar a estrutura de templates e atributos `data-*` contra esquemas
      rigorosos no build, prevenindo que bugs de parsing facilitem ataques de "clobbering" ou quebras de crawler.
   22
   23 ## 3. SEO de Próxima Geração e Web Crawling
   24
   25 Otimização granular para motores de busca e visibilidade social.
   26
   27 -   **Image LCP Priority Hints:** Identificar automaticamente o maior elemento visual (Largest Contentful Paint)
      no HTML e injetar `fetchpriority="high"` enquanto remove `loading="lazy"`, otimizando drasticamente o tempo de
      carregamento percebido.
   28 -   **Automatic I18n Routing & Hreflang:** Gerar tags `link rel="alternate" hreflang="..."` baseadas na estrutura
      de diretórios ou metadados de tradução, facilitando a indexação multirregional.
   29 -   **Breadcrumb JSON-LD Auto-Generation:** Inferir a hierarquia de navegação a partir do sitemap e injetar
      automaticamente o Schema.org de BreadcrumbList em cada página.
   30
   31 ## 4. Otimização de Performance (Efeito "Qwik/Astro")
   32
   33 Redução extrema de overhead e uso eficiente de recursos do navegador.
   34
   35 -   **Dynamic Font Subsetting:** Analisar o conteúdo textual de cada página e gerar "subsets" de fontes (WOFF2)
      contendo apenas os caracteres efetivamente utilizados, reduzindo arquivos de ~100kb para ~10kb.
   36 -   **CSS Variable Tree-Shaking:** Identificar e remover variáveis CSS (`--var`) declaradas mas nunca
      referenciadas no HTML processado, diminuindo o custo de parsing do CSSOM.
   37 -   **Static Interaction Manifest:** Evoluir a delegação de eventos para gerar um manifesto que impede o
      carregamento de qualquer script de interatividade até que o componente alvo entre na viewport (similar ao
      "Hydration on Visibility" do Astro).
   38
   39 ## 5. Auditoria de Supply Chain e Prevenção de CVEs
   40
   41 Garantir que o artefato final não contenha vulnerabilidades conhecidas em seus links ou scripts.
   42
   43 -   **Post-build Dependency Lockdown:** Validar scripts externos ou CDNs contra bases de vulnerabilidades (como
      OSV.dev), falhando o build se um recurso vulnerável for detectado no HTML final.
   44 -   **Shadow DOM Encapsulation Audit:** Para projetos que utilizam Web Components, auditar se há vazamento de
      estilos ou seletores que possam ser explorados para CSS Injection.
   45
   46 ---
   47
   48 ## Prioridades Recomendadas (Top 3)
   49
   50 1.  **LCP Priority Hints:** Ganho imediato e mensurável em Core Web Vitals (Performance).
   51 2.  **Font Subsetting:** Redução drástica no peso inicial da página (Performance/SEO).
   52 3.  **Permissions Policy Automation:** Segurança robusta por padrão (Segurança).

  Vou escrever este conteúdo no arquivo solicitado.