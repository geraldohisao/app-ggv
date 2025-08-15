-- Lista de perfis com paginação e busca (Security Definer)
create or replace function public.admin_list_profiles(
  p_limit int default 25,
  p_offset int default 0,
  p_search text default null
)
returns table(id uuid, email text, name text, role text, user_function text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Permissão negada';
  end if;
  return query
  select p.id, p.email, p.name, p.role, p.user_function, p.created_at
  from public.profiles p
  where (p_search is null or p_search = '' or
        lower(coalesce(p.email,'') || ' ' || coalesce(p.name,'')) like '%' || lower(p_search) || '%')
  order by p.created_at desc
  limit p_limit offset p_offset;
end; $$;

grant execute on function public.admin_list_profiles(int,int,text) to authenticated, service_role;

-- Atualiza role/func (Security Definer)
create or replace function public.admin_update_profile(
  p_id uuid,
  p_role text default null,
  p_function text default null
)
returns public.profiles
language plpgsql security definer set search_path = public, auth
as $$
declare rec public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Permissão negada';
  end if;
  update public.profiles
     set role = coalesce(p_role, role),
         user_function = coalesce(p_function, user_function)
   where id = p_id
   returning * into rec;
  return rec;
end; $$;

grant execute on function public.admin_update_profile(uuid, text, text) to authenticated, service_role;

-- Lista auth.users com profiles (opcional)
create or replace function public.admin_list_users_full(
  p_limit int default 25,
  p_offset int default 0,
  p_search text default null
)
returns table(id uuid, email text, name text, role text, user_function text)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Permissão negada';
  end if;
  return query
  select u.id,
         u.email,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'user_name', u.email) as name,
         coalesce(p.role, 'USER') as role,
         p.user_function
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (p_search is null or p_search = '' or lower(coalesce(u.email,'') || ' ' || coalesce(u.raw_user_meta_data->>'full_name','')) like '%' || lower(p_search) || '%')
  order by u.created_at desc
  limit p_limit offset p_offset;
end; $$;

grant execute on function public.admin_list_users_full(int,int,text) to authenticated, service_role;


