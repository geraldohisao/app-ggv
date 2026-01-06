-- =========================================
-- GGV Talent OS - Clima, PDI, Performance, Rotina
-- Execute no Supabase SQL Editor (role: owner)
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------
-- TABELAS
-- ----------------------------

CREATE TABLE IF NOT EXISTS talent_pdis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cycle TEXT NOT NULL,
    diagnostic TEXT,
    status TEXT NOT NULL CHECK (status IN ('DRAFT','REVIEW','APPROVED','IN_PROGRESS','DONE')),
    objectives JSONB DEFAULT '[]',          -- lista de objetivos/OKRs
    development_plan JSONB DEFAULT '[]',    -- lista de ações (hard/soft)
    progress INTEGER DEFAULT 0,
    history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pdi_id UUID REFERENCES talent_pdis(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('NOT_STARTED','IN_PROGRESS','DONE','LATE')),
    due_date DATE,
    lane TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period TEXT NOT NULL, -- ex: 2025-01
    technical_score NUMERIC NOT NULL,
    behavioral_score NUMERIC NOT NULL,
    total_score NUMERIC NOT NULL,
    comments TEXT,
    assessed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_checkins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    advances TEXT,
    blocks TEXT,
    motivation_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_alignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    criticality TEXT NOT NULL CHECK (criticality IN ('LOW','MEDIUM','HIGH')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_feedbacks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('AUTO','MANAGER','PEER')),
    date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_ninebox (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cycle TEXT NOT NULL,
    performance_score INTEGER NOT NULL CHECK (performance_score BETWEEN 1 AND 3),
    potential_score INTEGER NOT NULL CHECK (potential_score BETWEEN 1 AND 3),
    quadrant TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_survey_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    summary TEXT,
    kpis JSONB DEFAULT '{}',
    sentiment_distribution JSONB DEFAULT '{}',
    strengths JSONB DEFAULT '[]',
    weaknesses JSONB DEFAULT '[]',
    quotes JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]'
);

-- ----------------------------
-- TRIGGERS updated_at
-- ----------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_talent_pdis_updated_at BEFORE UPDATE ON talent_pdis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_talent_tasks_updated_at BEFORE UPDATE ON talent_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_talent_assessments_updated_at BEFORE UPDATE ON talent_assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_talent_checkins_updated_at BEFORE UPDATE ON talent_checkins FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_talent_alignments_updated_at BEFORE UPDATE ON talent_alignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_talent_feedbacks_updated_at BEFORE UPDATE ON talent_feedbacks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_talent_ninebox_updated_at BEFORE UPDATE ON talent_ninebox FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------
-- RLS
-- ----------------------------
ALTER TABLE talent_pdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_ninebox ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_survey_analysis ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Políticas padrão: Admin/Super Admin veem tudo
DO $$
BEGIN
  PERFORM 1;
END $$;

-- talent_pdis
CREATE POLICY "Admins manage pdis" ON talent_pdis FOR ALL USING (is_admin());
CREATE POLICY "Owner view/update pdi" ON talent_pdis
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- talent_tasks
CREATE POLICY "Admins manage tasks" ON talent_tasks FOR ALL USING (is_admin());
CREATE POLICY "Owner manage own tasks" ON talent_tasks
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- talent_assessments
CREATE POLICY "Admins manage assessments" ON talent_assessments FOR ALL USING (is_admin());
CREATE POLICY "Owner view assessments" ON talent_assessments FOR SELECT USING (user_id = auth.uid());

-- talent_checkins
CREATE POLICY "Admins manage checkins" ON talent_checkins FOR ALL USING (is_admin());
CREATE POLICY "Owner view checkins" ON talent_checkins FOR SELECT USING (user_id = auth.uid());

-- talent_alignments
CREATE POLICY "Admins manage alignments" ON talent_alignments FOR ALL USING (is_admin());
CREATE POLICY "Owner view alignments" ON talent_alignments FOR SELECT USING (user_id = auth.uid());

-- talent_feedbacks
CREATE POLICY "Admins manage feedbacks" ON talent_feedbacks FOR ALL USING (is_admin());
CREATE POLICY "Owner view feedbacks" ON talent_feedbacks FOR SELECT USING (user_id = auth.uid());

-- talent_ninebox
CREATE POLICY "Admins manage ninebox" ON talent_ninebox FOR ALL USING (is_admin());
CREATE POLICY "Owner view ninebox" ON talent_ninebox FOR SELECT USING (user_id = auth.uid());

-- talent_survey_analysis
CREATE POLICY "Admins manage survey analysis" ON talent_survey_analysis FOR ALL USING (is_admin());
CREATE POLICY "Admins read survey analysis" ON talent_survey_analysis FOR SELECT USING (is_admin());

-- ----------------------------
-- Índices básicos
-- ----------------------------
CREATE INDEX IF NOT EXISTS idx_talent_tasks_user ON talent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_pdis_user ON talent_pdis(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_assessments_user ON talent_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_checkins_user ON talent_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_alignments_user ON talent_alignments(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_feedbacks_user ON talent_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_ninebox_user ON talent_ninebox(user_id);



