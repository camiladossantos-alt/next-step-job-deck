---
name: antigravity-teste-em-tela
description: "Skill de teste visual com navegador. Quando ativada, o agente executa um passo a passo completo de teste — do login até o fluxo final — usando Playwright, e salva prints numerados de cada etapa em testes/testes-em-tela/<escopo>/plano-teste + resultado-teste/<runId>/. Cada execução tem pasta própria — prints nunca são compartilhados entre runs."
---

# Gravity — Teste em Tela

## Por que esta skill existe

Testes unitários provam que funções funcionam. Testes em tela provam que o **usuário
consegue completar o fluxo**. São complementares, não substitutos.

Esta skill define como o agente executa um teste visual completo:
do zero ao fluxo finalizado, com print de cada estado significativo.

> **Regra absoluta (2026-06-06):** Ver `documentos-tecnicos/testes/regras/07-organizacao-plano-resultado-por-escopo.md` — cada feature tem `plano-teste/` e `resultado-teste/<runId>/`. **Proibido** pasta datada compartilhada na raiz do escopo.

> **ID EMT (2026-06-06):** `TST-EMT-{LOCAL}-{AREA}-{RESUMO}-{NNNNNN}` — sufixo **global único** (6 dígitos). Ex.: `TST-EMT-PEDIDO-LISTA-EDITAR-SALVAR-000045`. Variante feature-first: `TST-EMT-EDICAO-EM-MASSA-LISTA-PEDIDO-000112`. Ver `documentos-tecnicos/testes/regras/01-convencao-ids.md`.

---

## Quando Esta Skill É Obrigatória

- Após entrega de nova tela ou feature visual
- Após ajuste em componente que afeta layout ou fluxo
- Após correção de bug reportado na interface
- Quando o QA pede validação visual
- Quando o usuário pede explicitamente teste visual de uma tela

---

## Estrutura de Pastas — Onde Salvar Plano e Prints

```
testes/testes-em-tela/
└── <produto>/
    └── <area>/
        └── <feature>/
            ├── plano-teste/
            │   ├── plano-teste-em-tela.md
            │   └── run-<feature>.ts
            └── resultado-teste/
                └── <runId>/              ← uma pasta por execução
                    ├── 01-descricao.png
                    ├── RESULTADO.txt
                    └── ...
```

### Exemplos reais

| Feature | Plano | Resultados |
|---------|-------|------------|
| Pedido › Lista › Editar-salvar | `testes-em-tela/pedido/lista/editar-salvar/plano-teste/` | `.../resultado-teste/<runId>/` |
| Pedido › Lista › Edição em massa | `testes-em-tela/pedido/lista/edicao-em-massa/plano-de-teste/` (`TST-EMT-EDICAO-EM-MASSA-LISTA-PEDIDO-000112`) | `.../resultado-teste/<runId>/` |
| Pedido › Config › Status | `testes-em-tela/pedido/configuracoes/status/plano-teste/` | `.../resultado-teste/<runId>/` |

### `runId`

- Disparo Admin: `EMT_RUN_ID` = `id_execucao_teste` retornado por `POST /admin/testes/disparar` (ex.: `1749581234567-x7k2m`)
- Local: `npx tsx ...` sem env → `local-<timestamp>`

### Convenção de nome do print

```
NN-descricao-do-estado.png
```

- `NN` começa em `01` e incrementa sequencialmente
- Descrição em kebab-case
- `99-erro.png` **somente** no `catch` de falha — nunca aparece em run APROVADO

---

## Protocolo de Execução

### ETAPA 0 — Preparação

1. **Confirmar servidor** — porta do produto / `PLAYWRIGHT_BASE_URL`
2. **Plano em** `plano-teste/plano-teste-em-tela.md`
3. **Runner** usa `resolverPastaResultadoEmt(featureRoot, process.env.EMT_RUN_ID)` para `OUT`
4. **Listar prints planejados** antes de executar

### ETAPA 1 — Execução com Playwright

```typescript
import { resolverPastaResultadoEmt } from '../../_lib/resolver-pasta-resultado-emt.js'

const __dirRoot = dirname(fileURLToPath(import.meta.url))
const OUT = resolverPastaResultadoEmt(__dirRoot, process.env.EMT_RUN_ID)

async function screenshot(page: Page, nome: string) {
  const path = `${OUT}/${nome}`
  await page.screenshot({ path, fullPage: false })
}
```

### ETAPA 2 — O que Sempre Fotografar

| Momento | Exemplo de nome |
|:--------|:----------------|
| Página carregada | `01-pagina-carregada.png` |
| Após abrir modal | `02-modal-aberto.png` |
| Sucesso | `06-sucesso.png` |
| Erro (catch) | `99-erro.png` |

### ETAPA 3 — Relatório

Gravar `RESULTADO.txt` em `resultado-teste/<runId>/` com checklist ✓/✗ e `Resultado: PASSOU|FALHOU`.

---

## Regras de Qualidade dos Prints

- **Viewport fixo:** `1440x900`
- **Aguardar** `networkidle` antes de capturar
- **Uma pasta por run** — nunca reutilizar PNG de execução anterior
- **Nomes descritivos** — não `screenshot-1.png`

---

## Integração com Outras Skills

| Skill | Relação |
|:------|:--------|
| `antigravity-testes` | Coordenação dos tipos; § ONDE colocar |
| `documentos-tecnicos/testes/regras/07-*` | SSOT da estrutura plano/resultado |
| `antigravity-qa` | QA pode solicitar teste em tela |

---

## Como o Agente Ativa o Modo

1. Cria/atualiza plano em `plano-teste/`
2. Runner grava em `resultado-teste/<runId>/`
3. Registry (`test-plans-registry.json`) aponta `planoFile` e `specFile`
4. Reporta resultado com lista de prints **da pasta do run**
