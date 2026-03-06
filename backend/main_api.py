"""
API-only entry: dub jobs are queued to disk for `npm run backend:pip`.

Imports `backend.main` after enabling `VOX_EXTERNAL_PIPELINE` so Whisper is not loaded
on the API process unless a request uses the in-process code path (never when using this module).
"""

from __future__ import annotations

import os

os.environ["VOX_EXTERNAL_PIPELINE"] = "1"

from backend.main import app  # noqa: E402

__all__ = ["app"]
