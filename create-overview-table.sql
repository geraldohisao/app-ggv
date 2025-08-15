-- Criar tabela knowledge_overview se não existir
CREATE TABLE IF NOT EXISTS knowledge_overview (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Sobre a GGV',
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE knowledge_overview ENABLE ROW LEVEL SECURITY;

-- Política de segurança
CREATE POLICY "Users can manage own overview" ON knowledge_overview 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verificar se a extensão vector está habilitada
CREATE EXTENSION IF NOT EXISTS vector;
