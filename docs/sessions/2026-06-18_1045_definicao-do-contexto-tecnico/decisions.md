# Decisões Tomadas — Definição do Contexto Técnico

## Decisão 1: Escolha da Stack Tecnológica
- **Contexto**: O projeto necessita de uma implementação simples, barata e ágil para o MVP do Job Search Operating System (JSOS).
- **Opções Consideradas**:
  - Opção A: Next.js + PostgreSQL + Supabase (Framework moderno, mas requer configuração de build e backend com potenciais custos de infraestrutura).
  - Opção B: SPA com HTML5, CSS Vanilla e JavaScript nativo + `localStorage` (Local-First, sem custos de servidor, roda localmente).
- **Decisão**: Opção B (Vanilla HTML/CSS/JS + Local-First).
- **Justificativa**: Garante custo zero de hospedagem e infraestrutura de banco de dados, elimina configurações complexas de build, e simplifica a implementação rápida por IAs agênticas.
- **Impacto**: A persistência é vinculada ao navegador do usuário. O projeto pode ser hospedado gratuitamente em qualquer servidor estático ou rodar localmente.

## Decisão 2: Modelo de IA de Baixo Custo
- **Contexto**: O MVP inclui recursos baseados em LLM (Match Score e Resume Tailoring).
- **Opções Consideradas**:
  - Opção A: Backend com chamadas de IA pagas pelo desenvolvedor.
  - Opção B: Front-end direto conectando com APIs usando a chave do próprio usuário (Bring Your Own Key - BYOK).
- **Decisão**: Opção B.
- **Justificativa**: Remove o custo de faturamento de APIs do desenvolvedor da plataforma, mantendo o sistema 100% gratuito de operar para quem o hospeda.
- **Impacto**: O usuário precisará inserir sua própria chave de API (Gemini/OpenAI) na interface do sistema.
