#!/bin/sh
set -e
PORT="${PORT:-8000}"
export PYTHONPATH=/app
export VOX_EXTERNAL_PIPELINE=1
uvicorn backend.main_api:app --host 0.0.0.0 --port "$PORT" &
python -m backend.pipeline_worker &
wait
