-- Adiciona campos de responsável na tabela sprints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sprints' AND column_name = 'responsible'
  ) THEN
    ALTER TABLE sprints ADD COLUMN responsible TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sprints' AND column_name = 'responsible_user_id'
  ) THEN
    ALTER TABLE sprints ADD COLUMN responsible_user_id UUID;
  END IF;
END $$;

-- Popular responsável das sprints existentes com base no owner do OKR vinculado
UPDATE sprints s
SET responsible = o.owner
FROM okrs o
WHERE s.okr_id = o.id
  AND s.responsible IS NULL
  AND o.owner IS NOT NULL
  AND s.deleted_at IS NULL;

COMMENT ON COLUMN sprints.responsible IS 'Nome do responsável pela sprint (herdado do OKR ou escolhido manualmente)';
COMMENT ON COLUMN sprints.responsible_user_id IS 'ID do usuário responsável pela sprint (UUID da tabela profiles)';
