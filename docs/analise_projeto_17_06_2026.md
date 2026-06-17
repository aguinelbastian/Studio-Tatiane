# Studio Tatiane — Análise Profunda: Agendamento + Financeiro

> Data: 2026-06-17 · Branch: `feat/p0-security-rls`
> Base: leitura de código (frontend + edge functions), schema e **consulta ao banco remoto ao vivo** para validar views e triggers não versionadas.

## 0. Panorama da arquitetura

Sistema de gestão de estúdio (Pilates + massoterapia) em **Vite + React 19 + Supabase**. A lógica de negócio vive em três lugares — e essa fragmentação é a raiz de boa parte dos problemas:

| Camada | Onde | O que faz |
|---|---|---|
| **Edge Functions** (Deno) | `update-agendamento`, `calcular-repasse-aula` | Validações de agendamento, autorização, cálculo de repasse |
| **Views SQL** (não versionadas) | `vw_receitas_profissional`, `vw_ocupacao_profissional`, `vw_comportamento_alunos` | Agregações de receita/ocupação consumidas por dashboard e relatórios |
| **Cliente React** | hooks `use*Mutacoes`, `use*Data`, componentes | CRUD direto + *fallback* local quando a edge function falha |

**Estado dos dados hoje** (banco real): 11 clientes, 3 profissionais, 6 contratos, 10 agendamentos, 3 repasses, 4 pagamentos. E **zero** em: `reposicoes`, `parcelas_planos`, `consumo_pacote`, `pagamentos_aluguel`. Ou seja: vários fluxos centrais **nunca foram exercitados com dados reais** — isso esconde bugs.

---

## 1. Marcação de aulas (agendamento)

### Fluxo
Criar passa pela edge `update-agendamento` (ação `criar`), que valida em cadeia:
1. **Contrato ativo** do cliente (`status='ativo'` e dentro da vigência)
2. **Horário de funcionamento** do profissional naquele dia/hora (`horarios_funcionamento`)
3. **Estúdio aberto** (sem `periodos_fechamento` no dia)
4. **Sala de Pilates livre** — só para `tipo='pilates'`: todos os profissionais de pilates concorrem pela mesma sala no mesmo `data_hora`
5. **Pacote com sessões disponíveis** — soma `consumo_pacote` vs `pacotes.quantidade_sessoes`

Se for pacote, insere `consumo_pacote` (1 sessão) atomicamente após criar.

### Estados (taxonomia)
```
agendado → realizado | falta_sem_aviso | cancelado | a_repor
```
O `CHECK` do banco (confirmado) aceita exatamente: `agendado, realizado, cancelado, falta_sem_aviso, a_repor`.

### 🔴 Problemas concretos
- **`tipo` é ignorado na criação.** A edge function faz `insert({..., tipo: 'aula'})` *hardcoded* (`update-agendamento` L190), mas a UI (`ModalAgendarAula`) oferece um seletor aula/sessão/reposição. O seletor é decorativo — só engana o operador.
- **`a_repor` é um estado órfão.** Existe no `CHECK`, aparece no dropdown da lista e há 1 registro no banco, mas **nenhum fluxo o produz nem o consome**. Cancelar gera `cancelado` + uma `reposicao`, não `a_repor`. Ninguém sabe o que ele significa.
- **`data_hora` é `timestamp WITHOUT time zone`** (confirmado no schema). O cliente converte local→ISO; sem fuso, qualquer mudança de ambiente/servidor desloca horários. Risco real de aula aparecer na hora errada.
- **Validação dupla e divergente:** as mesmas regras existem em `useAgendamentoValidacoes.ts` (cliente) **e** na edge function. Elas vão divergir com o tempo.

---

## 2. Cancelamento e reposição

### Como funciona
- **Cancelar** (`update-agendamento`/`cancelar`): exige **≥6h de antecedência** (senão bloqueia totalmente), marca `cancelado` e **sempre** cria uma `reposicao` com `data_limite = hoje + 30 dias`, `status='pendente'`.
- **Marcar reposição** (`marcar_reposicao`): valida pendência + prazo + 6h, cria novo agendamento `tipo='reposicao'` e atualiza a reposição para `marcada`.
- A UI mostra a **fila de reposições pendentes** num painel lateral, com badge de urgência (≤7 dias = amarelo, expirada = cinza/desabilitado).

### 🔴 Problemas concretos
- **Cancelar pacote não devolve a sessão.** O cancelamento não decrementa/remove o `consumo_pacote`. O cliente perde a sessão do pacote E ainda ganha uma reposição — conta dupla a favor dele e furo no controle de saldo.
- **Não há "falta com aviso" vs "sem aviso".** O cancelamento <6h é simplesmente *bloqueado* na edge function — não existe caminho para registrar uma falta avisada com regra diferente. Na prática o operador vai ter que forçar `falta_sem_aviso`, que gera repasse cheio (ver §5).
- **Reposições expiradas não têm limpeza.** Ficam `pendente` para sempre; a UI só desabilita o botão. Sem job/estado `expirada`.
- **30 dias e 6h são *hardcoded*** em dois lugares cada (edge + hook), sem configuração.

---

## 3. Dinâmica de agendamento (regras)

Pontos de atenção além do já citado:
- **Exclusividade de sala só existe para Pilates.** Massoterapeutas/professores podem ter **duplo-booking** no mesmo horário sem nenhuma checagem.
- **Contrato `trancado`/`pausado` não bloqueia novo agendamento** na criação (só `calcular-repasse-aula` checa `trancado`, e tarde demais).
- O `criar` busca contrato ativo com `.single()` — se o cliente tiver **2 contratos ativos**, a query quebra (erro PostgREST de múltiplas linhas).

---

## 4. Layout de visualização da agenda

- **Grade semanal** (`CalendarioAgendamentos`): 7 dias × horas fixas **07:00–21:00** *hardcoded*. Eventos coloridos por `profissional.cor_calendario` (fallback azul). Cancelados em cinza/riscado, reposições com badge "REP". Filtro por profissional. Navegação prev/próxima semana + "hoje".
- **Visão lista** com filtros (cliente/profissional/status) e dropdown de status inline.
- **Painel lateral** de reposições pendentes (300px).

### 🟡 Problemas
- **Bug de chave de render** (`CalendarioAgendamentos` ~L121): a key usa `getMonth()` (0-indexed) sem ano — colisão possível em viradas de mês.
- **Sem visão diária nem mensal.** Janela fixa 07–21h ignora horários reais cadastrados em `horarios_funcionamento`.
- Faixa horária e dias não respeitam configuração — é literal no componente.

---

## 5. Financeiro — distribuições e cálculos

### 5.1 Repasse por aula (`calcular-repasse-aula`) — a parte **bem-feita**
Disparado ao marcar `realizado`/`falta_sem_aviso`. Calcula `valor_bruto` por origem:

| Origem | Fórmula | Avaliação |
|---|---|---|
| Pacote | `pacote.preco / quantidade_sessoes` | ✅ Correta |
| Plano | `preco / (ceil(duracao_dias/7) × frequencia)` | ⚠️ Aproximação grosseira (ver abaixo) |
| Avulsa (sem contrato) | **R$ 180 hardcoded** | 🔴 Magic number |

`valor_repasse = round(valor_bruto × percentual/100, 2)` — arredondamento correto.

**Problemas:**
- **`falta_sem_aviso` gera repasse cheio** (mesmo `valor_bruto`, só muda `tipo_repasse`). Faz sentido de negócio? Talvez — mas não há política explícita, é efeito colateral.
- **Fórmula do plano distorce.** `ceil(duracao_dias/7)` arredonda semanas pra cima: plano de 30 dias vira 5 semanas → infla `totalAulas` → **subestima** o valor por aula e, logo, o repasse. Mês ≠ 5 semanas.
- **R$ 180 fixo** para avulsa: invisível ao admin, sem fonte configurável.
- **Sem transação:** atualiza status do agendamento e *depois* insere repasse. Se o insert falhar, o status já mudou (estado inconsistente).
- **Idempotência:** marcar `realizado` duas vezes insere **dois repasses** (sem unique em `agendamento_id`).

### 5.2 🔴🔴 A view de receitas está **fundamentalmente quebrada** (provado com dados reais)

`vw_receitas_profissional` (que alimenta **Dashboard** e **Relatórios → Receitas**) faz:
```sql
FROM profissionais p
  LEFT JOIN agendamentos a ON p.id = a.profissional_id
  LEFT JOIN contratos_cliente cc ON a.cliente_id = cc.cliente_id
... sum(cc.preco_pago) ...
```
Isso é um **join cartesiano**: soma `preco_pago` **uma vez por (profissional × agendamento do cliente)**. Medido no banco:

| Métrica | Verdade (contratos) | View reporta |
|---|---|---|
| Receita total do estúdio | **R$ 4.620** | **~R$ 12.280** (~2,7×) |
| Receita de pacotes | R$ 2.450 (total) | R$ 2.450 atribuído **integralmente a Miriam *E* a Tatiane** |

O **mesmo contrato é contado para vários profissionais** e multiplicado pelo número de aulas. Os números do dashboard são ficção.

### 5.3 🔴 Comissão do relatório **não bate** com os repasses reais

A view calcula `comissao_profissional = receita_inflada × percentual/100` — **desconectada** da tabela `repasses_profissionais` (o ledger real). Medido:

| Profissional | View diz | Repasse real (ledger) |
|---|---|---|
| Tatiane | R$ 3.850 | **R$ 170** |
| Renata | R$ 288 | **R$ 5,54** |

São dois universos numéricos diferentes. O relatório financeiro não reconcilia com o que o sistema efetivamente registra como devido.

### 5.4 Agregação no cliente por **nome hardcoded**
`TabReceitas.tsx` soma por `nome.includes('Tatiane'|'Renata'|'Miriam')`. Renomear/adicionar profissional quebra o relatório silenciosamente. (Mesmo problema de hardcode que já corrigimos na edge function de sala de pilates.)

### 5.5 Parcelas — **fluxo inexistente**
- Não há **trigger** no banco (confirmado: zero triggers em `public`) e **nenhum código** gera `parcelas_planos` ao criar contrato `parcelado`. `quantidade_parcelas` e `data_primeira_parcela` são gravados e nunca usados.
- `ModalParcelas` só *lê* — e a tabela está vazia (0 linhas). O recurso de parcelamento **não funciona**.

### 5.6 Aluguel
- `pagamentos_aluguel` vazio; `profissionais.aluguel_fixo_mensal` existe e **nunca é usado**. Lançamento 100% manual, status default `pago` (inconsistente com o resto, que é `pendente`).

### 5.7 KPI de receita mensal
`useDashboardData` soma `contratos_cliente.preco_pago` por `data_inicio` no mês — conta **contrato assinado**, não **dinheiro recebido**. Não cruza com `pagamentos`/`parcelas`. Mistura regime de competência com caixa.

---

## 6. Análise crítica — resumo de severidade

| Sev | Item | Impacto |
|---|---|---|
| 🔴 P0 | View de receitas com join cartesiano | Receita inflada ~2,7× no dashboard/relatório |
| 🔴 P0 | Comissão do relatório ≠ `repasses_profissionais` | Números financeiros não reconciliam |
| 🔴 P0 | Parcelamento não gera parcelas | Funcionalidade anunciada e morta |
| 🔴 P1 | Cancelar pacote não devolve sessão | Saldo de pacote furado |
| 🔴 P1 | Repasse sem transação + sem idempotência | Estado inconsistente / repasse duplicado |
| 🟡 P1 | `data_hora` sem timezone | Horários deslocam entre ambientes |
| 🟡 P2 | Agregação por nome hardcoded | Quebra ao mudar profissional |
| 🟡 P2 | `tipo` ignorado na criação / `a_repor` órfão | UI mente; estado sem semântica |
| 🟡 P2 | Sem exclusividade de sala fora do Pilates | Duplo-booking |
| 🟡 P2 | Fórmula do plano (ceil semanas) | Repasse de plano levemente subestimado |
| 🟢 P3 | Faixa 07–21h e dias hardcoded; sem visão dia/mês | Limitação de UX |
| 🟢 P3 | KPI mensal por `data_inicio` (competência vs caixa) | Métrica ambígua |

**O que está bom:** o motor de repasse por aula (`calcular-repasse-aula`) é sólido na lógica de origem (pacote/plano), com arredondamento correto; o modelo de autorização das edge functions (admin/dono) está bem feito; a UI da agenda é funcional e a fila de reposições é uma boa ideia. A fundação está lá — o problema é **a camada de relatório/financeiro consolidado, que está construída sobre uma view errada**, e **fluxos centrais (parcelas, devolução de sessão) que nunca foram terminados**.

---

## 7. Arcabouço do que falta para concluir

### FASE 1 — Corrigir o financeiro (bloqueante para confiar em qualquer número)
- [ ] **Reescrever `vw_receitas_profissional`** numa migration versionada: receita = soma de contratos **DISTINCT** (sem passar por `agendamentos`); comissão = soma de `repasses_profissionais` (ledger real), não `receita × %`.
- [ ] **Reescrever `TabReceitas`/`useDashboardData`** para agregar por **`profissional_id`**, eliminando o `includes(nome)`.
- [ ] Definir **receita = regime de caixa** (pagamentos/parcelas pagas) e separar de "vendas/contratos assinados".
- [ ] Tornar **idempotente** e **transacional** a geração de repasse (unique em `agendamento_id`; RPC/transação que muda status + insere repasse juntos).

### FASE 2 — Completar fluxos inacabados
- [ ] **Geração automática de parcelas** ao criar contrato `parcelado` (RPC `gerar_parcelas`: divide `preco_pago / quantidade_parcelas`, joga o resto do arredondamento na 1ª/última parcela, agenda vencimentos a partir de `data_primeira_parcela`).
- [ ] **Cancelamento de pacote devolve sessão** (remover/decrementar `consumo_pacote`).
- [ ] **Aluguel:** usar `aluguel_fixo_mensal` para pré-preencher; gerar lançamento mensal recorrente.
- [ ] Estado **`expirada`** para reposições + job (cron/edge agendada) que expira vencidas.

### FASE 3 — Consistência e robustez
- [ ] **Timezone**: migrar `data_hora` para `timestamptz` e padronizar conversão.
- [ ] Resolver `tipo` ignorado na criação **e** dar semântica (ou remover) a `a_repor`.
- [ ] **Exclusividade de sala** configurável por tipo (não só Pilates) e bloqueio de duplo-booking.
- [ ] Bloquear agendamento para contrato `trancado`/`pausado` já no `criar`.
- [ ] Tratar cliente com múltiplos contratos ativos (sem `.single()`).
- [ ] Centralizar regras (6h, 30 dias, preço avulso, faixa horária) em `studio_config`.

### FASE 4 — UX da agenda
- [ ] Visões **dia/semana/mês**; respeitar `horarios_funcionamento` reais em vez de 07–21h fixo.
- [ ] Corrigir key de render do calendário (incluir ano/ISO completo).
- [ ] Tela de **conciliação financeira** (repasses devidos × pagos, parcelas em aberto, inadimplência).

---

**Recomendação de ordem:** começar pela **Fase 1** — enquanto a view estiver errada, qualquer decisão tomada com base no dashboard/relatórios é baseada em números ~2,7× inflados e comissões que não existem. É barato de corrigir (uma migration + ajuste de 2 componentes) e destrava a confiança no sistema.
