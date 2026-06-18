# Decisões Tomadas — Ajuste para IA Gratuita e Local

## Decisão 1: Provedores de LLM Gratuitos
- **Contexto**: O usuário é o único operador da aplicação e quer que as requisições de IA sejam gratuitas para ele também.
- **Opções Consideradas**:
  - Opção A: Chaves pagas (OpenAI / Gemini Pay-as-you-go).
  - Opção B: Gemini API Free Tier (Google AI Studio) ou Ollama local.
- **Decisão**: Opção B.
- **Justificativa**: A Gemini API oferece um Free Tier com 15 requisições por minuto que cobre com sobras o uso pessoal de busca de vagas. O Ollama rodando localmente garante 100% de privacidade e gratuidade sem necessidade de conexão com a internet ou limite de tokens.
- **Impacto**: O front-end precisará ter suporte para configurar tanto a URL do Ollama (`http://localhost:11434`) quanto a chave de API gratuita do Gemini.
