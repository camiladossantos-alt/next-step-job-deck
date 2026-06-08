# Manual de Uso: Onion Portable 🧅

Bem-vindo ao **Onion Portable**. Esta é uma versão super enxuta da metodologia Spec-as-Code do Sistema Onion, desenhada para rodar em Web Chats restritos (Claude.ai, ChatGPT Custom GPTs, Gemini) e também nativamente em IDEs Agênticas (Antigravity, Cursor, Claude Code, Zed, ...).

---

## 1. O que tem no pacote?

A pasta `onion-portable` contém:
- **`ONION-MASTER-PROMPT.md`**: O "Cérebro". É a instrução que você deve dar à IA para que ela assuma as personas do Onion.
- **`docs/`**: A pasta com os 6 arquivos de contexto que guiam a IA e guardam as informações do seu projeto:
  1. `business-context-lite.md` — Contexto de Negócio (o que construir)
  2. `technical-context-lite.md` — Contexto Técnico (como construir)
  3. `product-cycle.md` — Regras do Ciclo de Produto
  4. `engineer-cycle.md` — Regras do Ciclo de Engenharia
  5. `knowledge-base-cycle.md` — Regras de criação de KBs
  6. `sync-cycle.md` — Regras de Engenharia Reversa e Sincronismo
- **`docs/knowledge-base/`**: Pasta para armazenar Knowledge Bases temáticas criadas pelo `@meta`.

---

## 2. Como Instalar (Guia por Plataforma)

### 💻 Cenário A: Web Chats (IA atua como Motor Lógico - Sem Escrita Direta)
Neste cenário, a IA guiará as fases de Produto e Engenharia através de respostas no chat, mas a gravação e atualização dos arquivos `.md` locais é feita manualmente por você (copiar/colar).

*   **Claude.ai (Claude Projects) [Recomendado para Web]**:
    1. Crie um novo **Project** (disponível no plano Pro/Team).
    2. Adicione o conteúdo de [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) nas *Custom Instructions* do Projeto.
    3. Faça o upload dos 6 arquivos da pasta `docs/` nos *Project Files* (Knowledge).
    4. *Fluxo:* Sempre que o Claude atualizar uma especificação, copie a resposta dele e atualize os arquivos correspondentes na sua máquina.
*   **ChatGPT (Custom GPTs ou ChatGPT Projects)**:
    *   **Opção A: Custom GPTs (Geral/Persistente)**:
        1. Crie um **Custom GPT** (acessando *Explore GPTs* -> *Create*).
        2. Cole o conteúdo de [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) no campo de *Instructions*.
        3. Na área de *Knowledge*, faça o upload dos 6 arquivos da pasta `docs/` para servirem de referência de regras e templates.
        4. Certifique-se de habilitar o "Code Interpreter" nas configurações para melhor raciocínio e escrita lógica.
    *   **Opção B: ChatGPT Projects (Ideal para Repositórios/Times)**:
        1. Crie um **Project** (disponível para contas Team/Enterprise).
        2. Nas *Custom Instructions* do projeto, insira o conteúdo do [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md).
        3. Faça o upload dos 6 arquivos da pasta `docs/` e de qualquer outro código relevante do repositório em *Files* do projeto.
        4. O histórico de conversas e os arquivos compartilhados no projeto manterão o alinhamento de forma simplificada.
*   **Gemini (Advanced / Gems)**:
    1. Crie uma **Gem** personalizada.
    2. Cole o conteúdo de [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) nas instruções da Gem.
    3. Anexe os 6 arquivos de contexto `docs/` na conversa inicial para dar o ponto de partida do seu projeto.

---

### ⚙️ Cenário B: IDEs Agênticas (Escrita Direta no Sistema de Arquivos)
Neste cenário, a própria IDE lerá e atualizará os arquivos de contexto de forma autônoma. Você não precisa copiar e colar nada, apenas aprovar as alterações.

*   **Antigravity IDE [Recomendado para Agentes Autônomos]**:
    1. Cole a pasta `docs/` na raiz do seu projeto.
    2. Coloque o arquivo [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) na pasta `.agents/rules/` (ou importe-o como regra global da IDE).
    3. A IA gerenciará as fases e fará a gravação direta dos arquivos de contexto no disco.
*   **Cursor (Cursor Agents / `.cursorrules`)**:
    1. Cole a pasta `docs/` na raiz do seu projeto.
    2. Cole o conteúdo de [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) dentro de um arquivo chamado `.cursorrules` na raiz do seu repositório (ou use o chat do Cursor referenciando-o).
*   **GitHub Copilot (VS Code / JetBrains - Copilot Edits)**:
    1. Cole a pasta `docs/` na raiz do seu projeto.
    2. No chat do **Copilot Edits** (modo agente), adicione os arquivos de contexto da pasta `docs/` e o [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) na lista de arquivos em contexto.
    3. Instrua a IA a seguir rigorosamente as personas e etapas detalhadas no prompt.
*   **Claude Code / Cowork**:
    1. Cole a pasta `docs/` na raiz do seu projeto.
    2. Adicione o arquivo [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) na pasta `.claude/rules/` ou como regra do seu ambiente de agente.
    3. O agente CLI do Claude Code lerá os arquivos de ciclo e o contexto técnico/negócio para planejar e executar a escrita do código.
*   **Zed (Zed AI / Assistants)**:
    1. Cole a pasta `docs/` na raiz do seu projeto.
    2. Adicione o conteúdo do [`ONION-MASTER-PROMPT.md`](./ONION-MASTER-PROMPT.md) como prompt de sistema ou insira nas instruções do assistente do Zed.
    3. Use o editor Zed AI com suporte a escrita e alteração de múltiplos arquivos de contexto em disco.


---

## 3. Como usar no dia a dia (O Ciclo de Vida)

O Onion Portable não é um gerador de código descontrolado. Ele segue regras estritas. Aqui estão os gatilhos e fluxos que você deve usar na conversa com a IA:

### 💡 Criando algo novo (O Ciclo de Produto)
- **O que você diz:** *"Tive uma ideia: quero colocar uma funcionalidade de exportar para PDF."*
- **O que a IA faz:** Ativa a persona `@product`, faz perguntas para entender o negócio, gera as especificações e atualiza o `business-context-lite.md`.
  - No **Cenário B**, a IA edita o arquivo diretamente.
  - No **Cenário A**, a IA gera o markdown e pede para você salvar localmente.
- *(Nunca peça código nesta fase!)*

### ⚙️ Desenvolvendo a ideia (O Ciclo de Engenharia)
- **O que você diz:** *"O produto está especificado, pode iniciar o trabalho do @engineer."*
- **O que a IA faz:** Lê as especificações, cria um plano arquitetural passo a passo no `technical-context-lite.md`. Depois que você aprovar, ela gera o código.
  - No **Cenário B**, a IA cria/edita os arquivos de código diretamente no projeto.
  - No **Cenário A**, a IA gera blocos de código para você colar.

### 📚 Estudando algo novo (O Ciclo de Knowledge Base)
- **O que você diz:** *"Atue como @meta e faça uma pesquisa sobre o framework Tailwind. Crie uma KB para nós."*
- **O que a IA faz:** Estuda o assunto e gera um Markdown mastigado.
  - No **Cenário B**, a IA salva em `docs/knowledge-base/[nome-do-tema].md` diretamente.
  - No **Cenário A**, a IA gera o bloco e pede para você salvar no mesmo caminho.

### 🔄 Lidando com Código Legado (O Ciclo de Sincronismo)
- **O que você diz:** *"Atue como @docs e faça engenharia reversa do projeto."*
- **O que a IA faz:** Lê seu código e infere automaticamente o Produto e a Engenharia.
  - No **Cenário B**, a IA lê o código diretamente do filesystem e atualiza os contextos.
  - No **Cenário A**, a IA pede que você cole o código e depois gera os documentos.

---

## ⚠️ Regra de Ouro: Como os arquivos são salvos?

Como o Onion lida com a documentação depende inteiramente do seu ambiente:

**Se você está em um Web Chat restrito (Cenário A):**
Como a IA não pode editar seus arquivos locais diretamente, a entrega de múltiplos arquivos se adapta dinamicamente à plataforma utilizada:
*   **ChatGPT (com Code Interpreter):** A IA cria a estrutura de pastas internamente e gera um arquivo `.zip` para você baixar e descompactar na raiz do seu projeto.
*   **Claude (com Artifacts):** A IA disponibiliza os arquivos em blocos de artefatos interativos individuais para fácil download.
*   **Outros Chats (como Gemini):** A IA gera o conteúdo `.md` completo dentro de blocos de código separados. Sua tarefa é copiar e salvar nos caminhos indicados.
*   *Resumo:* A IA sempre acompanhará a entrega com um resumo sintético rápido para facilitar a leitura das alterações.

**Se você está em uma IDE Agêntica (Cenário B — Antigravity, Cursor):**
Você não precisa copiar nada! A IA tem permissão de escrita. Ela vai te mostrar o que planeja fazer, pedir a sua confirmação e, uma vez aprovada, **ela mesma vai editar e gravar o arquivo diretamente no seu projeto.** Apenas relaxe e deixe o motor trabalhar.

---

## 🛡️ O Guardião do Fluxo (Auto-Consciência & Diagnóstico)

Para garantir que o desenvolvimento siga o padrão Spec-as-Code de forma consistente, o Onion possui regras integradas de auto-monitoramento:

*   **Bloqueio de Bypass:** Se você pedir código diretamente sem antes especificar o Produto ou planejar a Engenharia, a IA fará um alerta de auto-consciência lembrando-o de seguir as fases necessárias para manter a qualidade e o sincronismo.
*   **Auto-Diagnóstico (`/status` ou `/health`):** A qualquer momento no chat, você pode digitar `/status` ou `/health`. A IA fará uma varredura completa nas pastas do projeto, validando se a documentação e o código real estão alinhados, retornando um status de saúde do Onion (OK, Desalinhado ou Incompleto) e as ações corretivas.
*   **Chamada por Comando ("Onion" ou `@onion`):** Ao chamar por "Onion" ou digitar `@onion` no chat, você sinaliza explicitamente para o Orquestrador assumir a liderança ativa, analisar o estado atual da conversa e do projeto, e propor o próximo passo lógico ou executar tarefas de sincronização/diagnóstico de forma autônoma.
