# Knowledge Base: Regras de Matching de Vagas (Perfil vs. Candidato)

## 1. Visão Geral
O Match Score de vagas é o indicador que mede o nível de aderência entre o perfil (ou currículo master) de um candidato e a descrição de uma vaga de emprego (Job Description). Esta documentação detalha as regras de negócio e de engenharia observadas nos principais concorrentes do mercado (como ATS corporativos, LinkedIn, Indeed, Teal e Jobscan) para servir de base na modelagem e implementação do motor de IA do **Next Step - Job Deck**.

---

## 2. Conceitos Chave

### A. Parsing e Normalização (Léxico)
Antes de qualquer comparação, os textos devem ser estruturados e limpos:
* **Tokenização:** Divisão de textos longos em palavras/tokens individuais.
* **Stop Words Removal:** Remoção de conectivos neutros (ex: "e", "de", "com", "o", "a") para focar nas palavras com valor semântico.
* **Stemming / Lemmatization:** Redução de termos a seus radicais ou formas infinitivas (ex: "desenvolvendo", "desenvolvi", "desenvolvedores" viram "desenvolver" ou "desenvolvedor").
* **Sensibilidade à formatação:** ATS tradicionais descartam layouts de duas colunas, tabelas internas e imagens para evitar falhas de leitura.

### B. Similaridade Estatística vs. Semântica
* **TF-IDF (Term Frequency-Inverse Document Frequency):** Mede a relevância estatística de termos específicos no currículo comparados ao anúncio. Dá mais peso a termos raros e importantes (como *"Kubernetes"*, *"Svelte"*) e menor peso a termos comuns (como *"experiência"*, *"trabalho"*).
* **Similaridade de Cosseno (Cosine Similarity):** Compara a direção de dois vetores de palavras (Vaga vs. Currículo) ignorando o tamanho do documento. É a métrica padrão para identificar sobreposição textual.
* **Embeddings Semânticos:** Uso de IA (como Gemini ou BERT) para analisar o significado das frases, permitindo reconhecer sinônimos (ex: *"C# Developer"* é equivalente a *"Engenheiro .NET"*).

### C. Heurísticas e Ponderação de Pesos (Business Rules)
Os concorrentes aplicam fatores multiplicadores ou penalidades sobre a pontuação matemática direta:
* **Hard Skills (Peso Majoritário ~45-50%):** Habilidades técnicas obrigatórias citadas na vaga.
* **Job Title Alignment (Peso ~25%):** Relação entre o título pretendido e o cargo atual/anterior.
* **Tempo de Experiência/Senioridade (Peso ~20%):** Diferença entre anos de experiência exigidos e reais.
* **Métricas de Performance / Estilo (Peso ~10%):** Presença de conquistas quantificáveis (dados com `%` ou `$`).

---

## 3. Exemplos Práticos

### A. Exemplo de Cálculo da Similaridade Léxica Simples (JavaScript)
Trecho conceitual para rodar no frontend/servidor offline de forma rápida antes de invocar a IA:

```javascript
// Remove pontuação, converte para minúsculo e filtra palavras comuns
function preprocessText(text) {
  const stopWords = new Set(['e', 'o', 'a', 'de', 'para', 'em', 'com', 'um', 'uma', 'os', 'as', 'do', 'da']);
  return text
    .toLowerCase()
    .replace(/[^\w\sа-я]/gi, ' ') // remove caracteres especiais
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Calcula o coeficiente de similaridade de Jaccard (interseção sobre união)
function calculateBasicMatch(resumeText, jobDescriptionText) {
  const resumeTokens = new Set(preprocessText(resumeText));
  const jobTokens = new Set(preprocessText(jobDescriptionText));
  
  if (jobTokens.size === 0) return 0;
  
  let intersectionCount = 0;
  for (const token of jobTokens) {
    if (resumeTokens.has(token)) {
      intersectionCount++;
    }
  }
  
  return Math.round((intersectionCount / jobTokens.size) * 100);
}
```

### B. Prompt Estruturado para Análise Semântica via LLM (Gemini / Ollama)
Formato de entrada recomendado para que o módulo `ai.js` envie ao LLM para obter o score de matching estruturado:

```markdown
Você é o motor de Matching de Candidaturas do Next Step - Job Deck.
Sua tarefa é analisar o Currículo Master do usuário em relação à Descrição de Vaga fornecida.

[CURRÍCULO MASTER]
{currículoMaster}

[DESCRIÇÃO DA VAGA]
{jobDescription}

Retorne estritamente um JSON estruturado seguindo o schema abaixo (sem tags de código além de json):
{
  "matchScore": <número de 0 a 100>,
  "jobTitleAnalysis": {
    "targetTitle": "Título da Vaga",
    "candidateTitle": "Título do Candidato",
    "match": true/false,
    "feedback": "Explicação breve"
  },
  "skillsAnalysis": {
    "matchedHardSkills": ["skill1", "skill2"],
    "missingHardSkills": ["skill3"],
    "matchedSoftSkills": ["skill4"],
    "missingSoftSkills": ["skill5"]
  },
  "experienceAnalysis": {
    "requiredYears": <número>,
    "candidateYears": <número>,
    "feedback": "Comentário sobre senioridade"
  },
  "structuralImprovements": [
    "Adicionar métrica X",
    "Ajustar formatação da seção Y"
  ]
}
```

---

## 4. Armadilhas (Gotchas)

> [!CAUTION]
> * **Keyword Stuffing (Excesso de Termos):** Se o algoritmo pontuar apenas por volume absoluto, o candidato pode burlar inserindo uma lista invisível de keywords em branco. Sempre normalize a contagem ou valide a presença dos termos dentro do contexto das conquistas.
> * **Alucinação de Senioridade:** Modelos de linguagem podem inferir erradamente os anos de experiência a partir da data de graduação ou estágios. É vital validar as datas de início e fim declaradas no currículo master.
> * **Falsos Negativos por Formatação:** Se o parser converter um PDF de duas colunas misturando as linhas da esquerda com as da direita, a IA lerá frases sem nexo (ex: *"Projetou APIs Gerenciou equipes de DevOps"*). Mantenha a recomendação de que o Currículo Master seja inserido em texto limpo nas Configurações.
