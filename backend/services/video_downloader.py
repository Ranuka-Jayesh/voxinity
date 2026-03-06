from pathlib import Path
from typing import Callable
from uuid import uuid4

import yt_dlp

from backend.utils.logger import get_logger

logger = get_logger("video_downloader")


def _format_download_progress(status: dict) -> str | None:
    if status.get("status") != "downloading":
        return None

    downloaded = float(status.get("downloaded_bytes") or 0.0)
    total = float(
        status.get("total_bytes")
        or status.get("total_bytes_estimate")
        or 0.0
    )
    speed = float(status.get("speed") or 0.0)
    eta = status.get("eta")

    percent = (downloaded / total * 100.0) if total > 0 else 0.0
    speed_kib = speed / 1024.0 if speed > 0 else 0.0
    eta_seconds = int(eta) if isinstance(eta, (int, float)) else 0
    eta_min, eta_sec = divmod(max(eta_seconds, 0), 60)

    return (
        f"Downloading video... {percent:.1f}% "
        f"at {speed_kib:.2f}KiB/s ETA {eta_min:02d}:{eta_sec:02d}"
    )


def download_video_from_url(
    url: str,
    output_dir: str,
    progress_callback: Callable[[str], None] | None = None,
) -> str:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}.mp4"
    target_path = output_path / filename

    ydl_opts = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "merge_output_format": "mp4",
        "outtmpl": str(target_path),
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,
        "retries": 10,
        "fragment_retries": 10,
        "extractor_retries": 5,
        "file_access_retries": 5,
        "retry_sleep_functions": {"http": "exp=1:20"},
    }

    if progress_callback is not None:
        def _hook(data: dict) -> None:
            message = _format_download_progress(data)
            if message:
                progress_callback(message)

        ydl_opts["progress_hooks"] = [_hook]

    logger.info("Downloading video from URL...")
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as exc:
        error_text = str(exc).lower()
        if "timed out" in error_text or "read timed out" in error_text:
            raise RuntimeError(
                "Video download timed out. Please retry, or try a shorter/lower-resolution video."
            ) from exc
        raise RuntimeError("Invalid or unsupported video URL") from exc

    if not target_path.exists():
        raise RuntimeError("Invalid or unsupported video URL")

    logger.info("Download complete")
    return str(target_path)
