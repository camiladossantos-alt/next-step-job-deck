# Decisões Tomadas — Otimização do Match Score

## Decisão 1: Retrocompatibilidade em Match Score Schema
- **Contexto**: Vagas antigas no `localStorage` ou no Supabase possuem o campo `matchScore` contendo apenas `{ score, found: [], missing: [], recommendation: "" }`. A introdução de arrays de `hardSkills` e `softSkills` quebraria visualizadores existentes ou mapeamentos de DB.
- **Opções Consideradas**:
  - Opção A: Migrar todas as vagas da base de dados adicionando os novos campos. (Prós: Consistência absoluta; Contras: Complexo, exige script de migração no Supabase, alto risco de perda de dados).
  - Opção B: Adicionar os novos objetos de forma aninhada e manter os arrays planos `found` e `missing` sincronizados na raiz do objeto. (Prós: Risco zero, retrocompatibilidade garantida no frontend sem mexer no banco; Contras: Leve redundância de dados no JSON).
- **Decisão**: Opção B (Aninhamento e sincronismo retrocompatível).
- **Justificativa**: Preserva a estabilidade de dados do usuário local e na nuvem, enquanto possibilita a melhoria visual na tela de detalhes.
- **Impacto**: O modulo `app.js` junta no frontend as Hard e Soft skills e popula os campos legados `found`/`missing` logo após o processamento.
