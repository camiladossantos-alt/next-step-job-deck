// ==========================================
// Next Step - Job Deck — Job Search Tracker & AI Cockpit
// Main Orchestration, Sync & Integrations
// ==========================================

import { SupabaseDB } from './supabase-db.js';
import { GoogleCalendar } from './google-calendar.js';

// --- UTILS & INITIAL SEED DATA ---
const STAGES = ["Salva", "Analisada", "Aplicada", "Networking", "Entrevista", "Oferta", "Encerrada"];

const DEFAULT_CONFIG = {
    provider: "gemini",
    geminiKey: "",
    ollamaHost: "http://localhost:11434",
    ollamaModel: "gemma2",
    masterResume: "",
    supabaseUrl: "",
    supabaseKey: "",
    googleClientId: ""
};

// --- STAGE CHANGER TIMELINES ---
function logToConsole(message, type = "info") {
    const consoleEl = document.getElementById("api-logs-console");
    if (!consoleEl) return;
    
    const entry = document.createElement("div");
    entry.className = "api-log-entry";
    
    let color = "var(--primary-light)";
    if (type === "success") color = "var(--success)";
    if (type === "error") color = "var(--danger)";
    if (type === "warning") color = "var(--warning)";
    
    const now = new Date().toLocaleTimeString();
    entry.innerHTML = `<span style="color: var(--text-muted); font-size: 0.7rem;">[${now}]</span> <span style="color: ${color};">${message}</span>`;
    
    consoleEl.appendChild(entry);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

// Expose logging helper globally for other modules
window.logToConsole = logToConsole;

// ==========================================
// 1. STORAGE MANAGER (Hybrid Local/Supabase)
// ==========================================
const StorageManager = {
    getLocalJobs() {
        const data = localStorage.getItem("jsos_jobs");
        return data ? JSON.parse(data) : [];
    },
    
    saveLocalJobs(jobs) {
        localStorage.setItem("jsos_jobs", JSON.stringify(jobs));
    },
    
    async getJobs() {
        const user = await SupabaseDB.getCurrentUser();
        if (user) {
            try {
                return await SupabaseDB.getJobs();
            } catch (e) {
                logToConsole(`Erro ao buscar vagas do Supabase: ${e.message}. Usando dados locais.`, "error");
            }
        }
        return this.getLocalJobs();
    },
    
    async getJob(id) {
        const jobs = await this.getJobs();
        return jobs.find(j => j.id === id);
    },
    
    async addJob(jobData) {
        // Create local format
        const newJob = {
            id: 'job_' + Date.now(),
            title: jobData.title,
            company: jobData.company,
            url: jobData.url || "",
            description: jobData.description || "",
            status: jobData.status || "Salva",
            createdDate: new Date().toISOString(),
            matchScore: jobData.matchScore || { score: null, found: [], missing: [], recommendation: "" },
            tailoredResume: jobData.tailoredResume || "",
            tasks: jobData.tasks || [],
            timeline: jobData.timeline || [
                { date: new Date().toISOString(), text: `Vaga cadastrada no status: ${jobData.status || "Salva"}` }
            ]
        };
        
        // Save local anyway (offline cache)
        const localJobs = this.getLocalJobs();
        localJobs.push(newJob);
        this.saveLocalJobs(localJobs);
        
        // Save to Supabase if logged in
        const user = await SupabaseDB.getCurrentUser();
        if (user) {
            try {
                await SupabaseDB.addJob(newJob);
                if (newJob.tasks.length > 0) {
                    await SupabaseDB.syncTasks(newJob.id, newJob.tasks);
                }
            } catch (e) {
                logToConsole(`Erro ao salvar vaga no Supabase: ${e.message}`, "error");
            }
        }
        
        return newJob;
    },
    
    async updateJob(id, updatedFields) {
        // Update local cache
        const localJobs = this.getLocalJobs();
        const localIndex = localJobs.findIndex(j => j.id === id);
        
        if (localIndex !== -1) {
            if (updatedFields.status && localJobs[localIndex].status !== updatedFields.status) {
                localJobs[localIndex].timeline.push({
                    date: new Date().toISOString(),
                    text: `Status alterado de "${localJobs[localIndex].status}" para "${updatedFields.status}"`
                });
            }
            
            localJobs[localIndex] = { ...localJobs[localIndex], ...updatedFields };
            this.saveLocalJobs(localJobs);
            
            // Sync to Supabase
            const user = await SupabaseDB.getCurrentUser();
            if (user) {
                try {
                    // Re-inject updated timeline in mapped update
                    const fields = { ...updatedFields };
                    if (updatedFields.status) fields.timeline = localJobs[localIndex].timeline;
                    await SupabaseDB.updateJob(id, fields);
                } catch (e) {
                    logToConsole(`Erro ao atualizar vaga no Supabase: ${e.message}`, "error");
                }
            }
            return localJobs[localIndex];
        }
        return null;
    },
    
    async deleteJob(id) {
        // Delete locally
        let localJobs = this.getLocalJobs();
        localJobs = localJobs.filter(j => j.id !== id);
        this.saveLocalJobs(localJobs);
        
        // Delete from Supabase
        const user = await SupabaseDB.getCurrentUser();
        if (user) {
            try {
                await SupabaseDB.deleteJob(id);
            } catch (e) {
                logToConsole(`Erro ao deletar vaga no Supabase: ${e.message}`, "error");
            }
        }
    },
    
    async syncTasks(jobId, tasks) {
        const user = await SupabaseDB.getCurrentUser();
        if (user) {
            try {
                await SupabaseDB.syncTasks(jobId, tasks);
            } catch (e) {
                logToConsole(`Erro ao sincronizar tarefas no Supabase: ${e.message}`, "error");
            }
        }
    },
    
    getConfig() {
        const data = localStorage.getItem("jsos_config");
        return data ? { ...DEFAULT_CONFIG, ...JSON.parse(data) } : DEFAULT_CONFIG;
    },
    
    saveConfig(config) {
        localStorage.setItem("jsos_config", JSON.stringify(config));
    }
};

// ==========================================
// 2. AI ENGINE (Gemini Free API & Ollama)
// ==========================================
const AIEngine = {
    async calculateMatchScore(jobDescription, masterResume) {
        const config = StorageManager.getConfig();
        const prompt = `
Você é um especialista em recrutamento e seleção (ATS). Compare o Currículo Master abaixo com a Descrição da Vaga e calcule a aderência.

=== DESCRIÇÃO DA VAGA ===
${jobDescription}

=== CURRÍCULO MASTER ===
${masterResume}

=== REQUISITOS DE SAÍDA ===
Você DEVE responder APENAS com um objeto JSON válido, sem tags markdown, sem explicações externas, no seguinte formato exato:
{
  "score": 85,
  "foundSkills": ["HabilidadeEncontrada1", "HabilidadeEncontrada2"],
  "missingSkills": ["HabilidadeFaltante1", "HabilidadeFaltante2"],
  "recommendation": "Uma dica curta e objetiva de como o candidato pode otimizar o currículo para esta vaga."
}
        `.trim();

        logToConsole(`Iniciando análise de Match Score usando o provedor: ${config.provider}...`);
        
        try {
            let jsonText = "";
            if (config.provider === "gemini" && config.geminiKey) {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || "Erro na API do Gemini");
                }
                
                const resData = await response.json();
                jsonText = resData.candidates[0].content.parts[0].text;
            } else if (config.provider === "ollama") {
                const response = await fetch(`${config.ollamaHost}/api/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: config.ollamaModel,
                        prompt: prompt,
                        stream: false
                    })
                });
                
                if (!response.ok) throw new Error("Erro de comunicação com o Ollama local");
                const resData = await response.json();
                jsonText = resData.response;
            } else {
                logToConsole("Configuração de IA ausente. Executando simulação offline de teste.", "warning");
                return this._simulateOfflineMatchScore(jobDescription, masterResume);
            }
            
            jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
            const result = JSON.parse(jsonText);
            logToConsole("Match Score calculado com sucesso!", "success");
            return result;
            
        } catch (e) {
            logToConsole(`Erro no motor de IA: ${e.message}. Executando simulação offline.`, "error");
            return this._simulateOfflineMatchScore(jobDescription, masterResume);
        }
    },
    
    async generateTailoredResume(jobDescription, masterResume, missingSkills) {
        const config = StorageManager.getConfig();
        const prompt = `
Você é um redator profissional de currículos. Com base na Descrição da Vaga e no Currículo Master, ajude a customizar o currículo.
Escreva de 3 a 5 bullet points de conquistas profissionais ideais para incluir no currículo para demonstrar aderência às seguintes habilidades ausentes ou críticas: ${missingSkills.join(", ")}.

=== DESCRIÇÃO DA VAGA ===
${jobDescription}

=== CURRÍCULO MASTER ===
${masterResume}

=== INSTRUÇÕES ===
Escreva os bullets focando em impacto quantificável e alinhamento com os requisitos da vaga.
Responda diretamente com os bullets formatados em Markdown. Sem prefácios ou explicações adicionais.
        `.trim();

        logToConsole("Gerando Resume Tailoring...");
        
        try {
            let output = "";
            if (config.provider === "gemini" && config.geminiKey) {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                
                if (!response.ok) throw new Error("Erro na API do Gemini");
                const resData = await response.json();
                output = resData.candidates[0].content.parts[0].text;
            } else if (config.provider === "ollama") {
                const response = await fetch(`${config.ollamaHost}/api/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: config.ollamaModel,
                        prompt: prompt,
                        stream: false
                    })
                });
                
                if (!response.ok) throw new Error("Erro de comunicação com o Ollama local");
                const resData = await response.json();
                output = resData.response;
            } else {
                logToConsole("Configuração de IA ausente. Simulando adaptação offline.", "warning");
                return this._simulateOfflineResumeTailor(missingSkills);
            }
            
            logToConsole("Bullets customizados gerados!", "success");
            return output.trim();
        } catch (e) {
            logToConsole(`Erro ao gerar Resume Tailoring: ${e.message}`, "error");
            return this._simulateOfflineResumeTailor(missingSkills);
        }
    },
    
    _simulateOfflineMatchScore(jobDescription, masterResume) {
        if (!jobDescription || !masterResume) {
            return {
                score: 35,
                foundSkills: ["Comunicação"],
                missingSkills: ["Requisitos Técnicos", "Provedor de IA não configurado"],
                recommendation: "Configure sua API Key nas Configurações ou preencha a descrição da vaga/currículo master para obter o Match Score real via LLM."
            };
        }
        const jdWords = jobDescription.toLowerCase().split(/\W+/);
        const resumeWords = masterResume.toLowerCase().split(/\W+/);
        const commonSkills = ["javascript", "html", "css", "git", "react", "node", "sql", "api", "scrum", "python"];
        const found = commonSkills.filter(s => jdWords.includes(s) && resumeWords.includes(s));
        const missing = commonSkills.filter(s => jdWords.includes(s) && !resumeWords.includes(s));
        const score = Math.min(100, Math.max(30, 40 + (found.length * 10) - (missing.length * 3)));
        return {
            score: Math.round(score),
            foundSkills: found.map(s => s.toUpperCase()),
            missingSkills: missing.map(s => s.toUpperCase()).concat(["IA OFFLINE"]),
            recommendation: "[Simulado Offline] Insira sua chave gratuita do Gemini API nas Configurações para obter uma análise semântica e detalhada."
        };
    },
    
    _simulateOfflineResumeTailor(missingSkills) {
        return `
### [Sugestão Offline] Bullets sugeridos para o currículo:
* Concepção e desenvolvimento de soluções focando nas habilidades críticas requisitadas (${missingSkills.slice(0, 3).join(", ") || "Habilidades Técnicas"}).
* Colaboração em equipes ágeis para a entrega contínua de software de alta performance, minimizando lacunas de design.
* Otimização de fluxos e integração com sistemas legados, agregando valor e impulsionando a eficiência operacional.

_Nota: Insira sua chave de API nas configurações para gerar bullets semânticos reais adaptados por IA._
        `.trim();
    }
};

// ==========================================
// 3. UI MANAGER & CONTROLLERS (UIManager)
// ==========================================
let currentActiveJobId = null;
let isAuthSignUpMode = false;

const UIManager = {
    async init() {
        this.bindEvents();
        this.loadSettingsForm();
        
        // Initialize cloud connectors if creds exist
        const config = StorageManager.getConfig();
        if (config.supabaseUrl && config.supabaseKey) {
            const ok = SupabaseDB.init(config.supabaseUrl, config.supabaseKey);
            if (ok) {
                logToConsole("Módulo Supabase conectado.");
                // Sync session
                const session = await SupabaseDB.getSession();
                if (session) {
                    logToConsole(`Usuário logado: ${session.user.email}`, "success");
                    // Auto migrate local jobs to cloud
                    const localJobs = StorageManager.getLocalJobs();
                    await SupabaseDB.migrateLocalData(localJobs);
                }
            }
        }
        
        if (config.googleClientId) {
            const ok = GoogleCalendar.init(config.googleClientId);
            if (ok) {
                logToConsole("Módulo Google OAuth inicializado.");
                this.updateGcalButtonVisibility();
            }
        }
        
        this.renderAll();
        document.getElementById("modal-job-details").classList.remove("open");
        document.getElementById("modal-auth").classList.remove("open");
    },
    
    bindEvents() {
        // Tab Navigation
        document.querySelectorAll(".nav-link").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const tabName = link.getAttribute("data-tab");
                this.switchTab(tabName);
            });
        });
        
        // Add Job Modal Triggers
        document.getElementById("btn-add-job-trigger").addEventListener("click", () => {
            this.openJobModal();
        });
        
        document.getElementById("btn-close-new-job-modal").addEventListener("click", () => {
            this.closeJobModal();
        });
        
        document.getElementById("btn-cancel-job-save").addEventListener("click", () => {
            this.closeJobModal();
        });
        
        // Save Job Form Submit
        document.getElementById("btn-submit-job-save").addEventListener("click", () => {
            this.handleJobSave();
        });
        
        // Details Modal Close
        document.getElementById("btn-close-details-modal").addEventListener("click", () => {
            document.getElementById("modal-job-details").classList.remove("open");
            this.renderAll();
        });
        
        // Auth Modal Close
        document.getElementById("btn-close-auth-modal").addEventListener("click", () => {
            document.getElementById("modal-auth").classList.remove("open");
        });
        
        // Header Profile Modal Trigger
        document.getElementById("btn-header-profile-trigger").addEventListener("click", async () => {
            const session = await SupabaseDB.getSession();
            if (session) {
                document.getElementById("auth-modal-title").innerText = "Sua Conta (Nuvem)";
                document.getElementById("form-auth").innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto 12px; color: var(--action-blue);"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                        <p style="font-size: 0.95rem; color: var(--text-primary); margin-bottom: 4px;">Logado como:</p>
                        <strong style="color: var(--primary-light); font-size: 1rem; word-break: break-all;">${session.user.email}</strong>
                    </div>
                    <button type="button" class="btn btn-danger" id="btn-modal-logout" style="width: 100%; justify-content: center; margin-top: 16px;">Sair / Desconectar</button>
                `;
                
                document.getElementById("btn-modal-logout").addEventListener("click", async () => {
                    await SupabaseDB.signOut();
                    logToConsole("Sessão online encerrada. Modo local ativo.", "info");
                    document.getElementById("modal-auth").classList.remove("open");
                    UIManager.renderAll();
                });
            } else {
                document.getElementById("auth-modal-title").innerText = "Entrar na Nuvem";
                document.getElementById("form-auth").innerHTML = `
                    <div class="form-group">
                        <label class="form-label" for="auth-email">E-mail</label>
                        <input type="email" class="form-input" id="auth-email" required placeholder="seu@email.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="auth-password">Senha</label>
                        <input type="password" class="form-input" id="auth-password" required placeholder="******">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
                        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;" id="btn-auth-submit">Entrar</button>
                        <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: center;" id="btn-auth-toggle">Criar uma conta nova</button>
                    </div>
                `;
                
                isAuthSignUpMode = false;
                document.getElementById("btn-auth-toggle").addEventListener("click", () => {
                    isAuthSignUpMode = !isAuthSignUpMode;
                    const submitBtn = document.getElementById("btn-auth-submit");
                    const toggleBtn = document.getElementById("btn-auth-toggle");
                    const title = document.getElementById("auth-modal-title");
                    
                    if (isAuthSignUpMode) {
                        title.innerText = "Criar Nova Conta";
                        submitBtn.innerText = "Cadastrar";
                        toggleBtn.innerText = "Já tem conta? Fazer Login";
                    } else {
                        title.innerText = "Entrar na Nuvem";
                        submitBtn.innerText = "Entrar";
                        toggleBtn.innerText = "Criar uma conta nova";
                    }
                });
            }
            document.getElementById("modal-auth").classList.add("open");
        });
        
        // Auth Submit Form
        document.getElementById("form-auth").addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.handleAuthSubmit();
        });
        

        
        // Settings Provider Toggle
        document.getElementById("ai-provider").addEventListener("change", (e) => {
            const val = e.target.value;
            if (val === "gemini") {
                document.getElementById("group-gemini-key").style.display = "block";
                document.getElementById("group-ollama-host").style.display = "none";
            } else {
                document.getElementById("group-gemini-key").style.display = "none";
                document.getElementById("group-ollama-host").style.display = "block";
            }
        });
        
        // Settings Form Submit
        document.getElementById("config-api-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleSettingsSave();
        });
        
        // Cloud Credentials Form Submit
        document.getElementById("config-cloud-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleCloudSettingsSave();
        });
        
        // Google Calendar OAuth Connect
        document.getElementById("btn-connect-gcal").addEventListener("click", () => {
            if (GoogleCalendar.isConnected()) {
                GoogleCalendar.disconnect();
                this.updateGcalButtonVisibility();
            } else {
                GoogleCalendar.requestPermission(() => {
                    this.updateGcalButtonVisibility();
                });
            }
        });
        
        // Detail Actions: Status Change
        document.getElementById("detail-status-select").addEventListener("change", async (e) => {
            if (currentActiveJobId) {
                await StorageManager.updateJob(currentActiveJobId, { status: e.target.value });
                this.renderJobDetails(currentActiveJobId);
                logToConsole(`Status da vaga atualizado para: ${e.target.value}`, "info");
            }
        });
        
        // Detail Actions: Delete
        document.getElementById("btn-delete-job").addEventListener("click", async () => {
            if (currentActiveJobId && confirm("Deseja realmente excluir esta vaga?")) {
                await StorageManager.deleteJob(currentActiveJobId);
                document.getElementById("modal-job-details").classList.remove("open");
                logToConsole("Vaga excluída com sucesso.", "warning");
                this.renderAll();
            }
        });
        
        // AI: Run Match Score
        document.getElementById("btn-run-match-score").addEventListener("click", async () => {
            if (currentActiveJobId) {
                const job = await StorageManager.getJob(currentActiveJobId);
                const config = StorageManager.getConfig();
                
                document.getElementById("match-score-gauge-box").innerHTML = `
                    <div style="text-align: center; color: var(--primary-light);">
                        <div class="spinner" style="width: 24px; height: 24px; border: 3px solid var(--border-color); border-top-color: var(--action-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px;"></div>
                        Processando Análise por IA...
                    </div>
                `;
                
                const scoreResult = await AIEngine.calculateMatchScore(job.description, config.masterResume);
                await StorageManager.updateJob(currentActiveJobId, { matchScore: scoreResult });
                this.renderJobDetails(currentActiveJobId);
            }
        });
        
        // AI: Run Resume Tailor
        document.getElementById("btn-run-resume-tailor").addEventListener("click", async () => {
            if (currentActiveJobId) {
                const job = await StorageManager.getJob(currentActiveJobId);
                const config = StorageManager.getConfig();
                const skills = job.matchScore?.missingSkills || ["Requisitos Gerais"];
                
                document.getElementById("resume-tailoring-box").innerHTML = `
                    <div style="text-align: center; color: var(--primary-light);">
                        <div class="spinner" style="width: 24px; height: 24px; border: 3px solid var(--border-color); border-top-color: var(--action-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px;"></div>
                        Gerando adaptações...
                    </div>
                `;
                
                const tailorOutput = await AIEngine.generateTailoredResume(job.description, config.masterResume, skills);
                await StorageManager.updateJob(currentActiveJobId, { tailoredResume: tailorOutput });
                this.renderJobDetails(currentActiveJobId);
            }
        });
        
        // Detail Actions: Add Task
        document.getElementById("btn-add-task-submit").addEventListener("click", async () => {
            const titleInput = document.getElementById("new-task-title-input");
            const dateInput = document.getElementById("new-task-date-input");
            
            if (currentActiveJobId && titleInput.value.trim()) {
                const job = await StorageManager.getJob(currentActiveJobId);
                
                const newTask = {
                    id: 'task_' + Date.now(),
                    title: titleInput.value.trim(),
                    date: dateInput.value || new Date().toISOString().split('T')[0],
                    completed: false,
                    googleEventId: null
                };
                
                // Add event to Google Calendar if connected
                if (GoogleCalendar.isConnected()) {
                    try {
                        logToConsole("Enviando evento para o Google Calendar...");
                        const eventId = await GoogleCalendar.addEvent(newTask.title, newTask.date, job.title, job.company);
                        newTask.googleEventId = eventId;
                    } catch (err) {
                        logToConsole("Falha ao integrar com Google Calendar: " + err.message, "error");
                    }
                }
                
                const tasks = [...(job.tasks || []), newTask];
                await StorageManager.updateJob(currentActiveJobId, { tasks });
                await StorageManager.syncTasks(currentActiveJobId, tasks);
                
                titleInput.value = "";
                dateInput.value = "";
                this.renderJobDetails(currentActiveJobId);
                logToConsole(`Tarefa criada: "${newTask.title}"`, "success");
            }
        });
        
        // Detail Actions: Add Note
        document.getElementById("btn-add-note-submit").addEventListener("click", async () => {
            const input = document.getElementById("new-note-text-input");
            if (currentActiveJobId && input.value.trim()) {
                const job = await StorageManager.getJob(currentActiveJobId);
                const timeline = [...(job.timeline || [])];
                timeline.push({
                    date: new Date().toISOString(),
                    text: `Anotação: ${input.value.trim()}`
                });
                
                await StorageManager.updateJob(currentActiveJobId, { timeline });
                input.value = "";
                this.renderJobDetails(currentActiveJobId);
                logToConsole("Anotação adicionada à timeline.", "success");
            }
        });
    },
    
    async handleAuthSubmit() {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;
        
        if (!email || !password) return;
        
        try {
            if (isAuthSignUpMode) {
                logToConsole("Registrando conta...");
                await SupabaseDB.signUp(email, password);
                logToConsole("Conta criada com sucesso! Faça login para começar.", "success");
                alert("Conta criada! Agora faça o login com suas credenciais.");
                isAuthSignUpMode = false;
                document.getElementById("btn-auth-toggle").click();
            } else {
                logToConsole("Autenticando...");
                await SupabaseDB.signIn(email, password);
                logToConsole("Sessão iniciada na nuvem!", "success");
                document.getElementById("modal-auth").classList.remove("open");
                
                // Migrate local jobs to cloud on login
                const localJobs = StorageManager.getLocalJobs();
                await SupabaseDB.migrateLocalData(localJobs);
                
                this.renderAll();
            }
        } catch (e) {
            logToConsole("Erro de autenticação: " + e.message, "error");
            alert("Erro: " + e.message);
        }
    },
    
    switchTab(tabName) {
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("data-tab") === tabName) link.classList.add("active");
        });
        
        document.querySelectorAll(".tab-content").forEach(content => {
            content.classList.remove("active");
        });
        
        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) activeTab.classList.add("active");
        
        document.getElementById("page-title-label").innerText = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        
        this.renderAll();
    },
    
    async openJobModal(jobId = null) {
        const modal = document.getElementById("modal-new-job");
        const form = document.getElementById("form-job-editor");
        form.reset();
        
        if (jobId) {
            const job = await StorageManager.getJob(jobId);
            document.getElementById("edit-job-id").value = job.id;
            document.getElementById("job-title-input").value = job.title;
            document.getElementById("job-company-input").value = job.company;
            document.getElementById("job-url-input").value = job.url;
            document.getElementById("job-status-input").value = job.status;
            document.getElementById("job-description-input").value = job.description;
            document.getElementById("modal-new-job-title").innerText = "Editar Vaga";
        } else {
            document.getElementById("edit-job-id").value = "";
            document.getElementById("modal-new-job-title").innerText = "Nova Vaga";
        }
        
        modal.classList.add("open");
    },
    
    closeJobModal() {
        document.getElementById("modal-new-job").classList.remove("open");
    },
    
    async handleJobSave() {
        const id = document.getElementById("edit-job-id").value;
        const title = document.getElementById("job-title-input").value.trim();
        const company = document.getElementById("job-company-input").value.trim();
        const url = document.getElementById("job-url-input").value.trim();
        const status = document.getElementById("job-status-input").value;
        const description = document.getElementById("job-description-input").value.trim();
        
        if (!title || !company) {
            alert("Título e Empresa são obrigatórios.");
            return;
        }
        
        const jobData = { title, company, url, status, description };
        
        if (id) {
            await StorageManager.updateJob(id, jobData);
            logToConsole(`Vaga "${title}" na empresa "${company}" editada com sucesso.`, "success");
        } else {
            await StorageManager.addJob(jobData);
            logToConsole(`Nova vaga "${title}" adicionada.`, "success");
        }
        
        this.closeJobModal();
        this.renderAll();
    },
    
    loadSettingsForm() {
        const config = StorageManager.getConfig();
        document.getElementById("ai-provider").value = config.provider;
        document.getElementById("gemini-key").value = config.geminiKey || "";
        document.getElementById("ollama-host").value = config.ollamaHost || "http://localhost:11434";
        document.getElementById("ollama-model").value = config.ollamaModel || "gemma2";
        document.getElementById("master-resume").value = config.masterResume || "";
        
        // Cloud Creds
        document.getElementById("supabase-url").value = config.supabaseUrl || "";
        document.getElementById("supabase-key").value = config.supabaseKey || "";
        document.getElementById("google-client-id").value = config.googleClientId || "";
        
        if (config.provider === "gemini") {
            document.getElementById("group-gemini-key").style.display = "block";
            document.getElementById("group-ollama-host").style.display = "none";
        } else {
            document.getElementById("group-gemini-key").style.display = "none";
            document.getElementById("group-ollama-host").style.display = "block";
        }
    },
    
    handleSettingsSave() {
        const config = StorageManager.getConfig();
        const provider = document.getElementById("ai-provider").value;
        const geminiKey = document.getElementById("gemini-key").value.trim();
        const ollamaHost = document.getElementById("ollama-host").value.trim();
        const ollamaModel = document.getElementById("ollama-model").value.trim();
        const masterResume = document.getElementById("master-resume").value.trim();
        
        StorageManager.saveConfig({ ...config, provider, geminiKey, ollamaHost, ollamaModel, masterResume });
        logToConsole("Configurações do sistema e Currículo Master salvos.", "success");
        alert("Configurações salvas!");
    },
    
    handleCloudSettingsSave() {
        const config = StorageManager.getConfig();
        const supabaseUrl = document.getElementById("supabase-url").value.trim();
        const supabaseKey = document.getElementById("supabase-key").value.trim();
        const googleClientId = document.getElementById("google-client-id").value.trim();
        
        StorageManager.saveConfig({ ...config, supabaseUrl, supabaseKey, googleClientId });
        logToConsole("Configurações de credenciais salvas. Inicializando módulos...", "success");
        
        // Re-init modules
        if (supabaseUrl && supabaseKey) {
            const ok = SupabaseDB.init(supabaseUrl, supabaseKey);
            if (ok) logToConsole("Supabase Cloud conectado com sucesso.");
        }
        
        if (googleClientId) {
            const ok = GoogleCalendar.init(googleClientId);
            if (ok) {
                logToConsole("Google Client OAuth conectado.");
                this.updateGcalButtonVisibility();
            }
        }
        alert("Credenciais salvas! Atualize a página se os conectores não ativarem imediatamente.");
        this.renderAll();
    },
    
    updateGcalButtonVisibility() {
        const btn = document.getElementById("btn-connect-gcal");
        if (GoogleCalendar.isInitialized()) {
            btn.style.display = "block";
            if (GoogleCalendar.isConnected()) {
                btn.innerText = "🛑 Desconectar Agenda";
                btn.className = "btn btn-danger";
            } else {
                btn.innerText = "Conectar Google Agenda";
                btn.className = "btn btn-secondary";
            }
        } else {
            btn.style.display = "none";
        }
    },
    
    async renderSidebarFooter() {
        const footerContainer = document.getElementById("sidebar-footer-container");
        if (!footerContainer) return;
        
        const session = await SupabaseDB.getSession();
        if (session) {
            footerContainer.innerHTML = `
                <div class="user-badge" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="user-avatar" style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--muted); border: 1px solid var(--border-color); color: var(--text-primary);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>
                        <div class="user-info" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <h4 style="font-size: 0.78rem;">${session.user.email}</h4>
                            <p style="color: var(--success); font-size: 0.68rem; font-weight: 600;">Sincronizado</p>
                        </div>
                    </div>
                    <button class="btn btn-danger" id="btn-logout" style="width: 100%; font-size: 0.7rem; padding: 4px 8px; margin-top: 8px; justify-content: center;">Sair / Desconectar</button>
                </div>
            `;
            
            // bind logout
            document.getElementById("btn-logout").addEventListener("click", async () => {
                await SupabaseDB.signOut();
                logToConsole("Sessão online encerrada. Modo local ativo.", "info");
                this.renderAll();
            });
        } else {
            footerContainer.innerHTML = `
                <button class="btn btn-secondary" id="btn-login-trigger" style="width: 100%; font-size: 0.78rem; padding: 8px; justify-content: center; display: flex; align-items: center; gap: 6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> Entrar / Sincronizar
                </button>
            `;
            // bind login trigger
            document.getElementById("btn-login-trigger").addEventListener("click", () => {
                document.getElementById("modal-auth").classList.add("open");
            });
        }
    },
    
    async renderAll() {
        await this.renderSidebarFooter();
        await this.renderDashboard();
        await this.renderPipeline();
        this.updateGcalButtonVisibility();
    },
    
    async renderDashboard() {
        const jobs = await this.getJobs();
        const total = jobs.length;
        const applied = jobs.filter(j => ["Aplicada", "Networking", "Entrevista", "Oferta"].includes(j.status)).length;
        const interviews = jobs.filter(j => j.status === "Entrevista").length;
        
        // Find tasks active and close to date
        const allTasks = [];
        const today = new Date().toISOString().split('T')[0];
        
        jobs.forEach(j => {
            if (j.tasks) {
                j.tasks.forEach(t => {
                    if (!t.completed) {
                        allTasks.push({ ...t, jobTitle: j.title, jobCompany: j.company, jobId: j.id });
                    }
                });
            }
        });
        
        // Sort active tasks by date
        allTasks.sort((a, b) => a.date.localeCompare(b.date));
        
        // Badge counter (prazos hoje ou em atraso)
        const alertTasksCount = allTasks.filter(t => t.date <= today).length;
        
        document.getElementById("stat-total-jobs").innerText = total;
        document.getElementById("stat-applied-jobs").innerText = applied;
        document.getElementById("stat-interview-jobs").innerText = interviews;
        document.getElementById("stat-alert-tasks").innerText = alertTasksCount;
        
        // Render Active Tasks list
        const tasksListEl = document.getElementById("dashboard-tasks-list");
        if (allTasks.length === 0) {
            tasksListEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Nenhum prazo pendente. Bom trabalho!</p>`;
        } else {
            tasksListEl.innerHTML = allTasks.slice(0, 5).map(t => {
                const isOverdue = t.date < today;
                const isToday = t.date === today;
                let dateBadgeClass = "";
                if (isOverdue) dateBadgeClass = "style='color: var(--danger); font-weight: bold;'";
                else if (isToday) dateBadgeClass = "style='color: var(--warning); font-weight: bold;'";
                
                return `
                    <div class="task-item" onclick="UIManager.openJobDetails('${t.jobId}')" style="cursor: pointer;">
                        <div class="task-item-left">
                            <span style="display: flex; align-items: center; color: var(--text-secondary);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                            <div>
                                <h4 class="task-title" style="font-size: 0.9rem; font-weight: 600;">${t.title}</h4>
                                <p style="font-size: 0.72rem; color: var(--text-muted);">${t.jobTitle} @ ${t.jobCompany}</p>
                            </div>
                        </div>
                        <span class="task-meta" ${dateBadgeClass}>${t.date}</span>
                    </div>
                `;
            }).join("");
        }
        
        // Render Conversion Funnel Rates
        const funnelContainer = document.getElementById("dashboard-conversion-funnel");
        if (total === 0) {
            funnelContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 10px;">Adicione vagas no pipeline para ver as métricas de conversão.</p>`;
        } else {
            const stageCounts = STAGES.map(s => ({
                stage: s,
                count: jobs.filter(j => j.status === s).length
            }));
            
            funnelContainer.innerHTML = stageCounts.map(sc => {
                const pct = total > 0 ? Math.round((sc.count / total) * 100) : 0;
                return `
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                            <span style="font-weight: 600;">${sc.stage}</span>
                            <span style="color: var(--text-secondary);">${sc.count} vaga(s) (${pct}%)</span>
                        </div>
                        <div style="background: rgba(255, 255, 255, 0.05); height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="background: var(--primary-gradient); width: ${pct}%; height: 100%;"></div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    },
    
    async renderPipeline() {
        const container = document.getElementById("kanban-board-container");
        if (!container) return;
        
        const jobs = await this.getJobs();
        
        container.innerHTML = STAGES.map(stage => {
            const stageJobs = jobs.filter(j => j.status === stage);
            
            const cardsHtml = stageJobs.map(job => {
                const score = job.matchScore?.score;
                let scoreBadge = "";
                if (score !== null && score !== undefined) {
                    let matchClass = "match-low";
                    if (score >= 80) matchClass = "match-high";
                    else if (score >= 60) matchClass = "match-mid";
                    scoreBadge = `<span class="match-badge ${matchClass}">🎯 ${score}%</span>`;
                } else {
                    scoreBadge = `<span class="match-badge match-none">Sem Análise</span>`;
                }
                
                // Active alerts
                let alertsHtml = "";
                const today = new Date().toISOString().split('T')[0];
                const activeTasks = job.tasks?.filter(t => !t.completed) || [];
                const overdueTasks = activeTasks.filter(t => t.date < today);
                const todayTasks = activeTasks.filter(t => t.date === today);
                
                if (overdueTasks.length > 0) {
                    alertsHtml = `<span class="deadline-indicator danger">⚠️ Vencido</span>`;
                } else if (todayTasks.length > 0) {
                    alertsHtml = `<span class="deadline-indicator warning">⏰ Hoje</span>`;
                } else if (activeTasks.length > 0) {
                    activeTasks.sort((a,b) => a.date.localeCompare(b.date));
                    alertsHtml = `<span class="deadline-indicator">${activeTasks[0].date}</span>`;
                }
                
                return `
                    <div class="job-card" onclick="UIManager.openJobDetails('${job.id}')" draggable="true" data-job-id="${job.id}">
                        <div class="job-company">${job.company}</div>
                        <h4 class="job-title">${job.title}</h4>
                        <div class="job-card-footer">
                            ${scoreBadge}
                            ${alertsHtml}
                        </div>
                    </div>
                `;
            }).join("");
            
            return `
                <div class="kanban-column" data-stage="${stage}">
                    <div class="kanban-column-header">
                        <span class="kanban-column-title">${stage}</span>
                        <span class="kanban-count">${stageJobs.length}</span>
                    </div>
                    <div class="kanban-cards">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        }).join("");
        
        this.setupDragAndDrop();
    },
    
    setupDragAndDrop() {
        const cards = document.querySelectorAll(".job-card");
        const columns = document.querySelectorAll(".kanban-column");
        
        cards.forEach(card => {
            card.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", card.getAttribute("data-job-id"));
                card.style.opacity = "0.5";
            });
            
            card.addEventListener("dragend", () => {
                card.style.opacity = "1";
            });
        });
        
        columns.forEach(col => {
            col.addEventListener("dragover", (e) => {
                e.preventDefault();
                col.style.background = "rgba(99, 102, 241, 0.08)";
            });
            
            col.addEventListener("dragleave", () => {
                col.style.background = "rgba(12, 19, 36, 0.45)";
            });
            
            col.addEventListener("drop", async (e) => {
                e.preventDefault();
                col.style.background = "rgba(12, 19, 36, 0.45)";
                const jobId = e.dataTransfer.getData("text/plain");
                const newStage = col.getAttribute("data-stage");
                
                if (jobId && newStage) {
                    await StorageManager.updateJob(jobId, { status: newStage });
                    logToConsole(`Vaga movida para a coluna: "${newStage}"`, "info");
                    this.renderAll();
                }
            });
        });
    },
    
    async openJobDetails(id) {
        currentActiveJobId = id;
        await this.renderJobDetails(id);
        document.getElementById("modal-job-details").classList.add("open");
    },
    
    async renderJobDetails(id) {
        const job = await StorageManager.getJob(id);
        if (!job) return;
        
        document.getElementById("detail-title").innerText = job.title;
        document.getElementById("detail-company").innerText = job.company;
        document.getElementById("detail-status-select").value = job.status;
        document.getElementById("detail-description-box").innerText = job.description || "Nenhuma descrição fornecida.";
        
        const urlBtn = document.getElementById("detail-job-url");
        if (job.url) {
            urlBtn.href = job.url;
            urlBtn.style.display = "inline-flex";
        } else {
            urlBtn.style.display = "none";
        }
        
        const gaugeBox = document.getElementById("match-score-gauge-box");
        const score = job.matchScore?.score;
        if (score !== null && score !== undefined) {
            let color = "var(--danger)";
            if (score >= 80) color = "var(--success)";
            else if (score >= 60) color = "var(--warning)";
            
            const foundHtml = job.matchScore.foundSkills.map(s => `<span class="skill-tag found">${s}</span>`).join("");
            const missingHtml = job.matchScore.missingSkills.map(s => `<span class="skill-tag missing">${s}</span>`).join("");
            
            gaugeBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 28px; width: 100%;">
                    <div class="score-circle" style="background: conic-gradient(${color} calc(${score} * 1%), rgba(255, 255, 255, 0.05) 0deg);">
                        <div class="score-inner">
                            <span class="score-value">${score}</span>
                            <span class="score-unit">% Match</span>
                        </div>
                    </div>
                    <div style="flex-grow: 1; text-align: left;">
                        <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Dica do Especialista:</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">${job.matchScore.recommendation || "Boa aderência geral para a vaga."}</p>
                    </div>
                </div>
                <div style="width: 100%; text-align: left; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
                    <h5 style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Habilidades Encontradas (${job.matchScore.foundSkills.length})</h5>
                    <div class="skills-list">${foundHtml || "<span style='font-size: 0.8rem; color: var(--text-muted);'>Nenhuma correspondência óbvia.</span>"}</div>
                    
                    <h5 style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-secondary); margin-top: 14px; margin-bottom: 6px;">Habilidades Faltantes (${job.matchScore.missingSkills.length})</h5>
                    <div class="skills-list">${missingHtml || "<span style='font-size: 0.8rem; color: var(--text-muted);'>Nenhuma lacuna mapeada.</span>"}</div>
                </div>
            `;
        } else {
            gaugeBox.innerHTML = `
                <div style="text-align: center; padding: 12px; color: var(--text-secondary);">
                    <p style="font-size: 0.85rem; margin-bottom: 12px;">Esta vaga ainda não foi analisada.</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('btn-run-match-score').click();" style="font-size: 0.85rem; padding: 6px 16px;">🔥 Analisar agora com IA</button>
                </div>
            `;
        }
        
        const tailorBox = document.getElementById("resume-tailoring-box");
        if (job.tailoredResume) {
            let formattedText = job.tailoredResume
                .replace(/^### (.*$)/gim, '<h4 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--primary-light);">$1</h4>')
                .replace(/^\* (.*$)/gim, '<li style="margin-bottom: 8px; margin-left: 16px; list-style-type: square; color: var(--text-primary);">$1</li>')
                .replace(/\n/g, "<br>");
            
            tailorBox.innerHTML = `
                <div style="text-align: right; margin-bottom: 8px;">
                    <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(StorageManager.getJob('${job.id}').tailoredResume); alert('Copiado para a área de transferência!');" style="padding: 4px 8px; font-size: 0.7rem;">📋 Copiar Adaptações</button>
                </div>
                <div style="max-height: 250px; overflow-y: auto; text-align: left;">
                    ${formattedText}
                </div>
            `;
        } else {
            tailorBox.innerHTML = `
                <div style="text-align: center; padding: 10px; color: var(--text-secondary);">
                    <p style="font-size: 0.85rem; margin-bottom: 10px;">Sem adaptações salvas para esta candidatura.</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('btn-run-resume-tailor').click();" style="font-size: 0.85rem; padding: 6px 16px;">Gerar Versão Customizada</button>
                </div>
            `;
        }
        
        const tasksList = document.getElementById("detail-tasks-list");
        if (!job.tasks || job.tasks.length === 0) {
            tasksList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 12px;">Sem tarefas ou prazos cadastrados.</p>`;
        } else {
            const sortedTasks = [...job.tasks].sort((a,b) => a.date.localeCompare(b.date));
            tasksList.innerHTML = sortedTasks.map(t => {
                const isGcalSynced = t.googleEventId ? "✔️ gCal" : "";
                return `
                    <div class="task-item" style="padding: 8px 10px;">
                        <div class="task-item-left">
                            <input type="checkbox" class="task-checkbox" ${t.completed ? "checked" : ""} onchange="UIManager.toggleTask('${job.id}', '${t.id}')">
                            <span class="task-title ${t.completed ? "completed" : ""}" style="font-size: 0.82rem;">${t.title}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.68rem; color: var(--success); font-weight: bold; font-family: var(--font-mono);">${isGcalSynced}</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">${t.date}</span>
                            <button onclick="UIManager.deleteTask('${job.id}', '${t.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem;">&times;</button>
                        </div>
                    </div>
                `;
            }).join("");
        }
        
        const timelineList = document.getElementById("detail-timeline-list");
        if (!job.timeline || job.timeline.length === 0) {
            timelineList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 12px;">Nenhum histórico registrado.</p>`;
        } else {
            const sortedTimeline = [...job.timeline].reverse();
            timelineList.innerHTML = sortedTimeline.map(tl => {
                const date = new Date(tl.date).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });
                return `
                    <div class="timeline-item">
                        <span class="timeline-dot"></span>
                        <div class="timeline-time">${date}</div>
                        <div class="timeline-text">${tl.text}</div>
                    </div>
                `;
            }).join("");
        }
    },
    
    async toggleTask(jobId, taskId) {
        const job = await StorageManager.getJob(jobId);
        const tasks = job.tasks.map(t => {
            if (t.id === taskId) {
                const newState = !t.completed;
                job.timeline.push({
                    date: new Date().toISOString(),
                    text: `Tarefa "${t.title}" marcada como ${newState ? "CONCLUÍDA" : "PENDENTE"}`
                });
                return { ...t, completed: newState };
            }
            return t;
        });
        
        await StorageManager.updateJob(jobId, { tasks, timeline: job.timeline });
        await StorageManager.syncTasks(jobId, tasks);
        this.renderJobDetails(jobId);
        this.renderDashboard();
    },
    
    async deleteTask(jobId, taskId) {
        const job = await StorageManager.getJob(jobId);
        const task = job.tasks.find(t => t.id === taskId);
        
        // Remove event from Google Calendar if linked
        if (task && task.googleEventId && GoogleCalendar.isConnected()) {
            try {
                logToConsole("Excluindo evento do Google Calendar...");
                await GoogleCalendar.deleteEvent(task.googleEventId);
            } catch (err) {
                logToConsole("Falha ao remover do Google Calendar: " + err.message, "error");
            }
        }
        
        const tasks = job.tasks.filter(t => t.id !== taskId);
        const timeline = [...(job.timeline || [])];
        timeline.push({
            date: new Date().toISOString(),
            text: `Tarefa deletada: "${task?.title || "desconhecida"}"`
        });
        
        await StorageManager.updateJob(jobId, { tasks, timeline });
        await StorageManager.syncTasks(jobId, tasks);
        this.renderJobDetails(jobId);
        this.renderDashboard();
        logToConsole(`Tarefa deletada.`, "warning");
    }
};

// Expose globally
window.UIManager = UIManager;

// --- APP BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => {
    UIManager.init();
});
