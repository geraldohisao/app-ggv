-- ================================================
-- SCHEMA PARA MÓDULO DE GESTÃO DE OKR
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_strategic_maps_user_id ON public.strategic_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_strategic_maps_created_at ON public.strategic_maps(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.strategic_maps ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can view own strategic maps" 
    ON public.strategic_maps 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can create own strategic maps" 
    ON public.strategic_maps 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can update own strategic maps" 
    ON public.strategic_maps 
    FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own strategic maps" ON public.strategic_maps;
CREATE POLICY "Users can delete own strategic maps" 
    ON public.strategic_maps 
    FOR DELETE 
    USING (auth.uid() = user_id);

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

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_strategic_maps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_strategic_maps_updated_at ON public.strategic_maps;
CREATE TRIGGER trigger_update_strategic_maps_updated_at
    BEFORE UPDATE ON public.strategic_maps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_strategic_maps_updated_at();

