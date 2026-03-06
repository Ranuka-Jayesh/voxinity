from threading import Lock
from uuid import uuid4
import json
import os
from pathlib import Path
import logging

jobs: dict[str, dict] = {}
_jobs_lock = Lock()
_jobs_file = Path(__file__).resolve().parent.parent / "outputs" / "jobs.json"
_job_artifacts_root = _jobs_file.parent / "jobs"
_logger = logging.getLogger("job_manager")


def _load_jobs() -> dict[str, dict]:
    if not _jobs_file.exists():
        return {}
    try:
        data = json.loads(_jobs_file.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_jobs() -> None:
    _jobs_file.parent.mkdir(parents=True, exist_ok=True)
    _jobs_file.write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")


def _job_dir(job_id: str) -> Path:
    return _job_artifacts_root / job_id


def _write_job_meta(job_id: str) -> None:
    job = jobs.get(job_id)
    if job is None:
        return
    payload = {
        "job_id": job_id,
        "status": job.get("status"),
        "progress": job.get("progress"),
        "output": job.get("output"),
        "error": job.get("error"),
    }
    directory = _job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "meta.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _write_transcripts(job_id: str, segments: list[dict]) -> None:
    directory = _job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    transcript_json = {
        "job_id": job_id,
        "segment_count": len(segments),
        "segments": segments,
    }
    (directory / "transcript.json").write_text(
        json.dumps(transcript_json, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    lines: list[str] = []
    for idx, segment in enumerate(segments, start=1):
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        source_text = (segment.get("text") or "").strip()
        translated_text = (segment.get("translated_text") or "").strip()
        line = f"[{idx:03d}] {start:.2f}s -> {end:.2f}s | src: {source_text}"
        if translated_text:
            line += f" | tgt: {translated_text}"
        lines.append(line)
    (directory / "transcript.txt").write_text("\n".join(lines), encoding="utf-8")


jobs.update(_load_jobs())


def sync_jobs_from_disk() -> None:
    """Merge jobs.json from disk (API / other processes append jobs after worker import)."""
    with _jobs_lock:
        jobs.update(_load_jobs())


def create_job() -> str:
    job_id = uuid4().hex
    with _jobs_lock:
        jobs[job_id] = {
            "status": "pending",
            "progress": "Queued...",
            "output": None,
            "error": None,
            "segments": [],
        }
        _save_jobs()
        _write_job_meta(job_id)
    return job_id


def update_progress(job_id: str, message: str) -> None:
    with _jobs_lock:
        if job_id in jobs:
            jobs[job_id]["status"] = "processing"
            jobs[job_id]["progress"] = message
            _save_jobs()
            _write_job_meta(job_id)


def complete_job(job_id: str, output_path: str, segments: list[dict] | None = None) -> None:
    with _jobs_lock:
        if job_id in jobs:
            segment_rows = segments or []
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = "Completed"
            jobs[job_id]["output"] = output_path
            jobs[job_id]["error"] = None
            jobs[job_id]["segments"] = segment_rows
            _save_jobs()
            _write_job_meta(job_id)
            try:
                _write_transcripts(job_id, segment_rows)
            except Exception as exc:
                _logger.warning("Failed to write transcript artifacts for job %s: %s", job_id, exc)


def fail_job(job_id: str, error_message: str) -> None:
    with _jobs_lock:
        if job_id in jobs:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["progress"] = "Failed"
            jobs[job_id]["error"] = error_message
            _save_jobs()
            _write_job_meta(job_id)


def get_job(job_id: str) -> dict | None:
    """Always merge jobs.json first so the API sees updates from the ML worker process."""
    with _jobs_lock:
        jobs.update(_load_jobs())
        job = jobs.get(job_id)
        return dict(job) if job else None


def _queue_payload_path(job_id: str) -> Path:
    return _job_dir(job_id) / "queue.json"


def enqueue_pipeline_job(job_id: str, payload: dict) -> None:
    """Mark job as queued for the external ML worker and write queue.json."""
    directory = _job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    _queue_payload_path(job_id).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with _jobs_lock:
        if job_id in jobs:
            jobs[job_id]["status"] = "queued"
            jobs[job_id]["progress"] = "Waiting for ML worker..."
            jobs[job_id]["error"] = None
            _save_jobs()
            _write_job_meta(job_id)


def queued_pipeline_job_ids() -> list[str]:
    """FIFO by queue.json mtimes."""
    root = _job_artifacts_root
    if not root.is_dir():
        return []
    entries: list[tuple[float, str]] = []
    for child in root.iterdir():
        if child.is_dir() and (_queue_payload_path(child.name)).is_file():
            try:
                mtime = (_queue_payload_path(child.name)).stat().st_mtime
            except OSError:
                continue
            entries.append((mtime, child.name))
    entries.sort(key=lambda pair: pair[0])
    return [job_id for _, job_id in entries]


def claim_next_pipeline_job_payload() -> tuple[str, dict] | None:
    """
    Pop the oldest queued dub job for the ML worker process.
    Returns None if none available or metadata is inconsistent.
    """
    sync_jobs_from_disk()
    for job_id in queued_pipeline_job_ids():
        payload_path = _queue_payload_path(job_id)
        lock_path = payload_path.with_suffix(".lock")
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
        except FileExistsError:
            continue
        try:
            with _jobs_lock:
                if job_id not in jobs and payload_path.is_file():
                    jobs[job_id] = {
                        "status": "queued",
                        "progress": "Waiting for ML worker...",
                        "output": None,
                        "error": None,
                        "segments": [],
                    }
                    _save_jobs()
                job = jobs.get(job_id)
                if not job or job.get("status") != "queued":
                    continue
                if not payload_path.is_file():
                    continue
                try:
                    raw = json.loads(payload_path.read_text(encoding="utf-8"))
                except Exception:
                    continue
                if not isinstance(raw, dict):
                    continue
                payload_path.unlink(missing_ok=True)
                jobs[job_id]["status"] = "processing"
                jobs[job_id]["progress"] = "Starting ML pipeline..."
                _save_jobs()
                _write_job_meta(job_id)
            return job_id, raw
        finally:
            lock_path.unlink(missing_ok=True)
    return None
