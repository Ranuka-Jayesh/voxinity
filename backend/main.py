from backend.load_env import load_env

load_env()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.utils.ffmpeg_tooling import ensure_ffmpeg_bin_on_path

# Before routes import pydub (import-time probe), put FFmpeg on PATH.
ensure_ffmpeg_bin_on_path()

from backend.routes.dub import router as dub_router
from backend.routes.auth import router as auth_router
from backend.routes.admin import router as admin_router
from backend.routes.realtime import router as realtime_router
from backend.utils.file_utils import OUTPUT_DIR
from backend.utils.logger import get_logger

_main_logger = get_logger("main")


def _cors_allow_origins() -> list[str]:
    """Local dev defaults plus comma-separated CORS_ORIGINS (e.g. your Vercel URL)."""
    defaults = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    extra = os.getenv("CORS_ORIGINS", "").strip()
    if not extra:
        return defaults
    merged = list(defaults)
    for origin in extra.split(","):
        o = origin.strip()
        if o and o not in merged:
            merged.append(o)
    return merged


app = FastAPI(title="Voxinity Dubbing Backend", version="0.1.0")


@app.on_event("startup")
async def _configure_ffmpeg_for_pydub() -> None:
    """Align pydub with resolved FFmpeg path / PATH (avoids WinError 2 during sync/export)."""
    try:
        from backend.utils.ffmpeg_tooling import configure_pydub_and_path

        configure_pydub_and_path()
    except RuntimeError as exc:
        _main_logger.warning(
            "FFmpeg not configured; dubbing will fail until FFmpeg is installed or FFMPEG_PATH is set: %s",
            exc,
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")
app.include_router(dub_router, prefix="/api", tags=["Dubbing"])
app.include_router(auth_router, prefix="/api", tags=["Auth"])
app.include_router(admin_router, prefix="/api", tags=["Admin"])
app.include_router(realtime_router, prefix="/api", tags=["Realtime"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
