#!/bin/sh
set -e

# Cloud Run exige listen na $PORT em poucos segundos.
# Migrations NÃO rodam no startup por padrão (podem falhar/travar e matar o deploy).
# Opt-in: RUN_MIGRATIONS=true
# Abortar se migrate falhar: RUN_MIGRATIONS_STRICT=true
# Timeout do migrate (segundos): MIGRATE_TIMEOUT_SECONDS (default 45)

MIGRATE_TIMEOUT_SECONDS="${MIGRATE_TIMEOUT_SECONDS:-45}"

run_migrate() {
  echo "Running Prisma migrations (timeout ${MIGRATE_TIMEOUT_SECONDS}s)..."
  if command -v timeout >/dev/null 2>&1; then
    timeout "${MIGRATE_TIMEOUT_SECONDS}" npx prisma migrate deploy
  else
    npx prisma migrate deploy
  fi
}

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  if run_migrate; then
    echo "Prisma migrations applied successfully."
  else
    echo "ERROR: Prisma migrate deploy failed or timed out."
    echo "ERROR: Prefer applying SQL in Supabase, or set DIRECT_URL (Postgres :5432) + fix DATABASE_URL."
    if [ "${RUN_MIGRATIONS_STRICT}" = "true" ]; then
      echo "ERROR: RUN_MIGRATIONS_STRICT=true — aborting container startup."
      exit 1
    fi
    echo "WARNING: Starting app anyway so Cloud Run can pass health checks."
  fi
else
  echo "Skipping Prisma migrations (default). Set RUN_MIGRATIONS=true to opt-in at startup."
fi

echo "Starting application on PORT=${PORT:-3000}..."
exec node dist/index.js
