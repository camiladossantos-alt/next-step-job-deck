---
name: antigravity-multi-agente-plano-teste
description: "Skill mestra do pipeline multi-agente de planos de teste do Gravity. Define os 8 agentes especializados (Analisador de Codigo, Analisador de Tela, Analisador de Variaveis, QA Pleno, QA Master, Elaborador, Revisor, Coordenador), o fluxo sequencial de 6 fases, e a regra de FONTE PRIMARIA: plano multi-agente substitui e deleta testes legados do mesmo escopo. Consultar ANTES de qualquer criacao de plano de teste. Subordina todas as skills de agente-plano-teste-* existentes."
---

# Gravity -- Pipeline Multi-Agente de Planos de Teste

> **Esta skill e a autoridade maxima sobre criacao de planos de teste no Gravity.**
> Toda skill em `skills/testes/agente-plano-teste*` e subordinada a esta.
> Em conflito com qualquer outro documento, esta skill prevalece.

---

## Regra Absoluta -- FONTE PRIMARIA

> **O plano multi-agente e a fonte primaria de testes para o escopo coberto.**
> Testes legados (pre-existentes) do MESMO escopo sao DELETADOS e substituidos.

### O que isso significa

Quando o pipeline multi-agente gera planos para um escopo (ex: "Edicao em Massa do Pedido"):

1. **Os novos planos sao a unica fonte de verdade** -- unitario, funcional, E2E
2. **Testes `.test.ts` e `.spec.ts` legados do mesmo escopo sao deletados** -- sem preservar, sem merge
3. **Planos `.json` e `.md` legados do mesmo escopo sao deletados** -- substituidos pelos novos
4. **O registry (`test-plans-registry.json`) e atualizado** -- entradas legadas removidas, novas adicionadas
5. **Nenhum teste legado coexiste** com o plano multi-agente para o mesmo escopo

### Quando NAO se aplica

- Testes de **outro escopo** (ex: pipeline gera para "Duplicar" -- testes de "Consolidar" continuam intactos)
- Testes de **seguranca** em `testes/security/` (cross-tenant-isolation, pool-leak) -- sao transversais e nunca deletados
- Testes em `packages/` (ex: `packages/tenant-resolver/tests/`) -- sao do pacote publicavel, fora do escopo

### Procedimento de substituicao

```
1. Coordenador (Agente 8) identifica testes legados do escopo
2. Lista TODOS os arquivos que serao deletados (com caminho completo)
3. Apresenta a lista ao dono para aprovacao ANTES de deletar
4. Dono aprova -> arquivos deletados -> novos planos persistidos
5. Registry atualizado no mesmo commit
```

---

## Principio Fundamental

> **Imaginar 1000 usuarios testando todas as possibilidades ao longo de 3 anos.**
> O plano deve cobrir TODAS as combinacoes, TODAS as variaveis, TODOS os cenarios.
> Nenhum edge case e "improvavel demais para testar".

---

## Os 8 Agentes Especializados

### Agente 1 -- Analisador de Codigo

**Missao:** Ler TODO o codigo-fonte envolvido e extrair a anatomia completa da feature.

**O que analisa:**
- Componentes React: props, estado, hooks, callbacks, renders condicionais
- Rotas Express: endpoints, validacoes Zod, middlewares, error handling
- Services: metodos publicos, logica de negocio, queries Prisma
- Models Prisma (fragment.prisma): campos, tipos, relacoes, indices, `@@unique`
- Schemas Zod: campos, tipos, validacoes, opcionais, defaults
- `data-testid`: extrair TODOS de cada componente (para mapeamento E2E)
- Chamadas entre servicos: fetch cross-service, headers `x-chave-interna`
- Logica condicional: if/else, ternarios, switches, guards

**Output:** Relatorio de Codigo
```
- Lista de arquivos analisados (com caminho)
- Mapa de campos (nome, tipo, obrigatorio, validacao, default)
- Mapa de endpoints (metodo, rota, body schema, response schema)
- Mapa de testids (componente -> testid -> elemento)
- Mapa de logica condicional (condicao -> branches)
- Mapa de permissoes (tipo_usuario -> acoes permitidas)
- Dependencias externas (APIs, servicos, bancos)
```

### Agente 2 -- Analisador de Tela

**Missao:** Documentar o que o USUARIO ve e com o que interage.

**O que analisa (via Playwright/screenshot/navegacao real):**
- Elementos visiveis: botoes, campos, selects, toggles, tabelas, modais
- Estados da tela: vazia, com dados, loading, erro, sucesso
- Fluxos de navegacao: de onde vem, para onde vai, breadcrumb
- Tabela: TODAS as colunas (nome, tipo de dado, editavel, ordenavel)
- Toolbar: botoes disponiveis por selecao (0, 1, N itens selecionados)
- Menu de contexto: acoes por linha
- Modais: conteudo, botoes, campos internos, validacoes visiveis
- Textos: labels, placeholders, mensagens de erro, toasts, tooltips
- Responsividade: viewport 1440x900 (padrao) + 375px (mobile)

**Output:** Relatorio Visual
```
- Inventario de elementos (tipo, label, testid se visivel)
- Mapa de estados (estado -> screenshot planejado)
- Fluxos de navegacao (diagrama de telas)
- Inventario de colunas da tabela (se aplicavel)
- Inventario de acoes (toolbar + menu de linha + modais)
- Mensagens de feedback (sucesso, erro, warning)
```

### Agente 3 -- Analisador de Variaveis

**Missao:** Enumerar TODAS as combinacoes possiveis de variaveis, estados e cenarios.

**O que faz:**
- Cruza Relatorio de Codigo (Agente 1) + Relatorio Visual (Agente 2)
- Para CADA campo: lista valores validos, invalidos, limites, null, vazio, adversariais
- Para CADA acao: lista sucesso, falha, parcial, concorrencia
- Para CADA permissao: lista comportamento por tipo_usuario (SUPER_ADMIN, ADMIN, MASTER, STANDARD, SUPPLIER)
- Para CADA estado inicial: lista combinacoes (0 itens, 1, 5, 50, 100+ itens)
- Para CADA campo de tabela: verificar duplicacao/persistencia/edicao
- Enumera combinacoes compostas: campo A vazio + campo B preenchido + campo C invalido

**Tecnica de enumeracao:**
```
Para cada campo F do formulario:
  Para cada tipo de dado T (valido, invalido, vazio, null, limite_min, limite_max, adversarial):
    Para cada permissao P (SUPER_ADMIN, MASTER, STANDARD):
      Para cada estado E (vazio, 1_item, N_itens, misto):
        Registrar combinacao (F, T, P, E) com resultado esperado
```

**Output:** Matriz de Variaveis
```
- Lista exaustiva de variaveis (campo/acao/permissao/estado)
- Combinacoes prioritarias (criticas primeiro)
- Combinacoes de borda (edge cases)
- Combinacoes adversariais (XSS, SQL injection, payload gigante)
- Combinacoes de concorrencia (2 usuarios simultaneos)
- Estimativa de total de cenarios
```

### Agente 4 -- QA Pleno

**Missao:** Revisar a Matriz de Variaveis e garantir que NADA ficou para tras.

**O que faz:**
- Le a Matriz de Variaveis (Agente 3)
- Verifica: "Falta alguma variavel?"
- Adiciona edge cases de negocio que o Agente 3 nao percebeu
- Verifica cenarios de:
  - Race conditions (2 abas, 2 usuarios)
  - Timeout (operacao demorada, JWT expira no meio)
  - Dados corrompidos (campo obrigatorio null no banco -- como a tela se comporta?)
  - Rollback (operacao falha no meio -- estado fica consistente?)
  - Cache stale (dado mudou no backend, tela mostra versao antiga)
  - Navegacao inesperada (usuario clica "voltar" no meio de operacao)

**Output:** Matriz Validada
```
- Todos os itens da Matriz original + cenarios adicionados
- Para cada item adicionado: justificativa
- Para cada item original: confirmacao "coberto" ou "precisa expandir"
- Flag: "Completa" ou "Precisa de mais analise em: [area]"
```

### Agente 5 -- QA Master

**Missao:** Dar 100% de certeza que NENHUM cenario ficou para tras.

**Mentalidade:**
> "Eu sou 1000 usuarios diferentes, usando o sistema de formas que ninguem imaginou,
> ao longo de 3 anos, com dados reais, em condicoes adversas."

**O que faz:**
- Le a Matriz Validada (Agente 4)
- Simula cenarios extremos:
  - Usuario cola texto de 50.000 caracteres no campo
  - Usuario abre 20 abas da mesma tela simultaneamente
  - Usuario duplica 500 pedidos de uma vez
  - Usuario edita o mesmo pedido em 2 abas
  - Importacao de planilha com 10.000 linhas
  - Exportacao com filtro que retorna 0 resultados
  - Acao em massa com mix de itens validos e invalidos
  - Campos com caracteres especiais: emojis, RTL, Unicode
- Verifica completude por dimensao:
  - Todos os campos testados? (preenchidos, vazios, invalidos)
  - Todas as acoes testadas? (criar, ler, editar, deletar, duplicar, transferir, consolidar)
  - Todas as permissoes testadas? (5 tipos de usuario)
  - Todos os estados testados? (vazio, parcial, completo, erro)
  - Todas as combinacoes criticas testadas?

**Output:** Matriz DEFINITIVA
```
- Stamp: "100% COMPLETA" ou "INCOMPLETA -- falta: [lista]"
- Se incompleta: volta para Agente 3 com os gaps
- Se completa: numero total de cenarios
- Prioridade por cenario: P0 (critico), P1 (importante), P2 (bom ter)
```

### Agente 6 -- Elaborador de Plano

**Missao:** Transformar a Matriz DEFINITIVA em planos JSON canonicos.

**O que produz (3 planos):**
1. **Plano Unitario** -- formato de `agente-plano-teste-unitario/SKILL.md`
2. **Plano Funcional** -- formato de `agente-plano-teste-funcional/SKILL.md`
3. **Plano E2E** -- formato de `agente-plano-teste-e2e/SKILL.md`

**Regras de elaboracao:**
- Cada cenario da Matriz vira 1+ passos no plano apropriado
- Cenarios de logica pura -> Plano Unitario
- Cenarios de rota/API -> Plano Funcional
- Cenarios de fluxo de usuario -> Plano E2E
- Cenarios que cruzam niveis -> aparecem em mais de 1 plano
- Testids mapeados a partir do Relatorio de Codigo (Agente 1)
- Numeracao sequencial e estavel (regra das skills existentes)
- Screenshots planejados para passos criticos (E2E)
- Pre-requisitos explicitos (ambiente, dados, permissao)
- IDs seguem convencao: `TST-{TIPO}-{ESCOPO}-{NUMERO}`

**Output:** 3 planos JSON no formato canonico + resumo executivo de cada

### Agente 7 -- Revisor de Plano

**Missao:** Garantir que os planos refletem 100% da Matriz DEFINITIVA.

**O que faz:**
- Cruza cada cenario da Matriz com os passos dos 3 planos
- Verifica:
  - Todo cenario da Matriz esta representado em pelo menos 1 plano?
  - Nenhum passo esta ambiguo (acao + resultado esperado claros)?
  - Todos os testids referenciados existem no componente?
  - Numeracao e estavel e sem gaps?
  - Pre-requisitos sao suficientes para reproduzir o teste?
  - IDs seguem a convencao TST-{TIPO}-{ESCOPO}-{NUMERO}?
  - Screenshots planejados para todos os estados criticos?

**Output:** Relatorio de Conformidade
```
- Total de cenarios da Matriz: N
- Cenarios cobertos nos planos: N (deve ser 100%)
- Gaps encontrados: [lista] (se houver -> volta para Agente 6)
- Problemas de formato: [lista]
- Veredicto: CONFORME ou NAO CONFORME (com lista de gaps)
```

### Agente 8 -- Coordenador

**Missao:** Aprovar o pacote completo e apresentar ao dono.

**O que verifica:**
- Skills de governanca respeitadas (9 Mandamentos, DDD, code-standards)
- Estrutura de pastas correta para os planos
- IDs nao colidem com registry existente
- Regra FONTE PRIMARIA: testes legados do escopo identificados para delecao
- Planos usam nomenclatura DDD em todos os exemplos
- Nenhum plano viola isolamento de organizacao

**O que apresenta ao dono:**
```
PACOTE MULTI-AGENTE -- [nome do escopo]
Data: YYYY-MM-DD

RESUMO:
- Cenarios totais: N
- Plano Unitario: N passos
- Plano Funcional: N passos
- Plano E2E: N passos

TESTES LEGADOS A DELETAR:
- [caminho/arquivo1.test.ts]
- [caminho/arquivo2.spec.ts]
- [caminho/plano-legado.json]

PASTAS A CRIAR:
- [caminho/nova-pasta/]

APROVACAO NECESSARIA:
1. Planos estao completos?
2. Testes legados podem ser deletados?
3. Pastas podem ser criadas?
```

**Output:** Pacote aprovado ou rejeitado (com justificativa)

---

## Fluxo Sequencial -- As 6 Fases

```
FASE 1 -- ANALISE (paralela)
  Agente 1 (Codigo)  ----+
  Agente 2 (Tela)    ----+--> 2 relatorios de analise
                          |
FASE 2 -- ENUMERACAO
  Agente 3 (Variaveis) ---> Matriz de combinacoes
                          |
FASE 3 -- VALIDACAO (sequencial, com loop)
  Agente 4 (QA Pleno) ----> Matriz validada
  Agente 5 (QA Master) ---> Matriz DEFINITIVA (100%)
     Se incompleta ---------> volta para Agente 3
                          |
FASE 4 -- ELABORACAO
  Agente 6 (Elaborador) --> 3 planos JSON (UNI + FUN + E2E)
                          |
FASE 5 -- REVISAO (com loop)
  Agente 7 (Revisor) -----> Relatorio de conformidade
     Se nao conforme -------> volta para Agente 6
                          |
FASE 6 -- APROVACAO
  Agente 8 (Coordenador) -> Pacote para o dono
  DONO aprova -------------> Planos persistidos + legados deletados
```

### Regras do Fluxo

1. **Nenhum agente pula fase** -- o output de cada agente e input obrigatorio do proximo
2. **Agentes 1+2 rodam em paralelo** -- sao independentes
3. **Agente 3 PRECISA dos outputs de 1+2** -- nao pode comecar antes
4. **QA Pleno (4) e QA Master (5) sao sequenciais** -- 5 valida o trabalho de 4
5. **Se QA Master encontra gaps** -> volta para Agente 3 com os gaps, que refaz a matriz
6. **Se Revisor encontra gaps** -> volta para Elaborador com os gaps
7. **Coordenador nao corrige** -- apenas aprova ou rejeita com justificativa
8. **Planos seguem formato canonico** das skills existentes
9. **Criacao de pastas exige aprovacao do dono**
10. **Delecao de testes legados exige aprovacao do dono** (regra FONTE PRIMARIA)

---

## Onde Persistir os Planos

Os planos gerados seguem a mesma estrutura do README de `testes/`:

```
testes/
  testes-unitarios/<escopo>/<sublocal>/
    _planos/                        <-- plano unitario JSON
    TST-UNI-{ESCOPO}-{NUMERO}.test.ts  <-- spec gerado depois
  testes-funcionais/<escopo>/<sublocal>/
    _planos/                        <-- plano funcional JSON
    TST-FUN-{ESCOPO}-{NUMERO}.test.ts
  testes-e2e/<escopo>/<sublocal>/
    _planos/                        <-- plano E2E JSON
    _mapeamentos/                   <-- testids extraidos
    TST-E2E-{ESCOPO}-{NUMERO}.spec.ts
```

O `test-plans-registry.json` e atualizado com as novas entradas e as entradas legadas removidas.

---

## Relacao com Skills Existentes

| Skill | Relacao |
|-------|---------|
| `agente-plano-teste` | **Subordinada.** Pode ser usada standalone para escopos simples. Para escopos complexos, o multi-agente prevalece. |
| `agente-plano-teste-unitario` | **Subordinada.** O Agente 6 (Elaborador) produz planos unitarios seguindo o formato desta skill. |
| `agente-plano-teste-funcional` | **Subordinada.** O Agente 6 produz planos funcionais seguindo o formato desta skill. |
| `agente-plano-teste-e2e` | **Subordinada.** O Agente 6 produz planos E2E seguindo o formato desta skill. |
| `padroes-vitest-playwright` | **Referencia tecnica.** Configs, mocks, coverage -- consultada pelo Elaborador. |
| `teste-em-tela` | **Referencia tecnica.** Protocolo de prints -- consultada pelo Analisador de Tela. |
| `contract-testing` | **Referencia tecnica.** Zod como contrato -- consultada pelo Elaborador. |
| `papeis/qa` | **Referencia tecnica.** Checklist de 6 categorias + 11 categorias E2E -- consultada pelo QA Pleno e QA Master. |

---

## Quando Usar Este Pipeline

**SEMPRE** quando:
- O dono solicita testes para uma feature/tela/fluxo
- O escopo tem mais de 5 campos OU mais de 3 acoes OU envolve tabela com multiplas colunas
- A criticidade e `alta` ou `critica`
- Existem testes legados do mesmo escopo que precisam ser substituidos

**Aceito usar agente-plano-teste standalone** quando:
- Escopo minimo (1-2 campos, 1 acao, sem tabela)
- Criticidade `baixa`
- Nao ha testes legados para substituir

---

## Checklist -- Antes de Iniciar o Pipeline

- [ ] Escopo definido pelo dono (ex: "Casas Decimais do Configurador no Pedido")?
- [ ] Porta do produto identificada (para Agente 2 navegar)?
- [ ] Skills de teste lidas (esta + 7 filhas)?
- [ ] Testes legados do escopo identificados (para regra FONTE PRIMARIA)?
- [ ] Dono informado que testes legados serao deletados?
