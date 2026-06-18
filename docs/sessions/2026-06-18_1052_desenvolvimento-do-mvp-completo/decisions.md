# Decisões Tomadas — Desenvolvimento do MVP Completo

## Decisão 1: Persistência Baseada em JSON no LocalStorage
- **Contexto**: Para uma SPA local-first, era necessário definir a estrutura e limites do armazenamento.
- **Opções Consideradas**:
  - Opção A: Usar múltiplos itens do LocalStorage por vaga.
  - Opção B: Centralizar todas as vagas em um único array JSON (`jsos_jobs`) e as configurações em `jsos_config`.
- **Decisão**: Opção B.
- **Justificativa**: Simplifica as consultas, carregamento global no dashboard e atualizações de status via drag-and-drop.
- **Impacto**: A importação/exportação do banco de dados completo pode ser feita no futuro com um simples stringify/parse do JSON.

## Decisão 2: Uso do Conic Gradient no Gauge de Score
- **Contexto**: A visualização do Match Score precisava de um indicador premium sem carregar bibliotecas pesadas de gráficos.
- **Opções Consideradas**:
  - Opção A: Carregar bibliotecas via CDN (Chart.js, etc.).
  - Opção B: Criar um indicador circular dinâmico usando propriedades de CSS puro (`conic-gradient`).
- **Decisão**: Opção B.
- **Justificativa**: Carregamento instantâneo, visual limpo, 100% responsivo e alinhado com o design system leve.
- **Impacto**: O estilo é atualizado dinamicamente via JS manipulando o background inline do elemento.
