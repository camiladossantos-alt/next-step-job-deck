# Decisões Tomadas — Otimização Mobile e Perfil no Header

## Decisão 1: Sidebar para Bottom Nav no Mobile
- **Contexto**: O menu lateral ocupa muito espaço horizontal em telas pequenas, reduzindo a largura útil da aplicação.
- **Opções Consideradas**:
  - Opção A: Criar um menu sanduíche (Hambúrguer) deslizante.
  - Opção B: Transformar a sidebar em uma barra de navegação inferior fixa (Bottom Nav).
- **Decisão**: Opção B (Bottom Nav).
- **Justificativa**: Mais ergonômico para o polegar no celular e garante acesso instantâneo às principais seções (Dashboard, Pipeline e Configurações) sem precisar abrir submenus.
- **Impacto**: O logo e o avatar da sidebar foram ocultados no mobile, necessitando de um canal alternativo de perfil.

## Decisão 2: Perfil Centralizado no Header com Modal Dinâmico
- **Contexto**: Sem o rodapé da sidebar no mobile, o botão de login e gerenciamento de perfil precisava de um local universal.
- **Opções Consideradas**:
  - Opção A: Adicionar um quarto link de "Login" na Bottom Nav.
  - Opção B: Incluir um botão de perfil 👤 no cabeçalho superior (`header.content-header`) que serve tanto para desktop quanto para mobile.
- **Decisão**: Opção B (Botão no Header + Modal Dinâmico).
- **Justificativa**: O cabeçalho é persistente em todas as abas da SPA e o botão de perfil circular consome pouquíssimo espaço. Ao clicar, o modal se adapta (exibe login se deslogado ou informações da conta com botão de desconexão se logado).
- **Impacto**: Elimina a necessidade de telas separadas de perfil, reduzindo código e mantendo a interface limpa.
