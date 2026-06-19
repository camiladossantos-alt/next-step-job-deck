---
name: agente-plano-teste-unitario
description: "Use sempre que precisar criar ou expandir um plano de teste unitário para qualquer módulo do Gravity. O agente recebe um arquivo fonte (hook, função, serviço, schema, etc.) e devolve um plano JSON canônico cobrindo todas as exportações, mocks obrigatórios e casos happy/sad/edge. Plano é validado por humano antes de virar .test.ts. NUNCA gera o .test.ts diretamente — esse é trabalho de outro agente que consome este JSON. Mantém compatibilidade total com planos pré-existentes (apenas agrega, nunca remove)."
---

# Agente Plano de Teste Unitario

> **SUBORDINACAO (2026-05-17):** Esta skill e subordinada ao pipeline multi-agente (`skills/testes/multi-agente-plano-teste/SKILL.md`). O Agente 6 (Elaborador) do pipeline produz planos unitarios seguindo o formato definido aqui. Uso standalone permitido apenas para escopos minimos e criticidade baixa.
>
> **REGRA FONTE PRIMARIA:** Planos gerados pelo pipeline multi-agente substituem e deletam planos/testes legados do mesmo escopo. Ver regra completa na skill multi-agente.

> **Missao:** dado um arquivo fonte do Gravity, produzir um plano de teste unitario estruturado em JSON que cobre **todas as exportacoes**, aplica o protocolo de cobertura especifico para o tipo de modulo, mapeia mocks obrigatorios e fica pronto pra um humano validar e um gerador de specs converter em codigo.

---

## Quando Usar

**SEMPRE** quando:
- Um novo hook, função, serviço, schema, middleware ou utilitário foi criado
- Um módulo existente tem cobertura unitária < 70% (< 80% para `nucleo-global/`)
- Um agente vai gerar testes unitários e precisa do plano como input
- O QA pediu cobertura de um módulo específico

**NUNCA** quando:
- O módulo ainda não existe no código (sem arquivo, não dá para mapear exportações)
- O plano já existe e está completo (use `consolidate-test-plans`)
- O módulo é puramente de configuração/infra sem lógica testável (ex: `vitest.config.ts`)

---

## Inputs Obrigatórios

| Campo | Tipo | Por quê |
|---|---|---|
| `escopo` | enum | CONFIG, ADMIN, PEDIDO, NFIMP, LPCO, BIDFRT, BIDCAM, SIMCUS, FINCOM, TENANT, INFRA, NUCLEO, PROCSO |
| `modulo` | string | Ex: "useCarregarTipoUsuario", "importEngine", "webhookSignature" |
| `tipoModulo` | enum | Ver tabela de 12 tipos abaixo |
| `arquivoFilePath` | string | Path do arquivo fonte — fonte da verdade para extração de exports |
| `arquivoFileContent` | string | Conteúdo do arquivo — agente extrai exports, lógica e dependências |
| `planoExistente` | object \| null | Se já houver plano, agente ESTENDE em vez de recriar |
| `criticidade` | enum | `baixa` \| `media` \| `alta` \| `critica` — define mínimo de casos por export |
| `coberturaMinima` | number | 70 para a maioria, 80 para `nucleo-global/` |

---

## 12 Tipos de Módulo — Protocolo por Tipo

O tipo do módulo define o protocolo obrigatório de cobertura. O agente identifica o tipo automaticamente a partir do conteúdo do arquivo, mas o humano pode corrigir.

### 1. Função Pura
*Arquivo: sem side effects, sem I/O, sem estado externo*

- Para cada exportação: happy path com input válido → output esperado
- Casos de borda: `null`, `undefined`, string vazia, número negativo, zero, lista vazia
- Casos adversariais: `<script>alert(1)</script>`, `' OR 1=1--`, string de 10.000 caracteres
- Performance: se a função opera sobre arrays grandes, testar com 10.000 elementos
- Ambiente: `@vitest-environment node`

### 2. Schema Zod
*Arquivo: exporta `z.object(...)` ou schema Zod composto*

- Para cada campo: válido → `safeParse.success = true`
- Para cada campo `required`: ausente → `safeParse.success = false` + mensagem de erro correta
- Para cada campo: valor de tipo errado → mensagem de erro correta
- Para cada `z.enum()`: cada valor válido + pelo menos 1 inválido
- Para cada `z.string().min(n)`: string menor que `n` → erro; string exatamente `n` → ok
- Para cada `z.string().max(n)`: string maior que `n` → erro
- Objeto vazio `{}` → erro listando todos os campos required
- Objeto completo e válido → `safeParse.success = true`
- Inputs adversariais: `<script>alert(1)</script>` em campos de texto → `z.string()` aceita (é string válida), verificar que não quebra o sistema downstream
- Ambiente: `@vitest-environment node`

### 3. Hook React
*Arquivo: função começando com `use`, usa `useState`/`useEffect`/`useCallback`*

- Ambiente: **`@vitest-environment jsdom`**
- Padrão obrigatório: `vi.hoisted()` + `vi.mock()` para Clerk, fetch e dependências externas
- `beforeEach`: `vi.clearAllMocks()` + invalidar cache (se o hook tiver cache)
- `afterEach`: `vi.unstubAllGlobals()`
- Estado inicial: valores default corretos antes de qualquer efeito
- Loading state: começa `true` → termina `false` após resposta
- Happy path: hook renderiza com dados válidos → retorna estado esperado
- `waitFor`: toda asserção sobre estado assíncrono usa `await waitFor()`
- Erro de rede: `fetch` rejeita → hook não quebra, retorna estado de erro adequado
- 4xx/5xx: API retorna erro → hook não quebra, estado de erro adequado
- Token null: sem token → fetch não é chamado, hook retorna estado default
- Cache hit: mesmo input 2x → fetch chamado apenas 1x
- Cache invalidação: após `invalidateCache()` → fetch é chamado novamente
- Desmontagem: hook desmontado antes de resolver → sem memory leak, sem `setState` em componente desmontado

### 4. Componente React (lógica isolada)
*Arquivo: `.tsx`, exporta componente — testar apenas lógica, não renderização visual*

- Ambiente: **`@vitest-environment jsdom`**
- Testar apenas callbacks, cálculos de derivação de estado, formatação
- Renderização visual completa → competência do teste E2E/Funcional
- Props obrigatórias ausentes → componente não crasha silenciosamente
- Evento `onClick`/`onChange` → callback chamado com argumento correto
- Estado condicional: todas as branches de render testadas (if/else/ternário)
- Prop inválida de tipo → TypeScript bloqueia em compile time (não precisa de caso de runtime)

### 5. Serviço (service.ts)
*Arquivo: classe ou módulo com métodos que chamam banco/API externa*

- Ambiente: `@vitest-environment node`
- Prisma: usar `vi.hoisted()` + `vi.mock()` — **nunca** importar `PrismaClient` real
- Para cada método público: happy path → retorno esperado
- Para cada método: entrada inválida → `throw new AppError(...)` com código correto
- Para cada método: banco retorna `null`/`[]` → comportamento esperado (throw `NOT_FOUND` ou retornar vazio)
- Isolamento: nenhum teste modifica estado compartilhado entre it()
- Não testar SQL diretamente — testar lógica do serviço sobre mock do Prisma

### 6. Rota Express (router.ts)
*Arquivo: usa `router.get/post/put/delete`*

- Ambiente: `@vitest-environment node`
- Usar `supertest` + instância Express de teste (não subir servidor real)
- Para cada rota: request válida → status 2xx + body esperado
- Para cada rota: body inválido (sem campos required) → `400` + `{ error: { code: 'VALIDATION_ERROR' } }`
- Para cada rota protegida: `Authorization` ausente → `401`
- Para cada rota com RBAC: role insuficiente → `403`
- Para cada rota: recurso não encontrado → `404`
- Para cada rota: erro de banco simulado → `500` + sem stack trace no body
- Verificar que `error.code` está presente em toda resposta de erro

### 7. Middleware
*Arquivo: função `(req, res, next) => void`*

- Ambiente: `@vitest-environment node`
- Mock de `req`, `res` e `next` como `vi.fn()`
- Happy path: middleware chama `next()` sem argumento (fluxo normal)
- Falha de auth: middleware chama `next(new AppError(...))` ou `res.status(401).json()`
- Side effects: verificar que enriquece `req` com os campos esperados (ex: `req.organizacao`, `req.correlationId`)
- Middleware não deve chamar `next()` E retornar resposta ao mesmo tempo

### 8. Utilitário (utils.ts / helpers.ts)
*Arquivo: funções auxiliares de formatação, parsing, cálculo*

- Protocolo igual ao **Tipo 1 (Função Pura)**
- Adicionar casos de domínio específico: CNPJ, CPF, CEP, moeda BRL, data BR, NCM, etc.
- Para cada formato de domínio: formato inválido → retorno/erro esperado
- Para cada máscara: input sem máscara → output com máscara correta
- Ambiente: `@vitest-environment node`

### 9. Factory / Builder
*Arquivo: exporta função que constrói objetos (ex: `makeUsuario`, `criarOrganizacao`)*

- Objeto construído com todos defaults → estrutura completa e correta
- Objeto construído com overrides parciais → fields sobrescritos, resto default
- Objeto construído com campo inválido → comportamento defensivo (throw ou ignorar gracefully)
- Verificar que o tipo retornado satisfaz o TypeScript esperado
- Ambiente: `@vitest-environment node`

### 10. Guard / Validator
*Arquivo: função que retorna `boolean` ou lança erro de validação de negócio*

- Todos os valores `true` conhecidos → retorna `true`
- Todos os valores `false` conhecidos → retorna `false`
- Boundary conditions: valor exatamente no limite válido → `true`; um passo além → `false`
- `null`, `undefined`, tipo errado → sem crash (comportamento defensivo documentado)
- Ambiente: `@vitest-environment node`

### 11. Cache Module
*Arquivo: lida com Redis/in-memory, tem `get`/`set`/`invalidate`/`delete`*

- Set + Get: valor setado é lido corretamente
- TTL: valor expirado → `null` no get (se TTL aplicável)
- Invalidação: invalidar chave → próximo get retorna `null`/busca nova
- Prefixo obrigatório: chave **sempre** inclui `organizacao:<idOrganizacao>:` — caso sem prefixo → erro ou ausência no plano documentada com justificativa
- Duas escritas simultâneas (simuladas) → valor final determinístico
- Ambiente: `@vitest-environment node`

### 12. Event Handler / Webhook
*Arquivo: processa eventos externos (Clerk, Resend, Meta WhatsApp Cloud API, Gemini, webhooks de ERP)*

- Ambiente: `@vitest-environment node`
- Assinatura válida → handler processa e retorna `200`
- Assinatura inválida/ausente → retorna `401` sem processar payload
- Payload com evento desconhecido → ignora sem crash (retorna `200` ou `204`)
- Payload JSON malformado → retorna `400` sem crash
- Idempotência: mesmo evento 2x → segundo é ignorado sem duplicar efeitos
- Erro no processamento → retorna `500` mas loga com correlation ID

---

## Doutrina de Granularidade Mínima — Obrigatória

Cada exportação do módulo é coberta exaustivamente. Não existe "testar a função" como caso único.

> **Regra absoluta:** toda exportação tem mínimo 3 casos — happy, sad e edge.
> Exportações críticas (auth, permissão, Isolamento de Organização, financeiro) têm mínimo 5 casos.

**Nomenclatura obrigatória dos `it()`:**

```typescript
// ✅ correto — descreve comportamento, não passo
it('retorna tipo_usuario MASTER lido de data.usuario.tipo_usuario via /api/v1/me (Mandamento 01)', ...)
it('NÃO lê data.user.role (estrutura legada) — tipo_usuario deve ser null e schema.parse falha alto (Mandamento 08)', ...)
it('cache hit: fetch não é chamado novamente para o mesmo idUsuario', ...)

// ❌ proibido — descreve passo, não comportamento
it('testa retorno null', ...)
it('verifica fetch', ...)
it('caso 1', ...)
```

---

## Padrão de Mocks — Inviolável

### vi.hoisted() obrigatório para imports de terceiros

Qualquer mock de módulo de terceiros (Clerk, Prisma, Resend, Meta WhatsApp Cloud API, Gemini) usa `vi.hoisted()` para garantir que o mock existe antes dos imports do módulo sendo testado:

```typescript
// ✅ CORRETO — mock hoistado antes dos imports do módulo testado
const { mockGetToken, mockUseAuth } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockUseAuth:  vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: mockUseAuth,
}))

// import DEPOIS dos mocks
import { useCarregarTipoUsuario } from '../../../src/hooks/useCarregarTipoUsuario.js'
```

### vi.stubGlobal para fetch / console

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})
```

### Prisma mock — nunca importar PrismaClient diretamente

```typescript
// ✅ CORRETO — mock do módulo inteiro
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    usuario: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    organizacao: { findFirst: vi.fn() },
  },
}))

vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => mockPrisma) }))
```

### Armadilha: Schema Zod exportado de arquivo de rota

Quando o schema Zod a ser testado está em um arquivo de rota (ex: `UpdateWorkspacesSchema` dentro de `users.ts`), o `import` carrega o módulo inteiro — incluindo código de nível superior como `clerk.ts`, que lança `Error` se `CLERK_SECRET_KEY` não estiver definida no ambiente de teste.

**Solução obrigatória:** mapear todos os imports com side-effects do arquivo de rota e mocká-los antes do import do schema, mesmo que o teste não use nenhum deles:

```typescript
// Exemplo: testando UpdateWorkspacesSchema de users.ts
vi.mock('../../../../servicos-global/configurador/server/lib/clerk.js', () => ({
  clerkClient: { invitations: { createInvitation: vi.fn() } },
}))
vi.mock('../../../../servicos-global/configurador/server/lib/prisma.js', () => ({
  prisma: { usuario: {}, empresa: {}, usuarioWorkspace: {}, $transaction: vi.fn() },
}))
vi.mock('../../../../servicos-global/configurador/server/lib/syncRole.js', () => ({
  syncRoleToClerk: vi.fn(),
}))
vi.mock('../../../../servicos-global/servicos-plataforma/historico-global/server/lib/securityAuditLogger.js', () => ({
  securityAudit: { roleChanged: vi.fn(), permissionChanged: vi.fn() },
}))
vi.mock('../../../../servicos-global/configurador/server/middleware/requireAuth.js', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('../../../../servicos-global/configurador/server/middleware/requireMasterRole.js', () => ({
  requireMasterRole: vi.fn(),
}))

import { UpdateWorkspacesSchema } from '../../../../servicos-global/configurador/server/routes/users.js'
```

**Regra para o plano:** ao gerar plano de tipo `schema_zod` para schema em `routes/*.ts`, listar no campo `mocks` todos os imports de nível superior do arquivo — não apenas os usados no teste.

---

## Declaração de Ambiente — Obrigatória no Topo de Todo Arquivo

```typescript
// @vitest-environment jsdom    ← hooks React, componentes, DOM
// @vitest-environment node     ← serviços, rotas, scripts, utilitários, webhooks
```

Sem declaração explícita, o Vitest usa o default do config. Declarar sempre — sem ambiguidade, sem surpresa.

---

## coverage.include — Obrigatório em Todo vitest.config.ts

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['servicos-global/configurador/src/**/*.ts'],  // ← escopo explícito
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      thresholds: { lines: 70, functions: 70, branches: 70 },
    },
  },
})
```

Sem `coverage.include`, o report inclui arquivos irrelevantes e a cobertura é fictícia. Todo plano deve incluir recomendação de config se ainda não existe.

---

## Output Obrigatório

JSON validado por Zod (ver [formato-plano.md](./formato-plano.md)). Estrutura macro:

```typescript
{
  id:              "TST-UNIT-CONFIG-AUTH-000001",
  versao:          "1.0",
  geradoEm:        "2026-04-20T...",
  geradoPor:       "agente-plano-teste-unitario",
  escopo:          "CONFIG",
  modulo:          "useCarregarTipoUsuario",
  tipoModulo:      "hook",
  arquivoFilePath: "servicos-global/configurador/src/hooks/useCarregarTipoUsuario.ts",
  ambiente:        "jsdom",
  criticidade:     "alta",
  coberturaMinima: 80,
  exportacoes:     [...],    // lista de exports extraídos do arquivo fonte
  categorias:      [...],    // cobertura por categoria (happy/sad/edge/adversarial/cache)
  casos:           [...],    // casos de teste numerados com mock + asserção
  resumoExecutivo: "..."
}
```

Detalhes completos no [formato-plano.md](./formato-plano.md).

---

## As 16 Regras Invioláveis

### 1. NUNCA remove casos de planos existentes
Se há plano anterior, o agente **agrega**. Todo caso do plano antigo aparece no novo, marcado como `origem: 'humano-original'`. Casos novos marcados como `origem: 'agente-adicionado'`.

### 2. Toda exportação tem pelo menos 3 casos
Happy + sad + edge. Exportações críticas (auth, permissão, Isolamento de Organização, financeiro) têm mínimo 5.

### 3. `it()` descreve comportamento esperado, não passo
"role é null quando getToken retorna null" ✅ — "testa retorno null" ❌. O leitor entende o contrato sem ver o código.

### 4. Ambiente declarado explicitamente no topo de cada arquivo gerado
`@vitest-environment jsdom` ou `node` — sem depender do default do config.

### 5. vi.hoisted() obrigatório para qualquer mock de import de terceiros
Clerk, fetch global, Prisma, Resend, Meta WhatsApp Cloud API, Gemini — todos via `vi.hoisted()` + `vi.mock()`.

### 6. vi.stubGlobal para `fetch` — sempre desfazer em afterEach
`vi.stubGlobal('fetch', vi.fn())` no `beforeEach`, `vi.unstubAllGlobals()` no `afterEach`.

### 7. vi.clearAllMocks() em todo beforeEach
Sem limpeza entre testes, estado vaza. Todo `beforeEach` começa com `vi.clearAllMocks()`.

### 8. coverage.include obrigatório no vitest.config.ts
O plano deve incluir seção de configuração de coverage se o módulo ainda não tem config explícita.

### 9. IDs rastreáveis em todo caso
Cada caso tem `id: "TST-UNIT-{ESCOPO}-{MODULO}-{NNN}"`. O CI falha com o ID exato — humano sabe o que quebrou sem abrir código.

### 10. Casos adversariais são casos, não observações
`<script>alert(1)</script>`, `' OR 1=1--`, string de 10.000 chars — cada um vira um caso numerado com `resultadoEsperado` explícito. Não ficam como nota de rodapé.

### 11. Plano testa contrato, não implementação
O plano descreve o que a exportação deve fazer, não como. Implementação pode refatorar; o contrato testado não muda.

### 12. Testes são independentes e idempotentes
Todo teste que modifica cache, variável global ou banco deve restaurar no `afterEach`/`afterAll`. Testes devem rodar em qualquer ordem com o mesmo resultado.

### 13. Output é só o plano, não é código
O agente **não gera** `.test.ts`. Outro agente (o gerador de specs) consome esse JSON depois.

### 14. Preservação de testes já existentes ao estender plano
Se já existem arquivos `.test.ts` para o módulo, o agente lê e não duplica casos. Os testes existentes recebem `origem: 'existente'` no plano.

### 15. Revisão SME para módulos críticos antes da aprovação
Auth, permissão, Isolamento de Organização e financeiro: revisão por especialista antes de aprovar. Registrar `smeRevisadoPor` e `smeRevisadoEm`.

### 16. Nenhum teste depende de ordem de execução
Se o caso B depende de estado criado pelo caso A, ambos devem estar em um único `describe` com `beforeAll` explícito — nunca confiar em execução sequencial entre `it()` independentes.

---

## Fluxo Completo

```
1. Humano solicita plano para um módulo
   ↓
2. Agente lê arquivoFileContent
   ↓
3. Agente identifica tipoModulo (1–12)
   ↓
4. Agente extrai todas as exportações do arquivo
   ↓
5. Para cada exportação:
   ├─ Aplica protocolo do tipo de módulo
   ├─ Gera mínimo de casos por criticidade (checklist-categorias.md)
   └─ Inclui casos adversariais onde aplicável
   ↓
6. Verifica arquivos .test.ts existentes → casos existentes recebem origem: 'existente'
   ↓
7. Se planoExistente, MERGE — preserva tudo do antigo
   ↓
8. Calcula cobertura por categoria (happy / sad / edge / adversarial / cache)
   ↓
9. Gera resumoExecutivo
   ↓
10. Valida JSON contra schema (formato-plano.md)
    ↓
11. Persiste em testes/test-plans-registry.json
    ↓
12. Humano aprova / edita / rejeita
    ↓
13. Aprovado → gerador de specs converte em .test.ts
```

---

## Critérios de "10 de 10" (auditoria)

| Métrica | Meta |
|---|---|
| Todas as exportações cobertas | 100% |
| Aceitação humana sem edição | ≥85% dos planos |
| Casos adversariais incluídos | 100% dos módulos com input de texto |
| Preservação de planos antigos | 100% — nenhum caso some |
| Tempo de geração | ≤20s por módulo |
| Custo médio por plano | ≤$0.05 (Gemini Flash) |

---

## Estrutura de Pastas — Onde Salvar

> ⚠️ Esta árvore é a fonte de verdade no momento da escrita desta skill.
> Sempre verificar o estado atual da pasta antes de salvar — novos módulos podem ter sido adicionados.

```
testes/testes-unitarios/
├── configurador/
│   ├── _planos/                    ← JSONs de plano por módulo
│   ├── assinaturas/
│   │   └── store-subscribe.test.ts
│   └── useCarregarTipoUsuario.test.ts
├── infra/
│   └── migrate-tenants/
│       └── _shared.test.ts
├── nucleo-global/
│   └── shell/
│       └── entity-link-factory.test.ts
├── pedido/
│   └── api-context.test.ts
└── organizacao/
    └── notificacoes/
        └── webhook-resend-signature.test.ts

testes/
└── test-plans-registry.json        ← índice global (ID + paths, sem conteúdo completo)
```

**Regra de nomenclatura de ID:** `TST-UNIT-{ESCOPO}-{MODULO}-{NUMERO}` — número = próximo disponível no registry.

| Escopo | Módulo |
|---|---|
| `CONFIG` | Configurador (hooks, serviços, stores, pages) |
| `ADMIN` | Admin |
| `PEDIDO` | Produto Pedido (server + client) |
| `LPCO` | Produto LPCO |
| `FINCOM` | Financeiro Comex |
| `NFIMP` | NF Importação |
| `BIDCAM` | BID Câmbio |
| `BIDFRT` | BID Frete |
| `SIMCUS` | Simula Custo |
| `TENANT` | Serviços por Organização |
| `INFRA` | Scripts de infra, migrate-tenants |
| `NUCLEO` | nucleo-global |
| `PROCSO` | Processo |

---

## Modelo de IA

- **Modelo principal:** `gemini-2.0-flash`
- **Modelo escalável:** `gemini-2.0-pro` (se cobertura ficou < 80% das exportações, retenta no Pro)
- **Custo médio:** ~$0.02–0.08 por plano
- **Latência:** 10–25s (módulos grandes)

---

## Arquivos Relacionados

- [checklist-categorias.md](./checklist-categorias.md) — categorias de cobertura com mínimos por criticidade
- [formato-plano.md](./formato-plano.md) — schema Zod completo do JSON do plano
- [exemplo-plano.md](./exemplo-plano.md) — plano completo de `useCarregarTipoUsuario` (hook real do projeto)
