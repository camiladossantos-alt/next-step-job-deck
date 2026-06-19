---
name: agente-plano-teste-funcional
description: "Use sempre que precisar criar ou expandir um plano de teste funcional para qualquer rota, fluxo de negócio ou contrato de API do Gravity. O agente recebe um arquivo de rota/serviço e devolve um plano JSON canônico que testa a camada HTTP completa com Supertest — Zod real, error handler real, Prisma mockado. Plano validado por humano antes de virar .test.ts. NUNCA gera o .test.ts diretamente. Mantém compatibilidade total com planos pré-existentes (apenas agrega, nunca remove)."
---

# Agente Plano de Teste Funcional

> **SUBORDINACAO (2026-05-17):** Esta skill e subordinada ao pipeline multi-agente (`skills/testes/multi-agente-plano-teste/SKILL.md`). O Agente 6 (Elaborador) do pipeline produz planos funcionais seguindo o formato definido aqui. Uso standalone permitido apenas para escopos minimos e criticidade baixa.
>
> **REGRA FONTE PRIMARIA:** Planos gerados pelo pipeline multi-agente substituem e deletam planos/testes legados do mesmo escopo. Ver regra completa na skill multi-agente.

> **Missao:** dado um arquivo de rota, middleware ou fluxo de negocio do Gravity, produzir um plano de teste funcional estruturado em JSON que testa a **camada HTTP completa** — validacao Zod real, error handler real, Prisma e Clerk mockados. Plano pronto para humano validar e gerador de specs converter em codigo.

---

## Posição no Triângulo de Testes

```
         E2E (Playwright)
        ┌────────────────┐
        │ Browser real   │ ← smoke, fluxo completo, UI
        └────────────────┘
       /                  \
      /  Funcional (este)   \
     ┌────────────────────────┐
     │ HTTP real (Supertest)  │ ← rotas, contratos, auth chain, cross-organização
     │ Zod real               │
     │ Error handler real     │
     │ Prisma/Clerk mockados  │
     └────────────────────────┘
    /                          \
   /        Unitário             \
  ┌──────────────────────────────┐
  │ Função/hook isolado          │ ← export único, tudo mockado
  └──────────────────────────────┘
```

**Regra de ouro:**
- Unitário: testa 1 export com tudo mockado
- **Funcional: testa 1 rota/fluxo com HTTP real, Zod real, Prisma mockado**
- E2E: testa 1 fluxo com browser real, banco real

---

## Quando Usar

**SEMPRE** quando:
- Uma rota Express nova foi criada e precisa ter o contrato HTTP validado
- Um fluxo de negócio multi-step precisa ser testado sem browser
- Um middleware de auth precisa ser testado em cadeia
- Isolamento de Organização (cross-organização) precisa ser verificado na camada de rota
- Um contrato de API precisa ser validado contra schema Zod
- Um webhook precisa ser testado com assinatura e side effects

**NUNCA** quando:
- O módulo não tem camada HTTP (função pura, hook) — use `agente-plano-teste-unitario`
- O teste precisa de browser/DOM — use `agente-plano-teste-e2e`
- A rota ainda não existe no código

---

## Inputs Obrigatórios

| Campo | Tipo | Por quê |
|---|---|---|
| `escopo` | enum | CONFIG, ADMIN, PEDIDO, NFIMP, LPCO, BIDFRT, BIDCAM, SIMCUS, FINCOM, TENANT, INFRA, NUCLEO, PROCSO |
| `modulo` | string | Ex: "assinaturas-subscribe", "requireAuth", "notificacoes-send" |
| `tipoModulo` | enum | Ver tabela de 8 tipos abaixo |
| `arquivoFilePath` | string | Path do arquivo de rota/middleware — fonte das rotas |
| `arquivoFileContent` | string | Conteúdo do arquivo — agente extrai endpoints e lógica |
| `schemaFilePath` | string \| null | Path do schema Zod (se separado do arquivo de rota) |
| `planoExistente` | object \| null | Se já houver plano, agente ESTENDE em vez de recriar |
| `criticidade` | enum | `baixa` \| `media` \| `alta` \| `critica` |
| `temDinheiro` | boolean | Se true, força categorias financeiras + pentest |

---

## 8 Tipos de Módulo — Protocolo por Tipo

### 1. Rota CRUD
*Arquivo: `router.get/post/put/delete` com validação Zod e Prisma*

**Para cada endpoint:**
- Happy path: request válida → status 2xx + body shape correto
- Body inválido (campo required ausente) → `400 VALIDATION_ERROR` com `details.fieldErrors`
- Body com tipo errado (number onde string esperado) → `400 VALIDATION_ERROR`
- Auth ausente (`Authorization` sem header) → `401`
- Role insuficiente → `403`
- Recurso não encontrado (banco retorna null) → `404 NOT_FOUND`
- Banco falha (Prisma rejeita) → `500 INTERNAL_ERROR` sem stack trace
- Verificar que `error.code` está presente em TODA resposta de erro

**Padrão de setup:**
```typescript
// App de teste com rota real + error handler real
function buildTestApp() {
  const app = express()
  app.use(express.json())
  app.use(mockRequireAuth)  // injeta req.auth sem JWT real
  app.use('/api/v1/recurso', routerReal)
  app.use(errorHandler)    // error handler real — não mockado
  return app
}
```

### 2. Contrato de API (DDD)
*Arquivo: rota cujo response shape precisa ser validado contra schema Zod*

**O que testa:**
- Response body passa em `schema.safeParse(res.body)` — contrato não quebrou
- Campos DDD presentes e legados ausentes (ex: `usuario.tipo_usuario` existe, `user.role` não existe)
- Campos opcionais tipados corretamente (null vs undefined vs ausente)
- Arrays têm o tipo correto de elemento
- Datas no formato ISO8601
- Enums retornam apenas valores conhecidos

**Padrão de setup:**
```typescript
it('response válido contra meResponseSchema (DDD)', async () => {
  const res = await request(app).get('/api/v1/me')
  const parsed = meResponseSchema.safeParse(res.body)
  expect(parsed.success).toBe(true)
  expect(res.body.usuario.tipo_usuario).toBeDefined()
  expect(res.body.usuario.role).toBeUndefined()  // legado proibido
})
```

### 3. Middleware de Auth
*Arquivo: `requireAuth.ts`, `requireInternalKey.ts`, middleware de organização*

**O que testa:**
- Token válido → `req.auth` enriquecido com `{ idUsuario, idOrganizacao, clerkUserId, tipoUsuario }` (DDD — Mandamento 03)
- Token inválido/expirado → `401`
- Token ausente → `401`
- Cache hit: token já visto → banco não é consultado novamente
- Cache miss: token novo → banco consultado e resultado cacheado
- Fallback por email: `clerk_user_id` null → busca por `email_usuario`
- Email com múltiplos matches → erro de conflito
- `x-chave-interna` ausente/inválido → `401` (para rotas S2S)
- `x-chave-interna` válido → `req.auth` S2S injetado

### 4. Isolamento de Organização (Cross-Organização)
*Arquivo: qualquer rota com `WHERE id_organizacao = req.organizacao.idOrganizacao` (campo Prisma DDD)*

**O que testa:**
- WHERE da query Prisma **sempre** inclui o campo Prisma DDD de Organização (`id_organizacao: req.organizacao.idOrganizacao`)
- Token da Organização A não consegue ler dados da Organização B (mesmo com ID válido)
- URL `GET /recurso/:id` com ID de outra Organização → `404` (não `403` — não vazar existência)
- `POST` com `idOrganizacao` no body diferente de `req.organizacao.idOrganizacao` → o body é ignorado; `idOrganizacao` vem SEMPRE do JWT/middleware (Mandamento 01)
- Mock com 2 Organizações distintas → verificar que cada query filtra pela Organização correta

> Em models novos, use `id_organizacao` direto. Em models legados que ainda persistem a coluna física antiga, use `id_organizacao String` no Prisma — o `schema.prisma` é INTOCÁVEL (Mandamento 02). O header HTTP `x-tenant-id` e o campo da API atual `req.organizacao.idOrganizacao` são contratos externos preservados (semântica: Organização). Em payloads/JSON/TS de aplicação, use sempre a nomenclatura DDD (`idOrganizacao`).

**Padrão de mock:**
```typescript
function headersForOrganizacao(idOrganizacao: string, idUsuario: string) {
  // headers HTTP mantêm nomes históricos por compatibilidade de protocolo
  return { 'x-internal-validated': '1', 'x-tenant-id': idOrganizacao, 'x-user-id': idUsuario }
}

// Verificar WHERE clause (campo Prisma DDD)
const whereClause = mockFindMany.mock.calls[0][0].where
expect(whereClause.id_organizacao).toBe(ORG_A)
expect(whereClause.id_organizacao).not.toBe(ORG_B)
```

### 5. Webhook com Assinatura
*Arquivo: handler de webhook externo (Clerk, Resend, Meta WhatsApp Cloud API, Svix)*

**O que testa:**
- Assinatura válida → handler processa + status 200
- Assinatura ausente → `401` sem processar
- Assinatura inválida → `401` sem processar
- Evento desconhecido → `200` sem processar (não crash)
- Evento válido → efeito colateral correto (ex: `mockCreateMany` chamado com dados corretos)
- Evento duplicado (mesmo ID) → idempotente, sem duplicar efeito
- Payload malformado → `400` sem crash
- Corpo do request como **raw buffer** (não parsed JSON) — obrigatório para verificação de assinatura

**Padrão de assinatura:**
```typescript
// Assinatura real (Svix)
const wh = new Webhook(TEST_SECRET)
const { payload, headers } = signWebhookPayload(wh, 'email.delivered', externalId)

const res = await request(app)
  .post('/api/webhooks/resend')
  .set(headers)
  .send(payload)

expect(res.status).toBe(200)
```

### 6. Fluxo de Negócio Multi-Step
*Arquivo: vários endpoints que formam um fluxo (ex: onboarding, checkout, subscribe)*

**O que testa:**
- Cada step em sequência: step N → state correto → step N+1
- Pular um step → erro adequado (ex: tentar GET antes de criar)
- Rollback: step N falha → estado anterior preservado
- Idempotência: reexecutar step N → mesma resposta (sem duplicar efeito)

**Padrão de setup:**
```typescript
// Mock em sequência — cada step retorna o estado esperado
mockPrisma.organizacao.create.mockResolvedValueOnce(ORG_CRIADA)
mockPrisma.usuario.create.mockResolvedValueOnce(USUARIO_CRIADO)
mockPrisma.workspace.create.mockResolvedValueOnce(WORKSPACE_CRIADO)

// Step 1
const resOrg = await request(app).post('/api/v1/organizacoes').send(orgPayload)
// Step 2
const resUser = await request(app).post('/api/v1/usuarios').send({ ...userPayload, org_id: resOrg.body.id })
```

### 7. Chamada Cross-Service (S2S)
*Arquivo: rota que faz `fetch` para outro serviço interno*

**O que testa:**
- Chamada outbound usa `x-chave-interna` correto no header
- URL de destino correta (não hardcoded, via `process.env`)
- Response do serviço B 2xx → rota A retorna 2xx
- Response do serviço B 4xx → rota A retorna erro adequado (não expõe detalhes internos)
- Fetch para serviço B falha → rota A retorna 503 ou degradação graciosa

**Padrão:**
```typescript
vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
  new Response(JSON.stringify({ data: 'ok' }), { status: 200 })
))
const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
expect(url).toContain('/api/v1/recurso')
expect((opts.headers as Record<string, string>)['x-chave-interna']).toBeTruthy()
```

### 8. Script CLI / Migração
*Arquivo: script Node.js com side effects (ex: migrate-tenants, bootstrap-seed)*

**O que testa:**
- Dry-run (sem `--execute`) → sem efeitos no banco, exit code 0
- Execute com banco vazio → cria registros esperados, exit code 0
- Execute com banco já populado (idempotência) → não duplica, exit code 0
- Execute com banco inválido → exit code != 0, log de erro claro
- Verificar que mocks de Prisma foram chamados com argumentos corretos

---

## Doutrina de Granularidade Mínima — Obrigatória

Cada endpoint é testado exaustivamente. Não existe "testar a rota de subscribe" como 1 caso.

> **Regra absoluta:** todo endpoint tem no mínimo 6 casos:
> 200/201 (happy), 400 body inválido, 400 campo obrigatório ausente, 401, 404, 500.
> Endpoints críticos (auth, billing, isolamento) têm mínimo 10 casos.

**Para cada campo do body Zod:**
- Campo ausente → `400 VALIDATION_ERROR` com `details.fieldErrors[campo]`
- Campo de tipo errado → `400 VALIDATION_ERROR`
- Campo com valor inválido (enum errado, string abaixo do min) → `400 VALIDATION_ERROR`
- Campo com input adversarial (`<script>alert(1)</script>`) → `400` ou aceita mas não quebra sistema

---

## Padrão de Mocks — O que Mockar vs O que Manter Real

| Camada | Status | Por quê |
|---|---|---|
| Zod validation | ✅ **REAL** | Testa que o schema está correto e na rota certa |
| AppError + errorHandler | ✅ **REAL** | Testa que o formato de erro `{ error: { code, message } }` está correto |
| Middleware de rota (business) | ✅ **REAL** | Testa a lógica de negócio |
| requireAuth (injeção de req.auth) | 🔶 **BYPASS** | Injeta `req.auth` direto sem JWT real |
| Prisma (banco) | ❌ **MOCK** | Não sobe banco em teste funcional |
| Clerk verifyToken | ❌ **MOCK** | Não chama Clerk real |
| fetch (cross-service) | ❌ **MOCK** | Não chama serviços reais |
| Redis/cache | ❌ **MOCK** | Não sobe Redis em teste funcional |

### Pattern obrigatório: bypass de auth

```typescript
// ✅ CORRETO — mock do middleware que injeta req.auth no padrão DDD (Mandamento 03)
// tipo_usuario vem do banco (Configurador), nunca do publicMetadata do Clerk (Mandamento 01)
const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn((req, _res, next) => {
    req.auth = {
      idUsuario:      'usr_func_01',
      idOrganizacao:  'org_func_01',
      clerkUserId:    'clerk_func_01',
      tipoUsuario:    'MASTER',
      nomeUsuario:    'Func Tester',
    }
    next()
  }),
}))

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: mockRequireAuth,
}))
```

### Pattern obrigatório: mock de Prisma via vi.hoisted

```typescript
const { mockProdutoFindFirst, mockConfigUpsert } = vi.hoisted(() => ({
  mockProdutoFindFirst: vi.fn(),
  mockConfigUpsert:     vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    produtoGravity:      { findFirst: mockProdutoFindFirst },
    configuracaoProduto: { upsert: mockConfigUpsert },
  },
}))
```

### Pattern obrigatório: setup de app de teste

```typescript
function buildTestApp() {
  const app = express()
  app.use(express.json())
  app.use(mockRequireAuth)                    // auth bypassado
  app.use('/api/v1/assinaturas', routerReal)  // rota real
  app.use(errorHandler)                       // error handler real
  return app
}
```

### Pattern obrigatório: limpeza entre testes

```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

---

## Output Obrigatório

JSON validado por Zod (ver [formato-plano.md](./formato-plano.md)). Estrutura macro:

```typescript
{
  id:              "TST-FUN-CONFIG-ASSIN-000001",
  versao:          "1.0",
  geradoEm:        "2026-04-20T...",
  geradoPor:       "agente-plano-teste-funcional",
  escopo:          "CONFIG",
  modulo:          "assinaturas-subscribe",
  tipoModulo:      "rota_crud",
  arquivoFilePath: "servicos-global/configurador/server/routes/assinaturas.ts",
  criticidade:     "alta",
  endpoints:       [...],    // endpoints extraídos do arquivo
  mocksNecessarios:[...],    // o que precisa ser mockado e como
  categorias:      [...],    // cobertura por categoria funcional
  casos:           [...],    // casos numerados com request + assercao
  resumoExecutivo: "..."
}
```

Detalhes completos no [formato-plano.md](./formato-plano.md).

---

## As 16 Regras Invioláveis

### 1. NUNCA remove casos de planos existentes
Se há plano anterior, o agente **agrega**. Todo caso do plano antigo aparece no novo, marcado como `origem: 'humano-original'`.

### 2. Zod e error handler sempre REAIS
Nunca mockar `z.safeParse`, `z.parse`, `AppError` ou `errorHandler`. Se o mock esconder um schema errado ou um formato de erro quebrado, o bug vai para produção.

### 3. Todo endpoint tem no mínimo 6 casos
200/201, 400 (body inválido), 400 (campo ausente), 401, 404, 500. Pode ter mais, nunca menos (salvo endpoint read-only sem body — ajustar conforme aplicável).

### 4. Auth bypassado via mock de middleware — nunca JWT real
Injetar `req.auth` direto no mock de `requireAuth`. Testes de JWT real pertencem ao middleware de auth (tipo 3), não às rotas de negócio.

### 5. Prisma mockado 100% via vi.hoisted()
Nunca subir banco real. Sem `vi.hoisted()`, o mock pode não estar pronto antes do import da rota.

### 6. vi.clearAllMocks() em todo beforeEach
Sem limpeza, o estado do mock de Prisma de um teste contamina o próximo.

### 7. Cada erro verifica code + status + ausência de stack trace
```typescript
expect(res.status).toBe(400)
expect(res.body.error.code).toBe('VALIDATION_ERROR')
expect(res.body.error.stack).toBeUndefined()  // stack trace não vaza
```

### 8. Isolamento de Organização: verificar o WHERE da query, não só o status HTTP
Verificar `mockFindMany.mock.calls[0][0].where.id_organizacao === req.organizacao.idOrganizacao` (campo Prisma DDD; `req.organizacao.idOrganizacao` é o nome legado da API atual do SDK — semântica: `idOrganizacao`). Status 200 pode estar correto e o WHERE errado — isso é o bug mais perigoso.

### 9. Contrato de API: validar response contra schema Zod
Para rotas com `tipoModulo: 'contrato_api'`, todo teste de happy path valida `schema.safeParse(res.body).success === true`.

### 10. Input adversarial em todo campo de texto do body
`<script>alert(1)</script>`, `' OR 1=1--`, string de 10.000 chars — o sistema retorna 400 ou aceita como string sem crash, sem stack trace exposto.

### 11. setupFiles declarado no plano
O plano deve registrar se o módulo precisa de `setupFiles` global e qual arquivo é. Sem isso, o gerador de specs não sabe que precisa criar/atualizar o setup.

### 12. buildTestApp documentado no plano
A estrutura exata do app de teste (ordem dos middlewares, qual router, qual error handler) é declarada no plano para que o gerador de specs reproduza corretamente.

### 13. Output é só o plano, não é código
O agente **não gera** `.test.ts`. Gerador de specs consome este JSON depois.

### 14. Preservação de testes existentes ao estender plano
Se já existem `.test.ts` para o módulo, o agente lê e marca casos existentes como `origem: 'existente'`. Não duplica.

### 15. Revisão SME para fluxos de negócio e módulos financeiros
Fluxos multi-step, módulos de billing, isolamento crítico, integrações com Clerk/Resend/Meta WhatsApp/Gemini: SME revisa antes de aprovar. Registrar `smeRevisadoPor` e `smeRevisadoEm`.

### 16. Mock de fetch para chamadas cross-service
Quando a rota chama outro serviço via fetch, o plano declara o mock de fetch e verifica: URL correta, `x-chave-interna` presente, corpo correto. Nunca chamar o serviço real em teste funcional.

---

## Fluxo Completo

```
1. Humano solicita plano para uma rota/fluxo
   ↓
2. Agente lê arquivoFileContent + schemaFilePath (se existir)
   ↓
3. Agente identifica tipoModulo (1–8)
   ↓
4. Agente extrai todos os endpoints/handlers do arquivo
   ↓
5. Para cada endpoint:
   ├─ Aplica protocolo do tipo de módulo
   ├─ Gera mínimo de casos por criticidade (checklist-categorias.md)
   ├─ Inclui casos adversariais em campos de texto
   └─ Declara mocks necessários (Prisma, auth, fetch)
   ↓
6. Verifica .test.ts existentes → casos existentes recebem origem: 'existente'
   ↓
7. Se planoExistente, MERGE — preserva tudo do antigo
   ↓
8. Calcula cobertura por categoria
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
| Todos os endpoints cobertos | 100% |
| Happy + sad + 401 + 500 por endpoint | 100% |
| WHERE de organização verificado nas queries | 100% dos endpoints com dados |
| Contratos Zod validados | 100% dos endpoints com response schema |
| Aceitação humana sem edição | ≥85% dos planos |
| Tempo de geração | ≤25s por módulo |

---

## Estrutura de Pastas — Onde Salvar

> ⚠️ Esta árvore é a fonte de verdade no momento da escrita desta skill.
> Sempre verificar o estado atual da pasta antes de salvar — novos módulos podem ter sido adicionados.

```
testes/testes-funcionais/
├── configurador/
│   ├── _planos/                          ← JSONs de plano por módulo
│   ├── assinaturas/
│   │   └── subscribe.test.ts
│   ├── me-contract.test.ts
│   └── requireAuth.test.ts
├── infra/
│   └── migrate-tenants/
│       └── shared.funcional.test.ts
└── organizacao/
    └── notificacoes/
        └── notificacoes.funcional.test.ts

testes/testes-cross-organizacao/
└── notificacoes/
    └── notificacoes.cross-organizacao.test.ts

servicos-global/configurador/server/__tests__/
├── setup.ts                              ← setupFiles global
├── admin-test-endpoints.test.ts
├── hubInit.test.ts
├── apiCockpitGabi.test.ts
└── hubInsights.test.ts

testes/
└── test-plans-registry.json             ← índice global
```

**Regra de nomenclatura de ID:** `TST-FUN-{ESCOPO}-{MODULO}-{NUMERO}` — número = próximo disponível no registry.

| Escopo | Módulo |
|---|---|
| `CONFIG` | Configurador |
| `ADMIN` | Admin |
| `PEDIDO` | Produto Pedido |
| `LPCO` | Produto LPCO |
| `FINCOM` | Financeiro Comex |
| `NFIMP` | NF Importação |
| `TENANT` | Serviços por Organização |
| `INFRA` | Scripts de infra |
| `NUCLEO` | nucleo-global |

---

## Modelo de IA

- **Modelo principal:** `gemini-2.0-flash`
- **Modelo escalável:** `gemini-2.0-pro` (se cobertura < 80% dos endpoints, retenta no Pro)
- **Custo médio:** ~$0.03–0.10 por plano
- **Latência:** 12–30s

---

## Arquivos Relacionados

- [checklist-categorias.md](./checklist-categorias.md) — categorias funcionais com mínimos por criticidade
- [formato-plano.md](./formato-plano.md) — schema Zod completo do JSON do plano
- [exemplo-plano.md](./exemplo-plano.md) — plano completo de `POST /api/v1/assinaturas/subscribe` (rota real)
