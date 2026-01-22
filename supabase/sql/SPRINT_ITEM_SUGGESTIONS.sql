-- Tabela de sugestões de items a partir de check-ins
CREATE TABLE IF NOT EXISTS sprint_item_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  checkin_id UUID NOT NULL REFERENCES sprint_checkins(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- iniciativa | impedimento | decisão
  title TEXT NOT NULL,
  status TEXT NULL, -- status sugerido
  source_field TEXT NULL, -- campo de origem do check-in
  suggested_action TEXT NOT NULL, -- create | update
  existing_item_id UUID NULL REFERENCES sprint_items(id) ON DELETE SET NULL,
  applied_item_id UUID NULL REFERENCES sprint_items(id) ON DELETE SET NULL,
  match_confidence INTEGER NULL,
  suggestion_reason TEXT NULL,
  suggested_description TEXT NULL,
  suggestion_status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
  decided_at TIMESTAMP WITH TIME ZONE NULL,
  decided_by UUID NULL,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprint_item_suggestions_sprint ON sprint_item_suggestions(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_item_suggestions_checkin ON sprint_item_suggestions(checkin_id);
CREATE INDEX IF NOT EXISTS idx_sprint_item_suggestions_status ON sprint_item_suggestions(suggestion_status);

COMMENT ON TABLE sprint_item_suggestions IS 'Sugestões de itens geradas a partir de check-ins com IA';

ALTER TABLE sprint_item_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sprint_item_suggestions_select" ON sprint_item_suggestions;
DROP POLICY IF EXISTS "sprint_item_suggestions_insert" ON sprint_item_suggestions;
DROP POLICY IF EXISTS "sprint_item_suggestions_update" ON sprint_item_suggestions;
DROP POLICY IF EXISTS "sprint_item_suggestions_delete" ON sprint_item_suggestions;

CREATE POLICY "sprint_item_suggestions_select"
ON sprint_item_suggestions
FOR SELECT
USING (auth.uid() IS NOT NULL OR created_by IS NOT NULL);

CREATE POLICY "sprint_item_suggestions_insert"
ON sprint_item_suggestions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR created_by IS NOT NULL);

CREATE POLICY "sprint_item_suggestions_update"
ON sprint_item_suggestions
FOR UPDATE
USING (auth.uid() IS NOT NULL OR created_by IS NOT NULL);

CREATE POLICY "sprint_item_suggestions_delete"
ON sprint_item_suggestions
FOR DELETE
USING (auth.uid() IS NOT NULL OR created_by IS NOT NULL);
