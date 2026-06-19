---
name: agente-plano-teste
description: "Use sempre que precisar criar ou expandir um plano de teste para uma tela do Gravity. O agente recebe uma tela (escopo + sublocal + screenshot/descrição/código do componente) e devolve um plano de teste no formato JSON canônico que cobre as 20 categorias do checklist 10/10. Plano é validado por humano antes de virar .spec.ts. NUNCA gera o .spec.ts diretamente — esse é trabalho de outro agente que consome este JSON. Mantém compatibilidade total com planos pré-existentes (apenas agrega, nunca remove)."
---

# Agente Plano de Teste

> **SUBORDINACAO (2026-05-17):** Esta skill e subordinada ao pipeline multi-agente (`skills/testes/multi-agente-plano-teste/SKILL.md`). Para escopos complexos (5+ campos, 3+ acoes, tabelas, criticidade alta/critica), o pipeline multi-agente e obrigatorio e esta skill serve apenas como referencia de formato para o Agente 6 (Elaborador). Uso standalone permitido apenas para escopos minimos (1-2 campos, 1 acao, criticidade baixa).
>
> **REGRA FONTE PRIMARIA:** Planos gerados pelo pipeline multi-agente substituem e deletam planos/testes legados do mesmo escopo. Ver regra completa na skill multi-agente.

> **Missao:** dada uma tela do Gravity, produzir um plano de teste estruturado em JSON que cobre **as 20 categorias do plano 10/10**, mapeia cada passo a um `data-testid`, e fica pronto pra um humano validar e um gerador de specs converter em codigo.

---

## Quando Usar

**SEMPRE** quando:
- Uma tela nova foi criada e precisa de plano de teste
- Uma tela antiga tem plano incompleto (cobre <20 categorias)
- Um agente vai gerar testes E2E/Funcional/Isolamento de Organização e precisa do plano como input
- O dono pediu pra revisar a cobertura de testes de uma tela

**NUNCA** quando:
- A tela ainda não existe no código (sem componente, não dá pra mapear testids)
- O plano já existe e está completo (use `consolidate-test-plans` em vez disso)
- A "tela" é puramente backend sem UI (use `agente-plano-teste-api` se existir, ou pule)

---

## Inputs Obrigatórios

| Campo | Tipo | Por quê |
|---|---|---|
| `escopo` | enum | LOGIN, CONFIG, ADMIN, HUB, CORE, MARKET, TENANT, DBASE, PEDIDO, NFIMP, LPCO, BIDFRT, BIDCAM, SIMCUS, FINCOM, PROCSO, **MBOTO** (transversal — [seletor universal](../../../documentos-tecnicos/arquitetura/seletor-universal-visualizacoes.md)) |
| `sublocal` | string | Ex: "Organização", "Acessar Workspace", "Visão Geral" |
| `tela` | string | Geralmente igual ao sublocal, mas pode haver mais granularidade |
| `rota` | string | Ex: `/configurador/organizacao` |
| `componenteFilePath` | string | Path do arquivo React principal da tela |
| `componenteFileContent` | string | Conteúdo do componente — fonte da verdade dos testids |
| `screenshot` | string \| null | PNG da tela renderizada (opcional mas recomendado — ajuda IA "ver") |
| `planoExistente` | object \| null | Se já houver plano, agente ESTENDE em vez de recriar |
| `criticidade` | enum | `baixa` \| `media` \| `alta` \| `critica` — define quantos passos por categoria |
| `temDinheiro` | boolean | Se true, força camada Pentest + cobertura de validações de entrada |

---

## Output Obrigatório

JSON validado por Zod (ver [formato-plano.md](./formato-plano.md)). Estrutura macro:

```typescript
{
  id:           "TST-E2E-CONFIG-000013",     // gerado pelo agente
  versao:       "1.0",
  geradoEm:     "2026-04-15T...",
  geradoPor:    "agente-plano-teste",
  escopo:       "CONFIG",
  sublocal:     "Organização",
  tela:         "Organização",
  rota:         "/configurador/organizacao",
  ambientes:    ["Local", "Staging", "Producao"],
  criticidade:  "alta",
  preRequisitos: { ... },
  mapeamentoTestids: { ... },     // gerado a partir do componente
  cobertura:    { ... },           // ✅/❌ por categoria das 20
  passos:       [ ... ],            // 50-150 passos numerados
  resumoExecutivo: "..."
}
```

Detalhes completos no [formato-plano.md](./formato-plano.md).

---

## As 14 Regras Invioláveis

### 1. **NUNCA remove passos de planos existentes**
Se há plano anterior, o agente **agrega**. Renumera, reorganiza por categoria, mas todo passo do plano antigo aparece no novo. Se decidir mudar um passo, marca como `origem: 'humano-original'` e adiciona o novo como `origem: 'agente-adicionado'`.

### 2. **Cobre as 20 categorias do checklist 10/10**
Ver [checklist-10-de-10.md](./checklist-10-de-10.md). Cada categoria tem mínimo de passos por criticidade. Se não conseguir cobrir uma categoria (ex: tela read-only não tem CREATE), marca como `nao_aplicavel` com justificativa.

### 3. **Cada passo mapeia a um testid real**
O agente lê o `componenteFileContent` e extrai todos os `data-testid="..."`. Cada passo do plano que faz interação **deve** referenciar um testid que existe no componente. Se o passo precisa de um elemento que não tem testid, o agente **anota** no campo `requerNovoTestid` — humano sabe que precisa adicionar antes de gerar o spec.

### 4. **Texto de ação = texto exato na tela**
Se o passo é "Clicar Salvar", o botão na tela tem que exibir literalmente "Salvar" (ou a chave i18n equivalente). O agente extrai textos do componente e valida.

### 5. **Plano vale para os 6 tipos**
O JSON é único — o gerador de specs depois decide quais passos viram E2E, funcional, contract, etc. Cada passo tem `tiposAplicaveis: ['E2E','FUN']` (por exemplo). Categorias específicas:
- **Isolamento de Organização (cross-organização)** → passos com `tiposAplicaveis: ['CRO']`
- **Pentest** → passos com `tiposAplicaveis: ['PEN']`

### 6. **Numeração sequencial e estável**
Os passos são numerados 1, 2, 3... A numeração **não muda** entre versões — passos novos vão pro fim ou recebem números intermediários (16.1, 16.2). Isso é crítico pra rastrear referências em screenshots, prints e tickets.

### 7. **Critério de aprovação por passo**
Cada passo tem `resultadoEsperado` em texto humano + `assercao` estruturada (ex: `{ tipo: 'visible', testid: 'x' }`). Os 2 são redundantes de propósito: humano lê o texto, máquina executa a asserção.

### 8. **Screenshots numerados**
Cada passo crítico (não cada passo) tem `screenshot: "01_nome_descritivo"`. A numeração é local ao plano (1, 2, 3...) e o nome é descritivo. O Playwright vai gravar como `<id-do-plano>_<numero>_<nome>.png`.

### 9. **Sempre em português**
Todos os textos do plano (acao, resultadoEsperado, etc) em pt-BR. Nomes técnicos (testid, código) em inglês como sempre.

### 10. **Pré-requisitos explícitos**
O plano declara: ambiente, organização, workspace, role do usuário, dados que precisam existir antes (ex: "deve haver pelo menos 1 organização cadastrada"). Sem pré-requisitos, o teste é flaky por natureza.

### 11. **Cobertura calculada e exposta**
O campo `cobertura` é uma matriz das 20 categorias com status: ✅ coberta, ⚠️ parcial, ❌ ausente, 🚫 não aplicável. O humano vê de relance se o plano tá completo.

### 12. **Resumo executivo no topo**
Campo `resumoExecutivo` com 3-5 linhas: "Esta tela permite editar a Organização. Risco principal: ..., cobertura atual: X/20, criticidade: alta, ambientes: ..." — pra humano ler em 10s e decidir se aprova.

### 13. **Idempotência**
Rodar o agente 2x na mesma tela com os mesmos inputs deve devolver planos **funcionalmente equivalentes** (pode haver pequenas variações de wording, mas mesma cobertura, mesmos testids, mesmo número de passos por categoria). Se o input mudar (componente foi alterado), o plano novo reflete a mudança.

### 14. **Output é só o plano, não é código**
O agente **não gera** `.spec.ts`. Outro agente (o gerador de specs) consome esse JSON depois. Esta separação garante que o plano possa ser revisado por humano antes de virar código.

---

## Fluxo Completo

```
1. Humano abre Admin/Testes → "Novo Plano de Teste" → seleciona escopo + sublocal
   ↓
2. Backend lê o componente da tela (componenteFileContent)
   ↓
3. Verifica se existe plano antigo (planoExistente)
   ↓
4. Chama o agente com todos os inputs
   ↓
5. Agente extrai testids do componente
   ↓
6. Agente percorre as 20 categorias do checklist
   ├─ Cada categoria → gera N passos (N depende da criticidade)
   ├─ Cada passo → mapeia testid + texto + asserção
   └─ Categoria sem aplicação → marca nao_aplicavel
   ↓
7. Se planoExistente, MERGE com passos novos (preserva tudo do antigo)
   ↓
8. Calcula cobertura (matriz 20×status)
   ↓
9. Gera resumoExecutivo
   ↓
10. Valida JSON contra schema
    ↓
11. Persiste em testes/test-plans-registry.json
    ↓
12. Frontend mostra preview pro humano:
    - Lista de passos numerados
    - Matriz de cobertura
    - Resumo executivo
    - Botão "Aprovar e Gerar Specs" / "Editar" / "Rejeitar"
    ↓
13. Humano clica "Aprovar" → dispara o gerador de specs (próxima skill)
```

---

## Critérios de "10 de 10" (auditoria)

| Métrica | Meta |
|---|---|
| **Cobertura média por plano** | ≥18 das 20 categorias (sem contar `nao_aplicavel`) |
| **Aceitação humana** | ≥85% dos planos aprovados sem edição |
| **Testids mapeados corretamente** | 100% — zero passo apontando pra testid inexistente |
| **Preservação de planos antigos** | 100% — nenhum passo do plano original some |
| **Tempo de geração** | ≤30s por tela |
| **Custo médio por plano** | ≤$0.10 (Gemini Flash) |

---

## Arquivos Relacionados

- [checklist-10-de-10.md](./checklist-10-de-10.md) — as 20 categorias, com critérios e exemplos
- [formato-plano.md](./formato-plano.md) — schema JSON completo do output
- [exemplo-organizacao.md](./exemplo-organizacao.md) — plano da Organização (PDF do dono) **expandido pras 20 categorias**, mostrando preservação de tudo + adições

---

## Onde Plugar (a criar)

- **Backend:** `servicos-global/configurador/server/lib/agente-plano-teste.ts` (mesmo padrão do `gemini-test-analyzer.ts`)
- **Endpoint:** `POST /admin/test-plans/generate` — recebe `{ escopo, sublocal, tela }`, devolve plano JSON
- **Endpoint:** `POST /admin/test-plans/:id/expand` — recebe plano existente, devolve plano expandido
- **Frontend:** nova tela `Admin / Testes / Planos` com listagem + botão "Gerar plano para tela X"

---

## Modelo de IA

- **Modelo principal:** `gemini-2.0-flash`
- **Modelo escalável:** `gemini-2.0-pro` (se cobertura ficou <16/20, retenta no Pro)
- **Custo médio:** ~$0.05-0.15 por plano novo
- **Latência:** 15-40s (planos grandes)
