import asyncio
import logging
from pathlib import Path

import edge_tts

from backend.utils.logger import get_logger, log_event

logger = get_logger("tts")

VOICE_MAP = {
    "en": {
        "neutral": {
            "male_like": "en-US-GuyNeural",
            "female_like": "en-US-JennyNeural",
            "unknown": "en-US-GuyNeural",
        },
        "sri_lankan": {
            "male_like": "en-IN-PrabhatNeural",
            "female_like": "en-IN-NeerjaNeural",
            "unknown": "en-IN-PrabhatNeural",
        },
        "indian": {
            "male_like": "en-IN-PrabhatNeural",
            "female_like": "en-IN-NeerjaNeural",
            "unknown": "en-IN-PrabhatNeural",
        },
        "british": {
            "male_like": "en-GB-RyanNeural",
            "female_like": "en-GB-SoniaNeural",
            "unknown": "en-GB-RyanNeural",
        },
    },
    "si": {
        "neutral": {
            "male_like": "si-LK-SameeraNeural",
            "female_like": "si-LK-ThiliniNeural",
            "unknown": "si-LK-SameeraNeural",
        },
        "sri_lankan": {
            "male_like": "si-LK-SameeraNeural",
            "female_like": "si-LK-ThiliniNeural",
            "unknown": "si-LK-SameeraNeural",
        },
        "indian": {
            "male_like": "ta-IN-ValluvarNeural",
            "female_like": "ta-IN-PallaviNeural",
            "unknown": "ta-IN-ValluvarNeural",
        },
        "british": {
            "male_like": "en-GB-RyanNeural",
            "female_like": "en-GB-SoniaNeural",
            "unknown": "en-GB-RyanNeural",
        },
    },
    "ta": {
        "neutral": {
            "male_like": "ta-IN-ValluvarNeural",
            "female_like": "ta-IN-PallaviNeural",
            "unknown": "ta-IN-ValluvarNeural",
        },
        "sri_lankan": {
            "male_like": "ta-IN-ValluvarNeural",
            "female_like": "ta-IN-PallaviNeural",
            "unknown": "ta-IN-ValluvarNeural",
        },
        "indian": {
            "male_like": "ta-IN-ValluvarNeural",
            "female_like": "ta-IN-PallaviNeural",
            "unknown": "ta-IN-ValluvarNeural",
        },
        "british": {
            "male_like": "en-GB-RyanNeural",
            "female_like": "en-GB-SoniaNeural",
            "unknown": "en-GB-RyanNeural",
        },
    },
}


def _edge_rate_value(rate_percent: int) -> str:
    if rate_percent == 0:
        return "+0%"
    sign = "+" if rate_percent > 0 else ""
    return f"{sign}{rate_percent}%"


def resolve_voice(
    target_language: str,
    accent: str,
    preferred_gender: str = "unknown",
) -> str:
    # Standard Edge TTS does not clone the original speaker. It only selects
    # the closest preset voice. True voice cloning requires clone mode / XTTS.
    accent_map = VOICE_MAP.get(target_language, VOICE_MAP["en"])
    gender_map = accent_map.get(accent, accent_map["neutral"])
    return gender_map.get(preferred_gender, gender_map["unknown"])


async def generate_segment_speech(
    translated_segments: list[dict],
    target_language: str,
    temp_dir: Path,
    accent: str = "neutral",
    preferred_gender: str = "unknown",
    *,
    filename_prefix: str = "segment",
    speech_rate_percent: int = 0,
) -> list[dict]:
    logger.info("Generating speech...")

    temp_dir.mkdir(parents=True, exist_ok=True)
    voice = resolve_voice(target_language, accent, preferred_gender=preferred_gender)
    fallback_voice = "en-US-GuyNeural"
    edge_rate = _edge_rate_value(speech_rate_percent)
    log_event(
        logger,
        logging.INFO,
        "tts_voice_selected",
        "Edge TTS voice selected",
        language=target_language,
        accent=accent,
        preferred_gender=preferred_gender,
        voice=voice,
        rate=edge_rate,
    )
    generated_segments = []

    for idx, segment in enumerate(translated_segments):
        text = (segment.get("translated_text") or segment.get("text") or "").strip()
        if not text:
            continue

        segment_audio_path = temp_dir / f"{filename_prefix}_{idx:04d}.mp3"
        try:
            communicator = edge_tts.Communicate(text=text, voice=voice, rate=edge_rate)
            await communicator.save(str(segment_audio_path))
        except Exception as exc:
            logger.warning(
                "Primary TTS unavailable for lang=%s voice=%s segment=%s: %s. Falling back to English.",
                target_language,
                voice,
                idx,
                str(exc),
            )
            try:
                await asyncio.sleep(0.35)
                communicator = edge_tts.Communicate(
                    text=text,
                    voice=fallback_voice,
                    rate=edge_rate,
                )
                await communicator.save(str(segment_audio_path))
            except Exception as fallback_exc:
                logger.error(
                    "Fallback TTS failed for segment %s; leaving silence. %s",
                    idx,
                    str(fallback_exc),
                )
                continue

        await asyncio.sleep(0.15)
        generated_segments.append(
            {
                "start": segment["start"],
                "end": segment["end"],
                "text": text,
                "audio_path": segment_audio_path,
            }
        )

    return generated_segments
