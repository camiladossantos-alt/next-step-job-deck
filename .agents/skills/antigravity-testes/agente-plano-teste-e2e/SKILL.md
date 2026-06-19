---
name: agente-plano-teste-e2e
description: "Use sempre que precisar criar ou expandir um plano de teste E2E (Playwright) para uma tela do Gravity. O agente recebe uma tela (escopo + sublocal + screenshot/descrição/código do componente) e devolve um plano JSON canônico que cobre as 20 categorias do checklist 10/10, mapeia cada passo a um data-testid e prepara estrutura de pastas testes/testes-e2e/{escopo}/. Plano é validado por humano antes de virar .spec.ts. NUNCA gera o .spec.ts diretamente. Para overview e roteamento entre planos por tipo, consultar antigravity-testes."
---

# Agente Plano de Teste E2E

> **SUBORDINACAO (2026-05-17):** Esta skill e subordinada ao pipeline multi-agente (`skills/testes/multi-agente-plano-teste/SKILL.md`). O Agente 6 (Elaborador) do pipeline produz planos E2E seguindo o formato definido aqui. Uso standalone permitido apenas para escopos minimos e criticidade baixa.
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
| `escopo` | enum | LOGIN, CONFIG, ADMIN, HUB, CORE, MARKET, TENANT, DBASE, PEDIDO, NFIMP, LPCO, BIDFRT, BIDCAM, SIMCUS, FINCOM, PROCSO |
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

## Doutrina de Granularidade Mínima — Obrigatória

Todo plano gerado deve ser **exaustivo por elemento**.
Não existe "verificar formulário" como passo único. Cada elemento da tela é testado individualmente.

> **Regra absoluta:** se a tela tem 10 campos, o plano tem no mínimo 30 passos
> só para cobrir os campos. Plano com menos passos que elementos visíveis é plano incompleto.

### Protocolo por tipo de elemento

**Campo de texto / número / data**
- Passo 1: interagir com o campo (click/focus)
- Passo 2: preencher com valor válido → salvar → verificar persistência
- Passo 3: preencher com valor inválido → verificar mensagem de erro
- Passo 4: campo obrigatório vazio → verificar bloqueio de submissão
- Passo 5: valor no limite máximo de caracteres
- Passo 6: inputs adversariais — `<script>alert(1)</script>`, payload SQL injection, string de 10.000 caracteres → verificar que sistema rejeita sem quebrar

**Select / Dropdown**
- Passo 1: abrir o select → verificar que abre
- Passo 2: verificar que todas as opções esperadas estão presentes
- Passo 3: selecionar cada opção individualmente → verificar efeito visual
- Passo 4: confirmar fechamento após seleção
- Passo 5: salvar → verificar que o valor selecionado foi persistido
- Passo 6 (se aplicável): select com busca interna → testar filtro de opções

**Toggle / Checkbox / Switch**
- Passo 1: verificar estado inicial (ativo ou inativo)
- Passo 2: ativar → verificar efeito imediato na interface
- Passo 3: salvar → verificar persistência
- Passo 4: desativar → verificar efeito imediato
- Passo 5: salvar → verificar persistência do estado desativado

**Botão de ação (salvar, cancelar, confirmar, deletar)**
- Passo 1: clicar com dados válidos → verificar resultado esperado
- Passo 2: clicar com dados inválidos → verificar bloqueio ou erro
- Passo 3 (destrutivo): verificar modal de confirmação antes da ação
- Passo 4 (destrutivo): cancelar na confirmação → verificar que nada mudou

**Modal / Drawer / Painel expansível**
- Passo 1: abrir → verificar conteúdo correto
- Passo 2: fechar pelo botão X → verificar fechamento
- Passo 3 (se aplicável): fechar clicando fora → verificar fechamento
- Passo 4: todos os campos internos seguem os protocolos acima individualmente

**Tabela / Lista**
- Passo por coluna: verificar que cada coluna existe e exibe dado correto
- Passo por ação de linha: cada botão/menu de linha testado individualmente
- Passo de ordenação: clicar em cada coluna ordenável → crescente → decrescente

---

## Output Obrigatório

JSON validado por Zod (ver [formato-plano.md](./formato-plano.md)). Estrutura macro:

```typescript
{
  id:           "TST-E2E-CONFIG-000013",     // gerado pelo agente
  versao:       "1.0",
  geradoEm:     "2026-04-15T...",
  geradoPor:    "agente-plano-teste-e2e",
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

### 15. **Revisão SME obrigatória antes da aprovação**
Todo plano passa por revisão de um especialista de domínio (SME) antes de ser aprovado. O SME lê o plano e adiciona casos de negócio não antecipados pelo agente — edge cases de regras fiscais, fluxos de exceção do produto, comportamentos específicos do domínio. Plano sem `smeRevisadoPor` preenchido não pode ser aprovado. Registrar no JSON: `smeRevisadoPor` e `smeRevisadoEm`.

### 16. **Inputs adversariais obrigatórios em todo campo de texto**
Para cada campo de texto livre no formulário, o plano deve incluir passos com: `<script>alert(1)</script>` (XSS), `' OR 1=1--` (SQL injection) e string de 10.000 caracteres (payload gigante). O sistema deve rejeitar sem crash, sem tela branca e sem stack trace exposto ao usuário. Isso vale independentemente da criticidade da tela.

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
5.1. Agente mapeia efeitos downstream
     ├─ Para cada ação de criação/edição/deleção: listar onde o dado aparece depois
     ├─ Cada destino vira seção de verificação obrigatória no plano
     └─ Se não há efeito downstream → registrar: downstream: "nenhum — ação local sem propagação"
     ↓
5.2. Agente mapeia cenários de resiliência
     ├─ Race condition (2 contextos Playwright simultâneos no mesmo registro)
     ├─ JWT expirado no meio do preenchimento de formulário longo
     ├─ Cache invalidation entre sessões (contexto A salva, contexto B verifica)
     └─ Performance baseline (FCP < 1.5s por navegação, API < 200ms por chamada crítica)
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

## Estrutura de Pastas — Onde Salvar

> ⚠️ Esta árvore é a fonte de verdade no momento da escrita desta skill.
> Sempre verificar o estado atual da pasta antes de salvar — novos módulos podem ter sido adicionados.

```
testes/testes-e2e/
├── admin/            ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── bid-cambio/       ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── bid-frete/        ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── configurador/     ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── core/             ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── dbase/            ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── financeiro-comex/ ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── hub/              ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── infra/            ├── _planos/   ├── _mapeamentos/   └── {script}/{ID}.spec.ts
├── login/            ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── lpco/             ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── marketplace/      ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── nf-importacao/    ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── pedido/           ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── processo/         ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
├── simula-custo/     ├── _planos/   ├── _mapeamentos/   └── {fluxo}/{ID}.spec.ts
└── organizacao/         ├── _planos/   ├── _mapeamentos/   └── {servico}/{ID}.spec.ts

testes/
└── test-plans-registry.json   ← índice global (ID + paths, sem o conteúdo completo)
```

**Regra de nomenclatura de ID:** `TST-E2E-{ESCOPO}-{NUMERO}` — número = próximo disponível no registry.

| Escopo | Módulo |
|---|---|
| `CONFIG` | Configurador |
| `ADMIN` | Admin |
| `PEDIDO` | Produto Pedido |
| `LPCO` | Produto LPCO |
| `FINCOM` | Financeiro Comex |
| `NFIMP` | NF Importação |
| `BIDCAM` | BID Câmbio |
| `BIDFRT` | BID Frete |
| `SIMCUS` | Simula Custo |
| `HUB` | Hub |
| `LOGIN` | Login |
| `MARKET` | Marketplace |
| `TENANT` | Serviços por Organização |
| `INFRA` | Scripts de infra |
| `CORE` | Core |
| `DBASE` | Dbase |
| `PROCSO` | Processo |

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
