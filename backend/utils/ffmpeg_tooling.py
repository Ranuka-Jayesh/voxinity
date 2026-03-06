"""Resolve ffmpeg / ffprobe executables (PATH, env overrides, Windows installs)."""

from __future__ import annotations

import logging
import os
import shutil
from functools import lru_cache
from pathlib import Path

_logger = logging.getLogger("ffmpeg_tooling")

_FFMPEG_NOT_FOUND = (
    "FFmpeg was not found. Install FFmpeg and add it to your system PATH, or set "
    "FFMPEG_PATH to the full path of the ffmpeg executable "
    r"(e.g. C:\ffmpeg\bin\ffmpeg.exe on Windows). "
    "See https://ffmpeg.org/download.html . On Windows you can run "
    "`winget install ffmpeg` when available."
)


def _first_executable(*candidates: str | None) -> str | None:
    for raw in candidates:
        if not raw:
            continue
        p = Path(raw)
        if p.is_file():
            return str(p)
        if p.is_dir():
            name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
            exe = p / name
            if exe.is_file():
                return str(exe)
    return None


def _discover_windows_ffmpeg() -> str | None:
    """
    Common installs where ffmpeg.exe exists but the bin folder was never added to PATH
    (manual unzip to C:\\ffmpeg, winget Gyan.FFmpeg, etc.).
    """
    if os.name != "nt":
        return None

    fixed = [
        Path(r"C:\ffmpeg\bin\ffmpeg.exe"),
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "ffmpeg" / "bin" / "ffmpeg.exe",
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
        / "ffmpeg"
        / "bin"
        / "ffmpeg.exe",
    ]
    for candidate in fixed:
        if candidate.is_file():
            return str(candidate.resolve())

    local = os.environ.get("LOCALAPPDATA")
    if not local:
        return None
    packages = Path(local) / "Microsoft" / "WinGet" / "Packages"
    if not packages.is_dir():
        return None
    for pattern in (
        "Gyan.FFmpeg*/**/bin/ffmpeg.exe",
        "*/ffmpeg*/bin/ffmpeg.exe",
    ):
        for match in sorted(packages.glob(pattern)):
            if match.is_file():
                return str(match.resolve())
    return None


@lru_cache(maxsize=1)
def get_ffmpeg_exe() -> str:
    path = _first_executable(
        os.environ.get("FFMPEG_PATH"),
        shutil.which("ffmpeg"),
        _discover_windows_ffmpeg(),
    )
    if path:
        return path
    raise RuntimeError(_FFMPEG_NOT_FOUND)


@lru_cache(maxsize=1)
def get_ffprobe_exe() -> str:
    path = _first_executable(
        os.environ.get("FFPROBE_PATH"),
        shutil.which("ffprobe"),
    )
    if path:
        return path
    try:
        ffmpeg = Path(get_ffmpeg_exe())
        sibling = ffmpeg.parent / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
        if sibling.is_file():
            return str(sibling)
    except RuntimeError:
        pass
    raise RuntimeError(
        "ffprobe was not found. It is usually installed alongside FFmpeg. Add FFmpeg's "
        "bin folder to PATH, or set FFPROBE_PATH to the full path of ffprobe "
        r"(e.g. C:\ffmpeg\bin\ffprobe.exe on Windows)."
    )


def ensure_ffmpeg_bin_on_path() -> bool:
    """
    Prepend FFmpeg's directory to PATH so pydub's import-time probe finds `ffmpeg`.
    Call this before any `import pydub`. Returns False if FFmpeg cannot be resolved.
    """
    try:
        resolved = get_ffmpeg_exe()
    except RuntimeError:
        return False
    bin_dir = str(Path(resolved).resolve().parent)
    current = os.environ.get("PATH", "")
    parts = current.split(os.pathsep) if current else []
    if bin_dir not in parts:
        os.environ["PATH"] = bin_dir + os.pathsep + current
    return True


def configure_pydub_and_path() -> None:
    """
    Point pydub at the resolved ffmpeg binary and prepend its directory to PATH so
    pydub's internal use of `ffmpeg` / `ffprobe` (and subprocess) works on Windows
    when the user set FFMPEG_PATH or binaries exist outside the default PATH.
    """
    if not ensure_ffmpeg_bin_on_path():
        raise RuntimeError(_FFMPEG_NOT_FOUND)
    ffmpeg = get_ffmpeg_exe()
    bin_dir = str(Path(ffmpeg).resolve().parent)
    from pydub import AudioSegment  # local import: sets converter after env is ready

    AudioSegment.converter = ffmpeg
    _logger.info("pydub AudioSegment.converter set to %s; PATH includes %s", ffmpeg, bin_dir)


def format_pipeline_error(exc: BaseException) -> str:
    """User-facing text for common environment failures (e.g. missing FFmpeg on Windows)."""
    if isinstance(exc, FileNotFoundError):
        win = getattr(exc, "winerror", None)
        if win == 2 or (os.name == "nt" and "cannot find the file" in str(exc).lower()):
            return (
                "FFmpeg (or another required tool) was not found. Install FFmpeg and add its "
                "bin folder to your system PATH, or set the environment variable FFMPEG_PATH to the "
                r"full path of ffmpeg.exe (for example C:\ffmpeg\bin\ffmpeg.exe). "
                "On Windows: `winget install ffmpeg` if available. "
                "https://ffmpeg.org/download.html"
            )
    return str(exc)
