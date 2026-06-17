-- P0 / Task 5 — Policies de repasses (own-row), usuarios (self-read) e profissionais.

-- repasses_profissionais: admin vê tudo; profissional vê só os próprios. Escrita só admin.
drop policy if exists repasses_select on public.repasses_profissionais;
create policy repasses_select on public.repasses_profissionais for select to authenticated
  using (public.app_is_admin() or profissional_id = public.app_profissional_id());

drop policy if exists repasses_write on public.repasses_profissionais;
create policy repasses_write on public.repasses_profissionais for all to authenticated
  using (public.app_is_admin()) with check (public.app_is_admin());

-- usuarios: cada um lê a própria linha; admin lê todas. Escrita só admin.
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select to authenticated
  using (email = auth.jwt() ->> 'email' or public.app_is_admin());

drop policy if exists usuarios_write on public.usuarios;
create policy usuarios_write on public.usuarios for all to authenticated
  using (public.app_is_admin()) with check (public.app_is_admin());

-- profissionais: leitura para todo staff (nomes/cores na agenda); escrita só admin.
drop policy if exists profissionais_select on public.profissionais;
create policy profissionais_select on public.profissionais for select to authenticated
  using (auth.uid() is not null);

drop policy if exists profissionais_write on public.profissionais;
create policy profissionais_write on public.profissionais for all to authenticated
  using (public.app_is_admin()) with check (public.app_is_admin());
