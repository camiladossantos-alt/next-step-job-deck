# Contexto — Pesquisa Matching de Vagas

## Situação Inicial
O projeto Next Step - Job Deck possuía a especificação da feature `F-03: Match Score` estruturada no `business-context-lite.md`, porém necessitava de aprofundamento sobre como os concorrentes modelam essas regras de matching para estruturar as regras internas do nosso motor de IA de forma otimizada.

## Motivação
Entender as melhores práticas de mercado (ATS, LinkedIn, Indeed, Teal, Jobscan) garante que a nossa ferramenta forneça métricas confiáveis de matching, além de evitar armadilhas como keyword stuffing e falsos negativos de formatação.

## Restrições
O projeto é Local-First e deve funcionar offline de forma econômica. Assim, as regras de cálculo precisam ser leves e executáveis via JS direto no front-end, complementadas por IA opcional via API Gemini/Ollama.

## Referências
- Pesquisas sobre algoritmos ATS, LinkedIn, Indeed, Teal e Jobscan.
