import subprocess
from pathlib import Path
import re

from backend.utils.ffmpeg_tooling import get_ffmpeg_exe, get_ffprobe_exe
from backend.utils.logger import get_logger

logger = get_logger("audio_extractor")


def extract_audio_to_wav(video_path: Path, output_wav_path: Path) -> Path:
    logger.info("Extracting audio...")

    command = [
        get_ffmpeg_exe(),
        "-y",
        "-i",
        str(video_path),
        "-ac",
        "1",
        "-ar",
        "16000",
        "-vn",
        str(output_wav_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("FFmpeg extraction failed: %s", result.stderr)
        raise RuntimeError("Failed to extract audio from video.")

    return output_wav_path


def _read_audio_duration_seconds(audio_path: Path) -> float:
    command = [
        get_ffprobe_exe(),
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        return 0.0
    try:
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def _is_mostly_silent(audio_path: Path, clip_duration_sec: float) -> bool:
    command = [
        get_ffmpeg_exe(),
        "-v",
        "info",
        "-i",
        str(audio_path),
        "-af",
        "silencedetect=noise=-35dB:d=0.5",
        "-f",
        "null",
        "-",
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        return False

    silence_durations = [
        float(value)
        for value in re.findall(r"silence_duration:\s*([0-9]*\.?[0-9]+)", result.stderr)
    ]
    total_silence = sum(silence_durations)
    return total_silence >= (clip_duration_sec * 0.9)


def extract_speaker_reference(audio_path: Path, output_path: Path) -> Path:
    logger.info("Extracting speaker reference...")
    total_duration = _read_audio_duration_seconds(audio_path)
    target_duration = 10.0
    if total_duration > 0:
        target_duration = min(max(total_duration * 0.2, 8.0), 12.0)

    preferred_start = 3.0
    if total_duration > 0:
        preferred_start = min(max(total_duration * 0.08, 2.0), 5.0)

    attempts = [preferred_start, 0.0]
    last_error = ""
    for attempt_start in attempts:
        command = [
            get_ffmpeg_exe(),
            "-y",
            "-i",
            str(audio_path),
            "-ss",
            str(max(attempt_start, 0.0)),
            "-t",
            str(target_duration),
            "-acodec",
            "pcm_s16le",
            "-ar",
            "22050",
            "-ac",
            "1",
            str(output_path),
        ]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            last_error = result.stderr
            continue
        if _is_mostly_silent(output_path, target_duration):
            logger.warning(
                "Speaker reference candidate mostly silent at start=%.2fs; retrying.",
                attempt_start,
            )
            continue
        logger.info(
            "Speaker reference extracted: start=%.2fs duration=%.2fs",
            attempt_start,
            target_duration,
        )
        return output_path

    logger.error("FFmpeg speaker reference extraction failed: %s", last_error)
    raise RuntimeError("Failed to extract usable speaker reference audio.")
