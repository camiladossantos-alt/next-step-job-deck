# Formato JSON do Plano de Teste Unitário

> Schema canônico do plano produzido pelo `agente-plano-teste-unitario`. Este JSON é a **única fonte de verdade** consumida pelo gerador de specs, pelo `LogTestes` e pelo registry central.

---

## Schema Zod completo

```typescript
import { z } from 'zod'

const EscopoUnitSchema = z.enum([
  'CONFIG', 'ADMIN', 'HUB', 'NUCLEO',
  'PEDIDO', 'NFIMP', 'LPCO', 'BIDFRT', 'BIDCAM',
  'SIMCUS', 'FINCOM', 'TENANT', 'INFRA', 'PROCSO',
])

const TipoModuloSchema = z.enum([
  'funcao_pura',
  'schema_zod',
  'hook',
  'componente',
  'servico',
  'rota',
  'middleware',
  'utilitario',
  'factory',
  'guard',
  'cache',
  'webhook',
])

const AmbienteVitestSchema = z.enum(['jsdom', 'node'])

const CriticidadeSchema = z.enum(['baixa', 'media', 'alta', 'critica'])

// ─── Mock declarado no plano ─────────────────────────────────────────────────
const MockDeclaradoSchema = z.object({
  modulo:         z.string(),                 // ex: '@clerk/clerk-react'
  nomeMock:       z.string(),                 // ex: 'mockUseAuth'
  estrategia:     z.enum(['vi.hoisted', 'vi.mock', 'vi.stubGlobal', 'vi.spyOn']),
  descricao:      z.string(),
})

// ─── Asserção unitária ────────────────────────────────────────────────────────
const AssercaoUnitSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('toBe'),          valor: z.unknown() }),
  z.object({ tipo: z.literal('toEqual'),       valor: z.unknown() }),
  z.object({ tipo: z.literal('toBeNull') }),
  z.object({ tipo: z.literal('toBeTruthy') }),
  z.object({ tipo: z.literal('toBeFalsy') }),
  z.object({ tipo: z.literal('toThrow'),       mensagem: z.string().optional() }),
  z.object({ tipo: z.literal('toThrowAppError'), codigo: z.string(), status: z.number() }),
  z.object({ tipo: z.literal('toHaveBeenCalled') }),
  z.object({ tipo: z.literal('toHaveBeenCalledWith'), args: z.array(z.unknown()) }),
  z.object({ tipo: z.literal('notToHaveBeenCalled') }),
  z.object({ tipo: z.literal('toHaveBeenCalledTimes'), vezes: z.number() }),
  z.object({ tipo: z.literal('safeParseSucesso') }),
  z.object({ tipo: z.literal('safeParseErro'),  campo: z.string().optional() }),
  z.object({ tipo: z.literal('httpStatus'),     status: z.number() }),
  z.object({ tipo: z.literal('httpBody'),       campo: z.string(), valor: z.unknown() }),
  z.object({ tipo: z.literal('tipoCorreto'),    tipo: z.string() }),  // TypeScript satisfies
])

// ─── Setup do caso ───────────────────────────────────────────────────────────
const SetupSchema = z.object({
  mockRetornos: z.array(z.object({
    nomeMock:  z.string(),    // ex: 'mockGetToken'
    retorno:   z.unknown(),   // valor que o mock retorna
    metodo:    z.enum(['mockResolvedValue', 'mockRejectedValue', 'mockReturnValue',
                       'mockResolvedValueOnce', 'mockRejectedValueOnce', 'mockReturnValueOnce']),
  })).optional(),
  estadoInicial: z.record(z.string(), z.unknown()).optional(),
  waitForAsync:  z.boolean().default(false),   // true → it() usa waitFor()
})

// ─── Caso de teste ────────────────────────────────────────────────────────────
const CasoTesteSchema = z.object({
  id:               z.string().regex(/^TST-UNIT-[A-Z]+-[A-Z0-9]+-\d{6}$/),
  numero:           z.number().int().positive(),
  descricao:        z.string().min(10).max(200),   // texto do it() — descreve comportamento
  categoria:        z.number().int().min(1).max(12),
  origem:           z.enum(['humano-original', 'agente-adicionado', 'agente-expandido', 'existente']),
  exportacaoTestada: z.string(),                   // nome da export: 'useCarregarTipoUsuario', 'signatureValidator', etc.
  setup:            SetupSchema.optional(),
  acao:             z.string(),                    // o que o it() faz: "renderHook(() => useCarregarTipoUsuario())"
  assercao:         AssercaoUnitSchema,
  resultadoEsperado: z.string().min(10).max(300),  // em pt-BR, humano lê isto
  adversarial:      z.boolean().default(false),    // true se é caso de XSS/SQLi/payload-gigante
  notas:            z.string().optional(),
})

// ─── Cobertura por categoria ─────────────────────────────────────────────────
const CoberturaCategoriaUnitSchema = z.object({
  categoria:         z.number().int().min(1).max(12),
  nome:              z.string(),
  status:            z.enum(['coberta', 'parcial', 'ausente', 'nao_aplicavel']),
  casosAssociados:   z.array(z.number()).optional(),
  justificativa:     z.string().optional(),  // obrigatório se nao_aplicavel
})

// ─── Exportação mapeada ───────────────────────────────────────────────────────
const ExportacaoSchema = z.object({
  nome:             z.string(),                // nome do export
  tipo:             z.enum(['function', 'const', 'class', 'type', 'interface', 'enum', 'default']),
  descricao:        z.string(),
  critica:          z.boolean().default(false),  // true → mínimo 5 casos
  casosMinimos:     z.number().int(),
})

// ─── Plano completo ───────────────────────────────────────────────────────────
export const PlanoTesteUnitarioSchema = z.object({
  // Identidade
  id:        z.string().regex(/^TST-UNIT-[A-Z]+-[A-Z0-9]+-\d{6}$/),
  versao:    z.string(),
  geradoEm:  z.string(),                          // ISO timestamp
  geradoPor: z.literal('agente-plano-teste-unitario'),
  alteradoPor: z.array(z.string()).optional(),

  // Localização
  escopo:          EscopoUnitSchema,
  modulo:          z.string(),
  tipoModulo:      TipoModuloSchema,
  arquivoFilePath: z.string(),
  testFilePath:    z.string().optional(),         // só se .test.ts já existe

  // Execução
  ambiente:        AmbienteVitestSchema,
  criticidade:     CriticidadeSchema,
  coberturaMinima: z.number().min(0).max(100),
  smeRevisadoPor:  z.string().nullable().default(null),
  smeRevisadoEm:   z.string().nullable().default(null),

  // Resumo
  resumoExecutivo: z.string().min(50).max(800),

  // Mocks necessários
  mocksDeclarados: z.array(MockDeclaradoSchema),

  // Exportações extraídas do arquivo fonte
  exportacoes: z.array(ExportacaoSchema).min(1),

  // Cobertura
  categorias: z.array(CoberturaCategoriaUnitSchema).length(12),  // exatamente 12 categorias
  coberturaPercentual: z.number().min(0).max(100),

  // Casos de teste
  casos: z.array(CasoTesteSchema).min(1),

  // Config recomendada
  coverageInclude: z.string(),  // glob path pro coverage.include

  // Metadados
  estimativaDuracao:  z.string(),               // "~1 min"
  estimativaCustoIA:  z.number(),
  ultimaExecucao:     z.string().nullable(),
  ultimoResultado:    z.enum(['APROVADO','REPROVADO','ERRO','NAO_EXECUTADO']).nullable(),
})

export type PlanoTesteUnitario = z.infer<typeof PlanoTesteUnitarioSchema>
```

---

## Exemplo mínimo (esqueleto)

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000001",
  "versao": "1.0",
  "geradoEm": "2026-04-20T10:00:00Z",
  "geradoPor": "agente-plano-teste-unitario",
  "escopo": "CONFIG",
  "modulo": "useCarregarTipoUsuario",
  "tipoModulo": "hook",
  "arquivoFilePath": "servicos-global/configurador/src/hooks/useCarregarTipoUsuario.ts",
  "testFilePath": "testes/testes-unitarios/configurador/useCarregarTipoUsuario.test.ts",
  "ambiente": "jsdom",
  "criticidade": "alta",
  "coberturaMinima": 80,
  "smeRevisadoPor": null,
  "smeRevisadoEm": null,
  "resumoExecutivo": "Hook React que busca o tipo_usuario do usuário logado via GET /api/v1/me (Clerk APENAS para autenticação — Mandamento 01; resposta validada por meResponseSchema.parse — Mandamentos 06, 09). Risco principal: vazamento de tipo_usuario entre usuários por cache incorreto. Módulo crítico de autorização — todos os casos de token nulo, erro de rede e cache são obrigatórios.",
  "mocksDeclarados": [
    {
      "modulo": "@clerk/clerk-react",
      "nomeMock": "mockUseAuth",
      "estrategia": "vi.hoisted",
      "descricao": "Mock do hook useAuth do Clerk (APENAS autenticação — Mandamento 01) — controla isLoaded, isSignedIn, userId, getToken"
    },
    {
      "modulo": "global.fetch",
      "nomeMock": "fetchMock",
      "estrategia": "vi.stubGlobal",
      "descricao": "Mock global de fetch para simular respostas da API /api/v1/me"
    }
  ],
  "exportacoes": [
    {
      "nome": "useCarregarTipoUsuario",
      "tipo": "function",
      "descricao": "Hook React que retorna { role, isGravityAdmin, isReady } — campo `role` carrega o `tipo_usuario` lido do banco via /api/v1/me (Mandamento 01)",
      "critica": true,
      "casosMinimos": 5
    },
    {
      "nome": "limparCacheTipoUsuario",
      "tipo": "function",
      "descricao": "Função que limpa o cache de tipo_usuario por idUsuario (Clerk userId)",
      "critica": false,
      "casosMinimos": 2
    }
  ],
  "categorias": [
    { "categoria": 1, "nome": "Happy path", "status": "coberta", "casosAssociados": [1, 2, 3, 4] },
    { "categoria": 2, "nome": "Sad path — entrada inválida", "status": "coberta", "casosAssociados": [5, 6, 7] },
    { "categoria": 3, "nome": "Edge cases", "status": "coberta", "casosAssociados": [8, 9] },
    { "categoria": 4, "nome": "Inputs adversariais", "status": "nao_aplicavel", "justificativa": "Hook não aceita input de texto livre — role vem do backend, não do usuário" },
    { "categoria": 5, "nome": "Estado assíncrono e loading", "status": "coberta", "casosAssociados": [10, 11, 12] },
    { "categoria": 6, "nome": "Erros de rede / banco", "status": "coberta", "casosAssociados": [13, 14, 15] },
    { "categoria": 7, "nome": "Autenticação e token", "status": "coberta", "casosAssociados": [16, 17, 18] },
    { "categoria": 8, "nome": "Cache — hit, miss e invalidação", "status": "coberta", "casosAssociados": [19, 20, 21] },
    { "categoria": 9, "nome": "Isolamento entre testes", "status": "coberta", "casosAssociados": [1] },
    { "categoria": 10, "nome": "Contratos de tipo", "status": "coberta", "casosAssociados": [22] },
    { "categoria": 11, "nome": "Idempotência", "status": "nao_aplicavel", "justificativa": "Hook de leitura — não há operação de escrita a testar por idempotência" },
    { "categoria": 12, "nome": "Efeitos colaterais indesejados", "status": "coberta", "casosAssociados": [23] }
  ],
  "coberturaPercentual": 83,
  "casos": [
    {
      "id": "TST-UNIT-CONFIG-AUTH-000001",
      "numero": 1,
      "descricao": "retorna tipo_usuario MASTER lido de data.usuario.tipo_usuario via /api/v1/me (Mandamento 01)",
      "categoria": 1,
      "origem": "existente",
      "exportacaoTestada": "useCarregarTipoUsuario",
      "setup": {
        "mockRetornos": [
          { "nomeMock": "mockGetToken", "retorno": "valid-jwt", "metodo": "mockResolvedValue" },
          { "nomeMock": "mockUseAuth", "retorno": { "isLoaded": true, "isSignedIn": true, "userId": "clerk_master" }, "metodo": "mockReturnValue" }
        ],
        "waitForAsync": true
      },
      "acao": "renderHook(() => useCarregarTipoUsuario()) + waitFor(() => result.current.isReady === true)",
      "assercao": { "tipo": "toBe", "valor": "MASTER" },
      "resultadoEsperado": "result.current.role (tipo_usuario) é 'MASTER' e isGravityAdmin é false",
      "adversarial": false
    }
  ],
  "coverageInclude": "servicos-global/configurador/src/**/*.ts",
  "estimativaDuracao": "~45s",
  "estimativaCustoIA": 0.04,
  "ultimaExecucao": null,
  "ultimoResultado": null
}
```

---

## Como o registry referencia

`testes/test-plans-registry.json` lista apenas IDs e paths:

```json
[
  {
    "id": "TST-UNIT-CONFIG-AUTH-000001",
    "tipo": "UNI",
    "escopo": "CONFIG",
    "modulo": "useCarregarTipoUsuario",
    "criticidade": "alta",
    "planoFile": "testes/testes-unitarios/configurador/_planos/useCarregarTipoUsuario.json",
    "testFile": "testes/testes-unitarios/configurador/useCarregarTipoUsuario.test.ts"
  }
]
```

---

## Validação

Todo plano gerado passa por:

1. **Zod** — schema acima
2. **Exportações** — todas as exports do arquivo fonte estão representadas
3. **Categorias** — exatamente 12 categorias, todas presentes
4. **Casos** — cada caso referencia uma exportação que existe em `exportacoes`
5. **IDs** — sequenciais, sem duplicatas, no formato correto
6. **Não-aplicável com justificativa** — toda categoria `nao_aplicavel` tem `justificativa` preenchida
7. **Idempotência** — re-gerar com mesmos inputs produz plano funcionalmente equivalente

Falhar qualquer um → rejeita, agente regenera (até 3x).
