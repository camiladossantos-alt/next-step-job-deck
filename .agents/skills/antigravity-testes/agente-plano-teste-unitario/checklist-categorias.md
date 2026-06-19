# Checklist de Categorias — Testes Unitários

> Toda exportação de módulo do Gravity precisa cobrir as categorias abaixo (ou marcar como não-aplicável com justificativa). O agente `agente-plano-teste-unitario` usa esta lista como base obrigatória.

---

## Tabela Resumo

| # | Categoria | Mínimo de casos por criticidade | Tipos de módulo que se aplicam | Severidade |
|---|---|---|---|---|
| 1 | Happy path (caminho feliz) | baixa:1 / media:2 / alta:3 / crit:5 | Todos | 🔴 |
| 2 | Sad path — entrada inválida | baixa:1 / media:2 / alta:3 / crit:5 | Todos | 🔴 |
| 3 | Edge cases — limites e borda | baixa:1 / media:2 / alta:3 / crit:4 | Todos | 🔴 |
| 4 | Inputs adversariais (XSS, SQLi, payload gigante) | baixa:0 / media:1 / alta:2 / crit:3 | Função pura, Schema, Utilitário, Webhook | 🔴 |
| 5 | Estado assíncrono e loading | baixa:0 / media:2 / alta:3 / crit:5 | Hook, Serviço, Rota | 🔴 |
| 6 | Erros de rede / banco (4xx, 5xx, timeout) | baixa:1 / media:2 / alta:3 / crit:5 | Hook, Serviço, Rota, Webhook | 🔴 |
| 7 | Autenticação e token | baixa:0 / media:1 / alta:3 / crit:5 | Hook, Middleware, Rota | 🔴 |
| 8 | Cache — hit, miss e invalidação | baixa:0 / media:2 / alta:3 / crit:4 | Hook com cache, Cache Module | 🟡 |
| 9 | Isolamento entre testes | baixa:1 / media:1 / alta:2 / crit:3 | Todos | 🔴 |
| 10 | Contratos de tipo (TypeScript) | baixa:1 / media:1 / alta:2 / crit:3 | Todos | 🟡 |
| 11 | Idempotência | baixa:0 / media:1 / alta:2 / crit:3 | Serviço, Webhook, Factory | 🟡 |
| 12 | Efeitos colaterais indesejados | baixa:0 / media:1 / alta:2 / crit:3 | Middleware, Serviço, Hook | 🟡 |

**Severidade:**
- 🔴 = ausência aqui é bloqueio de release
- 🟡 = ausência aqui é agendada
- 🟢 = ausência aqui é polish

**Mínimos por criticidade:** se o módulo é `criticidade: alta`, o agente gera no mínimo o número da coluna "alta" por categoria aplicável. Pode gerar mais se fizer sentido para o domínio.

---

## Detalhamento por Categoria

### 1. Happy path (caminho feliz) 🔴
**O que cobre:** a exportação recebe um input válido e retorna o resultado esperado.

**Casos típicos:**
- Função com input correto → valor de retorno esperado
- Hook com dados normais → estado esperado após `waitFor`
- Schema com payload completo e válido → `safeParse.success = true`
- Serviço com banco respondendo → retorna entidade esperada
- Rota com request válida e auth correta → status 2xx + body esperado

**Regra:** pelo menos 1 caso por variação significativa de input (ex: cada role, cada tipo de enum).

---

### 2. Sad path — entrada inválida 🔴
**O que cobre:** a exportação recebe input inválido e retorna/lança o erro adequado.

**Casos típicos:**
- Schema com campo required ausente → `safeParse.success = false`
- Função com tipo errado → throw ou retorno defensivo
- Serviço com id inexistente no banco → `AppError('NOT_FOUND', 404)`
- Rota com body sem campos required → `400 VALIDATION_ERROR`
- Hook com API 4xx → estado de erro adequado (não crash)

**Regra:** para cada campo required e cada validação de formato, existe ao menos 1 caso sad.

---

### 3. Edge cases — limites e borda 🔴
**O que cobre:** valores nos extremos do domínio — mínimo, máximo, zero, vazio, null.

**Casos típicos:**
- String no exato limite `min(n)`: `n` chars → ok; `n-1` chars → erro
- String no exato limite `max(n)`: `n` chars → ok; `n+1` chars → erro
- Array vazio `[]` → comportamento correto (não crash)
- Número `0` e número negativo
- `null` e `undefined` em campos opcionais
- Lista com 1 elemento vs lista com 10.000 elementos

---

### 4. Inputs adversariais 🔴
**O que cobre:** tentativas de injeção que não devem crashar o sistema nem vazar dados.

**Casos obrigatórios:**
```
1. <script>alert(1)</script>   — XSS
2. ' OR 1=1--                  — SQL injection
3. String de 10.000 caracteres — payload gigante
```

**Resultado esperado:** sistema rejeita (ou aceita como string válida) sem crash, sem stack trace exposto, sem comportamento inesperado downstream.

**Aplicável a:** todo campo de texto em Schema Zod, função pura que aceita string, serviço que recebe string do request.

---

### 5. Estado assíncrono e loading 🔴
**O que cobre:** operações async — estado inicial, estado em progresso, estado final.

**Casos típicos para Hook:**
- `isReady === false` antes da resolução
- `isReady === true` após `waitFor`
- Estado correto quando resolve com sucesso
- Estado correto quando rejeita

**Casos típicos para Serviço/Rota:**
- `async/await` não perde dados
- Promise rejeita → erro propagado corretamente (não silenciado)

**Regra:** toda operação async tem pelo menos 1 caso de sucesso e 1 de falha.

---

### 6. Erros de rede / banco 🔴
**O que cobre:** `fetch` rejeita, banco retorna null, API retorna 4xx/5xx.

**Casos típicos:**
- `fetch` rejeita com `new Error('Network error')` → módulo não quebra
- `fetch` retorna `401` → comportamento adequado (sem loop, sem crash)
- `fetch` retorna `500` → estado de erro adequado
- Banco retorna `null` em `findFirst` → `AppError('NOT_FOUND')`
- Timeout simulado → timeout tratado gracefully

---

### 7. Autenticação e token 🔴
**O que cubre:** token ausente, inválido, expirado.

**Casos típicos:**
- `getToken` retorna `null` → fetch não é chamado
- Token inválido → API retorna `401` → módulo não quebra
- Token expirado no meio de operação longa → redirect ou erro tratado
- Usuário não autenticado (`isSignedIn: false`) → sem chamadas desnecessárias

---

### 8. Cache — hit, miss e invalidação 🟡
**O que cobre:** que o cache funciona como esperado sem estado vazando entre testes.

**Casos típicos:**
- Primeiro acesso (miss) → fetch chamado 1x
- Segundo acesso com mesmo input (hit) → fetch NÃO chamado novamente
- Após `invalidateCache()` → fetch chamado novamente no próximo acesso
- Cache da Organização A não contamina Organização B
- Cache prefixado com `organização:<idOrganizacao>:` (ou justificativa documentada)

---

### 9. Isolamento entre testes 🔴
**O que cobre:** que `vi.clearAllMocks()` garante independência entre it().

**Casos típicos:**
- Mock chamado no caso anterior não conta no próximo
- Estado de módulo com cache é resetado no `beforeEach`
- Variável global modificada é restaurada no `afterEach`

**Regra:** todo describe que usa mocks tem `beforeEach(() => vi.clearAllMocks())`.

---

### 10. Contratos de tipo (TypeScript) 🟡
**O que cobre:** que as exportações respeitam os tipos declarados.

**Casos típicos:**
- Função exportada recebe tipo correto → TypeScript compila sem erro
- Objeto retornado satisfaz a interface declarada
- `z.infer<typeof Schema>` produz o tipo esperado

**Regra:** verificado em compile time pelo `tsc --noEmit` — o plano deve incluir checagem de tipos como passo de CI se ainda não existe.

---

### 11. Idempotência 🟡
**O que cobre:** que chamar a mesma operação 2x não produz efeito duplicado.

**Casos típicos:**
- Criar entidade → criar mesmo entidade novamente → sem duplicata (upsert ou conflito tratado)
- Processar mesmo webhook 2x → apenas 1 efeito
- Executar migration 2x → segunda execução não corrompe dados

---

### 12. Efeitos colaterais indesejados 🟡
**O que cobre:** que a exportação não produz efeitos além do esperado.

**Casos típicos:**
- Middleware só chama `next()` OU retorna `res.status()` — nunca os dois
- Serviço que salva um registro não salva em tabela não relacionada
- Hook que chama fetch não chama fetch múltiplas vezes desnecessariamente (N+1 de hooks)

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
- Se tipoModulo = "hook", força categorias 5, 6, 7 com mínimo "media"
- Se tipoModulo = "webhook", força categorias 4, 11 com mínimo "alta"
- Se tipoModulo = "schema", força categoria 4 com mínimo "alta"
- Se o módulo lida com autenticação ou permissão → força criticidade mínima "alta"
- Se o módulo lida com dinheiro (billing, faturamento) → força criticidade mínima "critica"
```

---

## Como marcar uma categoria como `nao_aplicavel`

```json
{
  "categoria": 8,
  "nome": "Cache — hit, miss e invalidação",
  "status": "nao_aplicavel",
  "justificativa": "Função pura sem estado interno — não há cache a testar. Caching da chamada é responsabilidade do módulo consumidor.",
  "casos": []
}
```

A justificativa é **obrigatória**. Sem ela, o validador rejeita e força regeneração.
