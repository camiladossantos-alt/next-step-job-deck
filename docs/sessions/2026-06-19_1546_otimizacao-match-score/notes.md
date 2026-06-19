# Notas e Observações — Otimização do Match Score

## Insights e Aprendizados
- A similaridade léxica local, baseada em um dicionário bem-curado de ~130 habilidades tecnológicas de mercado, provou ser extremamente eficaz para calcular scores sem a latência ou o custo de invocar um LLM a cada mudança de dados.
- O cálculo cronológico local de anos de experiência melhora a confiabilidade do matching de senioridade.

## Próximos Passos
- Monitorar a performance das consultas com a nova resposta do prompt nos testes reais de IA do usuário.
- Se necessário no futuro, permitir que o usuário adicione habilidades customizadas ao dicionário local do cockpit.
