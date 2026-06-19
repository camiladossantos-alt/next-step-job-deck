# Exemplo Completo — Plano da Tela Organização

> Demonstração de **como o PDF do dono (63 passos) é preservado integralmente E expandido** para cobrir as 20 categorias do checklist 10/10. Mostra o output esperado do `agente-plano-teste` quando recebe a tela `CONFIG / Organização`.

---

## Inputs ao agente

```json
{
  "escopo": "CONFIG",
  "sublocal": "Organização",
  "tela": "Organização",
  "rota": "/configurador/organizacao",
  "componenteFilePath": "servicos-global/configurador/src/pages/Organizacao.tsx",
  "componenteFileContent": "...",
  "criticidade": "alta",
  "temDinheiro": false,
  "planoExistente": {
    "origem": "PDF do dono — TSTE2E00001",
    "passos": [/* 63 passos do PDF */]
  }
}
```

---

## Cobertura: o que o PDF cobriu vs. o que o agente expandiu

| # | Categoria | PDF | Agente | Total |
|---|---|---|---|---|
| 1 | Carregamento | 4 passos (3-4) | +1 passo (verificação de console errors) | 5 |
| 2 | Identidade visual | 7 passos (5,13-15, +3) | +0 | 7 |
| 3 | Navegação lateral | 6 passos (7-12) | +2 (item ativo + breadcrumb) | 8 |
| 4 | Read / Listagem | 7 passos (16,22,29,36,43,50,57) | +5 (formato CNPJ, formato data, contagem) | 12 |
| 5 | Update / Edição | 35 passos (16-63) | +5 (Cancelar, dirty check, F5 com dirty) | 40 |
| 6 | Create | 0 — **não aplicável** | — | 0 (justificado) |
| 7 | Delete | 0 — **não aplicável** | — | 0 (justificado) |
| 8 | Validações de campo | 0 | **+10** (CNPJ inválido, nome vazio, etc) | 10 |
| 9 | Estados de erro | 0 | **+6** (API 500, sem permissão, conflito) | 6 |
| 10 | Estados vazios | 0 | **+1** (organização recém-criada sem CNPJ) | 1 |
| 11 | Estados de loading | 0 | **+3** (skeleton inicial, salvando, recarregando) | 3 |
| 12 | Filtros / busca | 0 — não aplicável (tela tem 1 registro) | — | 0 (justificado) |
| 13 | Ordenação | 0 — não aplicável | — | 0 (justificado) |
| 14 | Permissões / RBAC | 0 | **+6** (USER read-only, ADMIN edita, SUPER deleta tudo) | 6 |
| 15 | Multi-organização | 0 | **+4** (tipo CRO — vai pro testes-cross-organização) | 4 |
| 16 | Acessibilidade | 0 | **+6** (Tab nav, focus visível, aria-label, contraste) | 6 |
| 17 | Responsividade | 0 | **+4** (375, 768, 1280, dark mode) | 4 |
| 18 | Internacionalização | 0 | **+4** (PT/EN, formatos data/moeda) | 4 |
| 19 | Performance | 0 | **+4** (FCP < 1.5s, TTI < 3s, no N+1) | 4 |
| 20 | Persistência / refresh | 0 (parcial via toast) | **+3** (F5 preserva, querystring, dirty check) | 3 |

**Totais:**
- PDF original: **63 passos** ✅ todos preservados
- Agente adicionou: **+59 passos**
- Plano final: **122 passos**
- Cobertura: **18/20 categorias** (2 não aplicáveis com justificativa)

---

## Resumo executivo gerado pelo agente

> **Tela de edição da Organização.** Permite alterar dados básicos da empresa (nome, CNPJ, estado, cidade, segmento, tipo) e definir o Workspace padrão. **Risco principal:** vazamento de CNPJ ou edição não-autorizada entre Organizações — por isso a categoria 15 (Isolamento de Organização) tem 4 passos dedicados em `testes-cross-organização` (nome de pasta legado preservado). **Cobertura: 18/20** — categorias 6 (Create) e 7 (Delete) marcadas como não-aplicáveis porque a Organização é única e seu ciclo de vida é gerenciado pelo onboarding/cancelamento, não por esta tela. **Criticidade: alta** porque é a porta de entrada para configuração de qualquer Organização — quebra aqui bloqueia todo o resto. **Ambientes:** Local, Staging, Produção (3 obrigatórios). Plano preserva os 63 passos do PDF original do dono e adiciona 59 passos cobrindo validações, permissões via `tipo_usuario`, a11y, i18n, performance e estados.

---

## Passos — Amostra organizada por categoria

> Mostra como o agente reorganiza os 122 passos em **seções por categoria**, mantendo a numeração sequencial original do PDF intacta (1-63) e adicionando os novos a partir do 64.

### Categoria 1 — Carregamento da tela

```json
{
  "numero": 1,
  "acao": "Subir servidor backend http://localhost:8005",
  "categoria": 1,
  "origem": "humano-original",
  "interacao": { "tipo": "verificacao" },
  "assercao": { "tipo": "apiResponse", "rota": "http://localhost:8005/health", "status": 200 },
  "resultadoEsperado": "Sucesso servidor",
  "screenshot": null,
  "tiposAplicaveis": ["E2E"]
}
```

```json
{
  "numero": 2,
  "acao": "Subir servidor frontend http://localhost:8000",
  "categoria": 1,
  "origem": "humano-original",
  "interacao": { "tipo": "verificacao" },
  "resultadoEsperado": "Sucesso servidor",
  "screenshot": null,
  "tiposAplicaveis": ["E2E"]
}
```

```json
{
  "numero": 3,
  "acao": "Navegar para /configurador/organizacao",
  "categoria": 1,
  "origem": "humano-original",
  "interacao": { "tipo": "goto", "rota": "/configurador/organizacao" },
  "assercao": { "tipo": "visible", "testid": "tela-organizacao-root" },
  "resultadoEsperado": "Tela carregada",
  "screenshot": "01_tela_carregada_configurador_organizacao",
  "tiposAplicaveis": ["E2E"]
}
```

```json
{
  "numero": 64,
  "acao": "Verificar que o console do browser não tem erros JS durante o load",
  "categoria": 1,
  "origem": "agente-adicionado",
  "interacao": { "tipo": "verificacao" },
  "assercao": { "tipo": "count", "testid": "console-error", "count": 0 },
  "resultadoEsperado": "Zero errors no console",
  "screenshot": null,
  "tiposAplicaveis": ["E2E"],
  "notas": "Captura via page.on('pageerror') do Playwright"
}
```

### Categoria 5 — Update / Edição (preserva todos os 35 passos do PDF)

```json
{
  "numero": 16,
  "acao": "Editar Nome da Empresa",
  "categoria": 5,
  "origem": "humano-original",
  "interacao": { "tipo": "fill", "testid": "input-nome-empresa", "valor": "Gravity Teste 1" },
  "assercao": { "tipo": "enabled", "testid": "btn-salvar-organizacao" },
  "resultadoEsperado": "Alterar o nome Gravity Teste 1 e salvar",
  "screenshot": "02_nome_empresa_editado_configurador_organizacao",
  "tiposAplicaveis": ["E2E"]
}
```

```json
{
  "numero": 17,
  "acao": "Verificar que botão Salvar fica ativo",
  "categoria": 5,
  "origem": "humano-original",
  "interacao": { "tipo": "verificacao" },
  "assercao": { "tipo": "enabled", "testid": "btn-salvar-organizacao" },
  "resultadoEsperado": "Deixa de ser opaco e fica ativo",
  "screenshot": "03_botao_salvar_ativo_configurador_organizacao",
  "tiposAplicaveis": ["E2E"]
}
```

```json
{
  "numero": 18,
  "acao": "Salvar Nome da Empresa",
  "categoria": 5,
  "origem": "humano-original",
  "interacao": { "tipo": "click", "testid": "btn-salvar-organizacao" },
  "assercao": { "tipo": "toastShown", "texto": "Organização salva com sucesso" },
  "resultadoEsperado": "Salva e aparece aviso do lado direito inferior da tela",
  "screenshot": "04_aviso_salvo_configurador_organizacao",
  "tiposAplicaveis": ["E2E"]
}
```

### Categoria 8 — Validações de campo (TODAS adicionadas pelo agente)

```json
{
  "numero": 89,
  "acao": "Tentar salvar com Nome da Empresa vazio",
  "categoria": 8,
  "origem": "agente-adicionado",
  "preCondicoes": ["Campo Nome com valor inicial preenchido"],
  "interacao": { "tipo": "fill", "testid": "input-nome-empresa", "valor": "" },
  "assercao": { "tipo": "hasText", "testid": "erro-campo-nome", "texto": "Nome é obrigatório" },
  "resultadoEsperado": "Mensagem de erro 'Nome é obrigatório' aparece e Salvar fica desabilitado",
  "screenshot": "20_validacao_nome_vazio",
  "tiposAplicaveis": ["E2E", "FUN"]
}
```

```json
{
  "numero": 90,
  "acao": "Tentar salvar com CNPJ inválido (11.111.111/1111-11)",
  "categoria": 8,
  "origem": "agente-adicionado",
  "interacao": { "tipo": "fill", "testid": "input-cnpj-empresa", "valor": "11.111.111/1111-11" },
  "assercao": { "tipo": "hasText", "testid": "erro-campo-cnpj", "texto": "CNPJ inválido" },
  "resultadoEsperado": "Mensagem de erro 'CNPJ inválido' (validação de dígito verificador)",
  "screenshot": "21_validacao_cnpj_invalido",
  "tiposAplicaveis": ["E2E", "FUN", "UNI"]
}
```

```json
{
  "numero": 91,
  "acao": "Verificar máscara de CNPJ ao digitar",
  "categoria": 8,
  "origem": "agente-adicionado",
  "interacao": { "tipo": "fill", "testid": "input-cnpj-empresa", "valor": "08973387000174" },
  "assercao": { "tipo": "hasValue", "testid": "input-cnpj-empresa", "valor": "08.973.387/0001-74" },
  "resultadoEsperado": "Máscara aplica automaticamente: 08.973.387/0001-74",
  "screenshot": null,
  "tiposAplicaveis": ["E2E"]
}
```

### Categoria 9 — Estados de erro (TODOS adicionados pelo agente)

```json
{
  "numero": 99,
  "acao": "Simular API 500 ao salvar",
  "categoria": 9,
  "origem": "agente-adicionado",
  "preCondicoes": ["Mock de PUT /api/organizacao retornando 500"],
  "interacao": { "tipo": "click", "testid": "btn-salvar-organizacao" },
  "assercao": { "tipo": "toastShown", "texto": "Erro ao salvar — tente novamente" },
  "resultadoEsperado": "Toast de erro aparece, dados editados continuam no formulário (não perde)",
  "screenshot": "30_erro_500_servidor",
  "tiposAplicaveis": ["E2E"]
}
```

### Categoria 14 — Permissões / RBAC

```json
{
  "numero": 105,
  "acao": "Logar como USUARIO e tentar editar Nome da Empresa",
  "categoria": 14,
  "origem": "agente-adicionado",
  "preCondicoes": ["Usuário com tipo_usuario USUARIO (não ADMIN), lido de /api/v1/me"],
  "interacao": { "tipo": "setTipoUsuario", "tipoUsuario": "USUARIO" },
  "assercao": { "tipo": "disabled", "testid": "input-nome-empresa" },
  "resultadoEsperado": "Campo Nome aparece como read-only para tipo_usuario USUARIO",
  "screenshot": "40_usuario_readonly",
  "tiposAplicaveis": ["E2E", "FUN"]
}
```

### Categoria 15 — Multi-organização (vai pro testes-cross-organização)

```json
{
  "numero": 111,
  "acao": "Organização B tenta GET /api/organizacao com ID da Organização A",
  "categoria": 15,
  "origem": "agente-adicionado",
  "preCondicoes": ["2 Organizações criadas via fixtures de cross-organização"],
  "interacao": { "tipo": "verificacao" },
  "assercao": { "tipo": "apiResponse", "rota": "/api/organizacao/{idOrganizacaoA}", "status": 404 },
  "resultadoEsperado": "404 — finge que não existe (não 403, pra não vazar existência)",
  "screenshot": null,
  "tiposAplicaveis": ["CRO"]
}
```

### Categoria 16 — Acessibilidade

```json
{
  "numero": 115,
  "acao": "Navegar a tela inteira só com Tab — verificar focus visível",
  "categoria": 16,
  "origem": "agente-adicionado",
  "interacao": { "tipo": "press", "tecla": "Tab" },
  "assercao": { "tipo": "hasClass", "testid": "input-nome-empresa", "classe": "focus-visible" },
  "resultadoEsperado": "Tab navega na ordem lógica (top→bottom, left→right) e cada elemento foca tem outline visível",
  "screenshot": "50_focus_keyboard_nav",
  "tiposAplicaveis": ["E2E"]
}
```

### Categoria 17 — Responsividade

```json
{
  "numero": 119,
  "acao": "Resize para 375x812 (mobile)",
  "categoria": 17,
  "origem": "agente-adicionado",
  "interacao": { "tipo": "resize", "largura": 375, "altura": 812 },
  "assercao": { "tipo": "hidden", "testid": "menu-lateral-configurador" },
  "resultadoEsperado": "Menu lateral colapsa, hambúrguer aparece, conteúdo principal ocupa 100% da largura",
  "screenshot": "60_mobile_375",
  "tiposAplicaveis": ["E2E"]
}
```

---

## Cobertura final (matriz)

```json
"cobertura": [
  { "categoria": 1,  "nome": "Carregamento da tela",        "status": "coberta",       "passosAssociados": [1,2,3,4,64] },
  { "categoria": 2,  "nome": "Identidade visual",           "status": "coberta",       "passosAssociados": [5,6,13,14,15,8,9] },
  { "categoria": 3,  "nome": "Navegação lateral",           "status": "coberta",       "passosAssociados": [7,8,9,10,11,12,65,66] },
  { "categoria": 4,  "nome": "Read / Listagem",             "status": "coberta",       "passosAssociados": [16,22,29,36,43,50,57,67,68,69,70,71] },
  { "categoria": 5,  "nome": "Update / Edição",             "status": "coberta",       "passosAssociados": [16,17,18,19,20,21,/* ... 35 passos ... */,86,87,88] },
  { "categoria": 6,  "nome": "Create / Criação",            "status": "nao_aplicavel", "justificativa": "Organização é única — criação acontece via fluxo de onboarding (TST-E2E-CONFIG-000010)" },
  { "categoria": 7,  "nome": "Delete / Exclusão",           "status": "nao_aplicavel", "justificativa": "Organização não pode ser deletada via UI — só via cancelamento de assinatura (TST-E2E-CONFIG-000011)" },
  { "categoria": 8,  "nome": "Validações de campo",         "status": "coberta",       "passosAssociados": [89,90,91,92,93,94,95,96,97,98] },
  { "categoria": 9,  "nome": "Estados de erro",             "status": "coberta",       "passosAssociados": [99,100,101,102,103,104] },
  { "categoria": 10, "nome": "Estados vazios",              "status": "coberta",       "passosAssociados": [105] },
  { "categoria": 11, "nome": "Estados de loading",          "status": "coberta",       "passosAssociados": [106,107,108] },
  { "categoria": 12, "nome": "Filtros e busca",             "status": "nao_aplicavel", "justificativa": "Tela mostra 1 registro único — não há listagem para filtrar" },
  { "categoria": 13, "nome": "Ordenação",                   "status": "nao_aplicavel", "justificativa": "Sem listagem para ordenar" },
  { "categoria": 14, "nome": "Permissões / RBAC",           "status": "coberta",       "passosAssociados": [109,110,111,112,113,114] },
  { "categoria": 15, "nome": "Multi-organização / isolamento", "status": "coberta",     "passosAssociados": [115,116,117,118], "notas": "Migra para testes-cross-organização via tiposAplicaveis: CRO" },
  { "categoria": 16, "nome": "Acessibilidade",              "status": "coberta",       "passosAssociados": [119,120,121,122,123,124] },
  { "categoria": 17, "nome": "Responsividade",              "status": "coberta",       "passosAssociados": [125,126,127,128] },
  { "categoria": 18, "nome": "Internacionalização",         "status": "coberta",       "passosAssociados": [129,130,131,132] },
  { "categoria": 19, "nome": "Performance",                 "status": "coberta",       "passosAssociados": [133,134,135,136] },
  { "categoria": 20, "nome": "Persistência e refresh",      "status": "coberta",       "passosAssociados": [137,138,139] }
],
"coberturaPercentual": 90,
```

90% (18 cobertas / 20 totais — as 2 marcadas como não-aplicáveis não contam contra a porcentagem mas estão documentadas).

---

## O que esse exemplo prova

1. **O PDF do dono é sagrado** — passos 1-63 estão lá, intactos, com a mesma redação, na mesma ordem, marcados como `origem: humano-original`.
2. **O agente agrega** — adiciona 59 passos novos cobrindo as 13 categorias que faltavam.
3. **Não-aplicáveis são justificadas** — Create, Delete, Filtros e Ordenação não fazem sentido nessa tela específica. O agente explica por quê em vez de inflar o plano.
4. **Cada passo aponta a um testid real** — depois de gerar, o validador roda e checa que `input-nome-empresa`, `btn-salvar-organizacao`, etc. existem no `Organizacao.tsx`. Se algum não existe, o agente sinaliza `requerNovoTestid: true` e o humano sabe que precisa adicionar antes de gerar o spec.
5. **Tipos múltiplos** — alguns passos vão pra E2E só, outros para E2E+FUN+UNI (validações de CNPJ, por exemplo, viram unitário rápido + funcional + E2E). O gerador de specs depois divide.
6. **Resumo executivo de 5 segundos** — humano lê o `resumoExecutivo` e sabe imediatamente o tamanho, risco, cobertura e justificativas.
