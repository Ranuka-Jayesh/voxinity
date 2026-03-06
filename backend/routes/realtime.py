import hashlib
import os
from datetime import UTC, datetime

import requests
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.realtime_hub import hub

router = APIRouter()


def _supabase_rest_base() -> str:
    raw = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    if not raw:
        raise RuntimeError("SUPABASE_URL is not configured.")
    if raw.endswith("/rest/v1"):
        return raw
    return f"{raw}/rest/v1"


def _supabase_key() -> str:
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    ).strip()
    if not key:
        raise RuntimeError("Supabase key is not configured.")
    return key


def _supabase_headers() -> dict[str, str]:
    key = _supabase_key()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _supabase_get(path: str, params: dict[str, str]) -> list[dict]:
    response = requests.get(
        f"{_supabase_rest_base()}/{path}",
        headers=_supabase_headers(),
        params=params,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase GET failed: {response.status_code} {response.text}")
    payload = response.json()
    return payload if isinstance(payload, list) else []


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _resolve_user_id_from_cookie(token: str) -> str | None:
    rows = _supabase_get(
        "user_sessions",
        {
            "select": "user_id",
            "token_hash": f"eq.{_token_hash(token)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{datetime.now(UTC).isoformat()}",
            "limit": "1",
        },
    )
    if not rows:
        return None
    return str(rows[0].get("user_id") or "") or None


@router.websocket("/ws/user")
async def user_realtime_socket(websocket: WebSocket) -> None:
    token = websocket.cookies.get("vox_session")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user_id = _resolve_user_id_from_cookie(token)
    except Exception:
        await websocket.close(code=1011)
        return
    if not user_id:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    await hub.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(user_id, websocket)
    except Exception:
        await hub.disconnect(user_id, websocket)
        await websocket.close()
