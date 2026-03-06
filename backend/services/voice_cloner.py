"""
XTTS v2 voice cloning (Coqui TTS).

XTTS only supports a fixed set of output languages (see Coqui docs); Sinhala/Tamil
are not included — dubbing to si/ta uses Edge TTS even if "Voice Clone" is selected.
"""

from __future__ import annotations

import os
from threading import Lock

from backend.utils.logger import get_logger

logger = get_logger("voice_cloner")

_xtts_model = None
_xtts_lock = Lock()

# Map Voxinity target_language -> XTTS `language` argument for tts_to_file
TARGET_TO_XTTS_LANG: dict[str, str] = {
    "en": "en",
    # si, ta: not supported by XTTS — use Edge TTS (handled in dub route)
}


def xtts_supports_target_language(target_language: str) -> bool:
    """True if XTTS can synthesize speech in this target language."""
    return target_language in TARGET_TO_XTTS_LANG


def resolve_xtts_language(target_language: str) -> str:
    """Return XTTS language code; raises if unsupported."""
    if target_language not in TARGET_TO_XTTS_LANG:
        raise ValueError(
            f"XTTS does not synthesize target_language={target_language!r}. "
            f"Supported app targets for cloning: {sorted(TARGET_TO_XTTS_LANG.keys())}"
        )
    return TARGET_TO_XTTS_LANG[target_language]


def _coqui_import_ok() -> bool:
    try:
        import torchaudio  # noqa: F401
        from TTS.api import TTS  # noqa: F401

        return True
    except Exception as exc:
        logger.debug("Coqui TTS import check failed: %s", exc)
        return False


def _get_xtts_model():
    global _xtts_model
    if _xtts_model is not None:
        return _xtts_model

    with _xtts_lock:
        if _xtts_model is not None:
            return _xtts_model
        try:
            import torch
            from TTS.api import TTS  # type: ignore
        except Exception as exc:
            raise RuntimeError(
                "Coqui TTS is not available. Install with: pip install 'coqui-tts[codec]' "
                "and matching torchaudio (see backend/requirements.txt)."
            ) from exc

        use_gpu = torch.cuda.is_available()
        logger.info(
            "Loading XTTS v2 (first run downloads weights; GPU=%s)...",
            use_gpu,
        )
        _xtts_model = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            progress_bar=os.environ.get("XTTS_PROGRESS_BAR", "").lower() in ("1", "true", "yes"),
            gpu=use_gpu,
        )
        return _xtts_model


def generate_cloned_speech(
    text: str, speaker_wav: str, output_path: str, target_language: str
) -> None:
    """
    Synthesize speech with cloned timbre from speaker_wav.

    target_language: Voxinity code (e.g. en). Must be XTTS-supported — use
    xtts_supports_target_language first.
    """
    lang = resolve_xtts_language(target_language)
    model = _get_xtts_model()
    logger.debug("XTTS segment len=%s chars lang=%s", len(text), lang)
    model.tts_to_file(
        text=text,
        speaker_wav=speaker_wav,
        language=lang,
        file_path=output_path,
    )


def is_xtts_available() -> bool:
    """True if Coqui/XTTS stack imports successfully (does not load weights)."""
    return _coqui_import_ok()
