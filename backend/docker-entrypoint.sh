#!/bin/sh
set -e

# Em produção, roda migrations por padrão (idempotente). Desative com RUN_MIGRATIONS=false.
should_migrate=false
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  should_migrate=true
elif [ "${RUN_MIGRATIONS}" != "false" ] && [ "${NODE_ENV}" = "production" ]; then
  should_migrate=true
fi

if [ "$should_migrate" = "true" ]; then
  echo "Running Prisma migrations..."
  if ! npx prisma migrate deploy; then
    echo "ERROR: Prisma migrate deploy failed. Fix DATABASE_URL/DIRECT_URL before serving traffic."
    exit 1
  fi
else
  echo "Skipping Prisma migrations (set RUN_MIGRATIONS=true to force, or NODE_ENV=production for auto)."
fi

echo "Starting application..."
exec node dist/index.js
