# Technical Context

> Este arquivo é a fonte de verdade para Engenharia. O agente `@engineer` atualizará este arquivo quando houver mudanças na arquitetura.

## 1. Stack Tecnológica
- **Linguagem:** HTML5, JavaScript (ES6+), CSS3 (Vanilla com Variáveis Modernas)
- **Framework/Arquitetura:** Vanilla SPA (Single Page Application) estruturada em módulos JavaScript nativos. Sem ferramentas de build (Vite/Webpack), permitindo carregamento instantâneo e 0 custo de build/configuração.
- **Banco de Dados:** Local-First utilizando a API `localStorage` do navegador para persistência de dados (vagas, configurações, histórico). 0 custo de banco de dados.
- **Processamento de IA:** 100% gratuito para o usuário final por meio de duas opções configuráveis localmente: (1) **Gemini API Free Tier** (utilizando uma chave gratuita obtida no Google AI Studio, que oferece limites de uso generosos sem custo) ou (2) conexão com servidor local **Ollama** (rodando modelos localmente no próprio computador do usuário via `http://localhost:11434` com privacidade total).
- **Hospedagem:** Hospedagem estática gratuita (Vercel, Netlify, GitHub Pages) ou execução direta local offline.

## 2. Padrões de Código (Code Standards)
- **Organização:** Estrutura modular separando visual (HTML/CSS), lógica de dados (`storage.js`) e integração externa (`ai.js`).
- **Nomenclatura:** Arquivos em *kebab-case* (ex: `match-score.js`). Classes e funções em *camelCase*.
- **Variáveis de Estilo:** Todas as cores, espaçamentos e transições declarados como variáveis CSS no `:root` em `styles.css`.
- **Qualidade:** Código livre de dependências externas pesadas. Preferência por bibliotecas leves carregadas via CDN quando estritamente necessário (ex: biblioteca de gráficos simples para o dashboard).

## 3. Arquitetura Lógica (Visão Simplificada)
```mermaid
graph TD
    subgraph Browser (Cliente)
        UI[Interface HTML/CSS] <--> JS[Orquestrador JS - app.js]
        JS <--> Storage[(localStorage)]
        JS <--> AI[Módulo IA - ai.js]
    end
    subgraph APIs Externas
        AI <--> LLM[API Gemini / OpenAI - BYOK]
    end
```

## 4. Planos de Implementação Ativos

### Plano de Implementação Unificado: JSOS MVP (1 Hora)

#### Objetivos
Desenvolver a aplicação completa do Job Search Operating System (JSOS) estruturada em 3 arquivos principais (sem build), focando em performance, custo zero e uma interface moderna (dark mode, glassmorphism, HSL).

#### Arquivos a Criar
1. **[index.html](file:///c:/Users/Pulse Mais/OneDrive/Central-vagas/onion-portable/index.html)**: Estrutura HTML da SPA contendo:
   - Header superior com Logo 🧅, contador de vagas e botão de configurações.
   - Navegação lateral/superior (Dashboard, Pipeline/Vagas, Configurações).
   - Abas dinâmicas controladas via JS.
   - Modais (Cadastro de Vaga, Detalhes da Vaga com Timeline/Match Score, e Alertas).
2. **[css/styles.css](file:///c:/Users/Pulse Mais/OneDrive/Central-vagas/onion-portable/css/styles.css)**: Estilos vanilla CSS incluindo:
   - Design System baseado em variáveis HSL (Tema escuro e elegante).
   - Glassmorphism (`backdrop-filter`) para painéis e modais.
   - Layout responsivo (CSS Grid para o Dashboard e Flexbox para Kanban/Listas).
   - Transições suaves e micro-animações de hover.
3. **[js/app.js](file:///c:/Users/Pulse Mais/OneDrive/Central-vagas/onion-portable/js/app.js)**: Lógica principal da aplicação agrupada em módulos lógicos internos:
   - `StorageManager`: Roda o CRUD de vagas no LocalStorage, salvando vagas, tarefas, timeline e configurações.
   - `AIEngine`: Conecta via fetch direto à API do Gemini Free ou Ollama local para as rotinas de Match Score e Resume Tailoring.
   - `UIManager`: Renderiza os dados nas telas, gerencia a navegação da SPA e os modais interativos.

#### Checklist de Execução
- [ ] Passo 1: Criar a estrutura base de arquivos e a folha de estilos (`css/styles.css`) com as definições de tema e layout.
- [ ] Passo 2: Criar o entrypoint (`index.html`) com todos os esqueletos de layouts e modais.
- [ ] Passo 3: Criar o script (`js/app.js`) contendo o gerenciador de Storage, roteamento dinâmico e eventos.
- [ ] Passo 4: Implementar a lógica de renderização do Dashboard (Estatísticas, Alertas de prazos) e do Pipeline Kanban (F-01 e F-05).
- [ ] Passo 5: Implementar a funcionalidade de Importação e cadastro de vaga (F-02) e Notas/Timeline (F-05).
- [ ] Passo 6: Implementar o painel de configurações (BYOK / Master Resume) e a lógica de Match Score / Tailoring (F-03, F-04) com a Gemini API / Ollama.
- [ ] Passo 7: Validação local das rotinas e finalização do MVP.
