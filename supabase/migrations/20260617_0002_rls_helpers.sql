-- P0 / Task 2 — Helpers SECURITY DEFINER para RLS.
-- Identidade resolvida por email do JWT (usuarios.id != auth.users.id).
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.usuarios where email = auth.jwt() ->> 'email' limit 1
$$;

create or replace function public.app_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin','superuser'), false)
$$;

create or replace function public.app_profissional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.id
  from public.profissionais p
  join public.usuarios u on p.usuario_id = u.id
  where u.email = auth.jwt() ->> 'email'
  limit 1
$$;

grant execute on function public.app_role() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_profissional_id() to authenticated;
