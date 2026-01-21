-- Adiciona vínculo opcional de responsável (usuário interno) aos itens de sprint

ALTER TABLE sprint_items
ADD COLUMN IF NOT EXISTS responsible_user_id UUID NULL REFERENCES profiles(id);

COMMENT ON COLUMN sprint_items.responsible_user_id IS 'Usuário responsável (profiles.id). Se nulo, usar responsável externo em texto.';

CREATE INDEX IF NOT EXISTS idx_sprint_items_responsible_user_id ON sprint_items(responsible_user_id);
