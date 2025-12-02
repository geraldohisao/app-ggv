-- Script para adicionar "Analista de Marketing" como nova função comercial
-- Execute no SQL Editor do seu projeto Supabase com um usuário/postgres com permissão

-- 1) Atualizar constraint da tabela profiles para incluir 'Analista de Marketing'
-- Remove a constraint antiga
alter table public.profiles drop constraint if exists profiles_user_function_check;

-- Adiciona a nova constraint com 'Analista de Marketing'
alter table public.profiles add constraint profiles_user_function_check 
  check (user_function in ('SDR','Closer','Gestor','Analista de Marketing'));

-- 2) Atualizar constraint da tabela user_functions (se ainda existir)
-- Esta tabela pode estar deprecated, mas vamos atualizar por garantia
alter table public.user_functions drop constraint if exists user_functions_function_check;

alter table public.user_functions add constraint user_functions_function_check
  check (function in ('SDR','Closer','Gestor','Analista de Marketing'));

-- 3) Verificar usuários com a nova função (teste)
-- Descomentar para testar:
-- select id, email, name, role, user_function 
-- from public.profiles 
-- where user_function = 'Analista de Marketing';

-- 4) Exemplo de como atribuir a função a um usuário (opcional)
-- Substitua 'UUID_DO_USUARIO' pelo ID real do usuário
-- update public.profiles 
-- set user_function = 'Analista de Marketing' 
-- where id = 'UUID_DO_USUARIO';

-- ✅ Script concluído!
-- Agora os usuários podem ser atribuídos à função "Analista de Marketing"
-- e terão acesso exclusivo à calculadora OTE específica para seu perfil.

