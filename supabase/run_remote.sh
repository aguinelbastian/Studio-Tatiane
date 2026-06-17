#!/usr/bin/env bash
# Aplica SQL no banco remoto via psql, lendo a credencial de .dburl (gitignored).
# .dburl pode conter:
#   - só a senha do Postgres (recomendado, alfanumérica), OU
#   - a URI completa postgresql://user:pass@host:port/db
# Uso: ./supabase/run_remote.sh arquivo.sql        (executa o arquivo)
#      ./supabase/run_remote.sh -c "select 1;"      (executa comando)
# Nunca ecoa a senha.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST='aws-1-us-west-2.pooler.supabase.com'
PORT='5432'
USER='postgres.hnyjvjflpoierndarupx'
DB='postgres'

[ -s .dburl ] || { echo "ERRO: .dburl vazio/ausente"; exit 1; }
raw=$(cat .dburl)

if [[ "$raw" == postgresql://* ]]; then
  prefix="postgresql://${USER}:"
  pass="${raw#"$prefix"}"
  pass="${pass%%@${HOST}*}"
else
  pass="$raw"
fi

export PGPASSWORD="$pass"
CONN="host=${HOST} port=${PORT} user=${USER} dbname=${DB} sslmode=require"

exec psql "$CONN" -v ON_ERROR_STOP=1 "$@"
