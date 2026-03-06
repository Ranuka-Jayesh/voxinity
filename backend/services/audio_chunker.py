import subprocess
from pathlib import Path

from backend.utils.ffmpeg_tooling import get_ffmpeg_exe
from backend.utils.logger import get_logger

logger = get_logger("audio_chunker")


def split_audio_into_chunks(
    audio_path: str, output_dir: str, chunk_duration: int = 15
) -> list[dict]:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    chunk_pattern = output_path / "chunk_%04d.wav"
    command = [
        get_ffmpeg_exe(),
        "-y",
        "-i",
        str(audio_path),
        "-f",
        "segment",
        "-segment_time",
        str(chunk_duration),
        "-c",
        "copy",
        str(chunk_pattern),
    ]

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("Audio chunking failed: %s", result.stderr)
        raise RuntimeError("Failed to split audio into chunks.")

    chunk_files = sorted(output_path.glob("chunk_*.wav"))
    chunks: list[dict] = []
    for idx, file_path in enumerate(chunk_files):
        chunks.append(
            {
                "chunk_path": str(file_path),
                "offset": float(idx * chunk_duration),
            }
        )
    return chunks
