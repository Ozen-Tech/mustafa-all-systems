#!/bin/sh
set -e

# Migrations precisam de conexão direta ao Postgres (Supabase :5432, não pooler :6543).
# Em produção, roda migrate deploy apenas quando DIRECT_URL estiver configurada.
# Forçar: RUN_MIGRATIONS=true | Desativar: RUN_MIGRATIONS=false
should_migrate=false
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  should_migrate=true
elif [ "${RUN_MIGRATIONS}" != "false" ] && [ "${NODE_ENV}" = "production" ] && [ -n "${DIRECT_URL}" ]; then
  should_migrate=true
fi

if [ "$should_migrate" = "true" ]; then
  echo "Running Prisma migrations..."
  if npx prisma migrate deploy; then
    echo "Prisma migrations applied successfully."
  else
    echo "ERROR: Prisma migrate deploy failed."
    echo "ERROR: Check DIRECT_URL (direct :5432) and DATABASE_URL on Cloud Run."
    if [ "${RUN_MIGRATIONS_STRICT}" = "true" ] || [ "${RUN_MIGRATIONS}" = "true" ]; then
      echo "ERROR: RUN_MIGRATIONS_STRICT=true — aborting container startup."
      exit 1
    fi
    echo "WARNING: Starting app anyway. Apply migrations manually or set DIRECT_URL + RUN_MIGRATIONS_STRICT=true."
  fi
else
  if [ "${NODE_ENV}" = "production" ] && [ "${RUN_MIGRATIONS}" != "false" ] && [ -z "${DIRECT_URL}" ]; then
    echo "WARNING: Skipping Prisma migrations — DIRECT_URL not set on Cloud Run."
    echo "WARNING: Add Secret mustafa-db-direct-url as DIRECT_URL, or run migrate deploy in Cloud Build / Supabase SQL."
  else
    echo "Skipping Prisma migrations (set DIRECT_URL + NODE_ENV=production for auto, or RUN_MIGRATIONS=true to force)."
  fi
fi

echo "Starting application..."
exec node dist/index.js
