-- ================================================
-- SCHEMA PARA MÓDULO DE GESTÃO DE OKR
-- ================================================
-- Criado em: 2026-01-05
-- Descrição: Tabela para armazenar mapas estratégicos
-- ================================================

-- Criar tabela de mapas estratégicos
CREATE TABLE IF NOT EXISTS public.strategic_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informações básicas
    company_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Identidade
    mission TEXT,
    vision TEXT,
    values JSONB DEFAULT '[]'::jsonb,
    
    -- Estrutura estratégica
    motors JSONB DEFAULT '[]'::jsonb,
    objectives JSONB DEFAULT '[]'::jsonb,
    action_plans JSONB DEFAULT '[]'::jsonb,
    roles JSONB DEFAULT '[]'::jsonb,
    rituals JSONB DEFAULT '[]'::jsonb,
    tracking JSONB DEFAULT '[]'::jsonb,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_strategic_maps_user_id ON public.strategic_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_strategic_maps_created_at ON public.strategic_maps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategic_maps_company_name ON public.strategic_maps(company_name);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.strategic_maps ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios mapas
DROP POLICY IF EXISTS "Users can view own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can view own strategic maps" 
    ON public.strategic_maps 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Política: Usuários podem criar seus próprios mapas
DROP POLICY IF EXISTS "Users can create own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can create own strategic maps" 
    ON public.strategic_maps 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios mapas
DROP POLICY IF EXISTS "Users can update own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can update own strategic maps" 
    ON public.strategic_maps 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios mapas
DROP POLICY IF EXISTS "Users can delete own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can delete own strategic maps" 
    ON public.strategic_maps 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Política: Admins podem ver todos os mapas
DROP POLICY IF EXISTS "Admins can view all strategic maps" ON public.strategic_maps;
CREATE POLICY "Admins can view all strategic maps" 
    ON public.strategic_maps 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_strategic_maps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_strategic_maps_updated_at ON public.strategic_maps;
CREATE TRIGGER trigger_update_strategic_maps_updated_at
    BEFORE UPDATE ON public.strategic_maps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_strategic_maps_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.strategic_maps IS 'Armazena mapas estratégicos (OKR) criados pelos usuários';
COMMENT ON COLUMN public.strategic_maps.user_id IS 'ID do usuário que criou o mapa';
COMMENT ON COLUMN public.strategic_maps.company_name IS 'Nome da empresa/departamento';
COMMENT ON COLUMN public.strategic_maps.date IS 'Data de criação do plano estratégico';
COMMENT ON COLUMN public.strategic_maps.mission IS 'Missão da empresa';
COMMENT ON COLUMN public.strategic_maps.vision IS 'Visão da empresa';
COMMENT ON COLUMN public.strategic_maps.values IS 'Valores da empresa (array JSON)';
COMMENT ON COLUMN public.strategic_maps.motors IS 'Motores estratégicos (array JSON)';
COMMENT ON COLUMN public.strategic_maps.objectives IS 'Objetivos estratégicos com KPIs (array JSON)';
COMMENT ON COLUMN public.strategic_maps.action_plans IS 'Planos de ação trimestrais (array JSON)';
COMMENT ON COLUMN public.strategic_maps.roles IS 'Papéis e responsabilidades (array JSON)';
COMMENT ON COLUMN public.strategic_maps.rituals IS 'Rituais de gestão (array JSON)';
COMMENT ON COLUMN public.strategic_maps.tracking IS 'Dados de acompanhamento (array JSON)';

