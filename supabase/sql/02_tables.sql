-- Tabelas idempotentes para cérebro da IA
create table if not exists public.knowledge_documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

create table if not exists public.knowledge_overview (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Sobre a GGV',
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);


