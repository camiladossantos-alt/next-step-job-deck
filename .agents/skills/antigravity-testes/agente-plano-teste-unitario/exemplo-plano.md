# Exemplo Completo — Plano de useCarregarTipoUsuario

> Demonstração de como o agente `agente-plano-teste-unitario` produz um plano para um hook real do projeto.
> **Módulo:** `servicos-global/configurador/src/hooks/useCarregarTipoUsuario.ts`
> **Teste existente:** `testes/testes-unitarios/configurador/useCarregarTipoUsuario.test.ts`

---

## Inputs ao agente

```json
{
  "escopo": "CONFIG",
  "modulo": "useCarregarTipoUsuario",
  "tipoModulo": "hook",
  "arquivoFilePath": "servicos-global/configurador/src/hooks/useCarregarTipoUsuario.ts",
  "criticidade": "alta",
  "coberturaMinima": 80,
  "planoExistente": null
}
```

---

## Exportações extraídas pelo agente

O agente lê o arquivo e identifica:

| Export | Tipo | Crítica | Casos mínimos |
|---|---|---|---|
| `useCarregarTipoUsuario` | function (hook) | ✅ sim | 5 |
| `limparCacheTipoUsuario` | function | ❌ não | 2 |
| `TipoUsuario` | type | ❌ não | 0 (type — sem casos de runtime) |

Total: 2 exportações testáveis → mínimo 7 casos. Plano final: 23 casos.

---

## Mocks necessários

O agente detecta as dependências externas e declara os mocks:

```json
[
  {
    "modulo": "@clerk/clerk-react",
    "nomeMock": "mockUseAuth + mockGetToken",
    "estrategia": "vi.hoisted",
    "descricao": "Clerk (APENAS autenticação — Mandamento 01) — controla isLoaded, isSignedIn, userId, getToken"
  },
  {
    "modulo": "global.fetch",
    "nomeMock": "fetchMock",
    "estrategia": "vi.stubGlobal",
    "descricao": "Simula respostas do GET /api/v1/me"
  }
]
```

**Setup obrigatório em todo describe:**
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  limparCacheTipoUsuario()           // limpa cache do hook
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})
```

---

## Cobertura por categoria

| # | Categoria | Status | Casos |
|---|---|---|---|
| 1 | Happy path | ✅ coberta | 4 |
| 2 | Sad path — entrada inválida | ✅ coberta | 3 |
| 3 | Edge cases | ✅ coberta | 2 |
| 4 | Inputs adversariais | 🚫 não aplicável | — |
| 5 | Estado assíncrono | ✅ coberta | 3 |
| 6 | Erros de rede / banco | ✅ coberta | 3 |
| 7 | Autenticação e token | ✅ coberta | 4 |
| 8 | Cache | ✅ coberta | 3 |
| 9 | Isolamento entre testes | ✅ coberta | 1 |
| 10 | Contratos de tipo | ✅ coberta | 1 |
| 11 | Idempotência | 🚫 não aplicável | — |
| 12 | Efeitos colaterais | ✅ coberta | 1 |

**Cobertura:** 10/12 categorias (83% — 2 não-aplicáveis com justificativa).

---

## Resumo executivo gerado pelo agente

> **Hook React de autorização** que busca o `tipo_usuario` do usuário logado via `GET /api/v1/me` usando o token Clerk (Clerk APENAS para autenticação — Mandamento 01). Retorna `{ role, isGravityAdmin, isReady }` (campo `role` = `tipo_usuario` lido do banco; nome legado mantido na API do hook). **Risco principal:** `tipo_usuario` vazando entre usuários por cache sem invalidação correta — por isso há 3 casos dedicados de cache. **Dependências externas:** `@clerk/clerk-react` (useAuth + getToken) e `global.fetch` — ambas mockadas via `vi.hoisted()`. **Módulo crítico de autorização** — ausência de testes aqui bloqueia todo fluxo de permissão da plataforma. Toda resposta do `/api/v1/me` deve passar por `meResponseSchema.parse()` (Mandamentos 06, 09). **Cobertura alvo: 80%** (nucleo-adjacent). Ambiente: `jsdom` (hook React).

---

## Casos de teste — completo

### Describe 1 — extração de tipo_usuario via data.usuario.tipo_usuario (DDD — Mandamento 03)

```json
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
      { "nomeMock": "mockUseAuth", "retorno": { "isLoaded": true, "isSignedIn": true, "userId": "clerk_master", "getToken": "mockGetToken" }, "metodo": "mockReturnValue" },
      { "nomeMock": "fetch", "retorno": "Response({ usuario: { tipo_usuario: 'MASTER' } }, 200)", "metodo": "mockResolvedValue" }
    ],
    "waitForAsync": true
  },
  "acao": "renderHook(() => useCarregarTipoUsuario()) + waitFor(() => result.current.isReady)",
  "assercao": { "tipo": "toBe", "valor": "MASTER" },
  "resultadoEsperado": "result.current.role = 'MASTER', isGravityAdmin = false",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000002",
  "numero": 2,
  "descricao": "retorna tipo_usuario SUPER_ADMIN e isGravityAdmin=true",
  "categoria": 1,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "assercao": { "tipo": "toBe", "valor": "SUPER_ADMIN" },
  "resultadoEsperado": "result.current.role = 'SUPER_ADMIN', isGravityAdmin = true",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000003",
  "numero": 3,
  "descricao": "retorna tipo_usuario ADMIN e isGravityAdmin=true",
  "categoria": 1,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "assercao": { "tipo": "toBe", "valor": "ADMIN" },
  "resultadoEsperado": "result.current.role = 'ADMIN', isGravityAdmin = true",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000004",
  "numero": 4,
  "descricao": "NÃO lê data.user.role (estrutura legada) — tipo_usuario deve ser null e meResponseSchema.parse falha alto (Mandamentos 06, 08)",
  "categoria": 2,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "setup": {
    "mockRetornos": [
      { "nomeMock": "fetch", "retorno": "Response({ user: { id: 'x', role: 'SUPER_ADMIN' } }, 200)", "metodo": "mockResolvedValue" }
    ],
    "waitForAsync": true
  },
  "assercao": { "tipo": "toBeNull" },
  "resultadoEsperado": "Payload na estrutura antiga (data.user.role) não é lido — role = null",
  "notas": "Testa que o hook não tem compatibilidade retroativa com estrutura legada — mudança proposital",
  "adversarial": false
}
```

### Describe 2 — cenários de erro e edge cases

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000005",
  "numero": 5,
  "descricao": "role é null quando getToken retorna null",
  "categoria": 7,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "setup": {
    "mockRetornos": [
      { "nomeMock": "mockGetToken", "retorno": null, "metodo": "mockResolvedValue" }
    ],
    "waitForAsync": true
  },
  "assercao": { "tipo": "toBeNull" },
  "resultadoEsperado": "role = null; fetch NÃO é chamado (sem token, sem request)",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000006",
  "numero": 6,
  "descricao": "role é null e isReady=true quando /me retorna 4xx",
  "categoria": 6,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "setup": {
    "mockRetornos": [
      { "nomeMock": "fetch", "retorno": "Response('Unauthorized', 401)", "metodo": "mockResolvedValue" }
    ],
    "waitForAsync": true
  },
  "assercao": { "tipo": "toBeNull" },
  "resultadoEsperado": "role = null, isReady = true — hook não quebra em 401",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000007",
  "numero": 7,
  "descricao": "role é null e isReady=true em exceção de rede",
  "categoria": 6,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "setup": {
    "mockRetornos": [
      { "nomeMock": "fetch", "retorno": "new Error('Network error')", "metodo": "mockRejectedValue" }
    ],
    "waitForAsync": true
  },
  "assercao": { "tipo": "toBeNull" },
  "resultadoEsperado": "role = null, isReady = true — hook não propaga exceção de rede",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000008",
  "numero": 8,
  "descricao": "não executa fetch quando usuário não está autenticado (isSignedIn=false)",
  "categoria": 7,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "setup": {
    "mockRetornos": [
      { "nomeMock": "mockUseAuth", "retorno": { "isLoaded": true, "isSignedIn": false, "userId": null }, "metodo": "mockReturnValue" }
    ],
    "waitForAsync": false
  },
  "assercao": { "tipo": "notToHaveBeenCalled" },
  "resultadoEsperado": "fetch não é chamado nenhuma vez; role = null",
  "adversarial": false
}
```

### Describe 3 — cache por userId

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000009",
  "numero": 9,
  "descricao": "cache hit: fetch não é chamado novamente para o mesmo userId",
  "categoria": 8,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "acao": "renderHook + rerender com mesmo userId → verificar fetch.mock.calls.length",
  "assercao": { "tipo": "toHaveBeenCalledTimes", "vezes": 1 },
  "resultadoEsperado": "Segundo render não chama fetch — resultado vem do cache",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000010",
  "numero": 10,
  "descricao": "limparCacheTipoUsuario limpa o cache e permite novo fetch",
  "categoria": 8,
  "origem": "existente",
  "exportacaoTestada": "limparCacheTipoUsuario",
  "acao": "renderHook → waitFor → limparCacheTipoUsuario() → novo renderHook → waitFor",
  "assercao": { "tipo": "toHaveBeenCalledTimes", "vezes": 2 },
  "resultadoEsperado": "Após invalidação, o segundo mount busca novamente (2 calls ao fetch)",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000011",
  "numero": 11,
  "descricao": "cache diferencia usuários — userId A e userId B têm caches independentes",
  "categoria": 8,
  "origem": "agente-adicionado",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "acao": "renderHook com userId A → renderHook com userId B → verificar 2 chamadas ao fetch",
  "assercao": { "tipo": "toHaveBeenCalledTimes", "vezes": 2 },
  "resultadoEsperado": "Cache não vaza entre usuários distintos — cada userId tem seu próprio cache",
  "adversarial": false,
  "notas": "Este caso previne o bug de role de um usuário aparecer para outro em sistemas sem isolamento de cache"
}
```

### Describe 4 — isGravityAdmin (parametrizado)

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000012",
  "numero": 12,
  "descricao": "it.each — todos os roles testados individualmente para isGravityAdmin",
  "categoria": 1,
  "origem": "existente",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "acao": "it.each([['SUPER_ADMIN', true], ['ADMIN', true], ['MASTER', false], ['STANDARD', false], ['SUPPLIER', false], [null, false]])",
  "assercao": { "tipo": "toBe", "valor": "expected por parâmetro" },
  "resultadoEsperado": "isGravityAdmin = true apenas para SUPER_ADMIN e ADMIN; false para todos os demais e null",
  "adversarial": false,
  "notas": "Parametrizado com it.each — 6 sub-casos por 1 declaração"
}
```

### Casos adicionados pelo agente — Tipos adicionais

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000013",
  "numero": 13,
  "descricao": "isReady começa false antes da resolução async",
  "categoria": 5,
  "origem": "agente-adicionado",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "acao": "renderHook, checar result.current.isReady IMEDIATAMENTE (sem waitFor)",
  "assercao": { "tipo": "toBe", "valor": false },
  "resultadoEsperado": "isReady = false no estado inicial — nunca true antes do fetch resolver",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000014",
  "numero": 14,
  "descricao": "role não vaza para outro componente após desmontagem",
  "categoria": 12,
  "origem": "agente-adicionado",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "acao": "renderHook → unmount() antes de fetch resolver → verificar sem setState erro",
  "assercao": { "tipo": "toBeNull" },
  "resultadoEsperado": "Sem warning 'setState on unmounted component' — sem memory leak",
  "adversarial": false
}
```

```json
{
  "id": "TST-UNIT-CONFIG-AUTH-000015",
  "numero": 15,
  "descricao": "retorno de tipo satisfaz TipoUsuario (null | 'MASTER' | 'STANDARD' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPPLIER')",
  "categoria": 10,
  "origem": "agente-adicionado",
  "exportacaoTestada": "useCarregarTipoUsuario",
  "acao": "verificar em compile time via TypeScript satisfies",
  "assercao": { "tipo": "tipoCorreto", "tipo": "TipoUsuario" },
  "resultadoEsperado": "tsc --noEmit compila sem erro — tipo de retorno está correto",
  "adversarial": false,
  "notas": "Verificado por CI com tsc --noEmit, não por Vitest em runtime"
}
```

---

## Matriz de cobertura final

```json
"categorias": [
  { "categoria": 1, "nome": "Happy path", "status": "coberta", "casosAssociados": [1,2,3,12] },
  { "categoria": 2, "nome": "Sad path — entrada inválida", "status": "coberta", "casosAssociados": [4] },
  { "categoria": 3, "nome": "Edge cases — limites e borda", "status": "coberta", "casosAssociados": [8] },
  { "categoria": 4, "nome": "Inputs adversariais", "status": "nao_aplicavel", "justificativa": "Hook não recebe input de texto do usuário — role vem do backend autenticado, não de input externo" },
  { "categoria": 5, "nome": "Estado assíncrono e loading", "status": "coberta", "casosAssociados": [13] },
  { "categoria": 6, "nome": "Erros de rede / banco", "status": "coberta", "casosAssociados": [6,7] },
  { "categoria": 7, "nome": "Autenticação e token", "status": "coberta", "casosAssociados": [5,8] },
  { "categoria": 8, "nome": "Cache — hit, miss e invalidação", "status": "coberta", "casosAssociados": [9,10,11] },
  { "categoria": 9, "nome": "Isolamento entre testes", "status": "coberta", "casosAssociados": [1], "notas": "vi.clearAllMocks() + limparCacheTipoUsuario() em beforeEach garante isolamento" },
  { "categoria": 10, "nome": "Contratos de tipo", "status": "coberta", "casosAssociados": [15] },
  { "categoria": 11, "nome": "Idempotência", "status": "nao_aplicavel", "justificativa": "Hook de leitura pura — sem operação de escrita ou criação de estado persistente" },
  { "categoria": 12, "nome": "Efeitos colaterais indesejados", "status": "coberta", "casosAssociados": [14] }
],
"coberturaPercentual": 83
```

83% — 10 categorias cobertas, 2 não-aplicáveis com justificativa.

---

## Config de coverage recomendada

```typescript
// testes/testes-unitarios/configurador/vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',  // default — hooks declaram jsdom individualmente
    coverage: {
      provider: 'v8',
      include: ['servicos-global/configurador/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/node_modules/**'],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
})
```

---

## O que esse exemplo prova

1. **Casos existentes são preservados** — os 12 `it()` do arquivo real recebem `origem: 'existente'` e ficam no plano intactos.
2. **Agente agrega** — adiciona casos que faltavam (desmontagem, isReady inicial, isolamento de cache entre usuários distintos).
3. **Não-aplicáveis têm justificativa** — categorias 4 e 11 são legítimas para este hook específico, com razão clara.
4. **Cache é categoria crítica** — 3 casos dedicados porque vazamento de cache entre usuários quebraria toda autenticação.
5. **Comportamento descrito em pt-BR** — `resultadoEsperado` é lido por humano, `assercao` é executada por máquina.
6. **Setup declarativo** — o gerador de specs lê `mockRetornos` e monta o `beforeEach` automaticamente sem ambiguidade.
