# P0 — Segurança (RLS, credenciais, edge functions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a exposição de dados do app do Studio (banco sem RLS, credenciais públicas, edge functions sem autorização) sem regredir o fluxo de uso.

**Architecture:** Habilitar Row Level Security em todas as tabelas com policies baseadas em papel (resolvido por email do JWT), com exceção de "profissional vê os próprios repasses". O SQL é versionado em `supabase/migrations/` e aplicado manualmente no SQL Editor do painel Supabase. Um admin real (Tatiane) é criado antes de ligar o RLS; as contas de teste são removidas por último. Edge functions passam a checar autorização e usam service role apenas para escrever repasses.

**Tech Stack:** PostgreSQL/Supabase (RLS, funções `SECURITY DEFINER`), Deno (edge functions), Vite + React (frontend), GitHub Actions → GitHub Pages (deploy do frontend já existente).

## Global Constraints

- Identidade no banco resolve-se **por email**: `auth.jwt() ->> 'email'` (porque `usuarios.id ≠ auth.users.id`; ligados só por email).
- Papéis válidos em `usuarios.role`: `admin`, `superuser`, `professor`, `massoterapeuta`. Admin "pleno" = `app_is_admin()` = papel ∈ {`admin`, `superuser`}.
- Admin real: `studiopilatestatiane@gmail.com`, senha provisória `studio@123` (a trocar no 1º acesso).
- SQL aplicado via **SQL Editor do painel** (projeto `hnyjvjflpoierndarupx`). Todo bloco SQL é idempotente (`drop policy if exists`, `create or replace`).
- **Ordem de segurança inquebrável:** criar admin real → criar helpers/policies → ligar RLS → verificar → só então remover contas de teste.
- Cada tarefa SQL grava também um arquivo de migration versionado e o commita (fonte da verdade), mesmo sendo aplicado à mão.
- Branch de trabalho: `feat/p0-security-rls`.

---

### Task 1: Bootstrap do admin real (Tatiane)

Cria a conta real de admin **antes** de qualquer RLS, para não trancar o acesso.

**Files:**
- Create: `supabase/migrations/20260617_0001_seed_admin_tatiane.sql`

**Interfaces:**
- Produces: linha em `public.usuarios` com `email='studiopilatestatiane@gmail.com'`, `role='admin'`, `status='ativo'`.

- [ ] **Step 1: Criar a conta de auth no painel (manual)**

No painel Supabase → Authentication → Users → **Add user**:
- Email: `studiopilatestatiane@gmail.com`
- Password: `studio@123`
- Marcar "Auto Confirm User" (email confirmado).

- [ ] **Step 2: Escrever a migration de upsert do perfil**

Conteúdo de `supabase/migrations/20260617_0001_seed_admin_tatiane.sql`:

```sql
-- Garante o perfil admin da dona do Studio (conta auth criada no painel).
insert into public.usuarios (email, nome, role, status)
values ('studiopilatestatiane@gmail.com', 'Tatiane Kafka Ghizoni', 'admin', 'ativo')
on conflict (email) do update
  set role = 'admin', status = 'ativo', nome = excluded.nome;
```

- [ ] **Step 3: Aplicar no SQL Editor**

Colar o bloco do Step 2 no SQL Editor e executar.

- [ ] **Step 4: Verificar**

Rodar no SQL Editor:
```sql
select email, role, status from public.usuarios where email = 'studiopilatestatiane@gmail.com';
```
Esperado: 1 linha com `role = admin`, `status = ativo`.

Verificar login: abrir o app publicado, logar com `studiopilatestatiane@gmail.com` / `studio@123`. Esperado: entra e cai no Dashboard.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260617_0001_seed_admin_tatiane.sql
git commit -m "feat(db): seed do admin real (Tatiane) antes do RLS"
```

---

### Task 2: Helpers SQL de identidade/papel

Funções `SECURITY DEFINER` que as policies usarão. Rodam acima do RLS (sem recursão).

**Files:**
- Create: `supabase/migrations/20260617_0002_rls_helpers.sql`

**Interfaces:**
- Produces: `public.app_role() → text`, `public.app_is_admin() → boolean`, `public.app_profissional_id() → uuid`. Usadas por todas as policies das Tasks 3–5.

- [ ] **Step 1: Escrever a migration**

Conteúdo de `supabase/migrations/20260617_0002_rls_helpers.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar no SQL Editor**

Colar e executar o bloco do Step 1.

- [ ] **Step 3: Verificar**

```sql
select public.app_role(), public.app_is_admin();
```
Esperado (rodando como o usuário `postgres` do editor, sem JWT de app): `app_role` = NULL, `app_is_admin` = `false` (não quebra; só confirma que as funções existem e executam).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617_0002_rls_helpers.sql
git commit -m "feat(db): helpers SECURITY DEFINER para RLS (app_role/app_is_admin/app_profissional_id)"
```

---

### Task 3: Policies das tabelas operacionais (compartilhadas)

`clientes`, `agendamentos`, `contratos_cliente`, `consumo_pacote`, `reposicoes`: qualquer staff logado lê e escreve. **Ainda não liga RLS** (isso é a Task 6).

**Files:**
- Create: `supabase/migrations/20260617_0003_rls_operacional.sql`

**Interfaces:**
- Consumes: nada (policies independem dos helpers; usam `auth.uid()`).

- [ ] **Step 1: Escrever a migration**

Conteúdo de `supabase/migrations/20260617_0003_rls_operacional.sql`:

```sql
-- Tabelas operacionais: leitura/escrita para qualquer usuário autenticado.
do $$
declare t text;
begin
  foreach t in array array['clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes']
  loop
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format(
      'create policy %I_rw on public.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
      t, t);
  end loop;
end $$;
```

- [ ] **Step 2: Aplicar no SQL Editor**

Colar e executar.

- [ ] **Step 3: Verificar policies criadas**

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes')
order by tablename;
```
Esperado: uma policy `<tabela>_rw` por tabela, `cmd = ALL`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617_0003_rls_operacional.sql
git commit -m "feat(db): policies das tabelas operacionais (acesso compartilhado autenticado)"
```

---

### Task 4: Policies das tabelas financeiras/administrativas (admin-only)

`pagamentos`, `pagamentos_aluguel`, `parcelas_planos`, `planos`, `pacotes`, `horarios_funcionamento`, `periodos_fechamento`, `studio_config`, `audit_log`: somente admin/superuser.

**Files:**
- Create: `supabase/migrations/20260617_0004_rls_admin.sql`

**Interfaces:**
- Consumes: `public.app_is_admin()` (Task 2).

- [ ] **Step 1: Escrever a migration**

Conteúdo de `supabase/migrations/20260617_0004_rls_admin.sql`:

```sql
-- Tabelas financeiras/administrativas: somente admin/superuser.
do $$
declare t text;
begin
  foreach t in array array[
    'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
    'horarios_funcionamento','periodos_fechamento','studio_config','audit_log']
  loop
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format(
      'create policy %I_admin on public.%I for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin())',
      t, t);
  end loop;
end $$;
```

- [ ] **Step 2: Aplicar no SQL Editor**

Colar e executar.

- [ ] **Step 3: Verificar**

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
                    'horarios_funcionamento','periodos_fechamento','studio_config','audit_log')
order by tablename;
```
Esperado: uma policy `<tabela>_admin` por tabela, `cmd = ALL`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617_0004_rls_admin.sql
git commit -m "feat(db): policies admin-only para tabelas financeiras/administrativas"
```

---

### Task 5: Policies de repasses, usuarios e profissionais

Exceção do profissional (vê os próprios repasses), self-read em `usuarios`, leitura compartilhada de `profissionais`.

**Files:**
- Create: `supabase/migrations/20260617_0005_rls_repasses_usuarios.sql`

**Interfaces:**
- Consumes: `public.app_is_admin()`, `public.app_profissional_id()` (Task 2).

- [ ] **Step 1: Escrever a migration**

Conteúdo de `supabase/migrations/20260617_0005_rls_repasses_usuarios.sql`:

```sql
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
```

- [ ] **Step 2: Aplicar no SQL Editor**

Colar e executar.

- [ ] **Step 3: Verificar**

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('repasses_profissionais','usuarios','profissionais')
order by tablename, policyname;
```
Esperado: `repasses_select`(SELECT)+`repasses_write`(ALL); `usuarios_select`(SELECT)+`usuarios_write`(ALL); `profissionais_select`(SELECT)+`profissionais_write`(ALL).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617_0005_rls_repasses_usuarios.sql
git commit -m "feat(db): policies de repasses (own-row), usuarios (self-read) e profissionais"
```

---

### Task 6: Ligar o RLS e verificar com dois logins

Liga RLS em todas as tabelas e valida a matriz antes de remover qualquer conta. **Este é o ponto crítico** — só avance se a verificação passar.

**Files:**
- Create: `supabase/migrations/20260617_0006_enable_rls.sql`

**Interfaces:**
- Consumes: todas as policies das Tasks 3–5.

- [ ] **Step 1: Escrever a migration**

Conteúdo de `supabase/migrations/20260617_0006_enable_rls.sql`:

```sql
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes',
    'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
    'horarios_funcionamento','periodos_fechamento','studio_config','audit_log',
    'repasses_profissionais','usuarios','profissionais']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
```

- [ ] **Step 2: Aplicar no SQL Editor**

Colar e executar.

- [ ] **Step 3: Confirmar RLS ligado**

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('clientes','agendamentos','contratos_cliente','consumo_pacote','reposicoes',
                  'pagamentos','pagamentos_aluguel','parcelas_planos','planos','pacotes',
                  'horarios_funcionamento','periodos_fechamento','studio_config','audit_log',
                  'repasses_profissionais','usuarios','profissionais')
order by relname;
```
Esperado: `relrowsecurity = true` em todas.

- [ ] **Step 4: Verificar como ADMIN (Tatiane) no app**

Logar como `studiopilatestatiane@gmail.com`. Esperado:
- Dashboard e Relatórios carregam (views funcionam sob RLS).
- Página Pagamentos lista pagamentos/repasses/aluguel.
- Usuários e Configurações abrem e listam dados.

- [ ] **Step 5: Verificar como PROFISSIONAL no app**

Criar/usar uma conta `professor` de teste (no painel Authentication + `insert into usuarios (...) values (..., 'professor', 'ativo')` ligada a um `profissionais.usuario_id`). Logar e confirmar:
- Agenda, Clientes, Contratos funcionam.
- Pagamentos: a query retorna **vazio** (sem erro de app) — financeiro escondido.
- Em repasses, vê **apenas** os próprios (validar via uma query no painel impersonando não é trivial; validar pela tela/efeito).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260617_0006_enable_rls.sql
git commit -m "feat(db): habilita RLS em todas as tabelas de dados"
```

---

### Task 7: Remover as contas de teste

Só depois da Task 6 passar. Trata as FKs (`profissionais.usuario_id`, `audit_log.usuario_id`) antes de deletar.

**Files:**
- Create: `supabase/migrations/20260617_0007_remove_test_accounts.sql`

- [ ] **Step 1: Conferir vínculos antes de deletar**

```sql
select u.email, p.id as profissional_id, p.nome as profissional_nome
from public.usuarios u
left join public.profissionais p on p.usuario_id = u.id
where u.email in ('tatiane@studio.com','renata@studio.com','miriam@studio.com',
                  'aguinel@studio.com','aguinel@gmail.com','admin@studio.com');
```
Anotar quais contas de teste estão ligadas a um `profissionais` real (Tatiane/Renata/Miriam provavelmente são instrutoras reais). **As linhas de `profissionais` NÃO devem ser apagadas** — só as contas de login de teste. Se houver vínculo, religar o profissional à conta real correspondente quando ela existir (ex.: a Tatiane real). Para profissionais sem conta real ainda, deixar `usuario_id = null`.

- [ ] **Step 2: Escrever a migration**

Conteúdo de `supabase/migrations/20260617_0007_remove_test_accounts.sql`:

```sql
-- Religa a profissional Tatiane à conta real (se a de teste estava vinculada).
update public.profissionais
set usuario_id = (select id from public.usuarios where email = 'studiopilatestatiane@gmail.com')
where usuario_id in (select id from public.usuarios where email = 'tatiane@studio.com');

-- Desvincula profissionais ainda sem conta real (evita violar a FK ao deletar).
update public.profissionais
set usuario_id = null
where usuario_id in (
  select id from public.usuarios
  where email in ('renata@studio.com','miriam@studio.com','aguinel@studio.com','aguinel@gmail.com','admin@studio.com')
);

-- Remove perfis de teste.
delete from public.usuarios
where email in ('tatiane@studio.com','renata@studio.com','miriam@studio.com',
                'aguinel@studio.com','aguinel@gmail.com','admin@studio.com');

-- Remove contas de auth de teste.
delete from auth.users
where email in ('tatiane@studio.com','renata@studio.com','miriam@studio.com',
                'aguinel@studio.com','aguinel@gmail.com','admin@studio.com');
```

- [ ] **Step 3: Aplicar no SQL Editor**

Colar e executar.

- [ ] **Step 4: Verificar**

```sql
select count(*) as contas_teste_restantes from auth.users
where email in ('tatiane@studio.com','renata@studio.com','miriam@studio.com',
                'aguinel@studio.com','aguinel@gmail.com','admin@studio.com');
```
Esperado: `0`. E confirmar que Tatiane real ainda loga normalmente.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260617_0007_remove_test_accounts.sql
git commit -m "feat(db): remove contas de teste apos validar RLS"
```

---

### Task 8: Remover o quadro de credenciais do Login

Remove a exposição pública das credenciais e publica via o workflow de Pages existente.

**Files:**
- Modify: `src/pages/Login.tsx:132-139`

- [ ] **Step 1: Remover o bloco**

Apagar o `<div>` de "Credenciais de Teste" (linhas 132-139) — o `<div className="bg-muted/50 ...">` inteiro, incluindo os `<p>` das contas.

- [ ] **Step 2: Build de verificação**

Run: `npm run build`
Expected: build conclui sem erro de type/compilação; sem referência remanescente às credenciais.

- [ ] **Step 3: Confirmar que sumiu**

Run: `grep -n "Credenciais de Teste\|senha123\|@studio.com" src/pages/Login.tsx`
Expected: nenhuma ocorrência.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "fix(login): remove quadro de credenciais de teste da tela publica"
```

- [ ] **Step 5: Publicar**

O merge desta branch na `main` dispara `deploy-pages.yml`. Após o deploy, confirmar no site público que o quadro sumiu da tela de login.

---

### Task 9: Hardening de `calcular-repasse-aula`

Profissional pode marcar as próprias aulas (Opção i). A função passa a checar autorização e usa service role só para escrever o repasse.

**Files:**
- Modify: `supabase/functions/calcular-repasse-aula/index.ts`

**Interfaces:**
- Consumes: env `SUPABASE_SERVICE_ROLE_KEY` (já disponível no runtime de Edge Functions do Supabase).

- [ ] **Step 1: Adicionar checagem de autorização do chamador**

Após criar o `supabase` (client com JWT do usuário) e ler `{ agendamento_id, status }`, inserir:

```ts
// Identifica o chamador pelo JWT.
const { data: userData, error: userErr } = await supabase.auth.getUser()
if (userErr || !userData?.user?.email) {
  return new Response(JSON.stringify({ error: 'Não autenticado' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
const callerEmail = userData.user.email

// Papel do chamador.
const { data: perfil } = await supabase
  .from('usuarios').select('id, role').eq('email', callerEmail).single()
const isAdmin = perfil?.role === 'admin' || perfil?.role === 'superuser'

// Profissional dono do agendamento.
const { data: ag } = await supabase
  .from('agendamentos').select('profissional_id').eq('id', agendamento_id).single()

// Profissional vinculado ao chamador.
const { data: prof } = await supabase
  .from('profissionais').select('id').eq('usuario_id', perfil?.id).maybeSingle()

const isOwner = !!ag && !!prof && ag.profissional_id === prof.id
if (!isAdmin && !isOwner) {
  return new Response(JSON.stringify({ error: 'Sem permissão para este agendamento' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
```

- [ ] **Step 2: Usar service role para a escrita do repasse**

Criar um client elevado e usá-lo **apenas** no insert/update de `repasses_profissionais` (mantendo o restante no client do usuário):

```ts
const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)
// ... onde hoje faz supabase.from('repasses_profissionais').insert(...)
// trocar por admin.from('repasses_profissionais').insert(...)
```

- [ ] **Step 3: Corrigir divisão por zero do repasse**

Onde calcula `pacote.preco / quantidade_sessoes`, guardar contra zero:

```ts
const valorBruto = quantidade_sessoes > 0 ? pacote.preco / quantidade_sessoes : 180
```

- [ ] **Step 4: Deploy da função**

Run (CLI logado no projeto): `supabase functions deploy calcular-repasse-aula`
(ou colar o código no editor de Edge Functions do painel).

- [ ] **Step 5: Verificar**

- Logado como o profissional dono: marcar a própria aula como `realizado` → repasse é criado (conferir `repasses_profissionais` no painel).
- Logado como profissional NÃO dono: tentar marcar aula de outro → resposta 403, nenhum repasse criado.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/calcular-repasse-aula/index.ts
git commit -m "fix(edge): autoriza chamador e usa service role para escrever repasse"
```

---

### Task 10: Hardening de `update-agendamento`

Checagem de autorização sobre o agendamento e remoção do hardcode de nomes de profissionais.

**Files:**
- Modify: `supabase/functions/update-agendamento/index.ts`

- [ ] **Step 1: Checar autorização do chamador**

No início do handler (após ler o corpo), aplicar a mesma checagem de identidade da Task 9 Step 1: obter `callerEmail`, `isAdmin`, e — para ações sobre um agendamento existente (cancelar/marcar/remarcar) — exigir `isAdmin || isOwner` do `profissional_id` do agendamento. Para `criar`, exigir `isAdmin || isOwner` do `profissional_id` informado no payload. Retornar 401/403 como na Task 9.

- [ ] **Step 2: Remover hardcode de nomes na validação de sala**

Substituir as comparações por nome literal (`'Tatiane Kafka Ghizoni'`, `'Renata Tomazetti'`) por filtro de profissionais de pilates por `tipo`:

```ts
// Antes: .eq('nome', 'Tatiane Kafka Ghizoni') / .eq('nome', 'Renata Tomazetti')
// Depois: profissionais de pilates concorrendo pela mesma sala/horário.
const { data: pilatesProfs } = await supabase
  .from('profissionais').select('id').eq('tipo', 'pilates')
// usar pilatesProfs.map(p => p.id) na verificação de conflito de sala
```

- [ ] **Step 3: Deploy da função**

Run: `supabase functions deploy update-agendamento`

- [ ] **Step 4: Verificar**

- Profissional dono cria/cancela a própria aula → OK.
- Profissional tenta agir sobre aula de outro → 403.
- Conflito de sala de pilates continua sendo detectado (testar dois profissionais de pilates no mesmo horário) sem depender de nomes.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/update-agendamento/index.ts
git commit -m "fix(edge): autoriza chamador e remove hardcode de nomes na validacao de sala"
```

---

### Task 11: Fechamento do P0

- [ ] **Step 1: Rodar o roteiro de verificação completo** (§6 do spec) com os dois logins, confirmando cada linha da matriz.
- [ ] **Step 2: Abrir PR da branch `feat/p0-security-rls` para `main`** com resumo das mudanças (migrations + login + edge functions) e o checklist de aplicação manual no painel.
- [ ] **Step 3: Após merge**, confirmar deploy do frontend (quadro de credenciais sumiu) e que o app segue funcional para admin e profissional.

---

## Apêndice — Próximas fases (planos próprios, não detalhados aqui)

Cada fase abaixo deve passar por seu próprio ciclo brainstorming → spec → plano antes de implementar. Resumo do elenco já levantado:

- **P1 — Bugs e estabilidade:** `useCallback` estável nos hooks de dados (corrigir re-fetch em loop do `useDashboardData`), guardas de `undefined` em relacionamentos, Error Boundary por página, trocar `window.location.reload()` e `confirm()` nativos, unificar o enum de status de agendamento (types ↔ constraint ↔ edge functions), fallback gracioso quando views SQL não existem.
- **P2 — Fluidez/UX:** adotar TanStack Query (cache/dedup/revalidação), padronizar loading/empty/erro, debounce na busca, acessibilidade (focus trap, aria-labels), ajustes mobile, remover hardcode de nomes em `TabReceitas`, i18n da 404.
- **P3 — Performance:** code-splitting por rota (`React.lazy`+`Suspense`) para quebrar o bundle de ~1,2 MB; eliminar `any` e ligar `strict`.
- **P4 — Funcionalidades de negócio:** agenda recorrente, check-in/presença e relatório de frequência, notificações (e-mail/WhatsApp), limite de capacidade por horário, renovação automática de contrato, gateway de pagamento.
