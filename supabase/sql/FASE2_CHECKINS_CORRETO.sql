-- =========================================
-- FASE 2: Sistema de Check-ins (VERSÃO CORRIGIDA)
-- Baseado em feedback de especialista OKR Master
-- =========================================

-- =========================================
-- 1. ADICIONAR CAMPO DIRECTION EM KEY_RESULTS
-- =========================================

-- Direção do KR: aumentar (ex: vendas) ou diminuir (ex: churn)
ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'increase' 
CHECK (direction IN ('increase', 'decrease'));

-- Adicionar descrição opcional
ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN key_results.direction IS 'increase = maior é melhor | decrease = menor é melhor (ex: churn, custo)';

-- =========================================
-- 2. CRIAR TABELA DE CHECK-INS DE KR (HISTÓRICO)
-- =========================================

CREATE TABLE IF NOT EXISTS kr_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kr_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    
    -- Valores
    value NUMERIC NOT NULL,
    previous_value NUMERIC NOT NULL,      -- Lido ANTES de atualizar
    target_value NUMERIC NOT NULL,        -- Snapshot da meta (pode mudar)
    
    -- Calculados
    delta NUMERIC,                        -- value - previous_value
    progress_pct NUMERIC,                 -- Calculado conforme direction
    
    -- Contexto
    comment TEXT,
    confidence TEXT CHECK (confidence IN ('baixa', 'média', 'alta')),
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kr_checkins_kr_id ON kr_checkins(kr_id);
CREATE INDEX idx_kr_checkins_sprint_id ON kr_checkins(sprint_id);
CREATE INDEX idx_kr_checkins_created_at ON kr_checkins(created_at DESC);

-- RLS
ALTER TABLE kr_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para autenticados" 
ON kr_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- 3. TRIGGER CORRETO PARA ATUALIZAR KR
-- =========================================

-- IMPORTANTE: Lê valor ANTES de atualizar (correção do bug)
CREATE OR REPLACE FUNCTION process_kr_checkin()
RETURNS TRIGGER AS $$
DECLARE
    current_kr_value NUMERIC;
    current_target NUMERIC;
    kr_direction TEXT;
    calculated_progress NUMERIC;
    calculated_delta NUMERIC;
BEGIN
    -- 1. Buscar valores ATUAIS do KR (antes de atualizar)
    SELECT current_value, target_value, direction
    INTO current_kr_value, current_target, kr_direction
    FROM key_results
    WHERE id = NEW.kr_id;
    
    -- 2. Se previous_value não foi fornecido, usar o valor atual
    IF NEW.previous_value IS NULL THEN
        NEW.previous_value := COALESCE(current_kr_value, 0);
    END IF;
    
    -- 3. Calcular delta
    NEW.delta := NEW.value - NEW.previous_value;
    
    -- 4. Snapshot da meta (pode mudar ao longo do tempo)
    NEW.target_value := current_target;
    
    -- 5. Calcular progress conforme direction
    IF kr_direction = 'increase' THEN
        -- Maior é melhor: vendas, contratos, etc
        calculated_progress := (NEW.value / NULLIF(current_target, 0)) * 100;
    ELSE
        -- Menor é melhor: churn, custo, tempo, etc
        -- Invertido: quanto menor o valor, maior o progresso
        calculated_progress := ((current_target - NEW.value) / NULLIF(current_target, 0)) * 100;
    END IF;
    
    NEW.progress_pct := GREATEST(0, LEAST(100, calculated_progress));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_kr_checkin ON kr_checkins;

CREATE TRIGGER trigger_process_kr_checkin
    BEFORE INSERT ON kr_checkins
    FOR EACH ROW
    EXECUTE FUNCTION process_kr_checkin();

-- Trigger separado para atualizar key_results (AFTER INSERT)
CREATE OR REPLACE FUNCTION update_kr_after_checkin()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE key_results 
    SET current_value = NEW.value,
        updated_at = NOW()
    WHERE id = NEW.kr_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kr_after_checkin ON kr_checkins;

CREATE TRIGGER trigger_update_kr_after_checkin
    AFTER INSERT ON kr_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_kr_after_checkin();

-- =========================================
-- 4. CRIAR TABELA SPRINT_TEMPLATES (PEQUENA)
-- =========================================

CREATE TABLE IF NOT EXISTS sprint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                   -- "Comercial Semanal"
    type TEXT NOT NULL,                   -- 'semanal' | 'mensal' | etc
    department TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'operacional',  -- 'operacional' | 'tático' | 'estratégico'
    audience TEXT NOT NULL DEFAULT 'time',      -- 'time' | 'liderança' | 'diretoria'
    
    -- Regras
    auto_create BOOLEAN DEFAULT true,
    max_initiatives INTEGER DEFAULT 7,
    max_carry_over_pct INTEGER DEFAULT 30,
    require_checkin BOOLEAN DEFAULT true,     -- Obriga check-in para finalizar
    
    -- Template
    title_template TEXT,                  -- "Sprint {department} W{week} - {month} {year}"
    description_template TEXT,
    
    -- Ativo
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar referência em sprints
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES sprint_templates(id);

CREATE INDEX idx_sprints_template_id ON sprints(template_id);

-- RLS
ALTER TABLE sprint_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para autenticados" 
ON sprint_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- 5. CRIAR TABELA SPRINT_CHECKINS (CORRETA)
-- =========================================

CREATE TABLE IF NOT EXISTS sprint_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    
    -- Data do check-in (para constraint UNIQUE)
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Resumo estruturado
    summary TEXT NOT NULL,
    achievements TEXT,          -- O que foi entregue (lista)
    blockers TEXT,              -- O que travou (lista)
    decisions_taken TEXT,       -- Decisões tomadas (lista)
    next_focus TEXT,            -- Próximos passos (lista)
    
    -- Saúde do ciclo
    health TEXT NOT NULL CHECK (health IN ('verde', 'amarelo', 'vermelho')),
    health_reason TEXT,
    
    -- Métricas (calculadas automaticamente ao salvar)
    initiatives_completed INTEGER DEFAULT 0,
    initiatives_total INTEGER DEFAULT 0,
    impediments_count INTEGER DEFAULT 0,
    decisions_count INTEGER DEFAULT 0,
    carry_over_count INTEGER DEFAULT 0,
    carry_over_pct INTEGER DEFAULT 0,
    
    -- Notas adicionais
    notes TEXT,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINT: 1 check-in por sprint (para sprints semanais/mensais simples)
    UNIQUE(sprint_id, checkin_date)
);

COMMENT ON TABLE sprint_checkins IS 'Check-ins periódicos das sprints. Para sprint semanal = 1 check-in. Para sprint mensal = múltiplos check-ins semanais.';

CREATE INDEX idx_sprint_checkins_sprint_id ON sprint_checkins(sprint_id);
CREATE INDEX idx_sprint_checkins_checkin_date ON sprint_checkins(checkin_date DESC);
CREATE INDEX idx_sprint_checkins_health ON sprint_checkins(health);

-- RLS
ALTER TABLE sprint_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para autenticados" 
ON sprint_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- 6. MELHORAR TABELA SPRINT_ITEMS (GOVERNANÇA)
-- =========================================

-- Campos adicionais para decisões
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS related_kr_id UUID REFERENCES key_results(id);
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS impact_description TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS trade_off TEXT;

-- Campos adicionais para impedimentos
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS severity TEXT 
CHECK (severity IN ('baixa', 'média', 'alta', 'crítica'));
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolution_deadline DATE;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Contador de carry-over (quantas vezes foi carregado)
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS carry_over_count INTEGER DEFAULT 0;

CREATE INDEX idx_sprint_items_related_kr ON sprint_items(related_kr_id);

-- =========================================
-- 7. FUNÇÃO HELPER: Calcular Progresso de KR Correto
-- =========================================

CREATE OR REPLACE FUNCTION calculate_kr_progress(
    p_current_value NUMERIC,
    p_target_value NUMERIC,
    p_direction TEXT
) RETURNS NUMERIC AS $$
DECLARE
    progress NUMERIC;
BEGIN
    IF p_target_value = 0 THEN
        RETURN 0;
    END IF;
    
    IF p_direction = 'increase' THEN
        -- Maior é melhor (vendas, receita, contratos)
        progress := (p_current_value / p_target_value) * 100;
    ELSE
        -- Menor é melhor (churn, custo, tempo de resposta)
        progress := ((p_target_value - p_current_value) / p_target_value) * 100;
    END IF;
    
    -- Limitar entre 0 e 100
    RETURN GREATEST(0, LEAST(100, progress));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =========================================
-- 8. VIEW PARA DASHBOARD (ANALYTICS)
-- =========================================

CREATE OR REPLACE VIEW sprint_checkins_with_metrics AS
SELECT 
    sc.*,
    s.title as sprint_title,
    s.type as sprint_type,
    s.department,
    s.start_date,
    s.end_date,
    -- Calcular taxa de conclusão
    CASE 
        WHEN sc.initiatives_total > 0 
        THEN ROUND((sc.initiatives_completed::NUMERIC / sc.initiatives_total) * 100)
        ELSE 0 
    END as completion_rate,
    -- Verificar se carry-over está alto
    CASE 
        WHEN sc.carry_over_pct > 30 THEN true 
        ELSE false 
    END as high_carry_over
FROM sprint_checkins sc
JOIN sprints s ON s.id = sc.sprint_id
ORDER BY sc.created_at DESC;

-- =========================================
-- 9. VIEW PARA EVOLUÇÃO DE KRs
-- =========================================

CREATE OR REPLACE VIEW kr_evolution AS
SELECT 
    kc.kr_id,
    kr.title as kr_title,
    kr.unit,
    kr.direction,
    kr.target_value,
    kc.value,
    kc.previous_value,
    kc.delta,
    kc.progress_pct,
    kc.comment,
    kc.confidence,
    kc.created_at,
    kc.created_by,
    s.title as sprint_title,
    s.start_date,
    s.end_date
FROM kr_checkins kc
JOIN key_results kr ON kr.id = kc.kr_id
LEFT JOIN sprints s ON s.id = kc.sprint_id
ORDER BY kc.kr_id, kc.created_at DESC;

-- =========================================
-- 10. VERIFICAÇÕES FINAIS
-- =========================================

-- Verificar se direction foi adicionada em key_results
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'key_results' AND column_name = 'direction'
        ) THEN '✅ direction adicionada'
        ELSE '❌ direction faltando'
    END as key_results_direction;

-- Verificar tabelas criadas
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'kr_checkins') THEN '✅' ELSE '❌' END as kr_checkins,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sprint_checkins') THEN '✅' ELSE '❌' END as sprint_checkins,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sprint_templates') THEN '✅' ELSE '❌' END as sprint_templates;

-- Verificar constraint UNIQUE em sprint_checkins
SELECT 
    conname as constraint_name,
    contype as type
FROM pg_constraint
WHERE conrelid = 'sprint_checkins'::regclass
  AND contype = 'u';  -- unique constraints

-- Listar colunas de sprint_checkins
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sprint_checkins'
ORDER BY ordinal_position;

-- ✅ Se todas as verificações acima mostrarem ✅, está perfeito!
