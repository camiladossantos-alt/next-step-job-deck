# Contexto — Otimização do Match Score

## Situação Inicial
O Next Step calculava o Match Score de forma puramente generativa por IA (sem pesos fixos e sem diferenciar hard/soft skills), e possuía um fallback offline extremamente básico limitado a 10 palavras-chave estáticas.

## Motivação
Aproximar o algoritmo de matching do Next Step aos padrões dos principais ATS e assistentes de mercado (Teal e Jobscan), introduzindo inteligência local, pesos determinísticos de competências, verificação de dados de impacto no currículo e separação visual de Hard vs. Soft Skills.

## Restrições
Não adicionar dependências externas para manter a aplicação modular, Local-First e leve para execução direta no navegador. Garantir a retrocompatibilidade com estruturas de dados antigas de vagas salvas em bancos de dados ou no localStorage.

## Referências
- [job-matching-rules.md](file:///c:/Users/Pulse%20Mais/OneDrive/Central-vagas/onion-portable/docs/knowledge-base/job-matching-rules.md)
