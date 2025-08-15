-- Trigger para criar profiles no primeiro login
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'USER' check (role in ('SUPER_ADMIN','ADMIN','USER')),
  user_function text check (user_function in ('SDR','Closer','Gestor')),
  email text,
  name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Policies básicas
drop policy if exists "Profiles self read" on public.profiles;
create policy "Profiles self read" on public.profiles for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles self update" on public.profiles;
create policy "Profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Profiles admin all" on public.profiles;
create policy "Profiles admin all" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, role, email, name)
  values (
    new.id,
    'USER',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'user_name', new.email)
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


