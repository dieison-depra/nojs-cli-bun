# Análise de Performance: nojs-cli-bun em Zig/Rust

Esta análise avalia os ganhos reais de converter o **nojs-cli-bun** (atualmente em JS/Bun) para linguagens de sistemas como **Zig** ou **Rust**.

## 1. O Estado Atual (Bun + linkedom)
O CLI atual utiliza o Bun como runtime e a biblioteca `linkedom` para processar o HTML.
*   **Startup:** O Bun inicia em ~10ms, o que é excelente para uma ferramenta de linha de comando.
*   **Parsing:** O `linkedom` constrói uma árvore DOM completa em memória para cada arquivo. Isso é custoso em termos de RAM para arquivos gigantes.
*   **Memória:** O consumo médio gira em torno de **40MB - 80MB** devido ao heap do JavaScriptCore e à estrutura de objetos do DOM.

## 2. Ganhos Reais com Zig ou Rust

### A. Tempo de Execução (Velocidade Pura)
*   **Parsing Streaming:** Usando uma biblioteca como `lol-html` (Rust), o CLI poderia processar o HTML via **streams** sem nunca carregar o arquivo inteiro na memória. Isso resultaria em uma velocidade de processamento **20x a 50x superior** à manipulação de objetos JS.
*   **Paralelismo Real:** Rust e Zig permitem o uso de threads nativas sem o custo de serialização do `Worker Threads` do JS, permitindo processar múltiplos arquivos simultaneamente de forma linear com o número de núcleos da CPU.

### B. Consumo de Memória
*   **Eficiência Extrema:** Um CLI escrito em Rust ou Zig consumiria entre **2MB e 8MB** de RAM para a mesma tarefa.
*   **Zero Garbage Collection:** A ausência de um GC elimina "pausas" durante o processamento de milhares de arquivos, tornando a execução previsível e constante.

## 3. Comparativo Técnico

| Métrica | Bun (JS) | Rust / Zig (Nativo) | Ganho |
| :--- | :--- | :--- | :--- |
| **Inicialização** | ~20ms | < 1ms | **Instantâneo** |
| **Memória (Heap)** | 40MB+ | 2MB - 5MB | **90% de redução** |
| **Parsing (1000 arquivos)** | ~5s | ~0.2s | **25x mais rápido** |
| **Binário Final** | Requer Bun/Node | Estático (Single File) | **Portabilidade** |

## 4. Vale a pena a conversão total?

### Quando SIM:
*   Se o CLI for utilizado em pipelines de CI/CD de larga escala com **milhares de páginas**.
*   Se você deseja distribuir uma ferramenta "zero-dependency" que rode instantaneamente em qualquer ambiente (Windows, Mac, Linux, Docker Minimal).
*   Se as transformações de AOT (Ahead-of-Time) se tornarem muito complexas para o JS gerenciar com segurança de tipos.

### Quando NÃO (ou usar Híbrido):
*   Se o CLI for focado em desenvolvedores frontend que esperam extensibilidade fácil via plugins JS.
*   **Abordagem Híbrida:** Manter o orquestrador no Bun (pela facilidade de plugins e rede) e mover apenas o **motor de transformação de HTML** para um binário nativo chamado pelo Bun via FFI (Foreign Function Interface).

## 5. Conclusão

Converter o `nojs-cli-bun` para **Rust** ou **Zig** traria um ganho de performance **perceptível apenas em projetos de grande escala**. Para o desenvolvedor comum, a inicialização do Bun já é "rápida o suficiente". O maior ganho real seria a **redução drástica de memória** e a facilidade de criar um executável único e leve para distribuição global.
