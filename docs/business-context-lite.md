# Business Context

> Este arquivo é a fonte de verdade para Produto. O agente `@product` atualizará este arquivo quando houver novas descobertas.

## 1. Visão do Produto
O **Next Step - Job Deck** é uma plataforma centralizada para gerenciar toda a busca por emprego. Permite importar vagas, avaliar aderência (Match Score), gerar currículos personalizados (Resume Tailoring), gerenciar prazos e datas de follow-up, e rastrear o andamento de candidaturas através de um pipeline visual integrado, sem a necessidade de planilhas ou ferramentas dispersas.

- **Público-Alvo:** Software Engineers, Product Managers, Designers, Data Professionals aplicando para 30 a 200 vagas por mês.
- **Principal Diferencial:** Centralização operacional completa em uma única tela contendo Match Score, currículo adaptado, timeline histórica e gestão de prazos por vaga.

## 2. Dores do Cliente (Problemas que resolvemos)
- **Vagas Dispersas:** Dificuldade de gerenciar candidaturas divididas entre LinkedIn, Greenhouse, Lever e outros ATS.
- **Acompanhamento Fracionado:** Falta de rastreabilidade do status atual de cada candidatura.
- **Perda de Contexto:** Não saber qual versão do currículo foi enviada para qual vaga ou o histórico de interações.
- **Prazos Perdidos:** Falha ao acompanhar deadlines de testes práticos, entrevistas e datas de follow-up.
- **Falta de Métricas:** Ausência de visibilidade sobre o funil de conversão (vagas aplicadas vs. respostas/entrevistas).

## 3. Backlog de Épicos e Features
| ID | Título | Status | Notas |
|---|---|---|---|
| F-01 | Dashboard Consolidado | Pronto para Dev | Métricas gerais, distribuição por status, alertas de prazos. |
| F-02 | Importação de Vagas | Pronto para Dev | URL do LinkedIn, ATS (Greenhouse, Lever) e cadastro manual. |
| F-03 | Match Score | Pronto para Dev | Comparação por IA entre descrição da vaga e currículo Master. |
| F-04 | Resume Tailoring | Pronto para Dev | Geração e histórico de currículos customizados por vaga. |
| F-05 | Pipeline e Timeline Visual | Pronto para Dev | Rastreamento de etapas (Salva, Analisada, Aplicada, etc.) e histórico de notas. |
| F-06 | Gestão de Prazos e Alertas | Pronto para Dev | Controle de datas para follow-ups, entrevistas e deadlines. |

## 4. Especificações Ativas (Em Detalhe)

### F-01: Dashboard Consolidado
- **User Story:** Como usuário, quero visualizar um painel resumo para ter controle rápido de toda a minha busca por vagas.
- **Regras de Negócio:**
  - Exibir totalizador de vagas ativas.
  - Exibir gráfico ou barra de progresso com a distribuição por status do pipeline.
  - Listar as próximas 3 tarefas ou entrevistas com prazos próximos.
- **Critérios de Aceite:**
  - O dashboard deve atualizar em tempo real quando vagas forem adicionadas/movidas.
  - Alertas visuais coloridos para prazos vencidos ou no dia (vermelho) e próximos (amarelo).

### F-02: Importação de Vagas
- **User Story:** Como usuário, quero cadastrar novas vagas facilmente digitando as informações ou informando um link para agilizar o processo.
- **Regras de Negócio:**
  - O cadastro manual exige: Título do Cargo, Empresa, URL da Vaga (opcional) e Descrição da Vaga (textarea).
  - A importação via link (LinkedIn/ATS) deve carregar um formulário pré-preenchido (ou simular a extração no front-end para evitar bloqueios CORS de requisições diretas).
- **Critérios de Aceite:**
  - Permitir salvar vagas mesmo com a descrição em branco.
  - Nova vaga deve iniciar no status "Salva".

### F-03: Match Score (IA)
- **User Story:** Como usuário, quero comparar meu currículo master com a descrição da vaga para entender meu nível de aderência.
- **Regras de Negócio:**
  - Requer um Currículo Master em formato texto salvo nas Configurações.
  - Se a chave de API (Gemini/Ollama) estiver configurada: faz uma chamada real estruturada retornando Score (0-100), Hard/Soft Skills encontradas, skills ausentes e recomendação de prioridade.
  - Se não houver chave configurada: exibe um modal instruindo a configurar ou simula um cálculo offline para fins de testes.
- **Critérios de Aceite:**
  - O resultado deve ser salvo junto aos dados da vaga no `localStorage`.
  - Exibir indicador visual de score (ex: circular ou barra de progresso colorida).

### F-04: Resume Tailoring (IA)
- **User Story:** Como usuário, quero que o sistema gere sugestões de adaptação do meu currículo baseado na descrição da vaga e skills faltantes.
- **Regras de Negócio:**
  - Envia a descrição da vaga + currículo master + skills ausentes para o LLM.
  - O LLM deve retornar sugestões de bullet points de conquistas adaptados para a vaga.
- **Critérios de Aceite:**
  - Permitir que o usuário copie as sugestões geradas com um clique.
  - Salvar o histórico de currículos adaptados para aquela vaga específica.

### F-05: Pipeline e Timeline Visual
- **User Story:** Como usuário, quero visualizar minhas vagas em um funil Kanban ou lista categorizada e ver o histórico de interações com cada uma delas.
- **Regras de Negócio:**
  - Estágios fixos: 1. Salva, 2. Analisada, 3. Aplicada, 4. Networking, 5. Entrevista, 6. Oferta, 7. Encerrada.
  - Cada vaga deve possuir uma Timeline onde são registradas: data de criação, mudanças de status automáticas, notas adicionadas pelo usuário.
- **Critérios de Aceite:**
  - Permitir mudar o status de uma vaga por um dropdown simples ou botões de ação na timeline.
  - Adicionar notas rápidas com timestamp na timeline da vaga.

### F-06: Gestão de Prazos e Alertas
- **User Story:** Como usuário, quero registrar tarefas importantes (enviar e-mail de follow-up, fazer entrevista, entregar teste) vinculadas a uma vaga e ser alertado sobre elas.
- **Regras de Negócio:**
  - Cada tarefa cadastrada deve possuir Título, Tipo (Follow-up, Teste, Entrevista, Outro) e Data/Hora Limite.
  - Exibir status da tarefa (Pendente, Concluída).
- **Critérios de Aceite:**
  - Notificações ou badges de alerta visuais na tela principal caso existam pendências para o dia de hoje.
