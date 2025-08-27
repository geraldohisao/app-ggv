-- Criar tabela para logs globais do sistema de debug
CREATE TABLE IF NOT EXISTS debug_logs (
  id BIGSERIAL PRIMARY KEY,
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON debug_logs(level);
CREATE INDEX IF NOT EXISTS idx_debug_logs_user_id ON debug_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_logs_source ON debug_logs(source);

-- RLS (Row Level Security)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de qualquer usuário autenticado
CREATE POLICY "Usuários podem inserir logs" ON debug_logs
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir leitura apenas para super admins
CREATE POLICY "Super admins podem ler logs" ON debug_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SuperAdmin', 'Admin')
    )
  );

-- Função para limpeza automática de logs antigos (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_debug_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM debug_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE debug_logs IS 'Tabela para armazenar logs globais do sistema de debug';
COMMENT ON COLUMN debug_logs.level IS 'Nível do log: info, warn, error, debug';
COMMENT ON COLUMN debug_logs.source IS 'Fonte/origem do log (ex: Console, GlobalError, Test)';
COMMENT ON COLUMN debug_logs.message IS 'Mensagem do log';
COMMENT ON COLUMN debug_logs.user_id IS 'ID do usuário que gerou o log';
COMMENT ON COLUMN debug_logs.user_name IS 'Nome do usuário (cache para performance)';
COMMENT ON COLUMN debug_logs.user_email IS 'Email do usuário (cache para performance)';
COMMENT ON COLUMN debug_logs.metadata IS 'Dados adicionais em formato JSON';
