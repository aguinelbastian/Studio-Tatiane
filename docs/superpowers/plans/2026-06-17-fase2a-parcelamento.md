# Fase 2A — Parcelamento de contratos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar `parcelas_planos` automaticamente para contratos parcelados (e um pagamento à vista para antecipados) e permitir marcar parcelas como pagas, criando o pagamento correspondente.

**Architecture:** Um trigger `AFTER INSERT ON contratos_cliente` gera a cobrança (parcelas ou pagamento à vista) na mesma transação da criação do contrato; uma RPC `marcar_parcela_paga` faz parcela→pago + insere o pagamento atomicamente; a UI (`ModalParcelas`) ganha a ação "Marcar paga".

**Tech Stack:** Postgres (Supabase) · React 19 + TypeScript · Vite · supabase-js · sonner (toasts). **Sem framework de testes** — verificação por SQL em transação com `ROLLBACK` (não polui produção) + `npm run typecheck`/`npm run build`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-17-fase2a-parcelamento-design.md`.
- 1ª parcela vence em `COALESCE(data_primeira_parcela, data_inicio)`; demais a cada mês. Valor base = `round(preco_pago/qtd, 2)`; **última parcela absorve a sobra** (`preco_pago − base*(qtd−1)`), de modo que a soma = `preco_pago`.
- Marcar parcela paga insere `pagamentos` com `tipo_pagamento='parcela'`, `status='confirmado'`. Antecipado insere `pagamentos` com `tipo_pagamento='avista'`, `metodo='pix'`, `status='confirmado'`.
- `pagamentos.metodo` só aceita `'pix'` ou `'transferencia'` (CHECK). `pagamentos.status` ∈ {pendente,confirmado,cancelado}.
- Funções `SECURITY INVOKER` (RLS do chamador admin gateia). RPC: `REVOKE EXECUTE ... FROM PUBLIC, anon; GRANT ... TO authenticated`.
- Aplicar SQL no remoto com `./supabase/run_remote.sh -f <arquivo>` (o runner faz no-op sem `-f`). Nunca ecoar a senha.
- Commits terminam com: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Migration — constraint + trigger + RPC

**Files:**
- Create: `supabase/migrations/20260617_0011_parcelamento.sql`

**Interfaces:**
- Produces: trigger `trg_gerar_cobranca_contrato` em `contratos_cliente`; função RPC `marcar_parcela_paga(p_parcela_id uuid, p_metodo text) RETURNS void`.

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/20260617_0011_parcelamento.sql`:

```sql
-- Fase 2A: parcelamento — gera parcelas/pagamento na criacao do contrato + RPC de baixa.

ALTER TABLE public.parcelas_planos
  ADD CONSTRAINT parcelas_planos_contrato_numero_key UNIQUE (contrato_id, numero_parcela);

CREATE OR REPLACE FUNCTION public.fn_gerar_cobranca_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_qtd integer;
  v_base numeric(10,2);
  v_acum numeric(10,2) := 0;
  v_valor numeric(10,2);
  v_inicio date;
  i integer;
BEGIN
  IF NEW.modelo_cobranca = 'parcelado' THEN
    v_qtd := GREATEST(COALESCE(NEW.quantidade_parcelas, 1), 1);
    v_inicio := COALESCE(NEW.data_primeira_parcela, NEW.data_inicio);
    v_base := round(NEW.preco_pago / v_qtd, 2);
    FOR i IN 1..v_qtd LOOP
      IF i < v_qtd THEN
        v_valor := v_base;
        v_acum := v_acum + v_base;
      ELSE
        v_valor := round(NEW.preco_pago - v_acum, 2);
      END IF;
      INSERT INTO public.parcelas_planos
        (contrato_id, numero_parcela, valor_parcela, data_vencimento, status)
      VALUES
        (NEW.id, i, v_valor, (v_inicio + ((i - 1) || ' months')::interval)::date, 'pendente');
    END LOOP;
  ELSE
    INSERT INTO public.pagamentos
      (contrato_id, cliente_id, valor, metodo, status, tipo_pagamento, data_pagamento)
    VALUES
      (NEW.id, NEW.cliente_id, NEW.preco_pago, 'pix', 'confirmado', 'avista', NEW.data_inicio);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_cobranca_contrato ON public.contratos_cliente;
CREATE TRIGGER trg_gerar_cobranca_contrato
AFTER INSERT ON public.contratos_cliente
FOR EACH ROW EXECUTE FUNCTION public.fn_gerar_cobranca_contrato();

CREATE OR REPLACE FUNCTION public.marcar_parcela_paga(p_parcela_id uuid, p_metodo text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_parcela public.parcelas_planos%ROWTYPE;
  v_cliente uuid;
BEGIN
  IF p_metodo NOT IN ('pix', 'transferencia') THEN
    RAISE EXCEPTION 'Método inválido: %', p_metodo;
  END IF;

  SELECT * INTO v_parcela FROM public.parcelas_planos WHERE id = p_parcela_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;
  IF v_parcela.status = 'pago' THEN
    RAISE EXCEPTION 'Parcela já está paga';
  END IF;

  SELECT cliente_id INTO v_cliente FROM public.contratos_cliente WHERE id = v_parcela.contrato_id;

  UPDATE public.parcelas_planos
    SET status = 'pago', data_pagamento = CURRENT_DATE
    WHERE id = p_parcela_id;

  INSERT INTO public.pagamentos
    (contrato_id, cliente_id, valor, metodo, status, tipo_pagamento, data_pagamento, observacoes)
  VALUES
    (v_parcela.contrato_id, v_cliente, v_parcela.valor_parcela, p_metodo, 'confirmado', 'parcela',
     CURRENT_DATE, 'Parcela ' || v_parcela.numero_parcela);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_parcela_paga(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_parcela_paga(uuid, text) TO authenticated;
```

- [ ] **Step 2: Aplicar a migration no remoto**

Run: `./supabase/run_remote.sh -f supabase/migrations/20260617_0011_parcelamento.sql`
Expected: sem erro (ALTER TABLE, CREATE FUNCTION ×2, CREATE TRIGGER, REVOKE, GRANT).

- [ ] **Step 3: Testar o trigger parcelado (rounding) — transação com ROLLBACK**

Run:
```bash
./supabase/run_remote.sh -c "
BEGIN;
WITH novo AS (
  INSERT INTO contratos_cliente
    (cliente_id, tipo, plano_id, data_inicio, preco_pago, modelo_cobranca, quantidade_parcelas, status)
  VALUES ((SELECT id FROM clientes LIMIT 1), 'plano', (SELECT id FROM planos LIMIT 1),
          '2026-06-17', 100, 'parcelado', 3, 'ativo')
  RETURNING id
)
SELECT numero_parcela, valor_parcela, data_vencimento, status
FROM parcelas_planos WHERE contrato_id = (SELECT id FROM novo) ORDER BY numero_parcela;
ROLLBACK;
"
```
Expected: 3 linhas — `1 | 33.33 | 2026-06-17 | pendente`, `2 | 33.33 | 2026-07-17 | pendente`, `3 | 33.34 | 2026-08-17 | pendente` (soma = 100,00).

- [ ] **Step 4: Testar o trigger antecipado — transação com ROLLBACK**

Run:
```bash
./supabase/run_remote.sh -c "
BEGIN;
WITH novo AS (
  INSERT INTO contratos_cliente
    (cliente_id, tipo, plano_id, data_inicio, preco_pago, modelo_cobranca, status)
  VALUES ((SELECT id FROM clientes LIMIT 1), 'plano', (SELECT id FROM planos LIMIT 1),
          '2026-06-17', 200, 'antecipado', 'ativo')
  RETURNING id
)
SELECT valor, metodo, status, tipo_pagamento
FROM pagamentos WHERE contrato_id = (SELECT id FROM novo);
ROLLBACK;
"
```
Expected: 1 linha — `200.00 | pix | confirmado | avista`.

- [ ] **Step 5: Testar a RPC (sucesso) — transação com ROLLBACK**

Run:
```bash
./supabase/run_remote.sh -c "
BEGIN;
DO \$\$
DECLARE v_contrato uuid; v_parcela uuid;
BEGIN
  INSERT INTO contratos_cliente
    (cliente_id, tipo, plano_id, data_inicio, preco_pago, modelo_cobranca, quantidade_parcelas, status)
  VALUES ((SELECT id FROM clientes LIMIT 1), 'plano', (SELECT id FROM planos LIMIT 1),
          '2026-06-17', 100, 'parcelado', 3, 'ativo')
  RETURNING id INTO v_contrato;
  SELECT id INTO v_parcela FROM parcelas_planos WHERE contrato_id = v_contrato AND numero_parcela = 1;
  PERFORM marcar_parcela_paga(v_parcela, 'pix');
  RAISE NOTICE 'status parcela = %', (SELECT status FROM parcelas_planos WHERE id = v_parcela);
  RAISE NOTICE 'pagamentos parcela = %', (SELECT count(*) FROM pagamentos WHERE contrato_id = v_contrato AND tipo_pagamento = 'parcela');
END \$\$;
ROLLBACK;
"
```
Expected (NOTICE no stderr): `status parcela = pago` e `pagamentos parcela = 1`.

- [ ] **Step 6: Testar a RPC (erros esperados) — duas chamadas**

Run (método inválido):
```bash
./supabase/run_remote.sh -c "
BEGIN;
DO \$\$
DECLARE v_contrato uuid; v_parcela uuid;
BEGIN
  INSERT INTO contratos_cliente (cliente_id, tipo, plano_id, data_inicio, preco_pago, modelo_cobranca, quantidade_parcelas, status)
  VALUES ((SELECT id FROM clientes LIMIT 1), 'plano', (SELECT id FROM planos LIMIT 1), '2026-06-17', 100, 'parcelado', 3, 'ativo')
  RETURNING id INTO v_contrato;
  SELECT id INTO v_parcela FROM parcelas_planos WHERE contrato_id = v_contrato AND numero_parcela = 1;
  PERFORM marcar_parcela_paga(v_parcela, 'cartao');
END \$\$;
ROLLBACK;
"
```
Expected: a command **falha** com `ERROR: Método inválido: cartao` (sair não-zero é o resultado esperado deste teste negativo).

Run (pagamento duplicado):
```bash
./supabase/run_remote.sh -c "
BEGIN;
DO \$\$
DECLARE v_contrato uuid; v_parcela uuid;
BEGIN
  INSERT INTO contratos_cliente (cliente_id, tipo, plano_id, data_inicio, preco_pago, modelo_cobranca, quantidade_parcelas, status)
  VALUES ((SELECT id FROM clientes LIMIT 1), 'plano', (SELECT id FROM planos LIMIT 1), '2026-06-17', 100, 'parcelado', 3, 'ativo')
  RETURNING id INTO v_contrato;
  SELECT id INTO v_parcela FROM parcelas_planos WHERE contrato_id = v_contrato AND numero_parcela = 1;
  PERFORM marcar_parcela_paga(v_parcela, 'pix');
  PERFORM marcar_parcela_paga(v_parcela, 'pix');
END \$\$;
ROLLBACK;
"
```
Expected: a command **falha** com `ERROR: Parcela já está paga`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260617_0011_parcelamento.sql
git commit -m "feat(db): parcelamento — trigger de cobranca + RPC marcar_parcela_paga

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Tipo da RPC em types.ts

**Files:**
- Modify: `src/lib/supabase/types.ts` (bloco `Functions`)

**Interfaces:**
- Consumes: assinatura da RPC da Task 1.
- Produces: `Database['public']['Functions']['marcar_parcela_paga']` para `supabase.rpc('marcar_parcela_paga', …)` tipar.

- [ ] **Step 1: Adicionar a função ao bloco `Functions`**

Em `src/lib/supabase/types.ts`, localizar o fim do bloco `delete_user`:

```ts
      delete_user: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
    }
```

e inserir a nova função antes do `}` que fecha `Functions` (após `delete_user`):

```ts
      delete_user: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      marcar_parcela_paga: {
        Args: {
          p_parcela_id: string
          p_metodo: string
        }
        Returns: undefined
      }
    }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "types(db): adiciona RPC marcar_parcela_paga

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: ModalParcelas — ação "Marcar paga"

**Files:**
- Modify: `src/components/contratos/ModalParcelas.tsx`

**Interfaces:**
- Consumes: RPC `marcar_parcela_paga` (Task 1) e seu tipo (Task 2).

- [ ] **Step 1: Reescrever `ModalParcelas.tsx`**

Substituir o conteúdo de `src/components/contratos/ModalParcelas.tsx` por:

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function ModalParcelas({ open, onOpenChange, contrato }: any) {
  const [parcelas, setParcelas] = useState<any[]>([])
  const [metodos, setMetodos] = useState<Record<string, string>>({})

  const fetchParcelas = useCallback(async () => {
    if (!contrato) return
    const { data } = await supabase
      .from('parcelas_planos')
      .select('*')
      .eq('contrato_id', contrato.id)
      .order('numero_parcela')
    setParcelas(data || [])
  }, [contrato])

  useEffect(() => {
    if (open && contrato) fetchParcelas()
  }, [open, contrato, fetchParcelas])

  const marcarPaga = async (parcelaId: string) => {
    const p_metodo = metodos[parcelaId] || 'pix'
    const { error } = await supabase.rpc('marcar_parcela_paga', {
      p_parcela_id: parcelaId,
      p_metodo,
    })
    if (error) {
      toast.error('Erro ao marcar parcela: ' + error.message)
      return
    }
    toast.success('Parcela marcada como paga')
    fetchParcelas()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Parcelas do Contrato</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcela</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.numero_parcela}ª</TableCell>
                <TableCell>R$ {p.valor_parcela?.toFixed(2)}</TableCell>
                <TableCell>{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge
                    variant={p.status === 'pago' ? 'default' : 'secondary'}
                    className={p.status === 'pago' ? 'bg-green-600' : ''}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {p.status !== 'pago' && (
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={metodos[p.id] || 'pix'}
                        onValueChange={(v) => setMetodos((m) => ({ ...m, [p.id]: v }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => marcarPaga(p.id)}>
                        Marcar paga
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {parcelas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhuma parcela encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: ambos PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/contratos/ModalParcelas.tsx
git commit -m "feat(contratos): ModalParcelas permite marcar parcela como paga

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- A.1 unique constraint → Task 1. A.2 trigger → Task 1. A.3 RPC → Task 1.
- B.1 types.ts → Task 2. B.2 ModalParcelas → Task 3.
- Verificação (migration, trigger parcelado/antecipado, RPC sucesso/erros, typecheck/build) → Task 1 Steps 3-6, Task 3 Step 2. ✔ Sem lacunas.

**Placeholder scan:** nenhum TBD/TODO; todo passo de código mostra o código completo; comandos de verificação são concretos com saída esperada.

**Type consistency:** RPC `marcar_parcela_paga(p_parcela_id uuid, p_metodo text)` na Task 1 ↔ tipo `{ p_parcela_id: string; p_metodo: string }` na Task 2 ↔ chamada `supabase.rpc('marcar_parcela_paga', { p_parcela_id, p_metodo })` na Task 3. Coluna `tipo_pagamento` valores `'avista'`/`'parcela'` consistentes entre trigger e RPC. `colSpan={5}` casa com as 5 colunas (incluindo "Ações"). Consistente.
