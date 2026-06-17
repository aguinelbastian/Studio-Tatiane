-- Fase 2A: parcelamento — gera parcelas/pagamento na criacao do contrato + RPC de baixa.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parcelas_planos_contrato_numero_key'
  ) THEN
    ALTER TABLE public.parcelas_planos
      ADD CONSTRAINT parcelas_planos_contrato_numero_key UNIQUE (contrato_id, numero_parcela);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_gerar_cobranca_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
