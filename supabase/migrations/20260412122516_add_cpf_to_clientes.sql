DO $$
BEGIN
  ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_cpf_key ON public.clientes (cpf) WHERE cpf IS NOT NULL;
