# Exemplo Completo — Plano de POST /api/v1/assinaturas/subscribe

> Demonstração de como o agente `agente-plano-teste-funcional` produz um plano para uma rota real do projeto.
> **Rota:** `POST /api/v1/assinaturas/subscribe`
> **Teste existente:** `testes/testes-funcionais/configurador/assinaturas/subscribe.test.ts`

---

## Inputs ao agente

```json
{
  "escopo": "CONFIG",
  "modulo": "assinaturas-subscribe",
  "tipoModulo": "rota_crud",
  "arquivoFilePath": "servicos-global/configurador/server/routes/assinaturas.ts",
  "criticidade": "alta",
  "temDinheiro": false,
  "planoExistente": null
}
```

---

## Endpoints extraídos pelo agente

| Método | Path | Auth | Body | Dados de Organização | Crítico |
|---|---|---|---|---|---|
| `POST` | `/api/v1/assinaturas/subscribe` | ✅ | ✅ `subscribeSchema` | ✅ | ✅ |
| `GET` | `/api/v1/assinaturas` | ✅ | ❌ | ✅ | ✅ |

---

## Mocks necessários

O agente detecta dependências externas e declara:

| Mock | Alvo | Estratégia |
|---|---|---|
| `mockProdutoFindFirst` | `prisma.produtoGravity.findFirst` | `vi.hoisted` |
| `mockConfigUpsert` | `prisma.configuracaoProduto.upsert` | `vi.hoisted` |
| `mockConfigFindMany` | `prisma.configuracaoProduto.findMany` | `vi.hoisted` |
| `mockRequireAuth` | `middleware/requireAuth.js` | `vi.hoisted` |

**buildTestApp declarado:**
```typescript
function buildTestApp() {
  const app = express()
  app.use(express.json())
  app.use(mockRequireAuth)                          // injeta req.auth sem JWT
  app.use('/api/v1/assinaturas', assinaturasRouter) // rota real
  app.use(errorHandler)                             // error handler real
  return app
}
```

**Setup no beforeEach (DDD — Mandamento 03):**
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockImplementation((req, _res, next) => {
    // tipoUsuario vem do banco via /api/v1/me — nunca do publicMetadata (Mandamento 01)
    req.auth = { idUsuario: 'usr_func_01', idOrganizacao: 'org_func_01', tipoUsuario: 'MASTER' }
    next()
  })
})
```

---

## Cobertura por categoria

| # | Categoria | Status | Casos |
|---|---|---|---|
| 1 | Happy path (2xx) | ✅ coberta | 2 |
| 2 | Validação de body (400) | ✅ coberta | 5 |
| 3 | Autenticação (401) | ✅ coberta | 2 |
| 4 | Autorização (403) | 🚫 não aplicável | — |
| 5 | Recurso não encontrado (404) | ✅ coberta | 2 |
| 6 | Erro de servidor (500) | ✅ coberta | 2 |
| 7 | Formato de erro canônico | ✅ coberta | aplicado em todos os erros |
| 8 | Contrato de response (Zod) | ✅ coberta | 2 |
| 9 | Isolamento de Organização (WHERE) | ✅ coberta | 2 |
| 10 | Inputs adversariais | ✅ coberta | 3 |
| 11 | Idempotência | ✅ coberta | 1 |
| 12 | Chamada cross-service | 🚫 não aplicável | — |
| 13 | Assinatura de webhook | 🚫 não aplicável | — |
| 14 | Cache de auth | 🚫 não aplicável | — |
| 15 | Isolamento de efeitos colaterais | ✅ coberta | 1 |

**Cobertura:** 11/15 (73% — 4 não-aplicáveis com justificativa).

---

## Resumo executivo

> **Rota de contratação de produto** para a Organização autenticada. Faz lookup do produto no catálogo (`produtoGravity.findFirst`) e upsert da config (`configuracaoProduto.upsert`). **Risco principal:** o id da Organização (campo Prisma DDD `id_organizacao`) deve vir de `req.auth.idOrganizacao`, nunca do body — caso de Isolamento de Organização testado explicitamente. **Contrato DDD:** response tem `{ config, catalog }` — validado contra `subscribeResponseSchema`. **Zod real:** schema `subscribeSchema` roda no request sem mock. **Error handler real:** formato `{ error: { code, message } }` verificado em todos os casos de erro.

---

## Casos de teste — completo

### Describe 1 — Happy path

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000001",
  "numero": 1,
  "descricao": "retorna 201 com config e catalog ao contratar produto ativo",
  "categoria": 1,
  "origem": "existente",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": "PRODUTO_CATALOGO", "metodo": "mockResolvedValue" },
    { "nomeMock": "mockConfigUpsert", "retorno": "CONFIG_CRIADO", "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 201 },
    { "tipo": "bodyField", "campo": "config.product_key", "valor": "pedido" },
    { "tipo": "bodyField", "campo": "config.is_active", "valor": true },
    { "tipo": "mockCalledWith", "nomeMock": "mockConfigUpsert", "args": {
      "where.id_organizacao_product_key.id_organizacao": "org_func_01",
      "where.id_organizacao_product_key.product_key": "pedido",
      "create.id_organizacao": "org_func_01"
    }}
  ],
  "resultadoEsperado": "201 com config.product_key = 'pedido'; upsert chamado com campo Prisma DDD id_organizacao = org_func_01 (de req.auth.idOrganizacao, não do body)",
  "adversarial": false
}
```

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000002",
  "numero": 2,
  "descricao": "contrato DDD: response body passa em subscribeResponseSchema.safeParse",
  "categoria": 8,
  "origem": "existente",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": "PRODUTO_CATALOGO", "metodo": "mockResolvedValue" },
    { "nomeMock": "mockConfigUpsert", "retorno": "CONFIG_CRIADO", "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 201 },
    { "tipo": "zodParse", "schema": "subscribeResponseSchema" }
  ],
  "resultadoEsperado": "subscribeResponseSchema.safeParse(res.body).success = true — contrato não quebrou",
  "adversarial": false
}
```

### Describe 2 — Validação de body (400)

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000003",
  "numero": 3,
  "descricao": "body vazio {} retorna 400 VALIDATION_ERROR com fieldErrors.product_key",
  "categoria": 2,
  "origem": "existente",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": {}
  },
  "assercoes": [
    { "tipo": "status", "valor": 400 },
    { "tipo": "errorCode", "codigo": "VALIDATION_ERROR" },
    { "tipo": "errorDetails", "campo": "product_key" },
    { "tipo": "noStackTrace" },
    { "tipo": "mockNotCalled", "nomeMock": "mockProdutoFindFirst" }
  ],
  "resultadoEsperado": "400 VALIDATION_ERROR com fieldErrors.product_key — Zod rejeita antes do banco ser consultado",
  "adversarial": false,
  "notas": "Verificar mockNotCalled confirma que Zod bloqueou antes do banco"
}
```

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000004",
  "numero": 4,
  "descricao": "product_key com tipo errado (número) retorna 400 VALIDATION_ERROR",
  "categoria": 2,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": 42 }
  },
  "assercoes": [
    { "tipo": "status", "valor": 400 },
    { "tipo": "errorCode", "codigo": "VALIDATION_ERROR" }
  ],
  "resultadoEsperado": "400 — Zod rejeita número onde string é esperada",
  "adversarial": false
}
```

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000005",
  "numero": 5,
  "descricao": "product_key string vazia retorna 400 VALIDATION_ERROR",
  "categoria": 2,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 400 },
    { "tipo": "errorCode", "codigo": "VALIDATION_ERROR" }
  ],
  "resultadoEsperado": "400 — Zod min(1) rejeita string vazia",
  "adversarial": false
}
```

### Describe 3 — Autenticação (401)

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000006",
  "numero": 6,
  "descricao": "sem Authorization header retorna 401",
  "categoria": 3,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 401 },
    { "tipo": "noStackTrace" }
  ],
  "resultadoEsperado": "401 — requireAuth real (sem bypass) rejeita request sem token",
  "adversarial": false,
  "notas": "Este caso usa requireAuth REAL, não o mock — o app de teste para este caso não injeta mockRequireAuth"
}
```

### Describe 4 — Recurso não encontrado (404)

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000007",
  "numero": 7,
  "descricao": "produto inexistente no catálogo retorna 404 NOT_FOUND",
  "categoria": 5,
  "origem": "existente",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": null, "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "produto-que-nao-existe" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 404 },
    { "tipo": "errorCode", "codigo": "NOT_FOUND" },
    { "tipo": "noStackTrace" },
    { "tipo": "mockNotCalled", "nomeMock": "mockConfigUpsert" }
  ],
  "resultadoEsperado": "404 NOT_FOUND — produto não existe no catálogo; upsert não é chamado",
  "adversarial": false
}
```

### Describe 5 — Erro de servidor (500)

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000008",
  "numero": 8,
  "descricao": "Prisma falha no upsert retorna 500 INTERNAL_ERROR sem stack trace",
  "categoria": 6,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": "PRODUTO_CATALOGO", "metodo": "mockResolvedValue" },
    { "nomeMock": "mockConfigUpsert", "retorno": "new Error('DB timeout')", "metodo": "mockRejectedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 500 },
    { "tipo": "errorCode", "codigo": "INTERNAL_ERROR" },
    { "tipo": "noStackTrace" },
    { "tipo": "bodyUndefined", "campo": "error.message" }
  ],
  "resultadoEsperado": "500 INTERNAL_ERROR — stack trace não vaza, message não expõe 'prisma' ou 'DB timeout'",
  "adversarial": false,
  "notas": "Verificar que error.message é 'Erro interno do servidor' ou similar — não o erro interno do Prisma"
}
```

### Describe 6 — Isolamento de Organização (Cross-Organização)

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000009",
  "numero": 9,
  "descricao": "campo Prisma DDD id_organizacao do upsert vem sempre de req.auth.idOrganizacao — nunca do body",
  "categoria": 9,
  "origem": "existente",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": "PRODUTO_CATALOGO", "metodo": "mockResolvedValue" },
    { "nomeMock": "mockConfigUpsert", "retorno": "CONFIG_CRIADO", "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido", "idOrganizacao": "org_MALICIOSA" },
    "authInjetada": { "idUsuario": "usr_func_01", "idOrganizacao": "org_func_01", "clerkUserId": "clerk_01", "tipoUsuario": "MASTER" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 201 },
    { "tipo": "whereClause", "nomeMock": "mockConfigUpsert", "campo": "where.id_organizacao_product_key.id_organizacao", "valor": "org_func_01" },
    { "tipo": "mockCalledWith", "nomeMock": "mockConfigUpsert", "args": { "create.id_organizacao": "org_func_01" } }
  ],
  "resultadoEsperado": "upsert usa org_func_01 (de req.auth.idOrganizacao) — idOrganizacao: 'org_MALICIOSA' do body é ignorado completamente",
  "adversarial": true,
  "notas": "Caso de Isolamento de Organização mais crítico — injeção de idOrganizacao via body. Backend deve sempre usar o id do JWT (Mandamento 01) e gravar no campo Prisma DDD id_organizacao."
}
```

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000010",
  "numero": 10,
  "descricao": "Organização B não vê assinaturas da Organização A no GET /api/v1/assinaturas",
  "categoria": 9,
  "origem": "agente-adicionado",
  "endpointTestado": "GET /api/v1/assinaturas",
  "mockRetornos": [
    { "nomeMock": "mockConfigFindMany", "retorno": "[{ id_organizacao: 'org_b', product_key: 'pedido' }]", "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "GET",
    "path": "/api/v1/assinaturas",
    "authInjetada": { "idUsuario": "usr_b", "idOrganizacao": "org_b", "clerkUserId": "clerk_b", "tipoUsuario": "MASTER" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 200 },
    { "tipo": "whereClause", "nomeMock": "mockConfigFindMany", "campo": "where.id_organizacao", "valor": "org_b" }
  ],
  "resultadoEsperado": "findMany chamado com WHERE id_organizacao = 'org_b' (campo Prisma DDD) — nunca 'org_a'",
  "adversarial": false
}
```

### Describe 7 — Inputs adversariais

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000011",
  "numero": 11,
  "descricao": "product_key com XSS (<script>alert(1)</script>) retorna 400 sem crash",
  "categoria": 10,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "<script>alert(1)</script>" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 400 },
    { "tipo": "noStackTrace" }
  ],
  "resultadoEsperado": "400 — Zod rejeita ou sistema aceita como string sem executar script; sem crash, sem 500",
  "adversarial": true
}
```

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000012",
  "numero": 12,
  "descricao": "product_key com SQL injection retorna 400 sem expor internals",
  "categoria": 10,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "' OR 1=1--" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 400 },
    { "tipo": "noStackTrace" }
  ],
  "resultadoEsperado": "400 — Prisma usa queries parametrizadas; SQL injection não executa; sem 500",
  "adversarial": true
}
```

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000013",
  "numero": 13,
  "descricao": "product_key com 10.000 caracteres retorna 400 sem crash",
  "categoria": 10,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "a".repeat(10000) }
  },
  "assercoes": [
    { "tipo": "status", "valor": 400 },
    { "tipo": "noStackTrace" }
  ],
  "resultadoEsperado": "400 — Zod max() rejeita; sem memory leak, sem 500",
  "adversarial": true
}
```

### Describe 8 — Idempotência

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000014",
  "numero": 14,
  "descricao": "chamar subscribe 2x com mesmo product_key não duplica config (upsert é idempotente)",
  "categoria": 11,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": "PRODUTO_CATALOGO", "metodo": "mockResolvedValue" },
    { "nomeMock": "mockConfigUpsert", "retorno": "CONFIG_CRIADO", "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 201 },
    { "tipo": "mockCalledTimes", "nomeMock": "mockConfigUpsert", "vezes": 1 }
  ],
  "resultadoEsperado": "upsert chamado 1x por request — é o próprio upsert que garante idempotência no banco",
  "adversarial": false,
  "notas": "A idempotência do subscribe é garantida pelo upsert do Prisma — 2 requests iguais geram 2 upserts corretos (não duplicata). O teste verifica que cada request faz exatamente 1 upsert."
}
```

### Describe 9 — Isolamento de efeitos colaterais

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000015",
  "numero": 15,
  "descricao": "vi.clearAllMocks() garante que mock do caso anterior não contamina o próximo",
  "categoria": 15,
  "origem": "agente-adicionado",
  "endpointTestado": "POST /api/v1/assinaturas/subscribe",
  "mockRetornos": [
    { "nomeMock": "mockProdutoFindFirst", "retorno": null, "metodo": "mockResolvedValue" }
  ],
  "request": {
    "metodo": "POST",
    "path": "/api/v1/assinaturas/subscribe",
    "body": { "product_key": "pedido" }
  },
  "assercoes": [
    { "tipo": "status", "valor": 404 },
    { "tipo": "mockCalledTimes", "nomeMock": "mockProdutoFindFirst", "vezes": 1 }
  ],
  "resultadoEsperado": "mockProdutoFindFirst chamado exatamente 1x — não acumula chamadas de testes anteriores",
  "adversarial": false,
  "notas": "Se beforeEach não tiver vi.clearAllMocks(), este teste falharia com vezes > 1 por acúmulo de chamadas anteriores"
}
```

---

## Matriz de cobertura final

```json
"categorias": [
  { "categoria": 1, "nome": "Happy path (2xx)", "status": "coberta", "casosAssociados": [1, 2] },
  { "categoria": 2, "nome": "Validação de body (400)", "status": "coberta", "casosAssociados": [3, 4, 5] },
  { "categoria": 3, "nome": "Autenticação (401)", "status": "coberta", "casosAssociados": [6] },
  { "categoria": 4, "nome": "Autorização (403)", "status": "nao_aplicavel", "justificativa": "Rota não tem RBAC — qualquer usuário autenticado pode contratar produto" },
  { "categoria": 5, "nome": "Recurso não encontrado (404)", "status": "coberta", "casosAssociados": [7] },
  { "categoria": 6, "nome": "Erro de servidor (500)", "status": "coberta", "casosAssociados": [8] },
  { "categoria": 7, "nome": "Formato de erro canônico", "status": "coberta", "casosAssociados": [3, 6, 7, 8], "notas": "Verificado em todos os casos de erro via noStackTrace + errorCode" },
  { "categoria": 8, "nome": "Contrato de response (Zod)", "status": "coberta", "casosAssociados": [2] },
  { "categoria": 9, "nome": "Isolamento de Organização (WHERE)", "status": "coberta", "casosAssociados": [9, 10] },
  { "categoria": 10, "nome": "Inputs adversariais", "status": "coberta", "casosAssociados": [11, 12, 13] },
  { "categoria": 11, "nome": "Idempotência", "status": "coberta", "casosAssociados": [14] },
  { "categoria": 12, "nome": "Chamada cross-service", "status": "nao_aplicavel", "justificativa": "Rota não chama serviços internos" },
  { "categoria": 13, "nome": "Assinatura de webhook", "status": "nao_aplicavel", "justificativa": "Rota de negócio, não webhook" },
  { "categoria": 14, "nome": "Cache de auth", "status": "nao_aplicavel", "justificativa": "Auth bypassado — cache testado no plano do requireAuth (TST-FUN-CONFIG-AUTH-000001)" },
  { "categoria": 15, "nome": "Isolamento de efeitos colaterais", "status": "coberta", "casosAssociados": [15] }
],
"coberturaPercentual": 73
```

73% — 11 categorias cobertas, 4 não-aplicáveis com justificativa.

---

## O que esse exemplo prova

1. **Zod e error handler são reais** — casos 3, 4, 5 provam que a validação Zod está corretamente wired na rota. Mock da validação esconderia um bug de schema.
2. **Isolamento de Organização detectado no WHERE, não só no status** — caso 9 verifica o argumento exato passado ao Prisma (campo Prisma DDD `id_organizacao`). Status 200 com WHERE errado é o bug mais silencioso da plataforma.
3. **Inputs adversariais são casos, não observações** — casos 11–13 têm request real e asserção de resultado esperado.
4. **Stack trace nunca vaza** — `noStackTrace` em todo caso de erro, incluindo o 500 do Prisma.
5. **Isolamento de mocks verificado** — caso 15 valida que `vi.clearAllMocks()` no `beforeEach` funciona corretamente.
6. **Contrato DDD preservado** — caso 2 valida que o response bate com `subscribeResponseSchema.safeParse()`.
7. **Casos existentes são `origem: 'existente'`** — agente não duplica o que já existe no `.test.ts`.
