// ==========================================
// Next Step - Job Deck — Google Calendar API Integration
// ==========================================

export const GoogleCalendar = {
    tokenClient: null,
    accessToken: null,
    tokenExpiry: null,
    
    init(clientId) {
        if (!clientId) {
            this.tokenClient = null;
            return false;
        }
        
        try {
            // google.accounts.oauth2 is loaded via GIS script in index.html
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (tokenResponse) => {
                    if (tokenResponse.error !== undefined) {
                        console.error("Erro no consentimento do Google:", tokenResponse);
                        return;
                    }
                    this.accessToken = tokenResponse.access_token;
                    // Calculate token expiry (tokenResponse.expires_in is in seconds)
                    this.tokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);
                    
                    // Save to localStorage for session persistent caching
                    localStorage.setItem("jsos_gcal_token", this.accessToken);
                    localStorage.setItem("jsos_gcal_expiry", this.tokenExpiry);
                    
                    logToConsole("Google Calendar conectado com sucesso!", "success");
                    
                    // Trigger custom UI event or update UI if callback bound
                    if (this.onConnectCallback) this.onConnectCallback();
                },
            });
            
            // Restore token from cache if still valid
            const cachedToken = localStorage.getItem("jsos_gcal_token");
            const cachedExpiry = localStorage.getItem("jsos_gcal_expiry");
            
            if (cachedToken && cachedExpiry && Number(cachedExpiry) > Date.now()) {
                this.accessToken = cachedToken;
                this.tokenExpiry = Number(cachedExpiry);
                logToConsole("Google Calendar reconectado via sessão activa.");
            }
            
            return true;
        } catch (e) {
            console.error("Erro ao inicializar Google Client:", e);
            this.tokenClient = null;
            return false;
        }
    },
    
    isInitialized() {
        return this.tokenClient !== null;
    },
    
    isConnected() {
        return this.accessToken !== null && this.tokenExpiry > Date.now();
    },
    
    requestPermission(onConnectCallback) {
        if (!this.isInitialized()) {
            logToConsole("Google OAuth não inicializado. Configure seu Client ID.", "error");
            return;
        }
        this.onConnectCallback = onConnectCallback;
        
        // Open Google authorization popup
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    },
    
    disconnect() {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem("jsos_gcal_token");
        localStorage.removeItem("jsos_gcal_expiry");
        logToConsole("Google Calendar desconectado.", "info");
    },
    
    // --- CALENDAR EVENTS CRUD ---
    async addEvent(taskTitle, taskDate, jobTitle, jobCompany) {
        if (!this.isConnected()) {
            throw new Error("Google Calendar não conectado ou sessão expirou.");
        }
        
        // Formulate event body
        // Google Calendar requires start/end time or standard date for all-day events
        const eventBody = {
            summary: `[Next Step - Job Deck] ${taskTitle}`,
            description: `Tarefa/Prazo vinculado à vaga de ${jobTitle} na empresa ${jobCompany}.\nGerenciado via Next Step - Job Deck.`,
            start: {
                date: taskDate // Format "YYYY-MM-DD" for all-day events
            },
            end: {
                date: taskDate
            },
            reminders: {
                useDefault: true
            }
        };
        
        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(eventBody)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Erro ao criar evento no Google Calendar");
        }
        
        const event = await response.json();
        logToConsole(`Evento criado no Google Calendar: "${taskTitle}"`, "success");
        return event.id; // Returns Google Event ID to reference/update later
    },
    
    async deleteEvent(eventId) {
        if (!this.isConnected()) return;
        
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${this.accessToken}`
            }
        });
        
        if (!response.ok && response.status !== 404) { // Treat 404 as already deleted
            const err = await response.json();
            throw new Error(err.error?.message || "Erro ao excluir evento no Google Calendar");
        }
        
        logToConsole(`Evento removido do Google Calendar.`, "info");
    }
};

// Help helper logic
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
