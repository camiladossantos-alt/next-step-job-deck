# Formato JSON do Plano de Teste

> Schema canônico do plano produzido pelo `agente-plano-teste`. Este JSON é a **única fonte de verdade** consumida pelo gerador de specs, pelo `LogTestes` e pelo registry central.

---

## Schema Zod completo

```typescript
import { z } from 'zod'

const EscopoSchema = z.enum([
  'LOGIN', 'CONFIG', 'ADMIN', 'HUB', 'CORE',
  'MARKET', 'TENANT', 'DBASE',
  'PEDIDO', 'NFIMP', 'LPCO', 'BIDFRT', 'BIDCAM',
  'SIMCUS', 'FINCOM', 'PROCSO',
])

const TipoTesteSchema = z.enum(['UNI', 'CON', 'FUN', 'CRO', 'E2E', 'PEN'])

const AmbienteSchema = z.enum(['Local', 'Staging', 'Producao'])

const CriticidadeSchema = z.enum(['baixa', 'media', 'alta', 'critica'])

// ─── Asserção estruturada ────────────────────────────────────────────────────
const AssercaoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('visible'),    testid: z.string() }),
  z.object({ tipo: z.literal('hidden'),     testid: z.string() }),
  z.object({ tipo: z.literal('enabled'),    testid: z.string() }),
  z.object({ tipo: z.literal('disabled'),   testid: z.string() }),
  z.object({ tipo: z.literal('hasText'),    testid: z.string(), texto: z.string() }),
  z.object({ tipo: z.literal('hasValue'),   testid: z.string(), valor: z.string() }),
  z.object({ tipo: z.literal('hasClass'),   testid: z.string(), classe: z.string() }),
  z.object({ tipo: z.literal('count'),      testid: z.string(), count: z.number() }),
  z.object({ tipo: z.literal('urlMatches'), regex: z.string() }),
  z.object({ tipo: z.literal('toastShown'), texto: z.string() }),
  z.object({ tipo: z.literal('apiResponse'), rota: z.string(), status: z.number() }),
  z.object({ tipo: z.literal('dbContains'),  modelo: z.string(), where: z.record(z.unknown()) }),
])

// ─── Interação ───────────────────────────────────────────────────────────────
const InteracaoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('goto'),    rota: z.string() }),
  z.object({ tipo: z.literal('click'),   testid: z.string() }),
  z.object({ tipo: z.literal('fill'),    testid: z.string(), valor: z.string() }),
  z.object({ tipo: z.literal('select'),  testid: z.string(), opcao: z.string() }),
  z.object({ tipo: z.literal('check'),   testid: z.string() }),
  z.object({ tipo: z.literal('uncheck'), testid: z.string() }),
  z.object({ tipo: z.literal('upload'),  testid: z.string(), arquivo: z.string() }),
  z.object({ tipo: z.literal('hover'),   testid: z.string() }),
  z.object({ tipo: z.literal('press'),   tecla: z.string() }),
  z.object({ tipo: z.literal('reload') }),
  z.object({ tipo: z.literal('resize'),  largura: z.number(), altura: z.number() }),
  z.object({ tipo: z.literal('setTipoUsuario'), tipoUsuario: z.string() }),  // troca de usuário (tipo_usuario lido de /api/v1/me — Mandamento 01)
  z.object({ tipo: z.literal('setLocale'), locale: z.enum(['pt','en','es']) }),
  z.object({ tipo: z.literal('verificacao') }),  // só verifica, não interage
])

// ─── Passo ───────────────────────────────────────────────────────────────────
const PassoSchema = z.object({
  numero:       z.number().int().positive(),
  acao:         z.string().min(5).max(200),
  categoria:    z.number().int().min(1).max(20),
  origem:       z.enum(['humano-original', 'agente-adicionado', 'agente-expandido']),
  interacao:    InteracaoSchema,
  assercao:     AssercaoSchema.optional(),
  resultadoEsperado: z.string().min(10).max(300),
  screenshot:   z.string().nullable(),
  tiposAplicaveis: z.array(TipoTesteSchema).min(1),
  preCondicoes:    z.array(z.string()).optional(),
  requerNovoTestid: z.boolean().optional(),
  requerNovoTestidNome: z.string().optional(),
  notas:        z.string().optional(),
})

// ─── Cobertura por categoria ─────────────────────────────────────────────────
const CoberturaCategoriaSchema = z.object({
  categoria: z.number().int().min(1).max(20),
  nome: z.string(),
  status: z.enum(['coberta', 'parcial', 'ausente', 'nao_aplicavel']),
  passosAssociados: z.array(z.number()).optional(),
  justificativa: z.string().optional(),  // obrigatório se nao_aplicavel
})

// ─── Pré-requisitos ──────────────────────────────────────────────────────────
const PreRequisitosSchema = z.object({
  ambiente:       AmbienteSchema,
  organizacao:    z.string(),
  workspace:      z.string(),
  tipoUsuario:    z.enum(['USUARIO', 'ADMIN', 'SUPER_ADMIN', 'MASTER']),  // sempre lido de /api/v1/me (Mandamento 01)
  dadosNecessarios: z.array(z.object({
    descricao: z.string(),
    fixture:   z.string().optional(),
  })).optional(),
  servicosAtivos: z.array(z.string()),  // ex: ['configurador-server', 'servidor-plataforma']
  notas: z.string().optional(),
})

// ─── Mapeamento de testids ───────────────────────────────────────────────────
const ElementoMapeadoSchema = z.object({
  testid: z.string(),
  tipo: z.enum(['input','textarea','select','botao','link','navegacao','feedback','tabela','linha','celula','modal','tab','accordion','outro']),
  descricao: z.string(),
  texto: z.string().optional(),       // texto literal exibido (se aplicável)
  i18nKey: z.string().optional(),     // chave de tradução (se houver)
  label: z.string().optional(),       // label do form
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  mascara: z.string().optional(),
  opcoes: z.array(z.string()).optional(),  // pra select/radio
  posicao: z.string().optional(),     // ex: "header", "footer", "bottom-right"
})

const MapeamentoTestidsSchema = z.object({
  componente: z.string(),  // path do .tsx
  extraidoEm: z.string(),  // ISO timestamp
  elementos: z.record(z.string(), ElementoMapeadoSchema),
  testidsFaltando: z.array(z.string()).optional(),  // elementos que precisam ser adicionados
})

// ─── Plano completo ──────────────────────────────────────────────────────────
export const PlanoTesteSchema = z.object({
  // Identidade
  id:        z.string().regex(/^TST-(UNI|CON|FUN|CRO|E2E|PEN)-(LOGIN|CONFIG|ADMIN|HUB|CORE|MARKET|TENANT|DBASE|PEDIDO|NFIMP|LPCO|BIDFRT|BIDCAM|SIMCUS|FINCOM|PROCSO)-\d{6}$/),
  versao:    z.string(),                      // '1.0', '1.1', '2.0'
  geradoEm:  z.string(),                       // ISO
  geradoPor: z.literal('agente-plano-teste'),
  alteradoPor: z.array(z.string()).optional(), // histórico de edição

  // Localização lógica
  escopo:     EscopoSchema,
  sublocal:   z.string(),
  tela:       z.string(),
  rota:       z.string(),

  // Onde mora no código
  componenteFilePath: z.string(),
  specFilePath:       z.string().optional(),  // só se já foi gerado
  mapeamentoFilePath: z.string(),

  // Execução
  ambientes:    z.array(AmbienteSchema).min(1),
  criticidade:  CriticidadeSchema,
  temDinheiro:  z.boolean().default(false),

  // Resumo
  resumoExecutivo: z.string().min(50).max(800),

  // Pré-requisitos
  preRequisitos: PreRequisitosSchema,

  // Mapeamento de testids
  mapeamentoTestids: MapeamentoTestidsSchema,

  // Cobertura
  cobertura: z.array(CoberturaCategoriaSchema).length(20),  // exatamente 20 categorias
  coberturaPercentual: z.number().min(0).max(100),

  // Passos
  passos: z.array(PassoSchema).min(1),

  // Metadados
  estimativaDuracao: z.string(),               // "~3 min"
  estimativaCustoIA: z.number(),                // dólares
  ultimaExecucao:    z.string().nullable(),    // ISO
  ultimoResultado:   z.enum(['APROVADO','REPROVADO','ERRO','NAO_EXECUTADO']).nullable(),
})

export type PlanoTeste = z.infer<typeof PlanoTesteSchema>
```

---

## Exemplo mínimo (esqueleto)

```json
{
  "id": "TST-E2E-CONFIG-000013",
  "versao": "1.0",
  "geradoEm": "2026-04-15T14:30:00Z",
  "geradoPor": "agente-plano-teste",
  "escopo": "CONFIG",
  "sublocal": "Organização",
  "tela": "Organização",
  "rota": "/configurador/organizacao",
  "componenteFilePath": "servicos-global/configurador/src/pages/Organizacao.tsx",
  "mapeamentoFilePath": "testes/_mapeamentos/configurador/organizacao.testids.json",
  "ambientes": ["Local", "Staging", "Producao"],
  "criticidade": "alta",
  "temDinheiro": false,
  "resumoExecutivo": "Tela de edição da Organização (dados básicos: nome, CNPJ, estado, cidade, segmento, tipo de empresa, Workspace padrão). Risco principal: vazamento de CNPJ entre Organizações. Cobertura: 18/20 categorias. Categorias 6 (Create) e 7 (Delete) marcadas como não-aplicáveis — Organização é única por instalação.",
  "preRequisitos": {
    "ambiente": "Local",
    "organizacao": "Gravity Ltda",
    "workspace": "Importador ABC",
    "tipoUsuario": "ADMIN",
    "servicosAtivos": ["configurador-server-8005", "configurador-front-8000"]
  },
  "mapeamentoTestids": {
    "componente": "servicos-global/configurador/src/pages/Organizacao.tsx",
    "extraidoEm": "2026-04-15T14:30:00Z",
    "elementos": {
      "input-nome-empresa": {
        "testid": "input-nome-empresa",
        "tipo": "input",
        "descricao": "Campo Nome da Empresa",
        "label": "NOME DA EMPRESA",
        "required": true
      },
      "input-cnpj-empresa": {
        "testid": "input-cnpj-empresa",
        "tipo": "input",
        "descricao": "Campo CNPJ",
        "label": "CNPJ",
        "mascara": "00.000.000/0000-00",
        "required": true
      },
      "btn-salvar-organizacao": {
        "testid": "btn-salvar-organizacao",
        "tipo": "botao",
        "descricao": "Botão Salvar",
        "texto": "Salvar",
        "i18nKey": "comum.salvar"
      }
    }
  },
  "cobertura": [
    { "categoria": 1, "nome": "Carregamento da tela", "status": "coberta", "passosAssociados": [1,2,3,4] },
    { "categoria": 2, "nome": "Identidade visual", "status": "coberta", "passosAssociados": [5,6,7,8,9,10,11] },
    { "categoria": 6, "nome": "Create / Criação", "status": "nao_aplicavel", "justificativa": "Organização é única — criação acontece via onboarding (TST-E2E-CONFIG-000010)" }
  ],
  "coberturaPercentual": 90,
  "passos": [
    {
      "numero": 1,
      "acao": "Subir servidor backend porta 8005",
      "categoria": 1,
      "origem": "humano-original",
      "interacao": { "tipo": "verificacao" },
      "assercao": { "tipo": "apiResponse", "rota": "http://localhost:8005/health", "status": 200 },
      "resultadoEsperado": "Servidor backend respondendo em 8005",
      "screenshot": null,
      "tiposAplicaveis": ["E2E"]
    },
    {
      "numero": 16,
      "acao": "Editar Nome da Empresa",
      "categoria": 5,
      "origem": "humano-original",
      "interacao": { "tipo": "fill", "testid": "input-nome-empresa", "valor": "Gravity Teste 1" },
      "assercao": { "tipo": "enabled", "testid": "btn-salvar-organizacao" },
      "resultadoEsperado": "Campo aceita edição, botão Salvar fica ativo",
      "screenshot": "02_nome_empresa_editado",
      "tiposAplicaveis": ["E2E"]
    }
  ],
  "estimativaDuracao": "~4 min",
  "estimativaCustoIA": 0.08,
  "ultimaExecucao": null,
  "ultimoResultado": null
}
```

---

## Como o registry referencia

`testes/test-plans-registry.json` é uma **lista** desses planos. Mas como o objeto é grande, cada plano vive em **arquivo próprio** dentro de `testes/_planos/<escopo>/<sublocal>.json` e o registry só lista os IDs e paths:

```json
[
  {
    "id": "TST-E2E-CONFIG-000013",
    "tipo": "E2E",
    "escopo": "CONFIG",
    "sublocal": "Organização",
    "criticidade": "alta",
    "planoFile": "_planos/configurador/organizacao.json",
    "specFile": "testes-e2e/configurador/organizacao/TST-E2E-CONFIG-000013.spec.ts"
  }
]
```

O backend `/admin/test-plans` lê o registry, e quando o usuário pede detalhes, lê o `planoFile`.

---

## Validação

Todo plano gerado passa por:

1. **Zod** — schema acima
2. **Cobertura** — exatamente 20 categorias, todas presentes
3. **Mapeamento** — todo `testid` referenciado nos passos existe no `mapeamentoTestids.elementos`
4. **Numeração** — passos sequenciais, sem buracos, sem duplicatas
5. **Tipos aplicáveis** — todo passo tem pelo menos 1 tipo
6. **Idempotência** — re-gerar com mesmos inputs produz plano funcionalmente equivalente

Falhar qualquer um → rejeita, agente regenera (até 3x).
