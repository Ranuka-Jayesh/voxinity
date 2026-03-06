from pathlib import Path
import asyncio
import logging
import os
import re
import subprocess

from pydub import AudioSegment
from pydub.silence import detect_nonsilent

from backend.services.tts import generate_segment_speech
from backend.utils.ffmpeg_tooling import get_ffmpeg_exe
from backend.utils.logger import get_logger, log_event

logger = get_logger("synchronizer")
MIN_SAFE_WINDOW_MS = 120
DEFAULT_RATE_STEPS = [10, 15, 20, 25, 30]


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def trim_silence(
    audio: AudioSegment,
    silence_thresh: int = -38,
    chunk_size: int = 10,
    *,
    preserve_lead_ms: int = 80,
    preserve_tail_ms: int = 120,
) -> AudioSegment:
    try:
        ranges = detect_nonsilent(
            audio,
            min_silence_len=chunk_size,
            silence_thresh=silence_thresh,
            seek_step=chunk_size,
        )
        if not ranges:
            return audio
        start_ms = max(ranges[0][0] - preserve_lead_ms, 0)
        end_ms = min(ranges[-1][1] + preserve_tail_ms, len(audio))
        if end_ms <= start_ms:
            return audio
        return audio[start_ms:end_ms]
    except Exception as exc:
        logger.warning("Silence trimming failed, using original clip: %s", str(exc))
        return audio


def _build_atempo_chain(speed_factor: float) -> str:
    if speed_factor <= 0:
        raise ValueError("speed_factor must be greater than 0")
    factors: list[float] = []
    remaining = speed_factor
    while remaining > 2.0:
        factors.append(2.0)
        remaining /= 2.0
    while remaining < 0.5:
        factors.append(0.5)
        remaining /= 0.5
    factors.append(remaining)
    return ",".join(f"atempo={factor:.5f}" for factor in factors)


def _apply_atempo_ffmpeg(input_audio_path: Path, output_audio_path: Path, speed_factor: float) -> Path:
    filter_chain = _build_atempo_chain(speed_factor)
    command = [
        get_ffmpeg_exe(),
        "-y",
        "-i",
        str(input_audio_path),
        "-filter:a",
        filter_chain,
        "-vn",
        str(output_audio_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        logger.warning(
            "FFmpeg atempo failed for %s with factor %.4f: %s",
            input_audio_path,
            speed_factor,
            result.stderr,
        )
        raise RuntimeError("Failed to apply FFmpeg atempo.")
    return output_audio_path


def _regenerate_with_rate(
    *,
    segment: dict,
    idx: int,
    target_language: str,
    accent: str,
    preferred_gender: str,
    temp_dir: Path,
    rate_percent: int,
    text_override: str | None = None,
) -> Path | None:
    text = (text_override if text_override is not None else segment.get("text") or "").strip()
    if not text:
        return None
    generated = asyncio.run(
        generate_segment_speech(
            translated_segments=[
                {
                    "start": segment.get("start", 0.0),
                    "end": segment.get("end", 0.0),
                    "text": text,
                    "translated_text": text,
                }
            ],
            target_language=target_language,
            temp_dir=temp_dir,
            accent=accent,
            preferred_gender=preferred_gender,
            filename_prefix=f"syncfit_s{idx:04d}_r{rate_percent}",
            speech_rate_percent=rate_percent,
        )
    )
    if not generated:
        return None
    audio_path = generated[0].get("audio_path")
    return Path(audio_path) if audio_path else None


def _compress_text_for_timing(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return cleaned
    parts = re.split(r"(?<=[.!?])\s+|[,;:]\s+", cleaned)
    base = parts[0].strip() if parts else cleaned
    if not base:
        base = cleaned
    words = base.split()
    if len(words) > 16:
        base = " ".join(words[:16]).rstrip(",;:- ")
    base = re.sub(
        r"\b(you know|kind of|sort of|basically|actually|in fact|really)\b",
        "",
        base,
        flags=re.IGNORECASE,
    )
    base = re.sub(r"\s+", " ", base).strip(" ,;:-")
    return base or cleaned


def _fit_segment_audio(
    *,
    idx: int,
    segment: dict,
    clip: AudioSegment,
    clip_path: Path,
    fit_target_ms: int,
    target_language: str,
    accent: str,
    preferred_gender: str,
    temp_dir: Path | None,
    aggressive_sync: bool,
) -> tuple[AudioSegment, dict]:
    selected_rate = "+0%"
    atempo_factor = 1.0
    text_compressed = False
    trimmed = False
    before_ms = len(clip)
    working_clip = clip
    working_path = clip_path

    source = str(segment.get("source") or "edge").lower()
    can_regen = source != "clone" and temp_dir is not None
    max_rate = 30 if aggressive_sync else 15
    max_atempo = 1.30 if aggressive_sync else 1.15
    regen_steps = [step for step in DEFAULT_RATE_STEPS if step <= max_rate]

    if len(working_clip) > fit_target_ms and can_regen:
        for rate_percent in regen_steps:
            regenerated = _regenerate_with_rate(
                segment=segment,
                idx=idx,
                target_language=target_language,
                accent=accent,
                preferred_gender=preferred_gender,
                temp_dir=temp_dir,
                rate_percent=rate_percent,
            )
            if not regenerated or not regenerated.exists():
                continue
            try:
                candidate = trim_silence(AudioSegment.from_file(regenerated))
            except Exception as exc:
                logger.warning("Rate regeneration read failed for segment %s: %s", idx, str(exc))
                continue
            working_clip = candidate
            working_path = regenerated
            selected_rate = f"+{rate_percent}%"
            if len(working_clip) <= fit_target_ms:
                break

    if len(working_clip) > fit_target_ms:
        try:
            required = max(len(working_clip) / max(fit_target_ms, 1), 1.0)
            atempo_factor = min(required, max_atempo)
            if atempo_factor > 1.0:
                atempo_path = clip_path.parent / f"{clip_path.stem}_atempo_{idx:04d}.wav"
                _apply_atempo_ffmpeg(working_path, atempo_path, atempo_factor)
                working_clip = trim_silence(AudioSegment.from_file(atempo_path))
                working_path = atempo_path
        except Exception as exc:
            logger.warning("Atempo adjustment failed for segment %s: %s", idx, str(exc))

    text_compression_enabled = _env_bool("DUB_TEXT_COMPRESSION", default=aggressive_sync)
    if len(working_clip) > fit_target_ms and can_regen and text_compression_enabled:
        compressed_text = _compress_text_for_timing(str(segment.get("text") or ""))
        original_text = str(segment.get("text") or "").strip()
        if compressed_text and compressed_text != original_text:
            text_compressed = True
            for rate_percent in [0] + regen_steps:
                compressed = _regenerate_with_rate(
                    segment=segment,
                    idx=idx,
                    target_language=target_language,
                    accent=accent,
                    preferred_gender=preferred_gender,
                    temp_dir=temp_dir,
                    rate_percent=rate_percent,
                    text_override=compressed_text,
                )
                if not compressed or not compressed.exists():
                    continue
                try:
                    candidate = trim_silence(AudioSegment.from_file(compressed))
                except Exception as exc:
                    logger.warning(
                        "Compressed regeneration read failed for segment %s: %s",
                        idx,
                        str(exc),
                    )
                    continue
                working_clip = candidate
                working_path = compressed
                selected_rate = f"+{rate_percent}%"
                if len(working_clip) <= fit_target_ms:
                    break

    if len(working_clip) > fit_target_ms:
        trimmed = True
        working_clip = working_clip[: max(fit_target_ms, 1)]

    return working_clip, {
        "before_ms": before_ms,
        "selected_rate": selected_rate,
        "atempo_factor": atempo_factor,
        "text_compressed": text_compressed,
        "trimmed": trimmed,
    }


def synchronize_dubbed_audio(
    tts_segments: list[dict],
    video_duration_sec: float,
    output_audio_path: Path,
    *,
    temp_dir: Path | None = None,
    target_language: str = "en",
    accent: str = "neutral",
    preferred_gender: str = "unknown",
) -> Path:
    logger.info("Synchronizing...")

    aggressive_sync = _env_bool("DUB_SYNC_AGGRESSIVE", default=False)
    safety_gap_ms = int(os.environ.get("DUB_SYNC_SAFETY_GAP_MS", "120"))
    allow_start_shift = _env_bool("DUB_ALLOW_START_SHIFT", default=False)
    start_shift_ms = int(os.environ.get("DUB_START_SHIFT_MS", "-400")) if allow_start_shift else 0
    pause_preserve_ms = int(os.environ.get("DUB_SYNC_PAUSE_PRESERVE_MS", "160"))

    video_duration_ms = max(int(video_duration_sec * 1000), 1)
    timeline = AudioSegment.silent(duration=video_duration_ms)
    ordered_segments = sorted(tts_segments, key=lambda item: float(item["start"]))

    for idx, segment in enumerate(ordered_segments, start=1):
        original_start_ms = max(int(float(segment["start"]) * 1000), 0)
        original_end_ms = max(int(float(segment["end"]) * 1000), original_start_ms + 1)
        placement_start_ms = max(original_start_ms + start_shift_ms, 0)
        original_duration_ms = max(original_end_ms - original_start_ms, 1)

        next_start_ms: int | None = None
        if idx < len(ordered_segments):
            next_start_ms = max(int(float(ordered_segments[idx]["start"]) * 1000), original_end_ms)

        # Gap-aware allowed window based on absolute ASR start times.
        if next_start_ms is not None:
            strict_window_ms = max(next_start_ms - original_start_ms - safety_gap_ms, MIN_SAFE_WINDOW_MS)
            natural_pause_ms = max(next_start_ms - original_end_ms, 0)
        else:
            strict_window_ms = max(video_duration_ms - original_start_ms, MIN_SAFE_WINDOW_MS)
            natural_pause_ms = max(video_duration_ms - original_end_ms, 0)
        overflow_allowance_ms = min(natural_pause_ms, pause_preserve_ms)
        fit_target_ms = max(strict_window_ms + overflow_allowance_ms, MIN_SAFE_WINDOW_MS)

        clip_path = Path(segment["audio_path"])
        clip = trim_silence(AudioSegment.from_file(clip_path))

        clip, fit_meta = _fit_segment_audio(
            idx=idx,
            segment=segment,
            clip=clip,
            clip_path=clip_path,
            fit_target_ms=fit_target_ms,
            target_language=str(segment.get("target_language") or target_language),
            accent=str(segment.get("accent") or accent),
            preferred_gender=str(segment.get("preferred_gender") or preferred_gender),
            temp_dir=temp_dir,
            aggressive_sync=aggressive_sync,
        )
        final_tts_duration_ms = len(clip)
        early_finish_ms = max(strict_window_ms - final_tts_duration_ms, 0)
        overflow_ms = max(final_tts_duration_ms - strict_window_ms, 0)

        log_event(
            logger,
            logging.INFO,
            "sync_segment_fit",
            "Segment synchronized",
            segment_idx=idx,
            original_start_ms=original_start_ms,
            original_end_ms=original_end_ms,
            placement_start_ms=placement_start_ms,
            original_duration_ms=original_duration_ms,
            final_tts_duration_ms=final_tts_duration_ms,
            gap_to_next_ms=(next_start_ms - original_end_ms) if next_start_ms is not None else None,
            rate=fit_meta["selected_rate"],
            atempo_factor=round(float(fit_meta["atempo_factor"]), 3),
            text_compressed=fit_meta["text_compressed"],
            trimmed=fit_meta["trimmed"],
            early_finish_ms=early_finish_ms,
            overflow_ms=overflow_ms,
            fit_target_ms=fit_target_ms,
            strict_window_ms=strict_window_ms,
        )

        # Overlay at absolute timeline position (no pull-forward concatenation).
        timeline = timeline.overlay(clip, position=placement_start_ms)

    timeline = timeline.set_channels(1).set_frame_rate(16000)
    pre_validation_ms = len(timeline)
    if len(timeline) < video_duration_ms:
        timeline = timeline + AudioSegment.silent(duration=video_duration_ms - len(timeline))
    elif len(timeline) > video_duration_ms:
        timeline = timeline[:video_duration_ms]

    log_event(
        logger,
        logging.INFO,
        "sync_timeline_validation",
        "Timeline validation complete",
        target_ms=video_duration_ms,
        pre_validation_ms=pre_validation_ms,
        final_ms=len(timeline),
        delta_ms=len(timeline) - video_duration_ms,
    )
    timeline.export(output_audio_path, format="wav")
    return output_audio_path
