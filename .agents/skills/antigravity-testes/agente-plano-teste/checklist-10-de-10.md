# Checklist 10/10 — As 20 Categorias

> Toda tela do Gravity precisa cobrir as 20 categorias abaixo (ou marcar explicitamente como não-aplicável). O agente `agente-plano-teste` usa esta lista como base obrigatória.

---

## Tabela Resumo

| # | Categoria | Mínimo de passos por criticidade | Tipos | Severidade |
|---|---|---|---|---|
| 1 | Carregamento da tela | baixa:2 / media:3 / alta:4 / crit:5 | E2E | 🔴 |
| 2 | Identidade visual | baixa:3 / media:5 / alta:7 / crit:8 | E2E | 🟡 |
| 3 | Navegação lateral / breadcrumb | baixa:2 / media:4 / alta:6 / crit:8 | E2E | 🟡 |
| 4 | Read / Listagem / Visualização | baixa:3 / media:5 / alta:8 / crit:12 | E2E + FUN | 🔴 |
| 5 | Update / Edição | baixa:0 / media:5 / alta:10 / crit:15 | E2E + FUN | 🔴 |
| 6 | Create / Criação | baixa:0 / media:4 / alta:8 / crit:12 | E2E + FUN | 🔴 |
| 7 | Delete / Exclusão | baixa:0 / media:3 / alta:6 / crit:10 | E2E + FUN | 🔴 |
| 8 | Validações de campo | baixa:2 / media:5 / alta:10 / crit:15 | E2E + FUN + UNI | 🔴 |
| 9 | Estados de erro | baixa:1 / media:3 / alta:6 / crit:10 | E2E + FUN | 🟡 |
| 10 | Estados vazios | baixa:1 / media:2 / alta:3 / crit:4 | E2E | 🟢 |
| 11 | Estados de loading | baixa:1 / media:2 / alta:3 / crit:4 | E2E | 🟢 |
| 12 | Filtros e busca | baixa:0 / media:3 / alta:6 / crit:10 | E2E + FUN | 🟡 |
| 13 | Ordenação | baixa:0 / media:2 / alta:4 / crit:6 | E2E | 🟢 |
| 14 | Permissões / RBAC | baixa:1 / media:3 / alta:6 / crit:10 | E2E + FUN | 🔴 |
| 15 | Multi-organização / isolamento | baixa:1 / media:2 / alta:4 / crit:6 | CRO | 🔴 |
| 16 | Acessibilidade (a11y) | baixa:2 / media:4 / alta:6 / crit:8 | E2E | 🟡 |
| 17 | Responsividade | baixa:1 / media:3 / alta:4 / crit:5 | E2E | 🟡 |
| 18 | Internacionalização (i18n) | baixa:1 / media:2 / alta:4 / crit:5 | E2E | 🟢 |
| 19 | Performance | baixa:0 / media:2 / alta:4 / crit:6 | E2E + FUN | 🟡 |
| 20 | Persistência e refresh | baixa:1 / media:2 / alta:3 / crit:4 | E2E | 🟡 |

**Severidade:**
- 🔴 = bug aqui é crítico, bloqueia release
- 🟡 = bug aqui é incômodo, agendado
- 🟢 = bug aqui é polish, opcional

**Mínimos por criticidade:** se a tela é `criticidade: alta`, o agente gera no mínimo o número da coluna "alta" para cada categoria. Pode gerar mais se fizer sentido.

---

## Detalhamento por Categoria

### 1. Carregamento da tela 🔴
**O que cobre:** a URL responde, o DOM monta, não há erro de JS no console, elementos principais ficam visíveis.

**Passos típicos:**
- Navegar para `/rota`
- Aguardar elemento principal aparecer (testid)
- Verificar que não há erros JS no console
- Verificar que não há requisições falhadas (4xx/5xx) durante o load
- (criticidade alta+) Verificar que o load completa em <2s

---

### 2. Identidade visual 🟡
**O que cobre:** logo, título, subtítulo, breadcrumb, nome do produto, badge de role do usuário.

**Passos típicos:**
- Verificar logo do produto visível
- Verificar título da página exato (`getByText('Organização')`)
- Verificar subtítulo presente
- Verificar breadcrumb com hierarquia correta
- Verificar nome do workspace no header
- Verificar avatar/iniciais do usuário
- (criticidade alta+) Verificar tema dark/light correto

---

### 3. Navegação lateral / breadcrumb 🟡
**O que cobre:** todos os itens do menu lateral carregam, o item ativo está marcado, breadcrumb permite voltar.

**Passos típicos:**
- Verificar todos os itens do menu lateral presentes (lista exata)
- Verificar que o item da tela atual está com classe `ativo` ou similar
- Clicar em outro item e verificar navegação
- Voltar via breadcrumb e verificar URL

---

### 4. Read / Listagem / Visualização 🔴
**O que cobre:** dados aparecem corretos, formatos respeitados (data, moeda, percentual), ordem default correta, paginação.

**Passos típicos:**
- Verificar tabela/cards aparecem com pelo menos 1 linha (após seed)
- Verificar nome de cada coluna
- Verificar que valores monetários têm formato R$ X.XXX,XX
- Verificar que datas têm formato DD/MM/AAAA
- Verificar contagem total exibida (X de Y)
- Verificar paginação funcional (próxima, anterior, ir para)
- Verificar ordem default (geralmente data DESC)

---

### 5. Update / Edição 🔴
**O que cobre:** editar cada campo editável, validar feedback visual, salvar, ver toast, persistir.

**Passos típicos por campo editável:**
- Verificar valor atual do campo
- Editar valor
- Verificar que botão Salvar fica ativo (`isDirty`)
- Verificar que botão Cancelar fica visível
- Clicar Salvar
- Verificar toast "Salvo com sucesso"
- Recarregar página (F5) e verificar persistência
- (caminho ruim) Editar e clicar Cancelar — verificar que volta ao valor original

---

### 6. Create / Criação 🔴
**O que cobre:** botão "Novo", formulário em branco, validações de required, salvar com sucesso, salvar com erro.

**Passos típicos:**
- Clicar botão "Novo X"
- Verificar modal/tela de criação abre
- Verificar todos os campos required marcados
- Tentar salvar vazio → ver mensagens de validação
- Preencher inválido (formato errado) → ver mensagens
- Preencher válido → salvar → toast → ver na lista
- (criticidade crit) Tentar criar duplicata → erro de conflito tratado

---

### 7. Delete / Exclusão 🔴
**O que cobre:** botão deletar, modal de confirmação, undo (se houver), hard vs soft delete.

**Passos típicos:**
- Clicar deletar em uma linha
- Verificar modal de confirmação aparece
- Clicar Cancelar → modal fecha → linha continua
- Clicar Confirmar → linha some → toast
- (se houver undo) Clicar Desfazer → linha volta
- (criticidade alta+) Verificar no banco se foi soft (deleted_at) ou hard delete

---

### 8. Validações de campo 🔴
**O que cobre:** required, formato (CNPJ, email, CPF), min/max length, regex, máscara.

**Passos típicos por campo:**
- Deixar vazio (se required) → ver mensagem
- Preencher abaixo do mínimo → ver mensagem
- Preencher acima do máximo → ver mensagem
- Preencher formato inválido (CNPJ 11.111.111/1111-11, email sem @) → ver mensagem
- Preencher válido → mensagem some
- Verificar máscara aplica corretamente (cursor, backspace)

---

### 9. Estados de erro 🟡
**O que cobre:** API 500, sem permissão (403), conflito (409), não encontrado (404), rede caiu.

**Passos típicos:**
- Mockar/simular API 500 → verificar mensagem de erro genérica
- Tentar acessar com role insuficiente → ver tela de "Sem permissão"
- (criticidade alta+) Simular timeout de rede → ver retry/aviso
- Verificar que erros não vazam stack trace pro usuário

---

### 10. Estados vazios 🟢
**O que cobre:** lista vazia, primeira vez, sem resultados de busca.

**Passos típicos:**
- Acessar com banco vazio → ver ilustração + texto "Nenhum X cadastrado"
- (se houver) Verificar botão "Criar primeiro X" no estado vazio
- Buscar por termo inexistente → ver "Nenhum resultado encontrado"

---

### 11. Estados de loading 🟢
**O que cobre:** skeleton, spinner, disabled durante request.

**Passos típicos:**
- No load inicial, verificar skeleton/spinner aparece antes dos dados
- Ao salvar, verificar botão fica disabled durante request
- Ao deletar, verificar linha fica em estado "deletando"

---

### 12. Filtros e busca 🟡
**O que cobre:** buscar por termo, filtros por coluna, paginação preserva filtros.

**Passos típicos:**
- Digitar termo na busca → verificar lista filtra
- Limpar busca → lista volta
- Aplicar filtro de coluna → lista filtra
- Combinar 2+ filtros → ambos aplicam (AND)
- Ir para próxima página → filtros preservados
- Recarregar → filtros (querystring) preservados

---

### 13. Ordenação 🟢
**O que cobre:** clicar header, asc/desc, ordem default.

**Passos típicos:**
- Clicar header de coluna → ordena ASC
- Clicar de novo → ordena DESC
- Clicar de novo → volta ao default
- Verificar indicador visual (seta) muda

---

### 14. Permissões / RBAC 🔴
**O que cobre:** quem vê o quê, quem edita, quem deleta — por `tipo_usuario`.

**Passos típicos por `tipo_usuario` (USUARIO, ADMIN, SUPER_ADMIN):**
- Logar como USUARIO → verificar quais botões/campos aparecem (read-only?)
- Logar como ADMIN → verificar botões de edição visíveis
- Logar como SUPER_ADMIN → verificar botões de delete + admin features
- `tipo_usuario` lido SEMPRE de `GET /api/v1/me` validado por Zod (Mandamento 01) — NUNCA de `publicMetadata`
- Tentar acessar URL diretamente sem `tipo_usuario` adequado → ver 403
- (criticidade crit) Tentar burlar via DevTools (remover `disabled`) → backend rejeita

---

### 15. Multi-organização / isolamento 🔴
**O que cobre:** Organização A não vê dados da Organização B. **Mora em `testes-cross-organização` (nome de pasta legado preservado para compatibilidade).**

**Passos típicos:**
- Criar dado na Organização A
- Logar como Organização B
- Tentar acessar a tela → não vê o dado de A
- Tentar acessar URL `/x/<id-de-A>` direto → 404 (não 403, pra não vazar existência)
- Tentar editar via API com token de B mas id de A → 404
- Verificar no banco que o registro de A continua intacto

---

### 16. Acessibilidade (a11y) 🟡
**O que cobre:** Tab navega, focus visível, aria-label, contraste.

**Passos típicos:**
- Pressionar Tab → focus visível em cada elemento interativo
- Pressionar Shift+Tab → focus volta
- Verificar `aria-label` em ícones sem texto
- Verificar `aria-live` em toasts
- (criticidade alta+) Rodar axe-core e verificar 0 violations críticas
- Verificar contraste WCAG AA em textos

---

### 17. Responsividade 🟡
**O que cobre:** mobile (375), tablet (768), desktop (1280).

**Passos típicos:**
- Resize para 375 → menu lateral colapsa, conteúdo reflua
- Resize para 768 → layout intermediário
- Resize para 1280 → layout completo
- Verificar que botões de ação ficam acessíveis em mobile (não escondidos)
- Verificar tabelas responsivas (scroll horizontal ou cards)

---

### 18. Internacionalização (i18n) 🟢
**O que cobre:** trocar idioma, textos traduzidos, formatação de data/moeda.

**Passos típicos:**
- Trocar para EN → verificar textos principais traduzidos
- Trocar para PT → verificar volta
- Verificar que datas mudam de formato (DD/MM/AAAA vs MM/DD/YYYY)
- Verificar moeda muda (R$ vs $)
- Verificar que não sobra `chave.de.traducao` (sem fallback)

---

### 19. Performance 🟡
**O que cobre:** tempo de carregamento, paginação grande, N+1.

**Passos típicos:**
- Medir First Contentful Paint < 1.5s
- Medir Time to Interactive < 3s
- Carregar 1000+ registros (seed) → verificar paginação não trava
- (criticidade alta+) Verificar que requests não passam de 200ms (P95)
- Verificar que não há requests duplicados (N+1)

---

### 20. Persistência e refresh 🟡
**O que cobre:** F5 não perde estado, localStorage funciona, querystring funciona.

**Passos típicos:**
- Editar campo → F5 → verificar pergunta "Descartar alterações?" (se houver dirty check)
- Aplicar filtro → F5 → filtro preservado (via querystring)
- Logout e login de novo → preferências do usuário preservadas
- Trocar de aba e voltar → estado preservado

---

## Como o agente decide quantos passos por categoria

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
- Se temDinheiro = true, força criticidade mínima "alta"
- Se a tela tem pelo menos 1 input de formulário, força categorias 5,6,7,8 com mínimo "media"
- Se a tela é read-only (sem inputs), categorias 5,6,7 podem ser nao_aplicavel
- Se a tela é pública (sem auth), categorias 14,15 são nao_aplicavel
```

---

## Como marcar uma categoria como `nao_aplicavel`

```json
{
  "categoria": 6,
  "nome": "Create / Criação",
  "status": "nao_aplicavel",
  "justificativa": "Tela Organização não permite criar — só editar a Organização única. CREATE acontece no onboarding via fluxo separado (TST-E2E-CONFIG-000010).",
  "passos": []
}
```

A justificativa é **obrigatória**. Sem ela, o validador rejeita e força o agente a regenerar.
