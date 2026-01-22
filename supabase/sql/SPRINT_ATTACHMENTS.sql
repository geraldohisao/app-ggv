-- =====================================================
-- SPRINT ATTACHMENTS - Anexos e Links na Sprint
-- =====================================================
-- Permite anexar arquivos (PDF, imagens, docs) e links
-- externos (Drive, Notion, Figma, etc.) às sprints
-- =====================================================

-- 1. Criar tabela de anexos
CREATE TABLE IF NOT EXISTS sprint_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  
  -- Tipo: 'link' ou 'file'
  type TEXT NOT NULL CHECK (type IN ('link', 'file')),
  
  -- Para links externos
  url TEXT,
  link_type TEXT CHECK (link_type IN ('drive', 'notion', 'figma', 'miro', 'sheets', 'docs', 'slides', 'youtube', 'loom', 'other')),
  
  -- Para arquivos uploadados
  file_name TEXT,
  file_path TEXT,      -- Caminho no Supabase Storage
  file_size INTEGER,   -- Em bytes
  file_type TEXT,      -- MIME type (application/pdf, image/png, etc.)
  
  -- Metadados comuns
  title TEXT NOT NULL,
  description TEXT,
  
  -- Histórico
  created_by TEXT,     -- Nome ou ID do usuário
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints de validação
  CONSTRAINT valid_link CHECK (type != 'link' OR url IS NOT NULL),
  CONSTRAINT valid_file CHECK (type != 'file' OR file_path IS NOT NULL)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_sprint_id ON sprint_attachments(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_type ON sprint_attachments(type);
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_created_at ON sprint_attachments(created_at DESC);

-- 3. Comentários
COMMENT ON TABLE sprint_attachments IS 'Anexos e links compartilhados nas sprints';
COMMENT ON COLUMN sprint_attachments.type IS 'Tipo do anexo: link (externo) ou file (upload)';
COMMENT ON COLUMN sprint_attachments.link_type IS 'Tipo do link: drive, notion, figma, miro, sheets, docs, slides, youtube, loom, other';
COMMENT ON COLUMN sprint_attachments.file_path IS 'Caminho do arquivo no bucket sprint-attachments do Supabase Storage';
COMMENT ON COLUMN sprint_attachments.created_by IS 'Nome ou identificador de quem adicionou o anexo';

-- 4. Políticas RLS
ALTER TABLE sprint_attachments ENABLE ROW LEVEL SECURITY;

-- Política de leitura para todos
DROP POLICY IF EXISTS "anon_read_sprint_attachments" ON sprint_attachments;
CREATE POLICY "anon_read_sprint_attachments" ON sprint_attachments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política de inserção
DROP POLICY IF EXISTS "anon_insert_sprint_attachments" ON sprint_attachments;
CREATE POLICY "anon_insert_sprint_attachments" ON sprint_attachments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política de atualização
DROP POLICY IF EXISTS "anon_update_sprint_attachments" ON sprint_attachments;
CREATE POLICY "anon_update_sprint_attachments" ON sprint_attachments
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Política de deleção
DROP POLICY IF EXISTS "anon_delete_sprint_attachments" ON sprint_attachments;
CREATE POLICY "anon_delete_sprint_attachments" ON sprint_attachments
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- SUPABASE STORAGE BUCKET
-- =====================================================
-- Nota: O bucket deve ser criado via Dashboard do Supabase:
-- 1. Acesse Storage no painel do Supabase
-- 2. Clique em "New bucket"
-- 3. Nome: sprint-attachments
-- 4. Public: false (privado)
-- 5. File size limit: 10485760 (10MB)
-- 6. Allowed MIME types: image/*, application/pdf, 
--    application/vnd.openxmlformats-officedocument.*,
--    application/msword, application/vnd.ms-excel,
--    application/vnd.ms-powerpoint, text/plain
-- =====================================================

-- Se você tiver acesso SQL ao Storage, pode usar:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'sprint-attachments',
--   'sprint-attachments', 
--   false,
--   10485760,
--   ARRAY['image/*', 'application/pdf', 'application/vnd.openxmlformats-officedocument.*']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage (executar via Dashboard ou API):
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'sprint-attachments');
--
-- CREATE POLICY "Allow authenticated downloads" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'sprint-attachments');
--
-- CREATE POLICY "Allow authenticated deletes" ON storage.objects
--   FOR DELETE TO authenticated
--   USING (bucket_id = 'sprint-attachments');

-- 5. Verificação
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sprint_attachments'
ORDER BY ordinal_position;
image.png