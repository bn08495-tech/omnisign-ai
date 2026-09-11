#!/bin/bash
# OmniSign AI — Freebuff preview launcher
# Runs the FastAPI server bound to 0.0.0.0, honoring the injected PORT.
set -e

PORT="${PORT:-8000}"

if [ ! -x ".venv/bin/uvicorn" ]; then
  echo "[preview] .venv missing — provisioning dependencies..."
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi

echo "[preview] Starting OmniSign AI on 0.0.0.0:${PORT}"
exec .venv/bin/uvicorn server.app:app --host 0.0.0.0 --port "$PORT"
