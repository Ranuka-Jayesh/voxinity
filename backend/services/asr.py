from pathlib import Path
import warnings

import whisper

from backend.utils.logger import get_logger

logger = get_logger("asr")
model = whisper.load_model("base")
# On CPU, Whisper warns and falls back automatically from FP16 to FP32.
# We force fp16=False in transcribe calls, and keep this filter as a backup.
warnings.filterwarnings(
    "ignore",
    message="FP16 is not supported on CPU; using FP32 instead",
    category=UserWarning,
)
WHISPER_LANGUAGE_MAP = {
    "en": "en",
    "ja": "ja",
    "ko": "ko",
}


def transcribe_with_timestamps(audio_path: Path) -> list[dict]:
    segments, _ = transcribe_with_metadata(audio_path, "auto")
    return segments


def transcribe_audio(audio_path: str, source_language: str = "auto") -> list[dict]:
    segments, _ = transcribe_with_metadata(Path(audio_path), source_language)
    return segments


def transcribe_with_metadata(
    audio_path: Path, source_language: str = "auto"
) -> tuple[list[dict], str]:
    whisper_lang = WHISPER_LANGUAGE_MAP.get(source_language) if source_language != "auto" else None
    logger.info("Transcribing... source_language=%s whisper_language=%s", source_language, whisper_lang or "auto")

    if whisper_lang:
        result = model.transcribe(str(audio_path), language=whisper_lang, fp16=False)
    else:
        result = model.transcribe(str(audio_path), fp16=False)
    segments = []
    for segment in result.get("segments", []):
        segments.append(
            {
                "start": float(segment["start"]),
                "end": float(segment["end"]),
                "text": segment["text"].strip(),
            }
        )
    detected_language = str(result.get("language") or "en")
    return segments, detected_language
