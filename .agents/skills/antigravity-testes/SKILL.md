---
name: antigravity-testes
description: "Skill de coordenação do ecossistema de testes do Gravity. Visão geral dos três níveis (Vitest unitário/funcional + Playwright E2E), padrões de organização, cobertura mínima por área e roteamento para as 7 skills filhas (padrões, contract testing, teste em tela, planos por tipo). Consultar antes de escrever qualquer teste — para decidir QUAL tipo, ONDE colocar e QUAIS padrões aplicar."
---

# Gravity — Coordenação de Testes

> **REGRA ABSOLUTA — FONTE PRIMARIA (2026-05-17)**
>
> Quando o pipeline multi-agente (`skills/testes/multi-agente-plano-teste/SKILL.md`) gera planos para um escopo, esses planos sao a **unica fonte de verdade**. Testes legados (`.test.ts`, `.spec.ts`, planos `.json`/`.md`) do MESMO escopo sao **deletados e substituidos** — sem merge, sem coexistencia. Testes de outros escopos permanecem intactos. Ver regra completa na skill multi-agente.

---

## Pipeline Multi-Agente (processo primario)

Para escopos complexos (5+ campos, 3+ acoes, tabelas com multiplas colunas, criticidade alta/critica), o processo obrigatorio e o **pipeline multi-agente de 8 agentes**:

1. Analisador de Codigo — anatomia completa da feature
2. Analisador de Tela — inventario visual de elementos
3. Analisador de Variaveis — TODAS as combinacoes possiveis
4. QA Pleno — validacao de completude
5. QA Master — certeza 100% que nada ficou para tras
6. Elaborador — 3 planos JSON canonicos (UNI + FUN + E2E)
7. Revisor — conformidade planos vs matriz
8. Coordenador — aprovacao + apresentacao ao dono

**Skill completa:** `skills/testes/multi-agente-plano-teste/SKILL.md`

As skills `agente-plano-teste*` abaixo sao **subordinadas** ao pipeline multi-agente — definem o formato de output que o Agente 6 (Elaborador) deve seguir.

---

## Os Tres Niveis

| Nível | Ferramenta | Onde mora | O que prova |
|:---|:---|:---|:---|
| **Unitário** | Vitest | `testes/testes-unitarios/` | Funções e componentes isolados funcionam |
| **Funcional** | Vitest + Supertest | `testes/testes-funcionais/` | Rotas/integração intra-serviço funcionam |
| **E2E** | Playwright | `testes/testes-e2e/` | Fluxos completos no navegador funcionam |
| **EMT** | Playwright + prints | `testes/testes-em-tela/` | Fluxo visual documentado (PNG + RESULTADO.txt) |

> **Pasta `testes/` é centralizada na raiz** — nenhum produto/serviço tem `__tests__` interno. Mantém specs separadas do código de produção e facilita CI.

---

## Cobertura Mínima Obrigatória

| Área | Cobertura unitária |
|:---|:---|
| `nucleo-global/` | ≥ 80% |
| `servicos-global/configurador/` | ≥ 70% |
| `servicos-global/servicos-plataforma/*/` | ≥ 70% |
| `produtos/*/` | ≥ 70% |
| `packages/resolver-organizacao/` | ≥ 90% (SDK crítico de isolamento) |

CI bloqueia merge abaixo do limite. Ver `padroes-vitest-playwright` para configuração.

---

## Testes Obrigatórios por Tipo de Código

### Rotas Express (qualquer servidor)
- [ ] Teste funcional do happy path
- [ ] Teste funcional de validação Zod (400 com payload inválido)
- [ ] Teste funcional de autorização (401/403)
- [ ] Teste funcional de erro de banco (500)

### Acesso a banco de produto (via SDK)
- [ ] Teste anti-cross-organização (`testes/testes-cross-organizacao/<servico>/`)
- [ ] Teste de pool leak (`SET LOCAL` reset após crash do handler)

> **Scaffolds cross-tenant disponíveis (auditoria 2026-05-18):**
> 64 `it.todo()` prontos para implementação em 3 serviços:
> - `testes/testes-cross-organizacao/gabi/gabi.cross-tenant.test.ts` (19 testes)
> - `testes/testes-cross-organizacao/pedido/pedido.cross-tenant.test.ts` (24 testes)
> - `testes/testes-cross-organizacao/email/email.cross-tenant.test.ts` (21 testes)
>
> Cobrem 5 vetores: leitura cross-tenant, modificação, criação com tenant forçado, bypass de auth, pool leak.

### Componentes React
- [ ] Teste unitário de render
- [ ] Teste unitário dos estados principais (loading, vazio, erro, sucesso)
- [ ] Teste funcional de interação se há lógica não-trivial

### Schemas Zod
- [ ] Teste unitário com payload válido
- [ ] Teste unitário com payload inválido (cada campo)
- [ ] **Contract test** se schema é compartilhado front↔back (ver `contract-testing`)

---

## Numeração de IDs (novos vs legados)

- **Novos planos:** sufixo `{NNNNNN}` **global único** (automático via `generatePlanId` + Regra 1/10 em `01-convencao-ids.md`).
- **Legados:** corrigir **só a sequência numérica** quando o plano for revisado — plano a plano, sem migração em massa (Regra 11 no mesmo documento).

---

## Mapa das 8 Skills Filhas

| Skill | Quando consultar |
|:---|:---|
| **`multi-agente-plano-teste`** | **SEMPRE — processo primario de criacao de planos (8 agentes, 6 fases)** |
| `padroes-vitest-playwright` | Configurar Vitest/Playwright, estrutura de spec, mocks, fixtures |
| `contract-testing` | Schema Zod usado por front e back — CI bloqueia breaking changes (Mandamento 09) |
| `teste-em-tela` | EMT — ID `TST-EMT-{LOCAL}-{AREA}-{RESUMO}-{NNN}`; prints em `resultado-teste/<runId>/` |
| `agente-plano-teste` | Formato de plano geral (20 categorias) — subordinado ao multi-agente |
| `agente-plano-teste-unitario` | Formato de plano unitario (12 tipos de modulo) — subordinado ao multi-agente |
| `agente-plano-teste-funcional` | Formato de plano funcional (8 tipos de modulo) — subordinado ao multi-agente |
| `agente-plano-teste-e2e` | Formato de plano E2E (20 categorias, doutrina granularidade) — subordinado ao multi-agente |

---

## Decisão: QUAL teste escrever?

```
Mudança em função pura, util, helper        → Unitário
Mudança em componente React isolado         → Unitário
Mudança em rota Express                     → Funcional + Unitário (do handler)
Mudança em schema Zod compartilhado         → Unitário + Contract
Mudança em fluxo do usuário (multi-tela)    → E2E + revisar Funcional/Unitário existente
Mudança visual (CSS, layout, ícone)         → Teste em Tela (skill teste-em-tela)
Mudança em SDK resolver-organizacao         → Unitário + anti-cross-org + pool-leak
```

---

## Decisão: ONDE colocar?

> **SSOT:** `documentos-tecnicos/testes/regras/07-organizacao-plano-resultado-por-escopo.md`

Cada **feature** (escopo testável) tem duas pastas no mesmo nível:

| Pasta | Conteúdo |
|-------|----------|
| `plano-teste/` (ou `plano-de-teste/` em funcionais) | Plano `.md`, specs, runner |
| `resultado-teste/<runId>/` | Prints, `RESULTADO.txt`, evidências **daquela** execução |

```
testes/
├── testes-unitarios/<produto>/<area>/<feature>/
│   ├── plano-teste/
│   └── resultado-teste/
├── testes-funcionais/<produto>/<area>/<feature>/
│   ├── plano-de-teste/
│   └── resultado-teste/
├── testes-e2e/<produto>/<area>/<feature>/
│   ├── plano-teste/
│   └── resultado-teste/
├── testes-em-tela/<produto>/<area>/<feature>/
│   ├── plano-teste/               ← plano + run-*.ts
│   └── resultado-teste/<runId>/   ← prints isolados por run (EMT)
├── testes-cross-organizacao/<produto>/<area>/<feature>/
│   ├── plano-teste/
│   └── resultado-teste/
└── security/
```

**Exemplo EMT (Pedido › Lista › Editar-salvar):**
`testes/testes-em-tela/pedido/lista/editar-salvar/plano-teste/` + `.../resultado-teste/`

**Regras:**
- O caminho do spec espelha o caminho do código de produção
- Plano precede o spec sempre que a feature é nova
- **Proibido** prints na raiz do escopo ou pasta `YYYY-MM-DD-*` compartilhada (legado EMT)
- Nenhum spec dentro de `produtos/`, `servicos-global/` ou `nucleo-global/`

---

## Fluxo Completo de uma Feature Nova

1. Agente recebe tarefa do Lider
2. **Executa pipeline multi-agente** (`multi-agente-plano-teste`) — 8 agentes, 6 fases
3. Planos (UNI + FUN + E2E) aprovados pelo dono
4. **Testes legados do mesmo escopo deletados** (regra FONTE PRIMARIA)
5. Implementa codigo + specs Unitario/Funcional juntos
6. Roda Vitest local — todos verdes
7. Implementa specs E2E conforme plano
8. Roda Playwright local — todos verdes
9. PR aberto -> CI roda os 3 niveis + cobertura + linter
10. QA acionado (skill `papeis/qa`) com checklist de 6 categorias
11. Aprovado -> merge

---

## Regras Invioláveis

- **Nenhum teste com mock de banco quando o código real toca banco** — usar `testcontainers-postgres` ou banco de teste isolado
- **Nenhum spec E2E sem plano aprovado** pelo dono (regra do QA)
- **Nenhum `it.skip` ou `it.only`** chega no main — CI bloqueia
- **Nenhum spec dependente de ordem** — cada `it()` é independente
- **Nenhum `waitForTimeout(>1000)`** em E2E — se precisa, o app está lento
- **Schema Zod muda → contract test atualizado no MESMO commit** (Mandamento 09)
- **Cobertura abaixo do mínimo bloqueia merge** — sem exceção

---

## Checklist — Antes de Pedir Review

- [ ] 3 níveis presentes onde aplicável (unitário + funcional + E2E)?
- [ ] Cobertura ≥ limite da área?
- [ ] Plano de teste em `.md` para cada nível antes do spec?
- [ ] Anti-cross-organização + pool-leak para código que usa o SDK?
- [ ] Contract test atualizado se schema Zod mudou?
- [ ] Nenhum `it.skip`/`it.only`/`waitForTimeout` longo?
- [ ] CI verde local (`npm test` + `npm run test:e2e`)?
