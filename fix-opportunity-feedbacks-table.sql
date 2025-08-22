-- Script para criar/verificar tabela opportunity_feedbacks
-- Execute no SQL Editor do Supabase

-- Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'opportunity_feedbacks'
);

-- Criar a tabela se não existir
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

-- Habilitar RLS
ALTER TABLE opportunity_feedbacks ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso
DROP POLICY IF EXISTS "Users can manage own opportunity feedbacks" ON opportunity_feedbacks;
CREATE POLICY "Users can manage own opportunity feedbacks" ON opportunity_feedbacks
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verificar se a tabela foi criada com sucesso
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'opportunity_feedbacks' 
ORDER BY ordinal_position;
