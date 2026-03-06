from pathlib import Path
from uuid import uuid4

import requests

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def unique_name(suffix: str) -> str:
    return f"{uuid4().hex}{suffix}"


def save_video_from_url(video_url: str) -> Path:
    output_path = UPLOAD_DIR / unique_name(".mp4")
    with requests.get(video_url, stream=True, timeout=120) as response:
        response.raise_for_status()
        content_type = (response.headers.get("content-type") or "").lower()
        if "video" not in content_type and "octet-stream" not in content_type:
            raise ValueError(
                "URL does not point to a direct video file. Please upload a video file "
                "or provide a direct media URL."
            )
        with open(output_path, "wb") as file_obj:
            for chunk in response.iter_content(chunk_size=1024 * 64):
                if chunk:
                    file_obj.write(chunk)
    return output_path
