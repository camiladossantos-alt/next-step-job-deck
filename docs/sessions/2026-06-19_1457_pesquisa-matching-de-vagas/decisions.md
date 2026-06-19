# Decisões Tomadas — Pesquisa Matching de Vagas

## Decisão 1: Abordagem Híbrida para Match Score
- **Contexto**: A aplicação precisa rodar localmente e de forma rápida sem custos altos de processamento.
- **Opções Consideradas**:
  - Opção A: Fazer todo o matching via chamadas de IA (Gemini/Ollama). (Prós: Muito preciso e semântico; Contras: Lento, consome muitos tokens/processamento local).
  - Opção B: Fazer um motor offline estrito de similaridade de cosseno/Jaccard em JS. (Prós: Instantâneo e gratuito; Contras: Não entende sinônimos).
  - Opção C (Híbrida): Motor local em JS rodando contagem e estatística simples para feedback rápido na UI, e chamada de IA (Gemini/Ollama) sob demanda para análise semântica detalhada e dicas de escrita de currículo.
- **Decisão**: Opção C (Híbrida).
- **Justificativa**: Garante o melhor dos dois mundos: rapidez offline no frontend e inteligência de alto nível opcional por IA.
- **Impacto**: A interface precisará de estados visuais indicando se a análise é offline (rápida/estatística) ou por IA (completa/semântica).
