-- Corrigir problema de recursão nas políticas RLS
-- O problema está na função is_admin() que causa stack overflow

-- 1. Primeiro, vamos criar uma função is_admin mais simples que não causa recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  -- Usar auth.jwt() para verificar se o usuário é admin baseado no email
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'),
    false
  );
$$;

-- 2. Garantir que a função pode ser executada
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;

-- 3. Recriar as políticas de forma mais simples para evitar recursão
-- Profiles - permitir que usuários vejam seus próprios perfis
DROP POLICY IF EXISTS "Profiles self read" ON public.profiles;
CREATE POLICY "Profiles self read" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;
CREATE POLICY "Profiles self update" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin pode ver todos os perfis (sem usar is_admin() para evitar recursão)
DROP POLICY IF EXISTS "Profiles admin all" ON public.profiles;
CREATE POLICY "Profiles admin all" ON public.profiles 
  FOR ALL USING (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  ) 
  WITH CHECK (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  );

-- 4. Simplificar políticas das outras tabelas também
-- Knowledge documents
DROP POLICY IF EXISTS "KD owner all" ON public.knowledge_documents;
CREATE POLICY "KD owner all" ON public.knowledge_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "KD admin all" ON public.knowledge_documents;
CREATE POLICY "KD admin all" ON public.knowledge_documents
  FOR ALL USING (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  ) 
  WITH CHECK (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  );

-- Knowledge overview
DROP POLICY IF EXISTS "KO owner all" ON public.knowledge_overview;
CREATE POLICY "KO owner all" ON public.knowledge_overview
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "KO admin all" ON public.knowledge_overview;
CREATE POLICY "KO admin all" ON public.knowledge_overview
  FOR ALL USING (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  ) 
  WITH CHECK (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  );

-- 5. Verificar se a tabela profiles existe e tem a estrutura correta
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('SUPER_ADMIN','ADMIN','USER')),
  user_function text CHECK (user_function IN ('SDR','Closer','Gestor')),
  email text,
  name text,
  created_at timestamptz DEFAULT now()
);

-- 6. Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Recriar o trigger para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, name)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br') THEN 'SUPER_ADMIN'
      ELSE 'USER'
    END,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'user_name', NEW.email)
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

