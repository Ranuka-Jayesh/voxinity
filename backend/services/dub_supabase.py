"""Shared REST helpers for dubbing_jobs / dubbing_segments (no RPC)."""

from __future__ import annotations

import hashlib
import os
from datetime import UTC, datetime

import requests


def is_configured() -> bool:
    """True when REST calls to Supabase can be made (env present)."""
    raw = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    ).strip()
    return bool(raw and key)


def supabase_rest_base() -> str:
    raw = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    if not raw:
        raise RuntimeError("SUPABASE_URL is not configured.")
    if raw.endswith("/rest/v1"):
        return raw
    return f"{raw}/rest/v1"


def supabase_key() -> str:
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    ).strip()
    if not key:
        raise RuntimeError("SUPABASE key is not configured.")
    return key


def supabase_headers(*, prefer: str | None = None) -> dict[str, str]:
    key = supabase_key()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def supabase_get(path: str, params: dict[str, str]) -> list[dict]:
    response = requests.get(
        f"{supabase_rest_base()}/{path}",
        headers=supabase_headers(),
        params=params,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase GET failed: {response.status_code} {response.text}")
    payload = response.json()
    return payload if isinstance(payload, list) else []


def supabase_post(path: str, payload: dict | list[dict], *, return_rows: bool = False) -> list[dict]:
    response = requests.post(
        f"{supabase_rest_base()}/{path}",
        headers=supabase_headers(prefer="return=representation" if return_rows else None),
        json=payload,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase POST failed: {response.status_code} {response.text}")
    if not return_rows:
        return []
    decoded = response.json()
    return decoded if isinstance(decoded, list) else []


def supabase_patch(path: str, payload: dict, params: dict[str, str]) -> None:
    response = requests.patch(
        f"{supabase_rest_base()}/{path}",
        headers=supabase_headers(),
        params=params,
        json=payload,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase PATCH failed: {response.status_code} {response.text}")


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def resolve_optional_user_id_from_cookie(vox_session: str | None) -> str | None:
    if not vox_session:
        return None
    now_iso = datetime.now(UTC).isoformat()
    rows = supabase_get(
        "user_sessions",
        {
            "select": "user_id",
            "token_hash": f"eq.{token_hash(vox_session)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{now_iso}",
            "limit": "1",
        },
    )
    if not rows:
        return None
    return str(rows[0].get("user_id") or "") or None
