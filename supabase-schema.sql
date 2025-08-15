-- Schema para GGV Plataforma - Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'USER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- 2. Tabela de segmentos de diagnóstico
CREATE TABLE IF NOT EXISTS diagnostic_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    benchmarkMedio INTEGER DEFAULT 0,
    topPerformers INTEGER DEFAULT 0,
    characteristics TEXT DEFAULT '',
    trends TEXT DEFAULT '',
    challenges TEXT DEFAULT '',
    successFactors TEXT DEFAULT '',
    aiFocusAreas TEXT[] DEFAULT '{}',
    aiCustomPrompt TEXT DEFAULT '',
    aiRevenueInsights TEXT DEFAULT '',
    aiChannelInsights JSONB DEFAULT '{"b2b": "", "b2c": "", "hibrido": ""}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de personas de IA
CREATE TABLE IF NOT EXISTS ai_personas (
    id TEXT PRIMARY KEY CHECK (id IN ('SDR', 'Closer', 'Gestor')),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    tone TEXT DEFAULT '',
    wordLimit INTEGER DEFAULT 500,
    systemPrompt TEXT DEFAULT '',
    directives TEXT DEFAULT '',
    personalityTraits TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de documentos de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Para embeddings OpenAI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de perguntas frequentes (FAQ) para reforço do contexto
CREATE TABLE IF NOT EXISTS knowledge_faq (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE knowledge_faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own faqs" ON knowledge_faq FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bloco de contexto/overview livre (texto longo)
CREATE TABLE IF NOT EXISTS knowledge_overview (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Sobre a GGV',
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE knowledge_overview ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own overview" ON knowledge_overview FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Tabela de histórico de conversas
CREATE TABLE IF NOT EXISTS chat_histories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    persona_id TEXT REFERENCES ai_personas(id) ON DELETE CASCADE,
    history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, persona_id)
);

-- 6. Feedback de Oportunidade (Closer)
CREATE TABLE IF NOT EXISTS opportunity_feedbacks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pipedrive_deal_id TEXT,
    meeting_happened BOOLEAN NOT NULL,
    notes TEXT DEFAULT '',
    accept_as_potential_client BOOLEAN,
    priority_now BOOLEAN,
    has_pain BOOLEAN,
    has_budget BOOLEAN,
    talked_to_decision_maker BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE opportunity_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own opportunity feedbacks" ON opportunity_feedbacks
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Tabela de configurações da aplicação
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de segurança (RLS - Row Level Security)

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para diagnostic_segments (todos podem ler, apenas admins podem modificar)
CREATE POLICY "Todos podem ler segmentos" ON diagnostic_segments
    FOR SELECT USING (true);

CREATE POLICY "Apenas admins podem modificar segmentos" ON diagnostic_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Políticas para ai_personas (todos podem ler, apenas admins podem modificar)
CREATE POLICY "Todos podem ler personas" ON ai_personas
    FOR SELECT USING (true);

CREATE POLICY "Apenas admins podem modificar personas" ON ai_personas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Políticas para knowledge_documents
CREATE POLICY "Usuários podem ver seus documentos" ON knowledge_documents
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem inserir documentos" ON knowledge_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem atualizar seus documentos" ON knowledge_documents
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem deletar seus documentos" ON knowledge_documents
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Políticas para chat_histories
CREATE POLICY "Usuários podem ver seu histórico" ON chat_histories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu histórico" ON chat_histories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu histórico" ON chat_histories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seu histórico" ON chat_histories
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para app_settings (apenas super admins)
CREATE POLICY "Apenas super admins podem acessar configurações" ON app_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'SUPER_ADMIN'
        )
    );

-- Inserir dados padrão

-- Personas padrão
INSERT INTO ai_personas (id, name, description, tone, wordLimit, systemPrompt, directives, personalityTraits) 
VALUES 
(
    'SDR',
    'SDR Sênior',
    'Especialista em prospecção e qualificação de leads',
    'Consultivo e focado em diagnóstico',
    500,
    'Você é um SDR sênior especialista da GGV Inteligência em Vendas.',
    'Foque em qualificação de leads e diagnóstico de necessidades.',
    ARRAY['consultivo', 'analítico', 'focado_em_resultados']
),
(
    'Closer',
    'Closer Experiente',
    'Especialista em fechamento de vendas',
    'Persuasivo e orientado para resultados',
    500,
    'Você é um closer experiente especialista da GGV Inteligência em Vendas.',
    'Foque em fechamento e superação de objeções.',
    ARRAY['persuasivo', 'confiante', 'orientado_resultados']
),
(
    'Gestor',
    'Gestor de Vendas',
    'Especialista em gestão e estratégia de vendas',
    'Estratégico e analítico',
    500,
    'Você é um gestor de vendas experiente especialista da GGV Inteligência em Vendas.',
    'Foque em estratégia, métricas e desenvolvimento de equipe.',
    ARRAY['estratégico', 'analítico', 'líder']
)
ON CONFLICT (id) DO NOTHING;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_chat_histories_updated_at 
    BEFORE UPDATE ON chat_histories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at 
    BEFORE UPDATE ON app_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'USER');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE profiles IS 'Perfis de usuário com roles';
COMMENT ON TABLE diagnostic_segments IS 'Segmentos de mercado para diagnóstico comercial';
COMMENT ON TABLE ai_personas IS 'Personas de IA para assistente';
COMMENT ON TABLE knowledge_documents IS 'Base de conhecimento para IA';
COMMENT ON TABLE chat_histories IS 'Histórico de conversas com IA';
COMMENT ON TABLE app_settings IS 'Configurações da aplicação';
