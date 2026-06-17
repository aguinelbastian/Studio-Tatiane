# P0 — Segurança: RLS, credenciais e hardening de edge functions

**Data:** 2026-06-17
**Status:** Aprovado (design)
**Branch:** `feat/p0-security-rls`

## Contexto e problema

O app (Vite + React 19 + Supabase) de gestão do Studio de Pilates está publicado no GitHub Pages e em uso. Hoje a autorização existe **apenas no frontend** (o menu em `MainLayout` esconde páginas por papel), mas o banco de dados **não tem Row Level Security (RLS)** em nenhuma tabela de dados — apenas o bucket `avatars` tem policies (`supabase/migrations/20260413123818_update_agendamentos_status.sql:8-12`).

Consequências concretas:
- Qualquer usuário autenticado (inclusive um `professor`) pode ler/gravar **qualquer** tabela direto via `VITE_SUPABASE_PUBLISHABLE_KEY` — incluindo `pagamentos`, `repasses_profissionais`, `usuarios`.
- A tela de login (`src/pages/Login.tsx:132-139`) exibe publicamente credenciais de teste (`admin@studio.com` … senha `senha123`).
- As edge functions criam o client Supabase com a anon key repassando o JWT do usuário (`supabase/functions/calcular-repasse-aula/index.ts:14-18`, `supabase/functions/update-agendamento/index.ts`), então hoje operam sem qualquer restrição porque não há RLS.

## Objetivo

Fechar a exposição de dados sem regredir o fluxo atual de uso, e deixar o sistema com um primeiro admin real antes de trancar o acesso.

Fora de escopo (vai para P1+ em planos separados): correção de bugs de estado, React Query, performance, novas funcionalidades de negócio.

## Fatos técnicos que fundamentam o desenho

- **Identidade:** `public.usuarios.id` **não** é igual a `auth.users.id`. As duas tabelas são ligadas **apenas pelo email** (`supabase/migrations/20260411225148_seed_auth_users.sql:108-115`). Logo, no RLS a identidade é resolvida por `auth.jwt() ->> 'email'`.
- `usuarios.email` é único (há `ON CONFLICT (email)`), então a busca por email é determinística.
- Papéis vivem em `usuarios.role`: `admin`, `superuser`, `professor`, `massoterapeuta` (default `professor` no fallback do `useAuthStore`).
- `profissionais.usuario_id → usuarios.id` liga um profissional ao seu usuário (usado na exceção de repasses).
- As edge functions repassam o JWT do usuário, então **passam a respeitar o RLS automaticamente** assim que ele for ligado.

## Modelo de permissões (decidido com o usuário)

- **Tatiane = dona → `admin`, acesso total.** Email real: `studiopilatestatiane@gmail.com`. Senha provisória: `studio@123` (a trocar no primeiro acesso).
- **Operacional compartilhado** entre todo staff logado: `clientes`, `agendamentos`, `contratos_cliente`, `consumo_pacote`, `reposicoes`.
- **Financeiro/administrativo** restrito a `admin`/`superuser`: `pagamentos`, `pagamentos_aluguel`, `parcelas_planos`, `planos`, `pacotes`, `horarios_funcionamento`, `periodos_fechamento`, `studio_config`, `audit_log`.
- **Exceção:** profissional vê os **próprios** repasses em `repasses_profissionais`.
- **Contas de teste** (`*@studio.com`, `aguinel@gmail.com`) são descartáveis: removidas de `usuarios` e `auth.users` após o bootstrap.

## Desenho

### 1. Helpers SQL (`SECURITY DEFINER`)

Rodam acima do RLS para evitar recursão ao consultar `usuarios`. Resolvem tudo por email do JWT.

- `app_role() returns text` — `SELECT role FROM public.usuarios WHERE email = auth.jwt()->>'email'`
- `app_is_admin() returns boolean` — `app_role() IN ('admin','superuser')`
- `app_profissional_id() returns uuid` — `SELECT p.id FROM profissionais p JOIN usuarios u ON p.usuario_id = u.id WHERE u.email = auth.jwt()->>'email'`

`GRANT EXECUTE` para `authenticated`. Funções marcadas `STABLE`.

### 2. Matriz de RLS por tabela

Todas recebem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Policies por operação:

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `clientes`, `agendamentos`, `contratos_cliente`, `consumo_pacote`, `reposicoes` | autenticado | autenticado |
| `profissionais` | autenticado | `app_is_admin()` |
| `pagamentos`, `pagamentos_aluguel`, `parcelas_planos`, `planos`, `pacotes`, `horarios_funcionamento`, `periodos_fechamento`, `studio_config`, `audit_log` | `app_is_admin()` | `app_is_admin()` |
| `repasses_profissionais` | `app_is_admin() OR profissional_id = app_profissional_id()` | `app_is_admin()` (+ exceção da edge function, ver §5) |
| `usuarios` | `email = auth.jwt()->>'email' OR app_is_admin()` | `app_is_admin()` |

"autenticado" = a policy exige sessão (`auth.role() = 'authenticated'` / `auth.uid() IS NOT NULL`). As views `vw_*` herdam o RLS das tabelas-base e são consultadas apenas por telas admin.

### 3. Ordem de implantação (bootstrap sem lockout)

Aplicado via **SQL Editor do painel Supabase** (decisão do usuário). Ordem obrigatória:

1. **Criar a Tatiane real** no painel (Authentication → Add user): `studiopilatestatiane@gmail.com` / `studio@123` (o painel faz o hash correto). Depois rodar SQL que faz upsert da linha em `usuarios` como `admin`/`ativo`.
2. Criar helpers (§1) e policies (§2) — ainda sem ligar RLS.
3. **Ligar RLS** tabela por tabela.
4. **Verificar** (§6) logando como Tatiane e como um profissional.
5. Só então **remover as contas de teste** de `usuarios` e `auth.users`.

Cada passo é um bloco SQL separado e idempotente quando possível (`drop policy if exists`, `create or replace function`).

### 4. Frontend

Remover o bloco de "Credenciais de Teste" (`src/pages/Login.tsx:132-139`). Publica pelo workflow `deploy-pages.yml` existente. Sem outras mudanças de comportamento.

### 5. Edge functions — autorização (Opção i aprovada)

Profissional pode marcar as **próprias** aulas como realizadas (o que gera repasse). Como a matriz só permite admin escrever em `repasses_profissionais`:

- `calcular-repasse-aula` passa a usar a **service role** apenas para o `INSERT`/`UPDATE` do repasse, **após** uma checagem explícita no código: o chamador é `admin`/`superuser` **ou** é o profissional dono do `agendamento_id`. A identidade do chamador é obtida do JWT recebido.
- Demais leituras/escritas das funções continuam com o JWT do usuário (respeitando RLS).
- `update-agendamento` mantém JWT do usuário; valida que o chamador tem permissão sobre o agendamento (dono/admin) antes de criar/cancelar/remarcar.
- Corrige de passagem o hardcode de nomes de profissionais ("Tatiane"/"Renata") na validação de sala, trocando por filtro por `tipo`/id (necessário para não acoplar a lógica a nomes específicos).

### 6. Verificação (roteiro manual)

Com dois logins, antes de remover as contas de teste:
- **Admin (Tatiane):** lê/edita financeiro, vê todos os repasses, gerencia usuários/config. ✅
- **Profissional:** acessa agenda/clientes/contratos; **não** consegue ler `pagamentos`/`pagamentos_aluguel` (query retorna vazio/erro); vê **apenas** os próprios em `repasses_profissionais`; consegue marcar a própria aula como realizada e o repasse é gerado; **não** consegue marcar aula de outro profissional.
- Conferir que o app (Dashboard/Relatórios) continua funcionando para admin (views herdam RLS).

## Critérios de pronto (P0)

- RLS habilitado em todas as tabelas de dados listadas, com as policies da matriz.
- Tatiane real criada e validada como admin; contas de teste removidas.
- Quadro de credenciais removido do login e publicado.
- `calcular-repasse-aula` e `update-agendamento` com checagem de autorização; hardcode de nomes removido.
- Roteiro de verificação (§6) executado com sucesso.

## Riscos e mitigações

- **Lockout:** mitigado pela ordem de bootstrap (admin real antes de ligar RLS; remover contas de teste por último).
- **Quebra de telas admin por RLS nas views:** mitigado testando Dashboard/Relatórios como admin no passo 4.
- **Drift do banco remoto vs migrations:** o estado real do projeto `hnyjvjflpoierndarupx` pode divergir das migrations versionadas. Mitigação: cada bloco SQL é idempotente e, ao ligar RLS, conferimos no painel que nenhuma policy pré-existente conflita.
- **Service role na edge function:** poder elevado — mitigado pela checagem explícita de propriedade/admin antes de qualquer escrita privilegiada, e pelo escopo mínimo (só o insert/update do repasse).
