#!/bin/sh
# Render start command: runs pending migrations, then boots the API.
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
