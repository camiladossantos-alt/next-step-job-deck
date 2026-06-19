# Formato JSON do Plano de Teste Funcional

> Schema canônico do plano produzido pelo `agente-plano-teste-funcional`. Este JSON é a **única fonte de verdade** consumida pelo gerador de specs, pelo `LogTestes` e pelo registry central.

---

## Schema Zod completo

```typescript
import { z } from 'zod'

const EscopoFuncSchema = z.enum([
  'CONFIG', 'ADMIN', 'HUB', 'NUCLEO',
  'PEDIDO', 'NFIMP', 'LPCO', 'BIDFRT', 'BIDCAM',
  'SIMCUS', 'FINCOM', 'TENANT', 'INFRA', 'PROCSO',
])

const TipoModuloFuncSchema = z.enum([
  'rota_crud',
  'contrato_api',
  'middleware_auth',
  'isolamento_cross_tenant',
  'webhook_assinatura',
  'fluxo_negocio',
  'cross_service',
  'script_cli',
])

const CriticidadeSchema = z.enum(['baixa', 'media', 'alta', 'critica'])

const MetodoHttpSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

// ─── Endpoint extraído do arquivo de rota ────────────────────────────────────
const EndpointSchema = z.object({
  metodo:      MetodoHttpSchema,
  path:        z.string(),                         // ex: '/api/v1/assinaturas/subscribe'
  descricao:   z.string(),
  temBody:     z.boolean(),
  temAuth:     z.boolean(),
  temRbac:     z.boolean().default(false),
  temDados:    z.boolean().default(false),          // retorna/persiste dados da Organização
  critico:     z.boolean().default(false),          // true → mínimo 10 casos
  schemaBody:  z.string().optional(),               // nome do schema Zod de input
  schemaResponse: z.string().optional(),            // nome do schema Zod de response
})

// ─── Mock declarado no plano ─────────────────────────────────────────────────
const MockFuncionalSchema = z.object({
  modulo:      z.string(),                         // ex: '../../lib/prisma.js'
  nomeMock:    z.string(),                         // ex: 'mockConfigUpsert'
  alvo:        z.string(),                         // ex: 'prisma.configuracaoProduto.upsert'
  estrategia:  z.enum(['vi.hoisted', 'vi.stubGlobal', 'setupFile']),
  descricao:   z.string(),
})

// ─── Config do app de teste ───────────────────────────────────────────────────
const BuildTestAppSchema = z.object({
  ordem: z.array(z.object({
    tipo:   z.enum(['json', 'rawBuffer', 'mockAuth', 'router', 'errorHandler', 'custom']),
    path:   z.string().optional(),   // para router: path de mount
    modulo: z.string().optional(),   // para mockAuth/router/errorHandler: import path
    nota:   z.string().optional(),
  })),
  setupFile: z.string().optional(),  // path do setupFiles global se existir
})

// ─── Request do caso ─────────────────────────────────────────────────────────
// authInjetada usa nomenclatura DDD (Mandamento 03). tipoUsuario é lido do banco
// via /api/v1/me — nunca do publicMetadata do Clerk (Mandamento 01).
const RequestFuncSchema = z.object({
  metodo:    MetodoHttpSchema,
  path:      z.string(),
  headers:   z.record(z.string(), z.string()).optional(),
  body:      z.record(z.string(), z.unknown()).optional(),
  authInjetada: z.object({
    idUsuario:     z.string(),
    idOrganizacao: z.string(),
    clerkUserId:   z.string(),
    tipoUsuario:   z.string(),
  }).optional(),
})

// ─── Asserção funcional ───────────────────────────────────────────────────────
const AssercaoFuncSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('status'),          valor: z.number() }),
  z.object({ tipo: z.literal('bodyField'),       campo: z.string(), valor: z.unknown() }),
  z.object({ tipo: z.literal('bodyUndefined'),   campo: z.string() }),
  z.object({ tipo: z.literal('errorCode'),       codigo: z.string() }),
  z.object({ tipo: z.literal('errorDetails'),    campo: z.string() }),
  z.object({ tipo: z.literal('noStackTrace') }),
  z.object({ tipo: z.literal('zodParse'),        schema: z.string() }),        // schema.safeParse(res.body)
  z.object({ tipo: z.literal('mockCalled'),      nomeMock: z.string() }),
  z.object({ tipo: z.literal('mockNotCalled'),   nomeMock: z.string() }),
  z.object({ tipo: z.literal('mockCalledWith'),  nomeMock: z.string(), args: z.record(z.string(), z.unknown()) }),
  z.object({ tipo: z.literal('mockCalledTimes'), nomeMock: z.string(), vezes: z.number() }),
  z.object({ tipo: z.literal('whereClause'),     nomeMock: z.string(), campo: z.string(), valor: z.unknown() }),
  z.object({ tipo: z.literal('headerSent'),      header: z.string(), valor: z.string().optional() }),
  z.object({ tipo: z.literal('urlContains'),     nomeMock: z.string(), substring: z.string() }),
])

// ─── Setup de mock para o caso ───────────────────────────────────────────────
const MockRetornoSchema = z.object({
  nomeMock:  z.string(),
  retorno:   z.unknown(),
  metodo:    z.enum([
    'mockResolvedValue', 'mockRejectedValue', 'mockReturnValue',
    'mockResolvedValueOnce', 'mockRejectedValueOnce', 'mockReturnValueOnce',
  ]),
})

// ─── Caso de teste funcional ─────────────────────────────────────────────────
const CasoFuncionalSchema = z.object({
  id:               z.string().regex(/^TST-FUN-[A-Z]+-[A-Z0-9]+-\d{6}$/),
  numero:           z.number().int().positive(),
  descricao:        z.string().min(10).max(200),
  categoria:        z.number().int().min(1).max(15),
  origem:           z.enum(['humano-original', 'agente-adicionado', 'agente-expandido', 'existente']),
  endpointTestado:  z.string(),                  // ex: 'POST /api/v1/assinaturas/subscribe'
  mockRetornos:     z.array(MockRetornoSchema).optional(),
  request:          RequestFuncSchema,
  assercoes:        z.array(AssercaoFuncSchema).min(1),
  resultadoEsperado: z.string().min(10).max(300),
  adversarial:      z.boolean().default(false),
  notas:            z.string().optional(),
})

// ─── Cobertura por categoria ─────────────────────────────────────────────────
const CoberturaCategoriaFuncSchema = z.object({
  categoria:         z.number().int().min(1).max(15),
  nome:              z.string(),
  status:            z.enum(['coberta', 'parcial', 'ausente', 'nao_aplicavel']),
  casosAssociados:   z.array(z.number()).optional(),
  justificativa:     z.string().optional(),       // obrigatório se nao_aplicavel
})

// ─── Plano completo ───────────────────────────────────────────────────────────
export const PlanoTesteFuncionalSchema = z.object({
  // Identidade
  id:        z.string().regex(/^TST-FUN-[A-Z]+-[A-Z0-9]+-\d{6}$/),
  versao:    z.string(),
  geradoEm:  z.string(),
  geradoPor: z.literal('agente-plano-teste-funcional'),
  alteradoPor: z.array(z.string()).optional(),

  // Localização
  escopo:          EscopoFuncSchema,
  modulo:          z.string(),
  tipoModulo:      TipoModuloFuncSchema,
  arquivoFilePath: z.string(),
  testFilePath:    z.string().optional(),

  // Execução
  criticidade:    CriticidadeSchema,
  temDinheiro:    z.boolean().default(false),
  smeRevisadoPor: z.string().nullable().default(null),
  smeRevisadoEm:  z.string().nullable().default(null),

  // Resumo
  resumoExecutivo: z.string().min(50).max(800),

  // App de teste
  buildTestApp: BuildTestAppSchema,

  // Mocks necessários
  mocksDeclarados: z.array(MockFuncionalSchema),

  // Endpoints extraídos
  endpoints: z.array(EndpointSchema).min(1),

  // Cobertura
  categorias:          z.array(CoberturaCategoriaFuncSchema).length(15),
  coberturaPercentual: z.number().min(0).max(100),

  // Casos de teste
  casos: z.array(CasoFuncionalSchema).min(1),

  // Metadados
  estimativaDuracao:  z.string(),
  estimativaCustoIA:  z.number(),
  ultimaExecucao:     z.string().nullable(),
  ultimoResultado:    z.enum(['APROVADO','REPROVADO','ERRO','NAO_EXECUTADO']).nullable(),
})

export type PlanoTesteFuncional = z.infer<typeof PlanoTesteFuncionalSchema>
```

---

## Exemplo mínimo (esqueleto)

```json
{
  "id": "TST-FUN-CONFIG-ASSIN-000001",
  "versao": "1.0",
  "geradoEm": "2026-04-20T10:00:00Z",
  "geradoPor": "agente-plano-teste-funcional",
  "escopo": "CONFIG",
  "modulo": "assinaturas-subscribe",
  "tipoModulo": "rota_crud",
  "arquivoFilePath": "servicos-global/configurador/server/routes/assinaturas.ts",
  "testFilePath": "testes/testes-funcionais/configurador/assinaturas/subscribe.test.ts",
  "criticidade": "alta",
  "temDinheiro": false,
  "smeRevisadoPor": null,
  "smeRevisadoEm": null,
  "resumoExecutivo": "Rota POST /api/v1/assinaturas/subscribe que cria ou atualiza config de produto para a Organização autenticada. Risco principal: id da Organização injetado de req.auth.idOrganizacao (gravado no campo Prisma DDD `id_organizacao`), nunca do body — caso de Isolamento de Organização crítico.",
  "buildTestApp": {
    "ordem": [
      { "tipo": "json" },
      { "tipo": "mockAuth", "modulo": "../../middleware/requireAuth.js" },
      { "tipo": "router", "path": "/api/v1/assinaturas", "modulo": "../../routes/assinaturas.js" },
      { "tipo": "errorHandler", "modulo": "../../middleware/errorHandler.js" }
    ]
  },
  "mocksDeclarados": [
    {
      "modulo": "../../lib/prisma.js",
      "nomeMock": "mockProdutoFindFirst",
      "alvo": "prisma.produtoGravity.findFirst",
      "estrategia": "vi.hoisted",
      "descricao": "Lookup de produto no catálogo"
    },
    {
      "modulo": "../../lib/prisma.js",
      "nomeMock": "mockConfigUpsert",
      "alvo": "prisma.configuracaoProduto.upsert",
      "estrategia": "vi.hoisted",
      "descricao": "Upsert da config do produto para a Organização"
    }
  ],
  "endpoints": [
    {
      "metodo": "POST",
      "path": "/api/v1/assinaturas/subscribe",
      "descricao": "Contrata produto para a Organização autenticada",
      "temBody": true,
      "temAuth": true,
      "temRbac": false,
      "temDados": true,
      "critico": true,
      "schemaBody": "subscribeSchema",
      "schemaResponse": "subscribeResponseSchema"
    }
  ],
  "categorias": [
    { "categoria": 1, "nome": "Happy path (2xx)", "status": "coberta", "casosAssociados": [1] },
    { "categoria": 2, "nome": "Validação de body (400)", "status": "coberta", "casosAssociados": [2, 3, 4] },
    { "categoria": 3, "nome": "Autenticação ausente/inválida (401)", "status": "coberta", "casosAssociados": [5] },
    { "categoria": 4, "nome": "Autorização insuficiente (403)", "status": "nao_aplicavel", "justificativa": "Rota não tem RBAC — qualquer tipo_usuario autenticado pode contratar produto" },
    { "categoria": 5, "nome": "Recurso não encontrado (404)", "status": "coberta", "casosAssociados": [6] },
    { "categoria": 6, "nome": "Erro de servidor (500)", "status": "coberta", "casosAssociados": [7] },
    { "categoria": 7, "nome": "Formato de erro canônico", "status": "coberta", "casosAssociados": [2, 3, 5, 6, 7] },
    { "categoria": 8, "nome": "Contrato de response (shape Zod)", "status": "coberta", "casosAssociados": [1] },
    { "categoria": 9, "nome": "Isolamento de Organização (WHERE)", "status": "coberta", "casosAssociados": [8] },
    { "categoria": 10, "nome": "Inputs adversariais", "status": "coberta", "casosAssociados": [9] },
    { "categoria": 11, "nome": "Idempotência", "status": "coberta", "casosAssociados": [10] },
    { "categoria": 12, "nome": "Chamada cross-service", "status": "nao_aplicavel", "justificativa": "Rota não chama outros serviços internos" },
    { "categoria": 13, "nome": "Assinatura de webhook", "status": "nao_aplicavel", "justificativa": "Não é rota de webhook" },
    { "categoria": 14, "nome": "Cache de auth", "status": "nao_aplicavel", "justificativa": "Auth bypassado neste módulo — cache testado no plano do requireAuth" },
    { "categoria": 15, "nome": "Isolamento de efeitos colaterais", "status": "coberta", "casosAssociados": [1] }
  ],
  "coberturaPercentual": 73,
  "casos": [
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
        "body": { "product_key": "pedido" },
        "authInjetada": { "idUsuario": "usr_func_01", "idOrganizacao": "org_func_01", "clerkUserId": "clerk_01", "tipoUsuario": "MASTER" }
      },
      "assercoes": [
        { "tipo": "status", "valor": 201 },
        { "tipo": "bodyField", "campo": "config.product_key", "valor": "pedido" },
        { "tipo": "mockCalledWith", "nomeMock": "mockConfigUpsert", "args": { "where.id_organizacao_product_key.id_organizacao": "org_func_01" } }
      ],
      "resultadoEsperado": "201 com config e catalog; upsert chamado com campo Prisma DDD id_organizacao = org_func_01 (de req.auth.idOrganizacao)",
      "adversarial": false
    }
  ],
  "estimativaDuracao": "~30s",
  "estimativaCustoIA": 0.06,
  "ultimaExecucao": null,
  "ultimoResultado": null
}
```

---

## Como o registry referencia

```json
[
  {
    "id": "TST-FUN-CONFIG-ASSIN-000001",
    "tipo": "FUN",
    "escopo": "CONFIG",
    "modulo": "assinaturas-subscribe",
    "criticidade": "alta",
    "planoFile": "testes/testes-funcionais/configurador/_planos/assinaturas-subscribe.json",
    "testFile": "testes/testes-funcionais/configurador/assinaturas/subscribe.test.ts"
  }
]
```

---

## Validação

Todo plano gerado passa por:

1. **Zod** — schema acima
2. **Endpoints** — todos os endpoints do arquivo de rota estão representados
3. **Categorias** — exatamente 15 categorias, todas presentes
4. **Casos** — cada caso referencia um endpoint que existe em `endpoints`
5. **IDs** — sequenciais, sem duplicatas, no formato correto
6. **Não-aplicável com justificativa** — toda categoria `nao_aplicavel` tem `justificativa` preenchida
7. **buildTestApp** — ordem dos middlewares declarada e válida
8. **mocksDeclarados** — todo mock usado em algum caso está na lista de mocks declarados

Falhar qualquer um → rejeita, agente regenera (até 3x).
