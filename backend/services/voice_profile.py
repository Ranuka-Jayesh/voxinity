import array
import audioop
import logging
import os
import statistics
import wave
from pathlib import Path

from backend.utils.logger import get_logger, log_event

logger = get_logger("voice_profile")
LOG_RAW_F0_CANDIDATES = os.environ.get("LOG_RAW_F0_CANDIDATES", "").lower() in {"1", "true", "yes"}


MIN_F0_HZ = 75.0
MAX_F0_HZ = 350.0
MALE_MIN_HZ = 85.0
MALE_MAX_HZ = 180.0
FEMALE_MIN_HZ = 165.0
FEMALE_MAX_HZ = 300.0
FRAME_SECONDS = 0.04
HOP_SECONDS = 0.02
MIN_CORRELATION = 0.35


def _bytes_to_mono_float(samples: bytes, sample_width: int) -> list[float]:
    if not samples:
        return []

    if sample_width == 1:
        # 8-bit PCM in WAV is typically unsigned.
        pcm = array.array("B", samples)
        return [((value - 128.0) / 128.0) for value in pcm]
    if sample_width == 2:
        pcm = array.array("h")
        pcm.frombytes(samples)
        return [value / 32768.0 for value in pcm]
    if sample_width == 4:
        pcm = array.array("i")
        pcm.frombytes(samples)
        return [value / 2147483648.0 for value in pcm]
    raise ValueError(f"Unsupported sample width for voice profiling: {sample_width}")


def _estimate_f0_candidates(
    samples: bytes,
    sample_rate: int,
    sample_width: int,
) -> list[float]:
    frame_size = max(int(sample_rate * FRAME_SECONDS), 1)
    hop_size = max(int(sample_rate * HOP_SECONDS), 1)
    min_lag = max(int(sample_rate / MAX_F0_HZ), 1)
    max_lag = max(int(sample_rate / MIN_F0_HZ), min_lag + 1)
    frame_bytes = frame_size * sample_width
    hop_bytes = hop_size * sample_width

    candidates: list[float] = []
    for start in range(0, max(len(samples) - frame_bytes + 1, 0), hop_bytes):
        frame = samples[start : start + frame_bytes]
        if len(frame) < frame_bytes:
            break
        # Skip very low-energy frames to avoid noise/harmonic misclassification.
        if audioop.rms(frame, sample_width) < 250:
            continue

        values = _bytes_to_mono_float(frame, sample_width)
        if len(values) <= max_lag + 1:
            continue

        energy = sum(sample * sample for sample in values)
        if energy <= 1e-9:
            continue

        best_lag = 0
        best_corr = 0.0
        for lag in range(min_lag, max_lag + 1):
            corr = 0.0
            for idx in range(0, len(values) - lag):
                corr += values[idx] * values[idx + lag]
            normalized = corr / energy
            if normalized > best_corr:
                best_corr = normalized
                best_lag = lag

        if best_lag <= 0 or best_corr < MIN_CORRELATION:
            continue
        candidates.append(sample_rate / float(best_lag))
    return candidates


def _classify_gender_like(valid_f0_hz: float | None) -> str:
    if valid_f0_hz is None:
        return "unknown"
    if MALE_MIN_HZ <= valid_f0_hz <= MALE_MAX_HZ:
        return "male_like"
    if FEMALE_MIN_HZ <= valid_f0_hz <= FEMALE_MAX_HZ:
        return "female_like"
    return "unknown"


def analyze_voice_profile(audio_path: Path) -> dict[str, float | str]:
    """
    Analyze source voice characteristics.
    Returns a lightweight profile used to select a closer TTS voice.
    """
    try:
        with wave.open(str(audio_path), "rb") as wav_file:
            sample_rate = wav_file.getframerate()
            sample_width = wav_file.getsampwidth()
            channels = wav_file.getnchannels()
            frame_count = min(int(sample_rate * 8), wav_file.getnframes())
            samples = wav_file.readframes(frame_count)
            if channels > 1:
                # Reduce to mono for pitch estimation.
                samples = audioop.tomono(samples, sample_width, 0.5, 0.5)

        raw_candidates = _estimate_f0_candidates(samples, sample_rate, sample_width)
        valid_candidates = [
            value for value in raw_candidates if MIN_F0_HZ <= value <= MAX_F0_HZ
        ]
        filtered_f0_hz: float | None = (
            float(statistics.median(valid_candidates)) if valid_candidates else None
        )
        gender_like = _classify_gender_like(filtered_f0_hz)

        if LOG_RAW_F0_CANDIDATES:
            log_event(
                logger,
                logging.INFO,
                "voice_profile_raw_candidates",
                "F0 candidates collected",
                count=len(raw_candidates),
                sample=[round(value, 2) for value in raw_candidates[:12]],
            )
        log_event(
            logger,
            logging.INFO,
            "voice_profile_detected",
            "Voice profile detected",
            valid_count=len(valid_candidates),
            pitch_hz=round(float(filtered_f0_hz or 0.0), 2),
            gender_like=gender_like,
        )
        return {
            "pitch_hz": float(filtered_f0_hz or 0.0),
            "gender_like": gender_like,
        }
    except Exception as exc:
        logger.warning("Voice profile detection failed, using neutral defaults: %s", str(exc))
        return {
            "pitch_hz": 0.0,
            "gender_like": "unknown",
        }
