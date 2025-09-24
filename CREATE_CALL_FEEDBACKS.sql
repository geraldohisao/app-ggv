-- 🗂️ Tabela de feedbacks por chamada
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS call_feedbacks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  sdr_id UUID, -- opcional, se quisermos atrelar ao SDR
  author_id UUID, -- quem escreveu o feedback
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_call_feedbacks_call_id ON call_feedbacks(call_id);
CREATE INDEX IF NOT EXISTS idx_call_feedbacks_sdr_id ON call_feedbacks(sdr_id);
CREATE INDEX IF NOT EXISTS idx_call_feedbacks_author_id ON call_feedbacks(author_id);

-- RLS simples (curto prazo): todos autenticados podem ver e criar
ALTER TABLE call_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_all_feedbacks" ON call_feedbacks;
DROP POLICY IF EXISTS "insert_all_feedbacks" ON call_feedbacks;
DROP POLICY IF EXISTS "update_own_feedbacks" ON call_feedbacks;

CREATE POLICY "read_all_feedbacks" ON call_feedbacks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "insert_all_feedbacks" ON call_feedbacks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "update_own_feedbacks" ON call_feedbacks
  FOR UPDATE USING (author_id = auth.uid());

-- Views úteis (opcional)
CREATE OR REPLACE VIEW v_my_feedbacks AS
SELECT * FROM call_feedbacks WHERE sdr_id = auth.uid();

