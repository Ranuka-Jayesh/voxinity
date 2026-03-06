import asyncio
import json
import os
from collections import Counter
from pathlib import Path
from uuid import uuid4
from datetime import UTC, datetime

import aiofiles
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from backend.services import dub_supabase as ds
from backend.utils.file_utils import UPLOAD_DIR
from backend.utils.job_manager import (
    create_job,
    enqueue_pipeline_job,
    get_job,
)
from backend.utils.logger import get_logger

router = APIRouter()
logger = get_logger("dub_route")
SOURCE_LANGUAGES = {"auto", "en", "ja", "ko"}
TARGET_LANGUAGES = {"en", "si", "ta"}


class DubStartResponse(BaseModel):
    job_id: str


class DubStatusResponse(BaseModel):
    status: str
    progress: str
    output: str | None
    error: str | None
    segments: list[dict] | None = None


class DubHistoryItem(BaseModel):
    id: str
    status: str
    progress: str | None = None
    error_message: str | None = None
    source_language: str | None = None
    target_language: str | None = None
    input_type: str | None = None
    input_label: str | None = None
    output_path: str | None = None
    created_at: str | None = None
    completed_at: str | None = None


class DubAnalyticsResponse(BaseModel):
    translations: int
    voice_sessions: int
    hours_saved: float
    avg_response_time_sec: float
    peak_hour: str
    total_words: int
    weekly_breakdown: list[dict]
    languages_used: list[dict]
    monthly_usage_trend: list[dict]



def external_pipeline_requested() -> bool:
    raw = (os.environ.get("VOX_EXTERNAL_PIPELINE") or "").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def _resolve_optional_user_id(request: Request) -> str | None:
    try:
        return ds.resolve_optional_user_id_from_cookie(request.cookies.get("vox_session"))
    except RuntimeError:
        logger.warning("Supabase unavailable; dubbing runs without attributed user.")
        return None


def _parse_iso_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None



@router.post("/dub", response_model=DubStartResponse)
async def dub_video(
    request: Request,
    background_tasks: BackgroundTasks,
    source_language: str = Form(default="auto"),
    target_language: str = Form(...),
    translation_provider: str = Form(default="nllb"),
    video_file: UploadFile | None = File(default=None),
    video_url: str | None = Form(default=None),
    voice_mode: str = Form(default="standard"),
    accent: str = Form(default="neutral"),
    voice_match_mode: str = Form(default="auto"),
) -> DubStartResponse:
    if not video_file and not video_url:
        raise HTTPException(status_code=400, detail="Provide either video_file or video_url.")

    if source_language not in SOURCE_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported source language.")
    if target_language not in TARGET_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported target language.")
    if translation_provider not in {"nllb"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported translation_provider. Use nllb.",
        )
    if voice_mode not in {"standard", "clone"}:
        raise HTTPException(status_code=400, detail="Unsupported voice_mode. Use standard or clone.")
    if accent not in {"neutral", "sri_lankan", "indian", "british"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported accent. Use neutral, sri_lankan, indian, or british.",
        )
    if voice_match_mode not in {"off", "auto"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported voice_match_mode. Use off or auto.",
        )

    input_type: str | None = None
    input_label: str | None = None
    try:
        if video_file is not None:
            suffix = Path(video_file.filename or "input.mp4").suffix or ".mp4"
            input_video_path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
            input_type = "file"
            input_label = video_file.filename or "uploaded_video"
            async with aiofiles.open(input_video_path, "wb") as file_obj:
                content = await video_file.read()
                await file_obj.write(content)
        elif video_url:
            input_video_path = None
            input_type = "url"
            input_label = video_url.strip()
        else:
            raise HTTPException(status_code=400, detail="Provide either video_file or video_url.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail="Invalid or unsupported video URL") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to prepare input for dubbing.")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    job_id = create_job()
    user_id: str | None = None
    try:
        user_id = _resolve_optional_user_id(request)
    except Exception as exc:
        logger.warning("Unable to resolve user from session for dubbing job: %s", exc)

    ext = external_pipeline_requested()
    job_progress_msg = "Waiting for ML worker..." if ext else "Queued..."

    try:
        ds.supabase_post(
            "dubbing_jobs",
            {
                "id": job_id,
                "user_id": user_id,
                "status": "pending",
                "progress": job_progress_msg,
                "input_type": input_type,
                "input_label": input_label,
                "source_language": source_language,
                "target_language": target_language,
                "translation_provider": translation_provider,
                "voice_mode": voice_mode,
                "accent": accent,
                "created_at": datetime.now(UTC).isoformat(),
            },
            return_rows=False,
        )
    except Exception as exc:
        logger.warning("Failed to persist dubbing_jobs row for %s: %s", job_id, exc)

    if ext:
        enqueue_pipeline_job(
            job_id,
            {
                "input_video_path": str(input_video_path) if input_video_path else None,
                "video_url": video_url,
                "input_label": input_label,
                "input_type": input_type,
                "user_id": user_id,
                "source_language": source_language,
                "target_language": target_language,
                "translation_provider": translation_provider,
                "voice_mode": voice_mode,
                "accent": accent,
                "voice_match_mode": voice_match_mode,
            },
        )
    else:
        from backend.services.dub_pipeline import run_dubbing_pipeline

        background_tasks.add_task(
            run_dubbing_pipeline,
            job_id,
            input_video_path,
            video_url,
            input_label,
            input_type,
            user_id,
            source_language,
            target_language,
            translation_provider,
            voice_mode,
            accent,
            voice_match_mode,
        )
    return DubStartResponse(job_id=job_id)


@router.get("/dub/status/{job_id}", response_model=DubStatusResponse)
async def dub_status(job_id: str) -> DubStatusResponse:
    job = get_job(job_id)
    if not job:
        return DubStatusResponse(
            status="failed",
            progress="Job unavailable",
            output=None,
            error="Job not found or expired. The backend may have restarted.",
            segments=[],
        )
    return DubStatusResponse(
        status=job["status"],
        progress=job["progress"],
        output=job["output"],
        error=job["error"],
        segments=job.get("segments"),
    )


@router.get("/dub/progress/{job_id}")
async def dub_progress(job_id: str) -> StreamingResponse:
    async def event_stream():
        last_snapshot = ""
        while True:
            job = get_job(job_id)
            if not job:
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "event": "failed",
                            "error": "Job not found or expired. Backend may have restarted.",
                        }
                    )
                    + "\n\n"
                )
                break

            snapshot = f"{job['status']}::{job['progress']}::{job['output']}::{job['error']}"
            if snapshot != last_snapshot:
                if job["status"] == "completed":
                    yield (
                        "data: "
                        + json.dumps(
                            {
                                "event": "completed",
                                "output": job["output"],
                                "segments": job.get("segments") or [],
                            }
                        )
                        + "\n\n"
                    )
                    break
                if job["status"] == "failed":
                    yield (
                        "data: "
                        + json.dumps(
                            {
                                "event": "failed",
                                "error": job.get("error") or "Unknown error",
                            }
                        )
                        + "\n\n"
                    )
                    break
                yield (
                    "data: "
                    + json.dumps({"event": "progress", "message": job["progress"]})
                    + "\n\n"
                )
                last_snapshot = snapshot

            await asyncio.sleep(1.0)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/dub/history/me", response_model=list[DubHistoryItem])
async def dub_history_me(request: Request) -> list[DubHistoryItem]:
    user_id = _resolve_optional_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        rows = ds.supabase_get(
            "dubbing_jobs",
            {
                "select": (
                    "id,status,progress,error_message,source_language,target_language,"
                    "input_type,input_label,output_path,created_at,completed_at"
                ),
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": "50",
            },
        )
        return [DubHistoryItem(**row) for row in rows]
    except RuntimeError as exc:
        logger.error("Failed to fetch dubbing history for user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to fetch dubbing history.") from exc


@router.get("/dub/analytics/me", response_model=DubAnalyticsResponse)
async def dub_analytics_me(request: Request) -> DubAnalyticsResponse:
    user_id = _resolve_optional_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        jobs = ds.supabase_get(
            "dubbing_jobs",
            {
                "select": "id,status,created_at,completed_at,target_language",
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": "500",
            },
        )
        job_ids = [str(row.get("id")) for row in jobs if row.get("id")]
        segments: list[dict] = []
        if job_ids:
            quoted = ",".join(job_ids)
            segments = ds.supabase_get(
                "dubbing_segments",
                {
                    "select": "job_id,translated_text,start_sec,end_sec",
                    "job_id": f"in.({quoted})",
                    "limit": "50000",
                },
            )

        total_jobs = len(jobs)
        completed_jobs = [row for row in jobs if str(row.get("status")) == "completed"]
        translations = len(completed_jobs)

        # Hours saved: sum segment spans from all stored segments.
        total_sec = 0.0
        total_words = 0
        for seg in segments:
            start = float(seg.get("start_sec") or 0.0)
            end = float(seg.get("end_sec") or start)
            total_sec += max(end - start, 0.0)
            text = str(seg.get("translated_text") or "").strip()
            if text:
                total_words += len([w for w in text.split() if w])
        hours_saved = round(total_sec / 3600.0, 2)

        # Avg response time from created_at -> completed_at for completed jobs.
        durations: list[float] = []
        for row in completed_jobs:
            created = _parse_iso_dt(row.get("created_at"))
            completed = _parse_iso_dt(row.get("completed_at"))
            if created and completed:
                durations.append(max((completed - created).total_seconds(), 0.0))
        avg_response_time_sec = round(sum(durations) / len(durations), 2) if durations else 0.0

        # Peak hour by created_at hour.
        hour_counter: Counter[int] = Counter()
        for row in jobs:
            created = _parse_iso_dt(row.get("created_at"))
            if created:
                hour_counter[created.astimezone(UTC).hour] += 1
        if hour_counter:
            peak_hour_num = hour_counter.most_common(1)[0][0]
            peak_hour = f"{peak_hour_num:02d}:00 UTC"
        else:
            peak_hour = "-"

        # Weekly breakdown (Mon..Sun) from last 7 days.
        now = datetime.now(UTC)
        week_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekly_counts = {label: 0 for label in week_labels}
        for row in jobs:
            created = _parse_iso_dt(row.get("created_at"))
            if not created:
                continue
            created_utc = created.astimezone(UTC)
            if (now - created_utc).days <= 6:
                weekly_counts[week_labels[created_utc.weekday()]] += 1
        weekly_breakdown = [{"day": day, "count": weekly_counts[day]} for day in week_labels]

        # Languages used pie data by target_language.
        lang_counter: Counter[str] = Counter()
        for row in jobs:
            lang = str(row.get("target_language") or "unknown").upper()
            lang_counter[lang] += 1
        languages_used = [{"language": k, "count": v} for k, v in lang_counter.items()]

        # Monthly usage trend for last 6 months.
        monthly_counter: Counter[str] = Counter()
        for row in jobs:
            created = _parse_iso_dt(row.get("created_at"))
            if created:
                key = created.astimezone(UTC).strftime("%Y-%m")
                monthly_counter[key] += 1
        months: list[str] = []
        cursor = datetime(now.year, now.month, 1, tzinfo=UTC)
        for _ in range(5, -1, -1):
            y = cursor.year
            m = cursor.month - _
            while m <= 0:
                y -= 1
                m += 12
            months.append(f"{y:04d}-{m:02d}")
        monthly_usage_trend = [
            {"month": key, "count": monthly_counter.get(key, 0)}
            for key in months
        ]

        return DubAnalyticsResponse(
            translations=translations,
            voice_sessions=total_jobs,
            hours_saved=hours_saved,
            avg_response_time_sec=avg_response_time_sec,
            peak_hour=peak_hour,
            total_words=total_words,
            weekly_breakdown=weekly_breakdown,
            languages_used=languages_used,
            monthly_usage_trend=monthly_usage_trend,
        )
    except RuntimeError as exc:
        logger.error("Failed to fetch dubbing analytics for user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to fetch dubbing analytics.") from exc
