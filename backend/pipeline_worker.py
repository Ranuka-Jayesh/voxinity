"""Run this process next to `npm run backend:api` when the API uses external pipeline mode."""

from __future__ import annotations

import os
import sys
import time


def main() -> None:
    from pathlib import Path

    from backend.load_env import load_env

    load_env()

    from backend.services.dub_pipeline import run_dubbing_pipeline
    from backend.utils.ffmpeg_tooling import configure_pydub_and_path, ensure_ffmpeg_bin_on_path
    from backend.utils.job_manager import claim_next_pipeline_job_payload

    ensure_ffmpeg_bin_on_path()
    try:
        configure_pydub_and_path()
    except RuntimeError as exc:
        print("FFmpeg warning:", exc, file=sys.stderr)

    poll = float(os.environ.get("VOX_PIPELINE_POLL_SEC", "2"))
    print(
        f"Voxinity ML pipeline worker (poll {poll:g}s). "
        "Run the API with `npm run backend:api` (backend.main_api), not backend.main alone. "
        "Ctrl+C to stop.",
        flush=True,
    )

    while True:
        claimed = claim_next_pipeline_job_payload()
        if claimed:
            job_id, raw = claimed
            iv = raw.get("input_video_path")
            path_obj = Path(iv) if isinstance(iv, str) and iv.strip() else None
            vu = raw.get("video_url")
            video_url = str(vu).strip() if vu else None
            run_dubbing_pipeline(
                job_id,
                path_obj,
                video_url,
                raw.get("input_label"),
                raw.get("input_type"),
                raw.get("user_id"),
                str(raw.get("source_language") or "auto"),
                str(raw.get("target_language") or "en"),
                str(raw.get("translation_provider") or "nllb"),
                str(raw.get("voice_mode") or "standard"),
                str(raw.get("accent") or "neutral"),
                str(raw.get("voice_match_mode") or "auto"),
            )
            continue
        time.sleep(poll)


if __name__ == "__main__":
    main()
