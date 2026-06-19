# Checklist de Categorias — Testes Funcionais

> Todo endpoint/fluxo do Gravity precisa cobrir as categorias abaixo (ou marcar como não-aplicável com justificativa). O agente `agente-plano-teste-funcional` usa esta lista como base obrigatória.

---

## Tabela Resumo

| # | Categoria | Mínimo de casos por criticidade | Tipos de módulo que se aplicam | Severidade |
|---|---|---|---|---|
| 1 | Happy path (2xx) | baixa:1 / media:2 / alta:3 / crit:5 | Todos | 🔴 |
| 2 | Validação de body (400) | baixa:2 / media:3 / alta:5 / crit:8 | Rota CRUD, Fluxo, Webhook | 🔴 |
| 3 | Autenticação ausente/inválida (401) | baixa:1 / media:1 / alta:2 / crit:3 | Rotas protegidas, Middleware Auth | 🔴 |
| 4 | Autorização insuficiente (403) | baixa:0 / media:1 / alta:2 / crit:4 | Rotas com RBAC | 🔴 |
| 5 | Recurso não encontrado (404) | baixa:1 / media:1 / alta:2 / crit:3 | Rota CRUD | 🔴 |
| 6 | Erro de servidor (500) | baixa:1 / media:1 / alta:2 / crit:3 | Todos | 🔴 |
| 7 | Formato de erro canônico | baixa:1 / media:2 / alta:3 / crit:4 | Todos | 🔴 |
| 8 | Contrato de response (shape Zod) | baixa:1 / media:2 / alta:3 / crit:4 | Contrato API, Rota CRUD | 🔴 |
| 9 | Isolamento de Organização (WHERE) | baixa:0 / media:1 / alta:2 / crit:4 | Rota CRUD, Fluxo, Cross-Organização | 🔴 |
| 10 | Inputs adversariais | baixa:0 / media:1 / alta:2 / crit:3 | Rota CRUD, Webhook, Fluxo | 🔴 |
| 11 | Idempotência | baixa:0 / media:1 / alta:2 / crit:3 | Webhook, Fluxo, Script CLI | 🟡 |
| 12 | Chamada cross-service (URL + headers) | baixa:0 / media:1 / alta:2 / crit:3 | Cross-Service | 🟡 |
| 13 | Assinatura de webhook | baixa:0 / media:0 / alta:3 / crit:5 | Webhook com Assinatura | 🔴 |
| 14 | Cache de auth (hit / miss / invalidação) | baixa:0 / media:1 / alta:2 / crit:4 | Middleware Auth | 🟡 |
| 15 | Isolamento de efeitos colaterais | baixa:0 / media:1 / alta:2 / crit:3 | Todos | 🟡 |

**Severidade:**
- 🔴 = ausência aqui bloqueia release
- 🟡 = ausência aqui é agendada
- 🟢 = ausência aqui é polish

---

## Detalhamento por Categoria

### 1. Happy path (2xx) 🔴
**O que cobre:** rota recebe request válido e retorna status + body esperados.

**Casos típicos:**
- `POST` com payload válido → `201` + objeto criado
- `GET /lista` com dados no banco → `200` + array de itens
- `GET /:id` com ID existente → `200` + objeto
- `PUT /:id` com payload válido → `200` + objeto atualizado
- `DELETE /:id` com ID existente → `204` ou `200` com confirmação

**Regra:** para cada variação significativa de input (ex: cada tipo de produto, cada role), existe ao menos 1 caso happy path.

---

### 2. Validação de body (400) 🔴
**O que cobre:** Zod rejeita inputs inválidos antes de tocar o banco.

**Casos obrigatórios por campo required:**
- Campo ausente → `400 VALIDATION_ERROR` + `details.fieldErrors[campo]` presente
- Campo com tipo errado (número onde string esperado) → `400 VALIDATION_ERROR`
- Campo com valor fora do enum → `400 VALIDATION_ERROR`
- String abaixo do `min(n)` → `400 VALIDATION_ERROR`
- String acima do `max(n)` → `400 VALIDATION_ERROR`
- Body completamente vazio `{}` → `400 VALIDATION_ERROR` com todos os campos required listados

**Verificação crítica:**
```typescript
expect(res.status).toBe(400)
expect(res.body.error.code).toBe('VALIDATION_ERROR')
expect(res.body.error.details.fieldErrors).toBeDefined()
expect(res.body.error.details.fieldErrors['campo_faltando']).toHaveLength.greaterThan(0)
```

---

### 3. Autenticação ausente/inválida (401) 🔴
**O que cobre:** rota protegida rejeita requests sem credencial válida.

**Casos típicos:**
- Header `Authorization` ausente → `401`
- Token malformado (`Bearer `) → `401`
- Token expirado → `401`
- Header `x-chave-interna` ausente (rota S2S) → `401`
- Header `x-chave-interna` com valor errado → `401`

---

### 4. Autorização insuficiente (403) 🔴
**O que cobre:** usuário autenticado mas sem `tipo_usuario` suficiente.

**Casos típicos:**
- `tipo_usuario` `USUARIO` tenta ação de `ADMIN` → `403 FORBIDDEN`
- `tipo_usuario` `ADMIN` tenta ação de `SUPER_ADMIN` → `403 FORBIDDEN`
- Usuário da Organização X tenta operação na Organização Y (se detectado antes do 404) → `403 FORBIDDEN`
- `tipo_usuario` lido SEMPRE de `GET /api/v1/me` (Mandamento 01) — nunca do `publicMetadata`

---

### 5. Recurso não encontrado (404) 🔴
**O que cobre:** ID ou recurso não existe ou pertence a outra Organização.

**Casos típicos:**
- `GET /:id` com ID inexistente → `404 NOT_FOUND`
- `GET /:id` com ID de outra Organização → `404 NOT_FOUND` (não 403 — não vazar existência)
- `PUT /:id` com ID inexistente → `404 NOT_FOUND`
- `DELETE /:id` com ID inexistente → `404 NOT_FOUND`

**Regra crítica:** resposta é sempre `404`, nunca `403`, para IDs de outras Organizações — 403 vazaria que o recurso existe.

---

### 6. Erro de servidor (500) 🔴
**O que cobre:** banco falha, serviço externo falha — resposta graciosa sem vazamento.

**Casos típicos:**
- `mockPrisma.findFirst.mockRejectedValue(new Error('DB timeout'))` → `500 INTERNAL_ERROR`
- `fetch` para serviço externo rejeita → `500` ou `503` com mensagem genérica
- `mockPrisma.create.mockRejectedValue(...)` → `500 INTERNAL_ERROR`

**Verificação crítica:**
```typescript
expect(res.status).toBe(500)
expect(res.body.error.code).toBe('INTERNAL_ERROR')
expect(res.body.error.stack).toBeUndefined()   // stack trace nunca vaza
expect(res.body.error.message).not.toContain('prisma')  // não expõe internals
```

---

### 7. Formato de erro canônico 🔴
**O que cobre:** TODO erro retorna `{ error: { code, message } }` — sem variações.

**Verificação obrigatória em todo caso de erro:**
```typescript
// ✅ Todo erro tem esta estrutura
expect(res.body).toHaveProperty('error')
expect(res.body.error).toHaveProperty('code')
expect(res.body.error).toHaveProperty('message')
// ❌ Nunca esta
expect(res.body).not.toHaveProperty('message')     // campo solto
expect(res.body).not.toHaveProperty('error_message')
```

---

### 8. Contrato de response (shape Zod) 🔴
**O que cobre:** response body passa na validação do schema Zod do frontend.

**Casos típicos:**
- Response completo validado: `schema.safeParse(res.body).success === true`
- Campos DDD presentes: `usuario.tipo_usuario` existe (não `user.role`)
- Campos legados ausentes: `res.body.user` é undefined
- Arrays têm tipo correto por elemento
- Datas são ISO8601 válidas
- Enums retornam apenas valores conhecidos

**Regra:** se existe um `responseSchema` Zod no codebase para a rota, o plano inclui validação contra ele em todo happy path.

---

### 9. Isolamento de Organização (WHERE) 🔴
**O que cobre:** que o campo Prisma de Organização (`id_organizacao`) do usuário autenticado sempre filtra as queries.

> Em models novos, use `id_organizacao` direto. Em models legados que ainda persistem a coluna física antiga, use `id_organizacao String` no Prisma — o `schema.prisma` é INTOCÁVEL (Mandamento 02). Em payloads/JSON/TS de aplicação, use sempre a nomenclatura DDD (`idOrganizacao`).

**Casos típicos:**
- Verificar `mockFindMany.mock.calls[0][0].where.id_organizacao === req.organizacao.idOrganizacao` (semântica: `idOrganizacao`)
- Organização A faz GET → mock retorna dados de A → verificar que WHERE não contém Organização B
- Organização B faz GET → mesmo mock → WHERE filtra Organização B
- Request com `idOrganizacao` no body (tentativa de injeção) → sistema usa `req.organizacao.idOrganizacao` do JWT (semântica: `idOrganizacao`), ignora o body

**Regra:** não basta verificar status 200. É preciso inspecionar o argumento passado ao mock do Prisma.

---

### 10. Inputs adversariais 🔴
**O que cobre:** campos de texto não crasham nem vão para o banco com dados perigosos.

**Casos obrigatórios por campo de texto livre:**
```
1. <script>alert(1)</script>   → 400 (Zod deve rejeitar) ou aceita como string (sem XSS)
2. ' OR 1=1--                  → 400 ou aceita como string (Prisma parametrizado — sem SQLi)
3. String de 10.000 caracteres → 400 se max() configurado; sem crash se aceito
```

**Verificação:**
```typescript
// Stack trace nunca vaza, mesmo com payload adversarial
expect(res.body.error?.stack).toBeUndefined()
expect(res.status).not.toBe(500)  // sistema não crasha
```

---

### 11. Idempotência 🟡
**O que cobre:** executar a mesma operação 2x não duplica efeitos.

**Casos típicos:**
- Mesmo webhook processado 2x → `mockCreateMany` chamado 1x (não 2x)
- Mesmo `POST` de criação 2x → conflito tratado (`409` ou upsert)
- Script CLI rodado 2x → banco não tem duplicatas (idempotente)

---

### 12. Chamada cross-service (URL + headers) 🟡
**O que cubre:** que chamadas para outros serviços usam URL e headers corretos.

**Casos típicos:**
- Verificar URL da chamada inclui path correto
- Verificar header `x-chave-interna` presente e não vazio
- Verificar que o id da Organização é passado corretamente para o serviço B (header `x-tenant-id` ou body conforme contrato)
- Serviço B retorna erro → comportamento de degradação correto

---

### 13. Assinatura de webhook 🔴
**O que cobre:** que o sistema valida a autenticidade do payload antes de processar.

**Casos obrigatórios:**
- Assinatura válida (Svix real ou mock) → `200`
- Assinatura ausente (sem headers Svix) → `401`
- Assinatura inválida (headers Svix com valor errado) → `401`
- Payload válido + assinatura válida → side effect correto (mockCreateMany chamado)

---

### 14. Cache de auth (hit / miss / invalidação) 🟡
**O que cobre:** que o middleware de auth usa cache corretamente.

**Casos típicos:**
- Token novo (miss) → `clerkClient.verifyToken` chamado → resultado cacheado
- Token repetido (hit) → `clerkClient.verifyToken` NÃO chamado novamente
- Token invalidado → próxima request forçada a verificar novamente
- Cache prefixado por `organização:<idOrganizacao>:` — não vaza entre Organizações

---

### 15. Isolamento de efeitos colaterais 🟡
**O que cobre:** que cada teste não contamina o próximo via estado de mock.

**Verificação:**
- `vi.clearAllMocks()` no `beforeEach` garante que mocks do caso anterior não contam
- `mockCreateMany.mock.calls.length` começa em 0 em cada `it()`
- Estado de banco (retorno dos mocks) é configurado por `it()`, não globalmente

---

## Como o agente decide quantos casos por categoria

```
SE criticidade = "critica":
  para cada categoria, gera o número da coluna "crit"
SE criticidade = "alta":
  gera o número da coluna "alta"
SE criticidade = "media":
  gera o número da coluna "media"
SE criticidade = "baixa":
  gera o número da coluna "baixa"

EXCEÇÕES:
- temDinheiro = true → força criticidade mínima "critica"
- tipoModulo = "middleware_auth" → força categorias 3, 14 com mínimo "alta"
- tipoModulo = "webhook_assinatura" → força categoria 13 com mínimo "alta"
- tipoModulo = "isolamento_cross_tenant" → força categoria 9 com mínimo "critica"
- Qualquer rota com dados de Organização → força categoria 9 com mínimo "media"
```

---

## Como marcar uma categoria como `nao_aplicavel`

```json
{
  "categoria": 4,
  "nome": "Autorização insuficiente (403)",
  "status": "nao_aplicavel",
  "justificativa": "Rota /health não tem autenticação — qualquer request é aceito. RBAC não se aplica.",
  "casos": []
}
```

A justificativa é **obrigatória**. Sem ela, o validador rejeita e força regeneração.
