import subprocess
from pathlib import Path

from backend.utils.ffmpeg_tooling import get_ffmpeg_exe
from backend.utils.logger import get_logger

logger = get_logger("video_merger")


def merge_video_with_audio(
    source_video_path: Path, dubbed_audio_path: Path, output_video_path: Path
) -> Path:
    logger.info("Merging video...")

    command = [
        get_ffmpeg_exe(),
        "-y",
        "-i",
        str(source_video_path),
        "-i",
        str(dubbed_audio_path),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        str(output_video_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("FFmpeg merge failed: %s", result.stderr)
        raise RuntimeError("Failed to merge dubbed audio with video.")

    return output_video_path
