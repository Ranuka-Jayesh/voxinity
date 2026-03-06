"""Heavy dubbing ML / media pipeline — import from the API process only via lazy import or run in pipeline_worker."""

from __future__ import annotations

import asyncio
import os
import re
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from backend.services.asr import transcribe_with_metadata
from backend.services.audio_chunker import split_audio_into_chunks
from backend.services.audio_extractor import extract_audio_to_wav, extract_speaker_reference
from backend.services import dub_supabase as ds
from backend.services.synchronizer import synchronize_dubbed_audio
from backend.services.translator import translate_segments
from backend.services.tts import generate_segment_speech
from backend.services.video_downloader import download_video_from_url
from backend.services.video_merger import merge_video_with_audio
from backend.services.voice_cloner import (
    generate_cloned_speech,
    is_xtts_available,
    xtts_supports_target_language,
)
from backend.services.voice_profile import analyze_voice_profile
from backend.utils.file_utils import OUTPUT_DIR, UPLOAD_DIR
from backend.utils.ffmpeg_tooling import format_pipeline_error, get_ffprobe_exe
from backend.utils.job_manager import complete_job, fail_job, update_progress
from backend.utils.logger import get_logger

logger = get_logger("dub_pipeline")


def get_video_duration_seconds(video_path: Path) -> float:
    command = [
        get_ffprobe_exe(),
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError("Failed to read video duration.")
    return float(result.stdout.strip())


def merge_short_segments(segments: list[dict], min_duration_sec: float = 1.0) -> list[dict]:
    if not segments:
        return []
    ordered = sorted(segments, key=lambda item: float(item.get("start", 0.0)))
    merged: list[dict] = []
    idx = 0
    while idx < len(ordered):
        current = dict(ordered[idx])
        current_start = float(current.get("start", 0.0))
        current_end = float(current.get("end", current_start))
        current_text = (current.get("text") or "").strip()
        current_duration = max(current_end - current_start, 0.0)

        should_merge = (
            idx + 1 < len(ordered)
            and (
                current_duration < min_duration_sec
                or (
                    current_text
                    and current_text[-1] not in ".!?"
                    and float(ordered[idx + 1].get("start", current_end)) - current_end < 0.8
                )
            )
        )
        if should_merge:
            nxt = dict(ordered[idx + 1])
            nxt_start = float(nxt.get("start", current_end))
            nxt_end = float(nxt.get("end", nxt_start))
            nxt_text = (nxt.get("text") or "").strip()
            merged.append(
                {
                    "start": min(current_start, nxt_start),
                    "end": max(current_end, nxt_end),
                    "text": " ".join(part for part in [current_text, nxt_text] if part).strip(),
                }
            )
            idx += 2
            continue

        merged.append(current)
        idx += 1
    return merged


def split_long_segments_by_punctuation(
    segments: list[dict],
    *,
    max_duration_sec: float = 6.5,
) -> list[dict]:
    split_segments: list[dict] = []
    for segment in segments:
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        text = (segment.get("text") or "").strip()
        duration = max(end - start, 0.0)

        if duration <= max_duration_sec or not text:
            split_segments.append(segment)
            continue

        parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+|[,;:]\s+", text) if part.strip()]
        if len(parts) <= 1:
            split_segments.append(segment)
            continue

        total_chars = sum(len(part) for part in parts)
        if total_chars <= 0:
            split_segments.append(segment)
            continue

        cursor = start
        for idx, part in enumerate(parts):
            part_ratio = len(part) / total_chars
            part_duration = duration * part_ratio
            part_end = end if idx == len(parts) - 1 else min(end, cursor + part_duration)
            split_segments.append(
                {
                    "start": cursor,
                    "end": part_end,
                    "text": part,
                }
            )
            cursor = part_end
    return split_segments


def run_dubbing_pipeline(
    job_id: str,
    input_video_path: Path | None,
    video_url: str | None,
    input_label: str | None,
    input_type: str | None,
    user_id: str | None,
    source_language: str,
    target_language: str,
    translation_provider: str,
    voice_mode: str,
    accent: str,
    voice_match_mode: str,
) -> None:
    extracted_wav_path: Path | None = None
    synced_dub_audio_path: Path | None = None
    tts_temp_dir: Path | None = None
    chunks_dir: Path | None = None
    supabase_ok = ds.is_configured()
    if not supabase_ok:
        logger.warning(
            "SUPABASE_URL / keys not set; skipping dubbing_jobs & dubbing_segments REST sync "
            "(local jobs.json still updates). Add them to .env or export in this shell."
        )
    try:
        def _db_patch_job(payload: dict) -> None:
            if not supabase_ok:
                return
            try:
                ds.supabase_patch("dubbing_jobs", payload, {"id": f"eq.{job_id}"})
            except Exception as exc:
                logger.warning("Failed to update dubbing_jobs row for %s: %s", job_id, exc)

        def _db_set_progress(message: str) -> None:
            _db_patch_job(
                {
                    "status": "processing",
                    "progress": message,
                    "started_at": datetime.now(UTC).isoformat(),
                }
            )

        def _set_progress(message: str) -> None:
            update_progress(job_id, message)
            _db_set_progress(message)

        def _annotate_tts_segments(rows: list[dict], source: str) -> list[dict]:
            annotated: list[dict] = []
            for seg_idx, row in enumerate(rows, start=1):
                segment = dict(row)
                segment["segment_index"] = seg_idx
                segment["source"] = str(segment.get("source") or source)
                segment["target_language"] = str(segment.get("target_language") or target_language)
                segment["accent"] = str(segment.get("accent") or accent)
                segment["preferred_gender"] = str(
                    segment.get("preferred_gender") or preferred_gender
                )
                annotated.append(segment)
            return annotated

        if input_video_path is None:
            if not video_url:
                raise RuntimeError("No input video provided.")
            _set_progress("Downloading video from URL...")
            downloaded_path = download_video_from_url(
                video_url,
                str(UPLOAD_DIR),
                progress_callback=lambda message: _set_progress(message),
            )
            _set_progress("Download complete")
            _set_progress("Processing downloaded video...")
            input_video_path = Path(downloaded_path)
            duration_seconds = get_video_duration_seconds(input_video_path)
            if duration_seconds > 300:
                input_video_path.unlink(missing_ok=True)
                raise RuntimeError("Video too long. Please provide a video up to 5 minutes.")

        base_name = uuid4().hex
        extracted_wav_path = OUTPUT_DIR / f"{base_name}_source.wav"
        synced_dub_audio_path = OUTPUT_DIR / f"{base_name}_dubbed.wav"
        output_video_path = OUTPUT_DIR / f"{base_name}_dubbed.mp4"
        tts_temp_dir = OUTPUT_DIR / f"{base_name}_tts_segments"
        chunks_dir = OUTPUT_DIR / f"{base_name}_chunks"

        _set_progress("Extracting audio...")
        extract_audio_to_wav(input_video_path, extracted_wav_path)
        video_duration_sec = get_video_duration_seconds(input_video_path)
        logger.info(
            "Selected voice mode=%s | accent=%s | video_duration=%.2fs",
            voice_mode,
            accent,
            video_duration_sec,
        )

        _set_progress("Splitting audio into chunks...")
        chunks = split_audio_into_chunks(
            audio_path=str(extracted_wav_path),
            output_dir=str(chunks_dir),
            chunk_duration=15,
        )
        if not chunks:
            raise RuntimeError("No audio chunks generated from source audio.")

        segments: list[dict] = []
        detected_source_language = "en"
        total_chunks = len(chunks)
        for idx, chunk in enumerate(chunks, start=1):
            _set_progress(f"Processing chunk {idx} of {total_chunks}...")
            chunk_segments, chunk_language = transcribe_with_metadata(
                Path(chunk["chunk_path"]), source_language
            )
            if source_language == "auto" and chunk_language:
                detected_source_language = chunk_language
            chunk_offset = float(chunk["offset"])
            for segment in chunk_segments:
                segment["start"] = float(segment["start"]) + chunk_offset
                segment["end"] = float(segment["end"]) + chunk_offset
                segments.append(segment)

        if not segments:
            raise RuntimeError("No speech segments detected in source audio.")
        segments = merge_short_segments(segments)
        segments = split_long_segments_by_punctuation(segments)

        preferred_gender = "unknown"
        if voice_match_mode == "auto":
            voice_profile = analyze_voice_profile(extracted_wav_path)
            preferred_gender = str(voice_profile.get("gender_like", "unknown"))
            pitch_hz = float(voice_profile.get("pitch_hz", 0.0))
            logger.info(
                "Voice match enabled: pitch_hz=%.2f, preferred_gender=%s",
                pitch_hz,
                preferred_gender,
            )
        else:
            logger.info("Voice match disabled; using neutral voice profile.")

        effective_source_language = (
            detected_source_language if source_language == "auto" else source_language
        )
        _set_progress("Translating segments...")
        logger.info(
            "Source language: %s | Target language: %s | segment_count=%s",
            effective_source_language,
            target_language,
            len(segments),
        )
        translated_segments = translate_segments(
            segments,
            target_language,
            effective_source_language,
            translation_provider,
        )

        _set_progress("Generating speech...")
        effective_voice_mode = voice_mode
        max_clone_sec = float(os.environ.get("VOICE_CLONE_MAX_DURATION_SEC", "180"))
        if voice_mode == "clone" and video_duration_sec > max_clone_sec:
            logger.warning(
                "Voice cloning disabled for long video (%.2fs > %.2fs). Falling back to standard TTS. "
                "Set VOICE_CLONE_MAX_DURATION_SEC to raise the limit.",
                video_duration_sec,
                max_clone_sec,
            )
            effective_voice_mode = "standard"

        if voice_mode == "clone" and not xtts_supports_target_language(target_language):
            logger.warning(
                "XTTS voice cloning cannot synthesize target_language=%s (Sinhala/Tamil are not in XTTS v2). "
                "Using Edge neural TTS. Use target English for full speaker cloning.",
                target_language,
            )
            effective_voice_mode = "standard"

        if effective_voice_mode == "clone":
            logger.info("Voice cloning enabled (XTTS v2)...")
            try:
                if not is_xtts_available():
                    raise RuntimeError(
                        "Coqui XTTS is unavailable. Install: pip install 'coqui-tts[codec]' torchaudio "
                        "and transformers>=4.46,<5 (see backend/requirements.txt)."
                    )

                speaker_reference_path = tts_temp_dir / "speaker_ref.wav"
                extract_speaker_reference(extracted_wav_path, speaker_reference_path)
                reference_duration = get_video_duration_seconds(speaker_reference_path)
                logger.info(
                    "Voice cloning reference prepared: duration=%.2fs path=%s",
                    reference_duration,
                    speaker_reference_path,
                )

                tts_segments = []
                tts_temp_dir.mkdir(parents=True, exist_ok=True)
                for idx, segment in enumerate(translated_segments, start=1):
                    _set_progress(f"Generating dubbed speech {idx}...")
                    text = (
                        segment.get("translated_text") or segment.get("text") or ""
                    ).strip()
                    if not text:
                        continue

                    segment_audio_path = tts_temp_dir / f"segment_{idx:04d}.wav"
                    try:
                        generate_cloned_speech(
                            text=text,
                            speaker_wav=str(speaker_reference_path),
                            output_path=str(segment_audio_path),
                            target_language=target_language,
                        )
                    except Exception as segment_exc:
                        logger.warning(
                            "Clone TTS failed for segment %s: %s — trying Edge TTS for this segment.",
                            idx,
                            str(segment_exc),
                        )
                        try:
                            fb = asyncio.run(
                                generate_segment_speech(
                                    translated_segments=[dict(segment)],
                                    target_language=target_language,
                                    temp_dir=tts_temp_dir,
                                    accent=accent,
                                    preferred_gender=preferred_gender,
                                    filename_prefix=f"clone_fb_{idx:04d}",
                                )
                            )
                            if fb:
                                row = fb[0]
                                tts_segments.append(
                                    {
                                        "start": segment["start"],
                                        "end": segment["end"],
                                        "text": text,
                                        "audio_path": row["audio_path"],
                                        "source": "edge",
                                        "target_language": target_language,
                                        "accent": accent,
                                        "preferred_gender": preferred_gender,
                                    }
                                )
                        except Exception as fb_exc:
                            logger.error(
                                "Edge fallback failed for segment %s: %s",
                                idx,
                                str(fb_exc),
                            )
                        continue
                    tts_segments.append(
                        {
                            "start": segment["start"],
                            "end": segment["end"],
                            "text": text,
                            "audio_path": segment_audio_path,
                            "source": "clone",
                            "target_language": target_language,
                            "accent": accent,
                            "preferred_gender": preferred_gender,
                        }
                    )
            except Exception as exc:
                logger.warning(
                    "Voice cloning failed, using standard TTS... reason=%s", str(exc)
                )
                for idx in range(1, len(translated_segments) + 1):
                    _set_progress(f"Generating dubbed speech {idx}...")
                tts_segments = asyncio.run(
                    generate_segment_speech(
                        translated_segments=translated_segments,
                        target_language=target_language,
                        temp_dir=tts_temp_dir,
                        accent=accent,
                        preferred_gender=preferred_gender,
                    )
                )
                tts_segments = _annotate_tts_segments(tts_segments, source="edge")
        else:
            for idx in range(1, len(translated_segments) + 1):
                _set_progress(f"Generating dubbed speech {idx}...")
            tts_segments = asyncio.run(
                generate_segment_speech(
                    translated_segments=translated_segments,
                    target_language=target_language,
                    temp_dir=tts_temp_dir,
                    accent=accent,
                    preferred_gender=preferred_gender,
                )
            )
            tts_segments = _annotate_tts_segments(tts_segments, source="edge")

        if not tts_segments:
            raise RuntimeError("Failed to generate TTS segments.")
        tts_segments = _annotate_tts_segments(tts_segments, source="edge")

        _set_progress("Synchronizing final audio...")
        synchronize_dubbed_audio(
            tts_segments,
            video_duration_sec,
            synced_dub_audio_path,
            temp_dir=tts_temp_dir,
            target_language=target_language,
            accent=accent,
            preferred_gender=preferred_gender,
        )

        _set_progress("Merging video...")
        merge_video_with_audio(input_video_path, synced_dub_audio_path, output_video_path)
        complete_job(job_id, f"/outputs/{output_video_path.name}", translated_segments)
        _db_patch_job(
            {
                "status": "completed",
                "progress": "Completed",
                "output_path": f"/outputs/{output_video_path.name}",
                "error_message": None,
                "completed_at": datetime.now(UTC).isoformat(),
            }
        )
        try:
            segment_rows = [
                {
                    "job_id": job_id,
                    "segment_index": idx,
                    "start_sec": float(seg.get("start", 0.0)),
                    "end_sec": float(seg.get("end", 0.0)),
                    "source_text": (seg.get("text") or "").strip() or None,
                    "translated_text": (seg.get("translated_text") or "").strip() or None,
                    "gesture": seg.get("gesture"),
                }
                for idx, seg in enumerate(translated_segments or [], start=1)
            ]
            if segment_rows and supabase_ok:
                ds.supabase_post("dubbing_segments", segment_rows, return_rows=False)
        except Exception as exc:
            logger.warning("Failed to persist dubbing segments for job %s: %s", job_id, exc)
    except Exception as exc:
        logger.exception("Dubbing pipeline failed for job_id=%s", job_id)
        fail_job(job_id, format_pipeline_error(exc))
        if supabase_ok:
            try:
                ds.supabase_patch(
                    "dubbing_jobs",
                    {
                        "status": "failed",
                        "progress": "Failed",
                        "error_message": format_pipeline_error(exc),
                        "completed_at": datetime.now(UTC).isoformat(),
                    },
                    {"id": f"eq.{job_id}"},
                )
            except Exception as patch_exc:
                logger.warning("Failed to mark dubbing_jobs failed for %s: %s", job_id, patch_exc)
    finally:
        if chunks_dir and chunks_dir.exists():
            shutil.rmtree(chunks_dir, ignore_errors=True)
        if tts_temp_dir and tts_temp_dir.exists():
            shutil.rmtree(tts_temp_dir, ignore_errors=True)
        if extracted_wav_path and extracted_wav_path.exists():
            extracted_wav_path.unlink(missing_ok=True)
        if synced_dub_audio_path and synced_dub_audio_path.exists():
            synced_dub_audio_path.unlink(missing_ok=True)
