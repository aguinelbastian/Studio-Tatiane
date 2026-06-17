# Fase 2A — Parcelamento de contratos

> Data: 2026-06-17 · Base: main (Fase 1 já mergeada)
> Origem: `docs/analise_projeto_17_06_2026.md` §5.5 (parcelamento inoperante).

## Problema

Contratos com `modelo_cobranca='parcelado'` gravam `quantidade_parcelas`/`data_primeira_parcela` mas **nada gera** as linhas em `parcelas_planos` (tabela vazia; `ModalParcelas` só lê). Além disso, criar contrato **não registra pagamento nenhum** — o "Recebido" da Fase 1 (que soma `pagamentos` confirmados) nunca reflete vendas.

## Decisões (aprovadas)

- **Geração por trigger** no banco (`AFTER INSERT ON contratos_cliente`), atômica com a criação do contrato; `criarContrato` no cliente não muda.
- **1ª parcela vence no ato** (`data_inicio`); demais mensais.
- **Sobra de centavos na última parcela** (base = `round(preco_pago/qtd, 2)`; última = `preco_pago − base*(qtd−1)`).
- **Marcar parcela paga cria um `pagamento`** (atômico, via RPC) — mantém o "Recebido" coerente.
- **Antecipado registra 1 pagamento à vista** automaticamente (método default `pix`, editável depois).

## Escopo

**Dentro:** migration (constraint + trigger + RPC + grants), tipo da RPC em `types.ts`, ação "marcar paga" em `ModalParcelas`.
**Fora (notar):** editar contrato parcelado não regenera parcelas (trigger só no INSERT); reembolso/cancelamento de contrato com parcelas fica como está; método real do pagamento antecipado (default pix, editável na tela de Pagamentos).

---

## A) Banco — migration `supabase/migrations/20260617_0011_parcelamento.sql`

### A.1 Unicidade (anti-duplicação)
```sql
ALTER TABLE public.parcelas_planos
  ADD CONSTRAINT parcelas_planos_contrato_numero_key UNIQUE (contrato_id, numero_parcela);
```

### A.2 Trigger de geração de cobrança
Função `SECURITY INVOKER` (escreve sob o RLS do admin que criou o contrato; as policies `parcelas_planos_admin`/`pagamentos_admin` já permitem `authenticated`/admin):

```sql
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
        v_valor := round(NEW.preco_pago - v_acum, 2);  -- última absorve a sobra
      END IF;
      INSERT INTO public.parcelas_planos
        (contrato_id, numero_parcela, valor_parcela, data_vencimento, status)
      VALUES
        (NEW.id, i, v_valor, (v_inicio + ((i - 1) || ' months')::interval)::date, 'pendente');
    END LOOP;
  ELSE
    -- antecipado (ou nulo): registra pagamento à vista
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
```

### A.3 RPC para marcar parcela paga (atômica: parcela + pagamento)
```sql
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

---

## B) Frontend

### B.1 `src/lib/supabase/types.ts`
Adicionar `marcar_parcela_paga` ao bloco `Functions` (para `supabase.rpc(...)` tipar):
```ts
      marcar_parcela_paga: {
        Args: { p_parcela_id: string; p_metodo: string }
        Returns: undefined
      }
```

### B.2 `src/components/contratos/ModalParcelas.tsx`
- Extrair a busca para uma função `fetchParcelas()` reutilizável (hoje está inline no `useEffect`).
- Por parcela com `status='pendente'`: uma coluna "Ações" com um `Select` de método (pix/transferência, default `pix`) e um botão **"Marcar paga"**.
- Ao clicar: `await supabase.rpc('marcar_parcela_paga', { p_parcela_id: p.id, p_metodo })`; em erro → `toast.error`; em sucesso → `toast.success` + `fetchParcelas()`.
- Parcelas pagas: sem ação (mostram data/badge verde — já existe).
- Usar `sonner` (`toast`) — padrão do projeto.

---

## Verificação (sem framework de testes)

Tudo no banco de produção deve ser testado em **transação com `ROLLBACK`** para não poluir dados.

1. Aplicar migration: `./supabase/run_remote.sh -f supabase/migrations/20260617_0011_parcelamento.sql` (nota: usar `-f`; o runner faz no-op com nome de arquivo solto).
2. **Trigger parcelado (rounding):** em um `BEGIN; … ROLLBACK;`, inserir contrato `plano`, `parcelado`, `preco_pago=100`, `quantidade_parcelas=3`, `data_inicio='2026-06-17'` (cliente_id/plano_id de registros existentes); conferir 3 parcelas: 33.33 / 33.33 / 33.34 (soma=100), vencimentos 2026-06-17, 2026-07-17, 2026-08-17, todas `pendente`.
3. **Trigger antecipado:** em `BEGIN; … ROLLBACK;`, inserir contrato `antecipado`, `preco_pago=200`; conferir 1 `pagamento` `confirmado`, `tipo_pagamento='avista'`, valor 200, `metodo='pix'`.
4. **RPC:** em um `BEGIN; … ROLLBACK;` próprio, inserir um contrato parcelado (como no passo 2), pegar o `id` da 1ª parcela gerada, chamar `marcar_parcela_paga(id,'pix')`; conferir parcela `pago` + 1 `pagamento` `tipo_pagamento='parcela'` com o valor da parcela; chamar de novo → erro "já está paga"; chamar com método inválido → erro.
5. `npm run typecheck && npm run build` para a UI.

## Follow-ups
- Antecipado: capturar método real no formulário (hoje default pix).
- Regenerar parcelas ao editar contrato parcelado.
- Expiração de reposições, aluguel recorrente, idempotência do repasse (demais sub-projetos da Fase 2).
