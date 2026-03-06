"""Load `.env` from repo root and `backend/.env` so all entrypoints see the same vars."""

from __future__ import annotations

from pathlib import Path

_DONE = False


def load_env() -> None:
    global _DONE
    if _DONE:
        return
    _DONE = True
    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    backend_dir = Path(__file__).resolve().parent
    root_dir = backend_dir.parent
    if (root_dir / ".env").is_file():
        load_dotenv(root_dir / ".env", override=False)
    if (backend_dir / ".env").is_file():
        load_dotenv(backend_dir / ".env", override=True)
