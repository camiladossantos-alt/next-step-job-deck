// ==========================================
// Next Step - Job Deck — Supabase Cloud Sync Manager
// ==========================================

export const SupabaseDB = {
    client: null,
    
    init(supabaseUrl, supabaseKey) {
        if (!supabaseUrl || !supabaseKey) {
            this.client = null;
            return false;
        }
        try {
            // supabase is loaded globally via CDN in index.html
            this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
            return true;
        } catch (e) {
            console.error("Erro ao inicializar Supabase client:", e);
            this.client = null;
            return false;
        }
    },
    
    isInitialized() {
        return this.client !== null;
    },
    
    // --- AUTH OPERATIONS ---
    async signUp(email, password) {
        if (!this.isInitialized()) throw new Error("Supabase não inicializado.");
        const { data, error } = await this.client.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    },
    
    async signIn(email, password) {
        if (!this.isInitialized()) throw new Error("Supabase não inicializado.");
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },
    
    async signOut() {
        if (!this.isInitialized()) return;
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
    },
    
    async getSession() {
        if (!this.isInitialized()) return null;
        const { data: { session } } = await this.client.auth.getSession();
        return session;
    },
    
    async getCurrentUser() {
        if (!this.isInitialized()) return null;
        const { data: { user } } = await this.client.auth.getUser();
        return user;
    },
    
    // --- DATABASE CRUD OPERATIONS ---
    async getJobs() {
        if (!this.isInitialized()) return [];
        const user = await this.getCurrentUser();
        if (!user) return [];
        
        // Fetch jobs
        const { data: jobs, error: jobsError } = await this.client
            .from("jobs")
            .select("*")
            .order("created_at", { ascending: true });
            
        if (jobsError) throw jobsError;
        
        // Fetch tasks
        const { data: tasks, error: tasksError } = await this.client
            .from("tasks")
            .select("*");
            
        if (tasksError) throw tasksError;
        
        // Map tasks into jobs to match the frontend JSON structure
        return jobs.map(job => {
            const jobTasks = tasks.filter(t => t.job_id === job.id).map(t => ({
                id: t.id,
                title: t.title,
                date: t.date,
                completed: t.completed,
                googleEventId: t.google_event_id
            }));
            
            return {
                id: job.id,
                title: job.title,
                company: job.company,
                url: job.url || "",
                description: job.description || "",
                status: job.status,
                createdDate: job.created_at,
                matchScore: job.match_score || { score: null, found: [], missing: [], recommendation: "" },
                tailoredResume: job.tailored_resume || "",
                tasks: jobTasks,
                timeline: job.timeline || []
            };
        });
    },
    
    async addJob(job) {
        if (!this.isInitialized()) return null;
        const user = await this.getCurrentUser();
        if (!user) return null;
        
        const { data, error } = await this.client
            .from("jobs")
            .insert([{
                id: job.id,
                user_id: user.id,
                title: job.title,
                company: job.company,
                url: job.url,
                description: job.description,
                status: job.status,
                match_score: job.matchScore,
                tailored_resume: job.tailoredResume,
                timeline: job.timeline
            }])
            .select();
            
        if (error) throw error;
        return data[0];
    },
    
    async updateJob(id, updatedFields) {
        if (!this.isInitialized()) return null;
        
        const mappedFields = {};
        if (updatedFields.title !== undefined) mappedFields.title = updatedFields.title;
        if (updatedFields.company !== undefined) mappedFields.company = updatedFields.company;
        if (updatedFields.url !== undefined) mappedFields.url = updatedFields.url;
        if (updatedFields.description !== undefined) mappedFields.description = updatedFields.description;
        if (updatedFields.status !== undefined) mappedFields.status = updatedFields.status;
        if (updatedFields.matchScore !== undefined) mappedFields.match_score = updatedFields.matchScore;
        if (updatedFields.tailoredResume !== undefined) mappedFields.tailored_resume = updatedFields.tailoredResume;
        if (updatedFields.timeline !== undefined) mappedFields.timeline = updatedFields.timeline;
        
        const { data, error } = await this.client
            .from("jobs")
            .update(mappedFields)
            .eq("id", id)
            .select();
            
        if (error) throw error;
        return data[0];
    },
    
    async deleteJob(id) {
        if (!this.isInitialized()) return;
        const { error } = await this.client
            .from("jobs")
            .delete()
            .eq("id", id);
            
        if (error) throw error;
    },
    
    // --- TASKS OPERATIONS (Linked to Jobs) ---
    async syncTasks(jobId, tasks) {
        if (!this.isInitialized()) return;
        const user = await this.getCurrentUser();
        if (!user) return;
        
        // 1. Delete all existing tasks in DB for this job
        const { error: deleteError } = await this.client
            .from("tasks")
            .delete()
            .eq("job_id", jobId);
            
        if (deleteError) throw deleteError;
        
        if (tasks.length === 0) return;
        
        // 2. Insert new tasks
        const dbTasks = tasks.map(t => ({
            id: t.id,
            job_id: jobId,
            user_id: user.id,
            title: t.title,
            date: t.date,
            completed: t.completed,
            google_event_id: t.googleEventId || null
        }));
        
        const { error: insertError } = await this.client
            .from("tasks")
            .insert(dbTasks);
            
        if (insertError) throw insertError;
    },
    
    // --- DATA MIGRATION (LocalStorage to Supabase) ---
    async migrateLocalData(localJobs) {
        if (!this.isInitialized() || localJobs.length === 0) return;
        
        logToConsole("Iniciando migração de dados locais para a nuvem...");
        
        // Get cloud jobs to avoid duplicates
        const cloudJobs = await this.getJobs();
        const cloudIds = new Set(cloudJobs.map(j => j.id));
        
        let migratedCount = 0;
        for (const localJob of localJobs) {
            if (!cloudIds.has(localJob.id)) {
                await this.addJob(localJob);
                if (localJob.tasks && localJob.tasks.length > 0) {
                    await this.syncTasks(localJob.id, localJob.tasks);
                }
                migratedCount++;
            }
        }
        
        logToConsole(`Migração concluída! ${migratedCount} vaga(s) sincronizada(s) com a nuvem.`, "success");
    }
};
