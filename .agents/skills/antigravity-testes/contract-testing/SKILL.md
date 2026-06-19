---
name: antigravity-contract-testing
description: "Use esta skill para implementar contract tests entre serviços. Define como Zod schemas servem como contratos de API, validação no CI, detecção de breaking changes e versionamento. Consultada pelo QA, Backend e Estrutura de Sistemas ao criar ou modificar APIs."
---

# Gravity — Contract Testing

## Por Que Contract Tests

Na arquitetura do Gravity, produtos chamam serviços de organização via API REST. Se um serviço de organização mudar o formato do response sem avisar, o produto que consume essa API quebra em produção.

Contract tests resolvem isso: o mesmo schema Zod que valida a rota **é** o contrato. Mudou o schema? O CI bloqueia o merge.

---

## Padrão 1 — Schema exportado do próprio arquivo de rota (Configurador)

Quando o serviço tem apenas uma rota central de identidade (ex: `/api/v1/me`), o schema Zod é exportado diretamente do arquivo de rota, sem um `contracts.ts` separado.

```typescript
// servicos-global/configurador/server/routes/me.ts
export const meResponseSchema = z.object({
  usuario: z.object({
    id_usuario:             z.string(),
    nome_usuario:           z.string(),
    email_usuario:          z.string().email(),
    tipo_usuario:           z.enum(['SUPER_ADMIN', 'ADMIN', 'MASTER', 'STANDARD', 'SUPPLIER']),
    id_organizacao_usuario: z.string(),
    id_workspace_preferido: z.string().nullable(),
  }),
  organizacao: z.object({
    id_organizacao:         z.string(),
    nome_organizacao:       z.string(),
    subdominio_organizacao: z.string(),
    status_organizacao:     z.string(),
  }).nullable(),
  workspaces: z.array(z.object({
    id_workspace:     z.string(),
    nome_workspace:   z.string(),
    status_workspace: z.string(),
    tipo_usuario:     z.enum(['MASTER', 'STANDARD', 'SUPPLIER']),
    produtos:         z.array(z.string()),
  })),
})
export type MeResponse = z.infer<typeof meResponseSchema>
```

O teste funcional importa `meResponseSchema` e valida o response real do supertest:

```typescript
// testes/testes-funcionais/configurador/me-contract.test.ts
import { meResponseSchema } from '../../../servicos-global/configurador/server/routes/me.js'

it('retorna 200 com payload que passa no meResponseSchema', async () => {
  const res = await request(app).get('/api/v1/me')
  expect(res.status).toBe(200)
  const parsed = meResponseSchema.safeParse(res.body)
  expect(parsed.success,
    parsed.success ? '' : JSON.stringify((parsed as { error: unknown }).error)
  ).toBe(true)
})
```

### Anti-Regressão DDD — Verificar que campos legados não existem

Após renomear campos (ex: `user.role` → `usuario.tipo_usuario`), adicionar testes explícitos que garantem que a estrutura antiga **nunca** reaparece:

```typescript
it('usuario.tipo_usuario presente (DDD) e user.role ausente (legado)', async () => {
  const res = await request(app).get('/api/v1/me')
  expect(res.body.usuario.tipo_usuario).toBe('MASTER')   // DDD ✓
  expect(res.body.usuario.role).toBeUndefined()           // legado ✗
  expect(res.body.user).toBeUndefined()                   // estrutura legada ✗
})

it('meResponseSchema rejeita payload com estrutura legada', () => {
  const payloadLegado = { user: { id: 'x', name: 'y', email: 'z@z.com', role: 'MASTER' } }
  expect(meResponseSchema.safeParse(payloadLegado).success).toBe(false)
})
```

---

## Padrão 2 — Schema em arquivo separado (serviços organização)

Para serviços com múltiplos endpoints, usar arquivo `contracts.ts` dedicado:

```typescript
// servicos-global/servicos-plataforma/atividades/server/contracts.ts
import { z } from 'zod'

// Contrato de Request
export const createActivityContract = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']),
  due_date: z.string().datetime().optional(),
  id_usuario: z.string().cuid(),
  id_produto: z.string().optional(),
})

// Contrato de Response
export const activityResponseContract = z.object({
  id: z.string().cuid(),
  id_organizacao: z.string(),
  title: z.string(),
  status: z.string(),
  id_usuario: z.string(),
  id_produto: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Tipos derivados do contrato
export type CreateActivityInput = z.infer<typeof createActivityContract>
export type ActivityResponse = z.infer<typeof activityResponseContract>
```

---

## Teste de Contrato — No Consumer (Produto)

O produto que consome a API valida que o response ainda segue o contrato:

```typescript
// testes/testes-funcionais/bid-frete/contracts.test.ts
import { describe, it, expect } from 'vitest'
import { activityResponseContract } from '@tenant/atividades/server/contracts'

describe('Contract: Atividades API', () => {
  it('GET /api/v1/activities response matches contract', async () => {
    const response = await fetch(`${process.env.ORGANIZACAO_SERVICES_URL}/api/v1/activities`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()

    // Cada item do response deve passar na validação do contrato
    for (const activity of data) {
      const result = activityResponseContract.safeParse(activity)
      expect(result.success).toBe(true)
    }
  })
})
```

---

## Teste de Contrato — No Provider (Serviço)

O serviço valida que seus responses continuam conformes:

```typescript
// testes/testes-unitarios/servicos-tenant/atividades/contract.test.ts
import { describe, it, expect } from 'vitest'
import { activityResponseContract } from './contracts'

describe('Provider Contract: Atividades', () => {
  it('service response conforms to published contract', async () => {
    const mockActivity = {
      id: 'clxxx123',
      id_organizacao: 'org-1',
      title: 'Test',
      status: 'PENDING',
      id_usuario: 'user-1',
      id_produto: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = activityResponseContract.safeParse(mockActivity)
    expect(result.success).toBe(true)
  })
})
```

---

## Breaking Changes — O Que Bloqueia o CI

| Mudança | Breaking? | Ação |
|:---|:---|:---|
| Adicionar campo opcional ao response | Não | CI passa |
| Adicionar campo obrigatório ao response | Sim | CI bloqueia |
| Remover campo do response | Sim | CI bloqueia |
| Mudar tipo de campo | Sim | CI bloqueia |
| Renomear campo | Sim | CI bloqueia |
| Adicionar query param opcional | Não | CI passa |
| Mudar payload de request | Sim | CI bloqueia → versionar |

---

## CI — Validação Automatizada

```yaml
# .github/workflows/contracts.yml
name: Contract Tests
on: pull_request

jobs:
  contract-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:contracts
```

```json
// package.json
{
  "scripts": {
    "test:contracts": "vitest run --config vitest.contracts.config.ts"
  }
}
```

---

## Versionamento de API quando Contrato Muda

Se uma breaking change é necessária:

1. Criar novo contrato: `activityResponseContractV2`
2. Criar novo endpoint: `/api/v2/activities`
3. Manter endpoint antigo por 1 ciclo de release
4. Migrar consumers para v2
5. Deprecar v1 (log warning nos acessos)
6. Remover v1

---

## Arquivo contracts.json Centralizado

O Coordenador mantém o registro de todos os contratos:

```json
{
  "services": {
    "atividades": {
      "baseUrl": "/api/v1/activities",
      "contracts": ["createActivityContract", "activityResponseContract"],
      "version": "v1"
    }
  }
}
```

---

## Payload Sanitization — Frontend antes do fetch

`JSON.stringify` silencia `undefined` sem erro. Se `valor` for `undefined`, a chave desaparece do body e o Zod do backend rejeita com 400 — sem stack trace útil no frontend.

**Regra obrigatória em toda função de edição inline:**

```typescript
// api.ts — padrão canônico (produto/pedido/client/src/shared/api.ts:198)
body: JSON.stringify({ campo, valor: valor === undefined ? null : valor })
```

**Regra para `getValorEditar` em colunas:**

```typescript
// errado — campo pode ser undefined na linha ainda não enriquecida
getValorEditar: (row) => row.campo_x

// certo — sempre com fallback explícito
getValorEditar: (row) => row.campo_x ?? ''
getValorEditar: (row) => row.campo_x ?? 0
getValorEditar: (row) => ({ currency: row.moeda ?? 'USD', amount: row.valor ?? 0 })
```

**Por que acontece:** linhas virtualizadas renderizam antes do enriquecimento (`_p`, joins, etc.) estar completo. O campo existe no tipo mas é `undefined` em runtime naquele instante.

---

## Checklist — Contract Testing

- [ ] Todo endpoint tem schema Zod exportado como contrato?
- [ ] Contratos de request E response definidos?
- [ ] Tipos derivados do contrato (z.infer)?
- [ ] Contract test no consumer (produto) implementado?
- [ ] Contract test no provider (serviço) implementado?
- [ ] CI bloqueia merge se contrato quebrar?
- [ ] Breaking changes versionam a API?
- [ ] Funções de edição inline usam `valor === undefined ? null : valor` antes do fetch?
- [ ] Todo `getValorEditar` tem fallback explícito (`?? ''`, `?? 0`, `?? 'padrão'`)?
