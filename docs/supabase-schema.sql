-- =======================================================
-- JSOS (Job Search Operating System) Schema for Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- =======================================================

-- 1. Tabela de Vagas (Jobs)
CREATE TABLE public.jobs (
    id TEXT PRIMARY KEY, -- Mantém o formato "job_timestamp" para compatibilidade com o front-end
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Salva',
    match_score JSONB DEFAULT '{"score": null, "found": [], "missing": [], "recommendation": ""}'::jsonb,
    tailored_resume TEXT DEFAULT '',
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso RLS para Jobs
CREATE POLICY "Usuários podem criar suas próprias vagas" 
    ON public.jobs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem visualizar suas próprias vagas" 
    ON public.jobs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias vagas" 
    ON public.jobs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias vagas" 
    ON public.jobs FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Tabela de Tarefas (Tasks)
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    google_event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso RLS para Tasks
CREATE POLICY "Usuários podem criar suas próprias tarefas" 
    ON public.tasks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem visualizar suas próprias tarefas" 
    ON public.tasks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias tarefas" 
    ON public.tasks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias tarefas" 
    ON public.tasks FOR DELETE 
    USING (auth.uid() = user_id);
