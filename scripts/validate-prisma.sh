#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://validation:validation@localhost:5432/jarvis_runtime?sslmode=require}"
export DIRECT_URL="${DIRECT_URL:-postgresql://validation:validation@localhost:5432/jarvis_migrations?sslmode=require}"
npx prisma validate
