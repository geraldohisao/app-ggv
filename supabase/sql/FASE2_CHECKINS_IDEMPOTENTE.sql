-- =========================================
-- FASE 2: Sistema de Check-ins (VERSÃO IDEMPOTENTE)
-- Pode ser executado múltiplas vezes sem erro
-- =========================================

-- =========================================
-- 1. ADICIONAR CAMPO DIRECTION EM KEY_RESULTS
-- =========================================

ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'increase';

-- Adicionar constraint apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'key_results_direction_check'
    ) THEN
        ALTER TABLE key_results 
        ADD CONSTRAINT key_results_direction_check 
        CHECK (direction IN ('increase', 'decrease'));
    END IF;
END $$;

ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS description TEXT;

-- =========================================
-- 2. CRIAR TABELA DE CHECK-INS DE KR (HISTÓRICO)
-- =========================================

CREATE TABLE IF NOT EXISTS kr_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kr_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    value NUMERIC NOT NULL,
    previous_value NUMERIC NOT NULL,
    target_value NUMERIC NOT NULL,
    delta NUMERIC,
    progress_pct NUMERIC,
    comment TEXT,
    confidence TEXT CHECK (confidence IN ('baixa', 'média', 'alta')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices com IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_kr_checkins_kr_id ON kr_checkins(kr_id);
CREATE INDEX IF NOT EXISTS idx_kr_checkins_sprint_id ON kr_checkins(sprint_id);
CREATE INDEX IF NOT EXISTS idx_kr_checkins_created_at ON kr_checkins(created_at DESC);

-- RLS
ALTER TABLE kr_checkins ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON kr_checkins;

CREATE POLICY "Permitir tudo para autenticados" 
ON kr_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- 3. TRIGGER CORRETO PARA ATUALIZAR KR
-- =========================================

CREATE OR REPLACE FUNCTION process_kr_checkin()
RETURNS TRIGGER AS $$
DECLARE
    current_kr_value NUMERIC;
    current_target NUMERIC;
    kr_direction TEXT;
    calculated_progress NUMERIC;
BEGIN
    SELECT current_value, target_value, direction
    INTO current_kr_value, current_target, kr_direction
    FROM key_results
    WHERE id = NEW.kr_id;
    
    IF NEW.previous_value IS NULL THEN
        NEW.previous_value := COALESCE(current_kr_value, 0);
    END IF;
    
    NEW.delta := NEW.value - NEW.previous_value;
    NEW.target_value := current_target;
    
    IF kr_direction = 'increase' THEN
        calculated_progress := (NEW.value / NULLIF(current_target, 0)) * 100;
    ELSE
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

CREATE OR REPLACE FUNCTION update_kr_after_checkin()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE key_results 
    SET current_value = NEW.value, updated_at = NOW()
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
-- 4. CRIAR TABELA SPRINT_TEMPLATES
-- =========================================

CREATE TABLE IF NOT EXISTS sprint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    department TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'operacional',
    audience TEXT NOT NULL DEFAULT 'time',
    auto_create BOOLEAN DEFAULT true,
    max_initiatives INTEGER DEFAULT 7,
    max_carry_over_pct INTEGER DEFAULT 30,
    require_checkin BOOLEAN DEFAULT true,
    title_template TEXT,
    description_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES sprint_templates(id);

CREATE INDEX IF NOT EXISTS idx_sprints_template_id ON sprints(template_id);

ALTER TABLE sprint_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON sprint_templates;
CREATE POLICY "Permitir tudo para autenticados" 
ON sprint_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- 5. CRIAR TABELA SPRINT_CHECKINS
-- =========================================

CREATE TABLE IF NOT EXISTS sprint_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary TEXT NOT NULL,
    achievements TEXT,
    blockers TEXT,
    decisions_taken TEXT,
    next_focus TEXT,
    health TEXT NOT NULL CHECK (health IN ('verde', 'amarelo', 'vermelho')),
    health_reason TEXT,
    initiatives_completed INTEGER DEFAULT 0,
    initiatives_total INTEGER DEFAULT 0,
    impediments_count INTEGER DEFAULT 0,
    decisions_count INTEGER DEFAULT 0,
    carry_over_count INTEGER DEFAULT 0,
    carry_over_pct INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar constraint UNIQUE apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sprint_checkins_sprint_id_checkin_date_key'
    ) THEN
        ALTER TABLE sprint_checkins 
        ADD CONSTRAINT sprint_checkins_sprint_id_checkin_date_key 
        UNIQUE(sprint_id, checkin_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sprint_checkins_sprint_id ON sprint_checkins(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_checkins_checkin_date ON sprint_checkins(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_sprint_checkins_health ON sprint_checkins(health);

ALTER TABLE sprint_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON sprint_checkins;
CREATE POLICY "Permitir tudo para autenticados" 
ON sprint_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================
-- 6. MELHORAR TABELA SPRINT_ITEMS
-- =========================================

ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS related_kr_id UUID REFERENCES key_results(id);
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS impact_description TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS trade_off TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolution_deadline DATE;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS carry_over_count INTEGER DEFAULT 0;

-- Adicionar constraint severity apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sprint_items_severity_check'
    ) THEN
        ALTER TABLE sprint_items 
        ADD CONSTRAINT sprint_items_severity_check 
        CHECK (severity IN ('baixa', 'média', 'alta', 'crítica'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sprint_items_related_kr ON sprint_items(related_kr_id);

-- =========================================
-- 7. FUNÇÃO HELPER
-- =========================================

CREATE OR REPLACE FUNCTION calculate_kr_progress(
    p_current_value NUMERIC,
    p_target_value NUMERIC,
    p_direction TEXT
) RETURNS NUMERIC AS $$
DECLARE
    progress NUMERIC;
BEGIN
    IF p_target_value = 0 THEN RETURN 0; END IF;
    
    IF p_direction = 'increase' THEN
        progress := (p_current_value / p_target_value) * 100;
    ELSE
        progress := ((p_target_value - p_current_value) / p_target_value) * 100;
    END IF;
    
    RETURN GREATEST(0, LEAST(100, progress));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =========================================
-- 8. VIEWS PARA ANALYTICS
-- =========================================

CREATE OR REPLACE VIEW sprint_checkins_with_metrics AS
SELECT 
    sc.*,
    s.title as sprint_title,
    s.type as sprint_type,
    s.department,
    s.start_date,
    s.end_date,
    CASE 
        WHEN sc.initiatives_total > 0 
        THEN ROUND((sc.initiatives_completed::NUMERIC / sc.initiatives_total) * 100)
        ELSE 0 
    END as completion_rate,
    CASE WHEN sc.carry_over_pct > 30 THEN true ELSE false END as high_carry_over
FROM sprint_checkins sc
JOIN sprints s ON s.id = sc.sprint_id
ORDER BY sc.created_at DESC;

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
-- VERIFICAÇÕES FINAIS
-- =========================================

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'key_results' AND column_name = 'direction') 
        THEN '✅ direction' ELSE '❌ direction' END as key_results,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'kr_checkins') 
        THEN '✅ kr_checkins' ELSE '❌ kr_checkins' END as table_kr_checkins,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sprint_checkins') 
        THEN '✅ sprint_checkins' ELSE '❌ sprint_checkins' END as table_sprint_checkins,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sprint_templates') 
        THEN '✅ sprint_templates' ELSE '❌ sprint_templates' END as table_templates;

-- ✅ Todas devem mostrar ✅
