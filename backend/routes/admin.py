import base64
import csv
import hashlib
import hmac
import io
import json
import os
import secrets
from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any

import requests
from fastapi import APIRouter, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from starlette.responses import StreamingResponse

from backend.services.realtime_hub import hub
from backend.utils.logger import get_logger

router = APIRouter()
logger = get_logger("admin_route")


class AdminUserItem(BaseModel):
    id: str
    name: str
    email: str
    plan: str
    status: str
    joined: str
    translations: int
    preferred_language: str


class AdminUsersResponse(BaseModel):
    users: list[AdminUserItem]


class AdminLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class AdminSendNotificationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=2000)
    audience: str = Field(default="all")


class AdminContentItem(BaseModel):
    id: str
    user: str
    source: str
    target: str
    words: int
    status: str
    flagged: bool
    created: str
    preview: str
    output_path: str | None = None


class AdminContentSummary(BaseModel):
    total_jobs: int
    processing: int
    flagged: int
    failed: int


class AdminContentResponse(BaseModel):
    summary: AdminContentSummary
    items: list[AdminContentItem]


class PlatformDailyJobs(BaseModel):
    date: str
    created: int
    completed: int


class PlatformHourlyJobs(BaseModel):
    hour: str
    count: int


class PlatformFailureDaily(BaseModel):
    day: str
    rate_pct: float


class PlatformLanguageShare(BaseModel):
    language: str
    count: int
    pct: float


class PlatformAnalyticsResponse(BaseModel):
    total_jobs: int
    avg_completion_sec: float
    success_rate_pct: float
    active_users_30d: int
    hours_dubbed_saved: float
    peak_hour_utc: str
    jobs_last_7_days: list[PlatformDailyJobs]
    jobs_by_hour_utc: list[PlatformHourlyJobs]
    failure_rate_last_7_days: list[PlatformFailureDaily]
    target_language_share: list[PlatformLanguageShare]


class AdminNotificationHistoryItem(BaseModel):
    id: int
    title: str
    body: str
    audience: str
    status: str
    recipients: int
    sent_at: str | None = None
    created_at: str | None = None


class AdminNotificationHistoryResponse(BaseModel):
    items: list[AdminNotificationHistoryItem]


class AdminNotificationStatsResponse(BaseModel):
    total_sent: int
    avg_open_rate: float
    click_through_rate: float


class AdminOverviewDailyJobs(BaseModel):
    day: str
    count: int


class AdminOverviewMonthRev(BaseModel):
    month: str
    revenue: float


class AdminOverviewSignup(BaseModel):
    name: str
    email: str
    plan: str
    joined: str
    status: str


class AdminOverviewAlert(BaseModel):
    level: str
    text: str
    time: str


class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    mrr_usd: float
    paying_users: int
    dub_jobs_today: int
    dub_jobs_created_7d: int
    dub_completed_7d: int
    dub_failed_7d: int
    dub_failed_24h: int
    jobs_by_day_7d: list[AdminOverviewDailyJobs]
    revenue_last_6_months: list[AdminOverviewMonthRev]
    recent_signups: list[AdminOverviewSignup]
    alerts: list[AdminOverviewAlert]


class AdminSubscriptionItem(BaseModel):
    subscription_id: str
    id: str
    user: str
    email: str
    plan: str
    amount: str
    status: str
    renewal: str
    since: str


class AdminSubscriptionsSummary(BaseModel):
    mrr: float
    arr: float
    paying_users: int
    arpu: float


class AdminSubscriptionsResponse(BaseModel):
    summary: AdminSubscriptionsSummary
    mrr_data: list[dict[str, Any]]
    plan_distribution: list[dict[str, Any]]
    items: list[AdminSubscriptionItem]


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


def _supabase_headers(*, prefer: str | None = None) -> dict[str, str]:
    key = _supabase_key()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _supabase_get(path: str, params: dict[str, str]) -> list[dict[str, Any]]:
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


def _supabase_post(
    path: str,
    payload: dict[str, Any] | list[dict[str, Any]],
    *,
    return_rows: bool = False,
) -> list[dict[str, Any]]:
    response = requests.post(
        f"{_supabase_rest_base()}/{path}",
        headers=_supabase_headers(prefer="return=representation" if return_rows else None),
        json=payload,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase POST failed: {response.status_code} {response.text}")
    if not return_rows:
        return []
    decoded = response.json()
    return decoded if isinstance(decoded, list) else []


def _supabase_patch(path: str, payload: dict[str, Any], params: dict[str, str]) -> None:
    response = requests.patch(
        f"{_supabase_rest_base()}/{path}",
        headers=_supabase_headers(),
        params=params,
        json=payload,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase PATCH failed: {response.status_code} {response.text}")


def _supabase_delete(path: str, params: dict[str, str]) -> None:
    response = requests.delete(
        f"{_supabase_rest_base()}/{path}",
        headers=_supabase_headers(),
        params=params,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Supabase DELETE failed: {response.status_code} {response.text}")


def _parse_iso_dt_admin(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(UTC)
    except Exception:
        return None


def _dub_row_failed(row: dict[str, Any]) -> bool:
    """Terminal failure: Supabase status and/or progress ('Failed' from pipeline)."""
    if str(row.get("status") or "").strip().lower() == "failed":
        return True
    return str(row.get("progress") or "").strip().lower() == "failed"


def _dub_row_completed(row: dict[str, Any]) -> bool:
    if str(row.get("status") or "").strip().lower() == "completed":
        return True
    return str(row.get("progress") or "").strip().lower() == "completed"


def _dub_row_terminal_outcome(row: dict[str, Any]) -> bool:
    """Job reached completed or failed (excludes pending/processing)."""
    return _dub_row_failed(row) or _dub_row_completed(row)


def _supabase_total_rows(table: str, *, extra_params: dict[str, str] | None = None) -> int | None:
    """Uses PostgREST Prefer: count=exact + Range: 0-0."""
    params: dict[str, str] = {"select": "id"}
    if extra_params:
        params.update(extra_params)
    headers = {**_supabase_headers(), "Prefer": "count=exact", "Range": "0-0"}
    response = requests.get(
        f"{_supabase_rest_base()}/{table}",
        headers=headers,
        params=params,
        timeout=30,
    )
    if response.status_code >= 400:
        return None
    cr = (response.headers.get("Content-Range") or "").strip()
    if "/" not in cr:
        return None
    tail = cr.split("/")[-1].strip()
    if tail.isdigit():
        return int(tail)
    return None


def _safe_iso_to_readable(value: str | None) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "-"
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(UTC)
        return dt.strftime("%b %d, %Y")
    except Exception:
        return raw


def _is_missing_table_error(exc: RuntimeError, table_name: str) -> bool:
    text = str(exc).lower()
    return "could not find the table" in text and table_name.lower() in text


def _extract_missing_table_name(exc: RuntimeError) -> str | None:
    text = str(exc)
    marker = "Could not find the table 'public."
    idx = text.find(marker)
    if idx == -1:
        return None
    start = idx + len(marker)
    end = text.find("'", start)
    if end == -1:
        return None
    name = text[start:end].strip()
    return name or None


def _normalize_plan_name(value: str | None) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"hobby", "pro", "business"}:
        return normalized
    return "hobby"


def _to_month_label(raw_iso: str | None) -> str:
    if not raw_iso:
        return "-"
    try:
        dt = datetime.fromisoformat(str(raw_iso).replace("Z", "+00:00")).astimezone(UTC)
        return dt.strftime("%b")
    except Exception:
        return "-"


def _build_subscription_receipt_pdf(
    subscription: dict[str, Any],
    user: dict[str, Any],
    invoice: dict[str, Any] | None,
) -> bytes:
    now = datetime.now(UTC)
    receipt_id = f"RCPT-{now.strftime('%Y%m%d')}-{str(subscription.get('id') or '')[:8].upper()}"
    full_name = str(user.get("full_name") or "").strip() or "Voxinity User"
    email = str(user.get("email") or "").strip() or "-"
    plan = _normalize_plan_name(str(subscription.get("plan_code") or "")).capitalize()
    interval = str(subscription.get("billing_interval") or "month")
    amount = float(subscription.get("price_usd") or 0.0)
    status = str(subscription.get("status") or "active").replace("_", " ").capitalize()
    period_start = _safe_iso_to_readable(str(subscription.get("current_period_start") or ""))
    period_end = _safe_iso_to_readable(str(subscription.get("current_period_end") or ""))
    invoice_number = str(invoice.get("invoice_number") or "-") if invoice else "-"
    paid_at = _safe_iso_to_readable(str((invoice or {}).get("paid_at") or now.isoformat()))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Voxinity Receipt {receipt_id}",
        author="Voxinity",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReceiptTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )
    h2_style = ParagraphStyle(
        "ReceiptH2",
        parent=styles["Heading2"],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "ReceiptBody",
        parent=styles["BodyText"],
        fontSize=10,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
    )
    meta_style = ParagraphStyle(
        "ReceiptMeta",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
    )

    story: list[Any] = []
    story.append(Paragraph("VOXINITY", ParagraphStyle("Brand", parent=title_style, fontSize=14, textColor=colors.HexColor("#16a34a"))))
    story.append(Paragraph("Payment Receipt", title_style))
    story.append(Paragraph("Official proof of subscription payment", meta_style))
    story.append(Spacer(1, 10))

    top_meta = Table(
        [
            ["Receipt No.", receipt_id, "Invoice No.", invoice_number],
            ["Issued On", now.strftime("%Y-%m-%d %H:%M UTC"), "Paid On", paid_at],
        ],
        colWidths=[30 * mm, 58 * mm, 28 * mm, 52 * mm],
    )
    top_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(top_meta)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Billed To", h2_style))
    billed_to = Table(
        [
            ["Name", full_name],
            ["Email", email],
            ["Customer ID", str(user.get("id") or "-")],
        ],
        colWidths=[32 * mm, 136 * mm],
    )
    billed_to.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(billed_to)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Subscription Details", h2_style))
    item_rows = [
        ["Description", "Billing", "Status", "Amount"],
        [f"{plan} Plan", interval.capitalize(), status, f"${amount:,.2f}"],
    ]
    item_table = Table(item_rows, colWidths=[76 * mm, 30 * mm, 30 * mm, 32 * mm])
    item_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ALIGN", (3, 1), (3, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(item_table)
    story.append(Spacer(1, 8))

    totals = Table(
        [
            ["Subtotal", f"${amount:,.2f}"],
            ["Tax", "$0.00"],
            ["Total Paid", f"${amount:,.2f}"],
        ],
        colWidths=[110 * mm, 58 * mm],
    )
    totals.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LINEABOVE", (0, 2), (-1, 2), 0.8, colors.HexColor("#94a3b8")),
                ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(totals)
    story.append(Spacer(1, 10))

    story.append(Paragraph(f"Billing period: {period_start} to {period_end}", body_style))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "This is a system-generated receipt and does not require a signature.",
            meta_style,
        )
    )
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _pbkdf2_verify(password: str, encoded_hash: str) -> bool:
    try:
        scheme, iter_s, salt_b64, digest_b64 = encoded_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iter_s)
        salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_b64.encode("ascii"))
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False


def _create_admin_session(admin_id: str, *, hours: int = 72) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(hours=hours)
    _supabase_post(
        "admin_sessions",
        {
            "admin_id": admin_id,
            "token_hash": _token_hash(token),
            "expires_at": expires_at.isoformat(),
        },
        return_rows=False,
    )
    return token, expires_at


def _resolve_admin_from_request(request: Request) -> dict[str, Any]:
    token = request.cookies.get("vox_admin_session")
    if not token:
        raise HTTPException(status_code=401, detail="Admin session required.")
    now_iso = datetime.now(UTC).isoformat()
    rows = _supabase_get(
        "admin_sessions",
        {
            "select": "admin_id",
            "token_hash": f"eq.{_token_hash(token)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{now_iso}",
            "limit": "1",
        },
    )
    if not rows:
        raise HTTPException(status_code=401, detail="Admin session expired.")
    admin_id = str(rows[0].get("admin_id") or "")
    if not admin_id:
        raise HTTPException(status_code=401, detail="Admin session invalid.")
    admin_rows = _supabase_get(
        "admin_users",
        {
            "select": "id,email,full_name,role,is_active",
            "id": f"eq.{admin_id}",
            "limit": "1",
        },
    )
    if not admin_rows:
        raise HTTPException(status_code=401, detail="Admin unavailable.")
    admin = admin_rows[0]
    if not bool(admin.get("is_active", True)):
        raise HTTPException(status_code=403, detail="Admin account is inactive.")
    return admin


def _ensure_admin_session(request: Request) -> dict[str, Any]:
    return _resolve_admin_from_request(request)


@router.post("/admin/login")
async def admin_login(payload: AdminLoginRequest, response: Response) -> dict[str, Any]:
    try:
        email = payload.email.strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Email is required.")
        rows = _supabase_get(
            "admin_users",
            {
                "select": "id,email,full_name,password_hash,role,is_active",
                "email": f"eq.{email}",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=401, detail="Invalid admin credentials.")
        admin = rows[0]
        if not bool(admin.get("is_active", True)):
            raise HTTPException(status_code=403, detail="Admin account is inactive.")
        if not _pbkdf2_verify(payload.password, str(admin.get("password_hash") or "")):
            raise HTTPException(status_code=401, detail="Invalid admin credentials.")

        token, expires_at = _create_admin_session(str(admin.get("id")))
        secure_cookie = (os.environ.get("AUTH_COOKIE_SECURE", "").lower() in {"1", "true", "yes"})
        response.set_cookie(
            key="vox_admin_session",
            value=token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            expires=int(expires_at.timestamp()),
            path="/",
        )
        return {
            "ok": True,
            "admin": {
                "id": admin.get("id"),
                "email": admin.get("email"),
                "full_name": admin.get("full_name"),
                "role": admin.get("role"),
            },
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Admin login failed: %s", exc)
        raise HTTPException(status_code=500, detail="Admin login failed.") from exc


@router.post("/admin/logout")
async def admin_logout(request: Request, response: Response) -> dict[str, bool]:
    token = request.cookies.get("vox_admin_session")
    try:
        if token:
            _supabase_patch(
                "admin_sessions",
                {"revoked_at": datetime.now(UTC).isoformat()},
                {"token_hash": f"eq.{_token_hash(token)}"},
            )
    except RuntimeError:
        pass
    response.delete_cookie("vox_admin_session", path="/")
    return {"ok": True}


@router.get("/admin/me")
async def admin_me(request: Request) -> dict[str, Any]:
    try:
        admin = _resolve_admin_from_request(request)
        return {
            "ok": True,
            "admin": {
                "id": admin.get("id"),
                "email": admin.get("email"),
                "full_name": admin.get("full_name"),
                "role": admin.get("role"),
            },
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Admin me failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to resolve admin session.") from exc


@router.get("/admin/users", response_model=AdminUsersResponse)
async def admin_list_users(
    request: Request,
    search: str = Query(default=""),
    plan: str = Query(default="All"),
    status: str = Query(default="All"),
    limit: int = Query(default=200, ge=1, le=1000),
) -> AdminUsersResponse:
    _ensure_admin_session(request)
    try:
        rows = _supabase_get(
            "users",
            {
                "select": "id,email,full_name,is_active,plan_name,created_at,preferred_language",
                "order": "created_at.desc",
                "limit": str(limit),
            },
        )
        job_rows = _supabase_get(
            "dubbing_jobs",
            {"select": "user_id", "status": "eq.completed", "limit": "50000"},
        )
        translations_by_user: dict[str, int] = {}
        for job in job_rows:
            uid = str(job.get("user_id") or "")
            if not uid:
                continue
            translations_by_user[uid] = translations_by_user.get(uid, 0) + 1

        search_l = search.strip().lower()
        plan_l = plan.strip().lower()
        status_l = status.strip().lower()

        users: list[AdminUserItem] = []
        for row in rows:
            uid = str(row.get("id") or "")
            if not uid:
                continue
            email = str(row.get("email") or "")
            name = str(row.get("full_name") or "").strip() or email.split("@")[0] or "User"
            user_plan = str(row.get("plan_name") or "").strip() or "Hobby"
            user_status = "active" if bool(row.get("is_active", True)) else "inactive"
            preferred_language = str(row.get("preferred_language") or "").strip() or "-"
            created_at = str(row.get("created_at") or "").strip()
            try:
                joined = (
                    datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    .astimezone(UTC)
                    .strftime("%b %d, %Y")
                )
            except Exception:
                joined = "-"

            if search_l and search_l not in name.lower() and search_l not in email.lower():
                continue
            if plan_l != "all" and user_plan.lower() != plan_l:
                continue
            if status_l != "all" and user_status.lower() != status_l:
                continue

            users.append(
                AdminUserItem(
                    id=uid,
                    name=name,
                    email=email,
                    plan=user_plan,
                    status=user_status,
                    joined=joined,
                    translations=translations_by_user.get(uid, 0),
                    preferred_language=preferred_language,
                )
            )
        return AdminUsersResponse(users=users)
    except RuntimeError as exc:
        logger.error("Admin users fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch users.") from exc


@router.post("/admin/users/{user_id}/activate")
async def admin_activate_user(user_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        _supabase_patch(
            "users",
            {"is_active": True, "updated_at": datetime.now(UTC).isoformat()},
            {"id": f"eq.{user_id}"},
        )
        return {"ok": True}
    except RuntimeError as exc:
        logger.error("Admin activate user failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to activate user.") from exc


@router.post("/admin/users/{user_id}/suspend")
async def admin_suspend_user(user_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        _supabase_patch(
            "users",
            {"is_active": False, "updated_at": datetime.now(UTC).isoformat()},
            {"id": f"eq.{user_id}"},
        )
        _supabase_delete("user_sessions", {"user_id": f"eq.{user_id}"})
        await hub.send_to_user(
            user_id,
            {
                "type": "ACCOUNT_SUSPENDED",
                "message": "Admin suspended you. Contact admin.",
            },
        )
        return {"ok": True}
    except RuntimeError as exc:
        logger.error("Admin suspend user failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to suspend user.") from exc


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        _supabase_delete("user_sessions", {"user_id": f"eq.{user_id}"})
        _supabase_delete("users", {"id": f"eq.{user_id}"})
        return {"ok": True}
    except RuntimeError as exc:
        logger.error("Admin delete user failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete user.") from exc


@router.get("/admin/analytics/platform", response_model=PlatformAnalyticsResponse)
async def admin_platform_analytics(request: Request) -> PlatformAnalyticsResponse:
    """Aggregate dubbing metrics from Supabase (no web-traffic / geo — those require analytics tooling)."""
    _ensure_admin_session(request)
    try:
        total_jobs = _supabase_total_rows("dubbing_jobs") or 0

        win_start = datetime.now(UTC) - timedelta(days=45)
        cutoff_iso = win_start.isoformat()
        rows = _supabase_get(
            "dubbing_jobs",
            {
                "select": "id,user_id,status,progress,created_at,completed_at,target_language",
                "created_at": f"gte.{cutoff_iso}",
                "order": "created_at.asc",
                "limit": "15000",
            },
        )

        # Fallback total if count header unavailable
        if total_jobs <= 0 and rows:
            total_jobs = len(rows)

        now = datetime.now(UTC)

        # Last 7 calendar days (UTC): created / completed counts
        jobs_last_7_days: list[PlatformDailyJobs] = []
        for day_offset in range(6, -1, -1):
            d = (now.date() - timedelta(days=day_offset))
            day_start = datetime(d.year, d.month, d.day, tzinfo=UTC)
            next_day = day_start + timedelta(days=1)
            created_n = 0
            completed_n = 0
            for row in rows:
                c_at = _parse_iso_dt_admin(row.get("created_at"))
                if c_at and day_start <= c_at < next_day:
                    created_n += 1
                comp_at = _parse_iso_dt_admin(row.get("completed_at"))
                st = str(row.get("status") or "").lower()
                if st == "completed" and comp_at and day_start <= comp_at < next_day:
                    completed_n += 1
            jobs_last_7_days.append(
                PlatformDailyJobs(
                    date=day_start.strftime("%b %d"),
                    created=created_n,
                    completed=completed_n,
                )
            )

        # Failure rate by created_at day: failed / (completed + failed) for jobs created that day.
        # Uses progress=='Failed' when status may lag (same as local fail_job); skips pending/processing.
        failure_rate_last_7_days: list[PlatformFailureDaily] = []
        for day_offset in range(6, -1, -1):
            d = (now.date() - timedelta(days=day_offset))
            day_start = datetime(d.year, d.month, d.day, tzinfo=UTC)
            next_day = day_start + timedelta(days=1)
            fail_d = 0
            terminal_d = 0
            for row in rows:
                c_at = _parse_iso_dt_admin(row.get("created_at"))
                if not c_at or not (day_start <= c_at < next_day):
                    continue
                if not _dub_row_terminal_outcome(row):
                    continue
                terminal_d += 1
                if _dub_row_failed(row):
                    fail_d += 1
            rate = round(100.0 * fail_d / terminal_d, 1) if terminal_d else 0.0
            failure_rate_last_7_days.append(
                PlatformFailureDaily(day=day_start.strftime("%a"), rate_pct=rate)
            )

        # Jobs by hour (UTC), last 14 days of created_at
        hour_cutoff = now - timedelta(days=14)
        hour_counts = Counter[int]()
        for row in rows:
            c_at = _parse_iso_dt_admin(row.get("created_at"))
            if c_at and c_at >= hour_cutoff:
                hour_counts[c_at.hour] += 1
        jobs_by_hour_utc = [
            PlatformHourlyJobs(hour=f"{h:02d}:00", count=hour_counts.get(h, 0))
            for h in range(24)
        ]

        # Distinct users with ≥1 job in last 30 days
        cut30 = now - timedelta(days=30)
        active_users: set[str] = set()
        for row in rows:
            c_at = _parse_iso_dt_admin(row.get("created_at"))
            uid = str(row.get("user_id") or "").strip()
            if c_at and c_at >= cut30 and uid:
                active_users.add(uid)
        active_users_30d = len(active_users)

        completed_rows = [r for r in rows if _dub_row_completed(r)]
        durations: list[float] = []
        for row in completed_rows:
            c0 = _parse_iso_dt_admin(row.get("created_at"))
            c1 = _parse_iso_dt_admin(row.get("completed_at"))
            if c0 and c1:
                durations.append(max((c1 - c0).total_seconds(), 0.0))
        avg_completion_sec = round(sum(durations) / len(durations), 1) if durations else 0.0

        terminal_ok = sum(1 for r in rows if _dub_row_completed(r))
        terminal_fail = sum(1 for r in rows if _dub_row_failed(r))
        denom = terminal_ok + terminal_fail
        success_rate_pct = round(100.0 * terminal_ok / denom, 1) if denom else 0.0

        hour_counter = Counter[int]()
        for row in rows:
            c_at = _parse_iso_dt_admin(row.get("created_at"))
            if c_at:
                hour_counter[c_at.astimezone(UTC).hour] += 1
        if hour_counter:
            peak_hour_utc = f"{hour_counter.most_common(1)[0][0]:02d}:00 UTC"
        else:
            peak_hour_utc = "-"

        lang_counter: Counter[str] = Counter()
        for row in rows:
            lang = str(row.get("target_language") or "unknown").strip().upper() or "UNKNOWN"
            lang_counter[lang] += 1
        lang_total = sum(lang_counter.values()) or 1
        sorted_langs = sorted(lang_counter.items(), key=lambda pair: pair[1], reverse=True)
        top_n = sorted_langs[:10]
        target_language_share = [
            PlatformLanguageShare(
                language=k,
                count=v,
                pct=round(100.0 * v / lang_total, 1),
            )
            for k, v in top_n
        ]

        # Hours of dubbed content (segment spans) — sample recent completed jobs only
        hours_dubbed_saved = 0.0
        completed_ids = [str(r.get("id")) for r in completed_rows if r.get("id")][:400]
        if completed_ids:
            quoted = ",".join(completed_ids)
            try:
                seg_rows = _supabase_get(
                    "dubbing_segments",
                    {
                        "select": "start_sec,end_sec",
                        "job_id": f"in.({quoted})",
                        "limit": "80000",
                    },
                )
                total_sec = 0.0
                for seg in seg_rows:
                    s0 = float(seg.get("start_sec") or 0.0)
                    s1 = float(seg.get("end_sec") or s0)
                    total_sec += max(s1 - s0, 0.0)
                hours_dubbed_saved = round(total_sec / 3600.0, 2)
            except RuntimeError:
                pass

        return PlatformAnalyticsResponse(
            total_jobs=total_jobs,
            avg_completion_sec=avg_completion_sec,
            success_rate_pct=success_rate_pct,
            active_users_30d=active_users_30d,
            hours_dubbed_saved=hours_dubbed_saved,
            peak_hour_utc=peak_hour_utc,
            jobs_last_7_days=jobs_last_7_days,
            jobs_by_hour_utc=jobs_by_hour_utc,
            failure_rate_last_7_days=failure_rate_last_7_days,
            target_language_share=target_language_share,
        )
    except RuntimeError as exc:
        logger.error("Admin platform analytics failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load platform analytics.") from exc


@router.get("/admin/overview", response_model=AdminOverviewResponse)
async def admin_overview(request: Request) -> AdminOverviewResponse:
    """Single snapshot for the admin dashboard: users, subscriptions, dubbing activity, recent signups, alerts."""
    _ensure_admin_session(request)
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    cut7 = now - timedelta(days=7)
    cut24 = now - timedelta(hours=24)

    total_users = _supabase_total_rows("users") or 0
    active_users = _supabase_total_rows("users", extra_params={"is_active": "eq.true"}) or 0

    mrr_usd = 0.0
    paying_users_ct = 0
    revenue_last_6_months: list[AdminOverviewMonthRev] = []
    try:
        sub_rows = _supabase_get(
            "subscriptions",
            {
                "select": "user_id,status,price_usd,created_at",
                "order": "created_at.desc",
                "limit": "2000",
            },
        )
        active_like = [
            r for r in sub_rows if str(r.get("status") or "").strip().lower() in {"active", "trialing", "past_due"}
        ]
        mrr_usd = round(sum(float(r.get("price_usd") or 0.0) for r in active_like), 2)
        paying_users_ct = len({str(r.get("user_id") or "") for r in active_like if r.get("user_id")})
        month_keys: list[tuple[int, int]] = []
        for i in range(5, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_keys.append((dt.year, dt.month))
        month_totals = {key: 0.0 for key in month_keys}
        for row in sub_rows:
            created = str(row.get("created_at") or "")
            if not created:
                continue
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00")).astimezone(UTC)
            except Exception:
                continue
            key = (dt.year, dt.month)
            if key in month_totals:
                month_totals[key] += float(row.get("price_usd") or 0.0)
        revenue_last_6_months = [
            AdminOverviewMonthRev(
                month=datetime(year=year, month=month, day=1, tzinfo=UTC).strftime("%b"),
                revenue=round(month_totals[(year, month)], 2),
            )
            for year, month in month_keys
        ]
    except RuntimeError:
        pass

    rows: list[dict[str, Any]] = []
    try:
        rows = _supabase_get(
            "dubbing_jobs",
            {
                "select": "id,status,progress,created_at,completed_at",
                "created_at": f"gte.{cut7.isoformat()}",
                "order": "created_at.asc",
                "limit": "15000",
            },
        )
    except RuntimeError:
        rows = []

    dub_jobs_created_7d = len(rows)
    dub_jobs_today = 0
    for row in rows:
        c_at = _parse_iso_dt_admin(row.get("created_at"))
        if c_at and c_at >= today_start:
            dub_jobs_today += 1

    completion_rows: list[dict[str, Any]] = []
    try:
        completion_rows = _supabase_get(
            "dubbing_jobs",
            {
                "select": "status,progress,completed_at",
                "completed_at": f"gte.{cut7.isoformat()}",
                "limit": "8000",
            },
        )
    except RuntimeError:
        completion_rows = []
    dub_completed_7d = sum(1 for r in completion_rows if _dub_row_completed(r))
    dub_failed_7d = sum(1 for r in completion_rows if _dub_row_failed(r))

    jobs_by_day_7d: list[AdminOverviewDailyJobs] = []
    for day_offset in range(6, -1, -1):
        d = now.date() - timedelta(days=day_offset)
        day_start = datetime(d.year, d.month, d.day, tzinfo=UTC)
        next_day = day_start + timedelta(days=1)
        created_n = 0
        for row in rows:
            c_at = _parse_iso_dt_admin(row.get("created_at"))
            if c_at and day_start <= c_at < next_day:
                created_n += 1
        jobs_by_day_7d.append(AdminOverviewDailyJobs(day=day_start.strftime("%a"), count=created_n))

    dub_failed_24h = 0
    try:
        terminal_recent = _supabase_get(
            "dubbing_jobs",
            {
                "select": "status,progress,completed_at",
                "completed_at": f"gte.{cut24.isoformat()}",
                "limit": "5000",
            },
        )
        dub_failed_24h = sum(1 for r in terminal_recent if _dub_row_failed(r))
    except RuntimeError:
        dub_failed_24h = 0

    recent_signups: list[AdminOverviewSignup] = []
    try:
        user_rows = _supabase_get(
            "users",
            {
                "select": "email,full_name,plan_name,is_active,created_at",
                "order": "created_at.desc",
                "limit": "8",
            },
        )
        for row in user_rows:
            email = str(row.get("email") or "")
            name = str(row.get("full_name") or "").strip() or email.split("@")[0] or "User"
            plan = _normalize_plan_name(str(row.get("plan_name") or "")).capitalize()
            user_status = "active" if bool(row.get("is_active", True)) else "inactive"
            joined = _safe_iso_to_readable(str(row.get("created_at") or ""))
            recent_signups.append(
                AdminOverviewSignup(
                    name=name,
                    email=email,
                    plan=plan,
                    joined=joined,
                    status=user_status,
                )
            )
    except RuntimeError:
        recent_signups = []

    alerts: list[AdminOverviewAlert] = []
    if dub_failed_24h > 0:
        alerts.append(
            AdminOverviewAlert(
                level="error",
                text=f"{dub_failed_24h} dub job(s) failed in the last 24 hours (by completion time).",
                time="Last 24h",
            )
        )

    flagged_ct = _supabase_total_rows("dubbing_jobs", extra_params={"is_flagged": "eq.true"})
    if flagged_ct is not None and flagged_ct > 0:
        alerts.append(
            AdminOverviewAlert(
                level="warn",
                text=f"{flagged_ct} dub job(s) flagged for review in Content.",
                time="Now",
            )
        )

    if not alerts:
        alerts.append(
            AdminOverviewAlert(
                level="info",
                text="No failures recorded in the last 24 hours and no flagged jobs.",
                time="Last check",
            )
        )

    return AdminOverviewResponse(
        total_users=total_users,
        active_users=active_users,
        mrr_usd=mrr_usd,
        paying_users=paying_users_ct,
        dub_jobs_today=dub_jobs_today,
        dub_jobs_created_7d=dub_jobs_created_7d,
        dub_completed_7d=dub_completed_7d,
        dub_failed_7d=dub_failed_7d,
        dub_failed_24h=dub_failed_24h,
        jobs_by_day_7d=jobs_by_day_7d,
        revenue_last_6_months=revenue_last_6_months,
        recent_signups=recent_signups,
        alerts=alerts[:8],
    )


@router.get("/admin/content", response_model=AdminContentResponse)
async def admin_content(
    request: Request,
    search: str = Query(default=""),
    status: str = Query(default="all"),
    language: str = Query(default="all"),
    limit: int = Query(default=80, ge=1, le=300),
) -> AdminContentResponse:
    _ensure_admin_session(request)
    try:
        search_l = search.strip().lower()
        status_l = status.strip().lower()
        language_l = language.strip().lower()

        jobs_params = {
            "select": (
                "id,user_id,status,source_language,target_language,"
                "input_label,error_message,created_at,output_path,is_flagged"
            ),
            "order": "created_at.desc",
            "limit": str(limit),
        }
        if status_l == "completed":
            jobs_params["status"] = "eq.completed"
        elif status_l == "failed":
            jobs_params["status"] = "eq.failed"
        elif status_l == "processing":
            jobs_params["status"] = "in.(pending,processing)"

        try:
            jobs = _supabase_get("dubbing_jobs", jobs_params)
        except RuntimeError as exc:
            err_txt = str(exc).lower()
            if "is_flagged" in err_txt or (
                "column" in err_txt and "does not exist" in err_txt
            ):
                jobs_params["select"] = (
                    "id,user_id,status,source_language,target_language,"
                    "input_label,error_message,created_at,output_path"
                )
                jobs = _supabase_get("dubbing_jobs", jobs_params)
                logger.debug(
                    "dubbing_jobs moderation columns missing; list loads with no flags. "
                    "Apply backend/sql/dubbing_jobs_moderation_columns.sql when ready."
                )
            else:
                raise

        if language_l != "all":
            jobs = [
                row for row in jobs
                if language_l in {
                    str(row.get("source_language") or "").strip().lower(),
                    str(row.get("target_language") or "").strip().lower(),
                }
            ]

        # Quick search prune by job id / input label first, before heavy joins.
        if search_l:
            jobs = [
                row for row in jobs
                if search_l in str(row.get("id") or "").lower()
                or search_l in str(row.get("input_label") or "").lower()
            ]

        job_ids = [str(row.get("id") or "") for row in jobs if row.get("id")]
        user_ids = list({str(row.get("user_id") or "") for row in jobs if row.get("user_id")})

        users_by_id: dict[str, str] = {}
        if user_ids:
            ids_csv = ",".join(user_ids)
            user_rows = _supabase_get(
                "users",
                {
                    "select": "id,email,full_name",
                    "id": f"in.({ids_csv})",
                    "limit": str(max(200, len(user_ids))),
                },
            )
            for row in user_rows:
                uid = str(row.get("id") or "")
                if not uid:
                    continue
                name = str(row.get("full_name") or "").strip()
                email = str(row.get("email") or "").strip()
                users_by_id[uid] = name or email or "Unknown user"

        words_by_job: dict[str, int] = {}
        preview_by_job: dict[str, str] = {}
        if job_ids:
            jobs_csv = ",".join(job_ids)
            segment_rows = _supabase_get(
                "dubbing_segments",
                {
                    "select": "job_id,segment_index,translated_text,source_text",
                    "job_id": f"in.({jobs_csv})",
                    "order": "segment_index.asc",
                    "limit": "12000",
                },
            )
            for row in segment_rows:
                jid = str(row.get("job_id") or "")
                if not jid:
                    continue
                txt = str(row.get("translated_text") or row.get("source_text") or "").strip()
                if txt:
                    words_by_job[jid] = words_by_job.get(jid, 0) + len([w for w in txt.split() if w])
                    if jid not in preview_by_job:
                        preview_by_job[jid] = txt[:120] + ("..." if len(txt) > 120 else "")

        items: list[AdminContentItem] = []
        for row in jobs:
            jid = str(row.get("id") or "")
            if not jid:
                continue
            raw_status = str(row.get("status") or "").strip().lower() or "processing"
            mapped_status = raw_status if raw_status in {"completed", "processing", "failed"} else "processing"
            source = str(row.get("source_language") or "auto").upper()
            target = str(row.get("target_language") or "-").upper()
            job_user_id = str(row.get("user_id") or "")
            who = users_by_id.get(job_user_id, "Unknown user")
            preview = preview_by_job.get(jid) or str(row.get("input_label") or "").strip() or "No content preview."
            flagged = bool(row.get("is_flagged"))

            if search_l and search_l not in jid.lower() and search_l not in who.lower() and search_l not in preview.lower():
                continue

            items.append(
                AdminContentItem(
                    id=jid,
                    user=who,
                    source=source,
                    target=target,
                    words=words_by_job.get(jid, 0),
                    status=mapped_status,
                    flagged=flagged,
                    created=_safe_iso_to_readable(str(row.get("created_at") or "")),
                    preview=preview,
                    output_path=str(row.get("output_path") or "").strip() or None,
                )
            )

        summary = AdminContentSummary(
            total_jobs=len(items),
            processing=sum(1 for item in items if item.status == "processing"),
            flagged=sum(1 for item in items if item.flagged),
            failed=sum(1 for item in items if item.status == "failed"),
        )
        return AdminContentResponse(summary=summary, items=items)
    except RuntimeError as exc:
        logger.error("Admin content fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch content items.") from exc


@router.post("/admin/content/{job_id}/flag")
async def admin_flag_content(job_id: str, request: Request) -> dict[str, bool]:
    admin = _ensure_admin_session(request)
    try:
        payload: dict[str, Any] = {
            "is_flagged": True,
            "flag_reason": "Flagged by admin",
            "flagged_at": datetime.now(UTC).isoformat(),
        }
        aid = admin.get("id")
        if aid:
            payload["flagged_by_admin_id"] = str(aid)
        _supabase_patch("dubbing_jobs", payload, {"id": f"eq.{job_id}"})
        return {"ok": True}
    except RuntimeError as exc:
        err = str(exc).lower()
        if "is_flagged" in err and ("does not exist" in err or "undefined column" in err):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Moderation columns missing on dubbing_jobs. "
                    "Run backend/sql/dubbing_jobs_moderation_columns.sql in Supabase SQL Editor "
                    "(after dubbing_tables.sql and admin_auth_tables.sql)."
                ),
            ) from exc
        logger.error("Admin flag content failed for %s: %s", job_id, exc)
        raise HTTPException(status_code=500, detail="Failed to flag content.") from exc


@router.delete("/admin/content/{job_id}/flag")
async def admin_unflag_content(job_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        _supabase_patch(
            "dubbing_jobs",
            {
                "is_flagged": False,
                "flag_reason": None,
                "flagged_at": None,
                "flagged_by_admin_id": None,
            },
            {"id": f"eq.{job_id}"},
        )
        return {"ok": True}
    except RuntimeError as exc:
        err = str(exc).lower()
        if "is_flagged" in err and ("does not exist" in err or "undefined column" in err):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Moderation columns missing on dubbing_jobs. "
                    "Run backend/sql/dubbing_jobs_moderation_columns.sql in Supabase SQL Editor "
                    "(after dubbing_tables.sql and admin_auth_tables.sql)."
                ),
            ) from exc
        logger.error("Admin unflag content failed for %s: %s", job_id, exc)
        raise HTTPException(status_code=500, detail="Failed to unflag content.") from exc


@router.delete("/admin/content/{job_id}")
async def admin_delete_content(job_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        _supabase_delete("dubbing_segments", {"job_id": f"eq.{job_id}"})
        _supabase_delete("dubbing_jobs", {"id": f"eq.{job_id}"})
        return {"ok": True}
    except RuntimeError as exc:
        logger.error("Admin delete content failed for %s: %s", job_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete content item.") from exc


@router.post("/admin/notifications/send")
async def admin_send_notification(
    payload: AdminSendNotificationRequest,
    request: Request,
) -> dict[str, Any]:
    admin = _ensure_admin_session(request)
    try:
        audience = payload.audience.strip().lower() or "all"
        if audience not in {"all", "pro", "business", "hobby"}:
            raise HTTPException(status_code=400, detail="Unsupported audience.")

        users = _supabase_get(
            "users",
            {
                "select": "id,email,full_name,plan_name,is_active",
                "is_active": "eq.true",
                "limit": "50000",
            },
        )
        target_users = []
        for user in users:
            user_plan = _normalize_plan_name(str(user.get("plan_name") or ""))
            if audience == "all" or user_plan == audience:
                target_users.append(user)

        notification_rows = _supabase_post(
            "admin_notifications",
            {
                "title": payload.title.strip(),
                "body": payload.body.strip(),
                "audience": audience,
                "created_by_admin_id": str(admin.get("id") or ""),
                "status": "sent",
                "sent_at": datetime.now(UTC).isoformat(),
                "created_at": datetime.now(UTC).isoformat(),
            },
            return_rows=True,
        )
        if not notification_rows:
            raise HTTPException(status_code=500, detail="Failed to create notification.")
        admin_notification_id = int(notification_rows[0].get("id"))

        user_notification_rows = [
            {
                "user_id": str(user.get("id")),
                "admin_notification_id": admin_notification_id,
                "title": payload.title.strip(),
                "body": payload.body.strip(),
                "is_read": False,
                "created_at": datetime.now(UTC).isoformat(),
            }
            for user in target_users
            if user.get("id")
        ]
        if user_notification_rows:
            _supabase_post("user_notifications", user_notification_rows, return_rows=False)

        delivery_rows = [
            {
                "admin_notification_id": admin_notification_id,
                "user_id": str(user.get("id")),
                "delivery_status": "delivered",
                "created_at": datetime.now(UTC).isoformat(),
            }
            for user in target_users
            if user.get("id")
        ]
        if delivery_rows:
            _supabase_post("notification_delivery_logs", delivery_rows, return_rows=False)

        for user in target_users:
            uid = str(user.get("id") or "")
            if not uid:
                continue
            await hub.send_to_user(
                uid,
                {
                    "type": "ADMIN_NOTIFICATION",
                    "notification_id": admin_notification_id,
                    "title": payload.title.strip(),
                    "message": payload.body.strip(),
                },
            )

        return {
            "ok": True,
            "notification_id": admin_notification_id,
            "recipients": len(target_users),
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/admin_notifications_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin notification send failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to send notification.") from exc


@router.get("/admin/notifications", response_model=AdminNotificationHistoryResponse)
async def admin_notifications_history(
    request: Request,
    limit: int = Query(default=100, ge=1, le=500),
) -> AdminNotificationHistoryResponse:
    _ensure_admin_session(request)
    try:
        rows = _supabase_get(
            "admin_notifications",
            {
                "select": "id,title,body,audience,status,sent_at,created_at",
                "order": "created_at.desc",
                "limit": str(limit),
            },
        )
        ids = [str(row.get("id") or "") for row in rows if row.get("id")]
        recipient_counts: dict[int, int] = {}
        if ids:
            id_csv = ",".join(ids)
            deliveries = _supabase_get(
                "notification_delivery_logs",
                {
                    "select": "admin_notification_id",
                    "admin_notification_id": f"in.({id_csv})",
                    "limit": "50000",
                },
            )
            for d in deliveries:
                nid = int(d.get("admin_notification_id") or 0)
                if nid <= 0:
                    continue
                recipient_counts[nid] = recipient_counts.get(nid, 0) + 1

        items = [
            AdminNotificationHistoryItem(
                id=int(row.get("id")),
                title=str(row.get("title") or ""),
                body=str(row.get("body") or ""),
                audience=str(row.get("audience") or "all"),
                status=str(row.get("status") or "sent"),
                recipients=recipient_counts.get(int(row.get("id")), 0),
                sent_at=str(row.get("sent_at") or "") or None,
                created_at=str(row.get("created_at") or "") or None,
            )
            for row in rows
        ]
        return AdminNotificationHistoryResponse(items=items)
    except RuntimeError as exc:
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/admin_notifications_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin notifications history failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch notifications history.") from exc


@router.get("/admin/notifications/stats", response_model=AdminNotificationStatsResponse)
async def admin_notifications_stats(request: Request) -> AdminNotificationStatsResponse:
    _ensure_admin_session(request)
    try:
        deliveries = _supabase_get(
            "notification_delivery_logs",
            {"select": "admin_notification_id,user_id", "delivery_status": "eq.delivered", "limit": "50000"},
        )
        total_sent = len(deliveries)

        read_rows = _supabase_get(
            "user_notifications",
            {"select": "id,is_read", "is_read": "eq.true", "limit": "50000"},
        )
        total_reads = len(read_rows)
        avg_open_rate = round((total_reads / total_sent) * 100, 2) if total_sent else 0.0

        click_rows = _supabase_get(
            "notification_click_events",
            {"select": "user_notification_id", "limit": "50000"},
        )
        total_clicks = len(click_rows)
        click_through_rate = round((total_clicks / total_sent) * 100, 2) if total_sent else 0.0

        return AdminNotificationStatsResponse(
            total_sent=total_sent,
            avg_open_rate=avg_open_rate,
            click_through_rate=click_through_rate,
        )
    except RuntimeError as exc:
        if _is_missing_table_error(exc, "notification_click_events"):
            deliveries = _supabase_get(
                "notification_delivery_logs",
                {"select": "admin_notification_id,user_id", "delivery_status": "eq.delivered", "limit": "50000"},
            )
            total_sent = len(deliveries)
            read_rows = _supabase_get(
                "user_notifications",
                {"select": "id,is_read", "is_read": "eq.true", "limit": "50000"},
            )
            total_reads = len(read_rows)
            avg_open_rate = round((total_reads / total_sent) * 100, 2) if total_sent else 0.0
            return AdminNotificationStatsResponse(
                total_sent=total_sent,
                avg_open_rate=avg_open_rate,
                click_through_rate=0.0,
            )
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/admin_notifications_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin notifications stats failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch notification stats.") from exc


@router.get("/notifications/me")
async def user_notifications_me(request: Request) -> dict[str, Any]:
    token = request.cookies.get("vox_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    now_iso = datetime.now(UTC).isoformat()
    session_rows = _supabase_get(
        "user_sessions",
        {
            "select": "user_id",
            "token_hash": f"eq.{_token_hash(token)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{now_iso}",
            "limit": "1",
        },
    )
    if not session_rows:
        raise HTTPException(status_code=401, detail="Session expired.")
    user_id = str(session_rows[0].get("user_id") or "")
    rows = _supabase_get(
        "user_notifications",
        {
            "select": "id,title,body,is_read,created_at,admin_notification_id",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": "200",
        },
    )
    return {"ok": True, "items": rows}


@router.post("/notifications/{notification_id}/read")
async def user_notification_read(notification_id: int, request: Request) -> dict[str, bool]:
    token = request.cookies.get("vox_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    now_iso = datetime.now(UTC).isoformat()
    session_rows = _supabase_get(
        "user_sessions",
        {
            "select": "user_id",
            "token_hash": f"eq.{_token_hash(token)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{now_iso}",
            "limit": "1",
        },
    )
    if not session_rows:
        raise HTTPException(status_code=401, detail="Session expired.")
    user_id = str(session_rows[0].get("user_id") or "")
    _supabase_patch(
        "user_notifications",
        {"is_read": True, "read_at": datetime.now(UTC).isoformat()},
        {"id": f"eq.{notification_id}", "user_id": f"eq.{user_id}"},
    )
    return {"ok": True}


@router.post("/notifications/{notification_id}/click")
async def user_notification_click(
    notification_id: int,
    request: Request,
) -> dict[str, bool]:
    token = request.cookies.get("vox_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    now_iso = datetime.now(UTC).isoformat()
    session_rows = _supabase_get(
        "user_sessions",
        {
            "select": "user_id",
            "token_hash": f"eq.{_token_hash(token)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{now_iso}",
            "limit": "1",
        },
    )
    if not session_rows:
        raise HTTPException(status_code=401, detail="Session expired.")
    user_id = str(session_rows[0].get("user_id") or "")
    _supabase_post(
        "notification_click_events",
        {
            "user_notification_id": notification_id,
            "user_id": user_id,
            "clicked_at": datetime.now(UTC).isoformat(),
        },
        return_rows=False,
    )
    return {"ok": True}


@router.get("/admin/subscriptions", response_model=AdminSubscriptionsResponse)
async def admin_subscriptions(
    request: Request,
    tab: str = Query(default="all"),
    search: str = Query(default=""),
    limit: int = Query(default=300, ge=1, le=1000),
) -> AdminSubscriptionsResponse:
    _ensure_admin_session(request)
    try:
        rows = _supabase_get(
            "subscriptions",
            {
                "select": (
                    "id,user_id,plan_code,status,billing_interval,price_usd,"
                    "currency,current_period_end,created_at"
                ),
                "order": "created_at.desc",
                "limit": str(limit),
            },
        )
        user_ids = sorted({str(row.get("user_id") or "") for row in rows if row.get("user_id")})
        users_map: dict[str, dict[str, Any]] = {}
        if user_ids:
            users_rows = _supabase_get(
                "users",
                {
                    "select": "id,email,full_name",
                    "id": f"in.({','.join(user_ids)})",
                    "limit": "50000",
                },
            )
            users_map = {str(u.get("id") or ""): u for u in users_rows}

        search_q = search.strip().lower()
        filtered_rows: list[dict[str, Any]] = []
        for row in rows:
            status = str(row.get("status") or "").strip().lower()
            if tab == "active" and status != "active":
                continue
            if tab == "cancelled" and status not in {"canceled", "past_due", "expired"}:
                continue
            user_id = str(row.get("user_id") or "")
            user = users_map.get(user_id, {})
            name = str(user.get("full_name") or "").strip() or "Unknown user"
            email = str(user.get("email") or "").strip() or "-"
            plan = _normalize_plan_name(str(row.get("plan_code") or "")).capitalize()
            if search_q and search_q not in f"{name} {email} {plan} {status}".lower():
                continue
            filtered_rows.append(row)

        active_like = [r for r in rows if str(r.get("status") or "") in {"active", "trialing", "past_due"}]
        mrr = round(sum(float(r.get("price_usd") or 0.0) for r in active_like), 2)
        arr = round(mrr * 12, 2)
        paying_users = len({str(r.get("user_id") or "") for r in active_like if r.get("user_id")})
        arpu = round((mrr / paying_users), 2) if paying_users else 0.0

        now = datetime.now(UTC)
        month_keys: list[tuple[int, int]] = []
        for i in range(5, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_keys.append((dt.year, dt.month))
        month_totals = {key: 0.0 for key in month_keys}
        for row in rows:
            created = str(row.get("created_at") or "")
            if not created:
                continue
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00")).astimezone(UTC)
            except Exception:
                continue
            key = (dt.year, dt.month)
            if key in month_totals:
                month_totals[key] += float(row.get("price_usd") or 0.0)
        mrr_data = [
            {
                "month": datetime(year=year, month=month, day=1, tzinfo=UTC).strftime("%b"),
                "mrr": round(month_totals[(year, month)], 2),
            }
            for year, month in month_keys
        ]

        plan_counts = {"Hobby": 0, "Pro": 0, "Business": 0}
        active_rows_for_dist = [r for r in rows if str(r.get("status") or "") in {"active", "trialing", "past_due"}]
        total_dist = max(len(active_rows_for_dist), 1)
        for row in active_rows_for_dist:
            pname = _normalize_plan_name(str(row.get("plan_code") or "")).capitalize()
            if pname in plan_counts:
                plan_counts[pname] += 1
        plan_distribution = [
            {"name": "Pro", "value": round((plan_counts["Pro"] / total_dist) * 100, 2), "color": "hsl(142,71%,45%)"},
            {
                "name": "Business",
                "value": round((plan_counts["Business"] / total_dist) * 100, 2),
                "color": "hsl(270,60%,65%)",
            },
            {"name": "Hobby", "value": round((plan_counts["Hobby"] / total_dist) * 100, 2), "color": "hsl(150,10%,40%)"},
        ]

        items: list[AdminSubscriptionItem] = []
        for row in filtered_rows:
            user_id = str(row.get("user_id") or "")
            user = users_map.get(user_id, {})
            name = str(user.get("full_name") or "").strip() or "Unknown user"
            email = str(user.get("email") or "").strip() or "-"
            plan = _normalize_plan_name(str(row.get("plan_code") or "")).capitalize()
            price = float(row.get("price_usd") or 0.0)
            interval = str(row.get("billing_interval") or "month")
            status = str(row.get("status") or "active").lower()
            sub_id = str(row.get("id") or "")
            items.append(
                AdminSubscriptionItem(
                    subscription_id=sub_id,
                    id=f"SUB-{sub_id[:8].upper()}",
                    user=name,
                    email=email,
                    plan=plan,
                    amount=f"${price:.2f}/{'yr' if interval == 'year' else 'mo'}",
                    status="cancelled" if status == "canceled" else status,
                    renewal=_safe_iso_to_readable(str(row.get("current_period_end") or "")),
                    since=_safe_iso_to_readable(str(row.get("created_at") or "")),
                )
            )

        return AdminSubscriptionsResponse(
            summary=AdminSubscriptionsSummary(
                mrr=mrr,
                arr=arr,
                paying_users=paying_users,
                arpu=arpu,
            ),
            mrr_data=mrr_data,
            plan_distribution=plan_distribution,
            items=items,
        )
    except RuntimeError as exc:
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/subscriptions_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin subscriptions fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load subscriptions.") from exc


@router.post("/admin/subscriptions/{subscription_id}/renew")
async def admin_subscription_renew(subscription_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        rows = _supabase_get(
            "subscriptions",
            {
                "select": "id,user_id,billing_interval,current_period_start,current_period_end",
                "id": f"eq.{subscription_id}",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Subscription not found.")
        current = rows[0]
        now = datetime.now(UTC)
        interval = str(current.get("billing_interval") or "month")
        end = now + (timedelta(days=365) if interval == "year" else timedelta(days=30))
        _supabase_patch(
            "subscriptions",
            {
                "status": "active",
                "canceled_at": None,
                "current_period_start": now.isoformat(),
                "current_period_end": end.isoformat(),
                "updated_at": now.isoformat(),
            },
            {"id": f"eq.{subscription_id}"},
        )
        return {"ok": True}
    except HTTPException:
        raise
    except RuntimeError as exc:
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/subscriptions_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin renew subscription failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to renew subscription.") from exc


@router.post("/admin/subscriptions/{subscription_id}/cancel")
async def admin_subscription_cancel(subscription_id: str, request: Request) -> dict[str, bool]:
    _ensure_admin_session(request)
    try:
        rows = _supabase_get(
            "subscriptions",
            {
                "select": "id,user_id",
                "id": f"eq.{subscription_id}",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Subscription not found.")
        now = datetime.now(UTC)
        _supabase_patch(
            "subscriptions",
            {"status": "canceled", "canceled_at": now.isoformat(), "updated_at": now.isoformat()},
            {"id": f"eq.{subscription_id}"},
        )
        return {"ok": True}
    except HTTPException:
        raise
    except RuntimeError as exc:
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/subscriptions_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin cancel subscription failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to cancel subscription.") from exc


@router.get("/admin/subscriptions/export")
async def admin_subscriptions_export(
    request: Request,
    tab: str = Query(default="all"),
    search: str = Query(default=""),
    limit: int = Query(default=500, ge=1, le=2000),
) -> StreamingResponse:
    admin = _ensure_admin_session(request)
    try:
        data = await admin_subscriptions(request=request, tab=tab, search=search, limit=limit)
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(["id", "user", "email", "plan", "amount", "status", "renewal", "since"])
        for item in data.items:
            writer.writerow([item.id, item.user, item.email, item.plan, item.amount, item.status, item.renewal, item.since])
        try:
            _supabase_post(
                "admin_audit_logs",
                {
                    "admin_id": str(admin.get("id") or ""),
                    "action": "subscriptions_export",
                    "entity_type": "subscriptions",
                    "entity_id": None,
                    "details": json.dumps(
                        {"tab": tab, "search": search, "limit": limit, "exported_count": len(data.items)}
                    ),
                    "created_at": datetime.now(UTC).isoformat(),
                },
                return_rows=False,
            )
        except RuntimeError:
            pass
        filename = f"admin-subscriptions-export-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}.csv"
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Admin subscriptions export failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to export subscriptions.") from exc


@router.get("/admin/subscriptions/{subscription_id}/receipt")
async def admin_subscription_receipt(subscription_id: str, request: Request) -> StreamingResponse:
    _ensure_admin_session(request)
    try:
        rows = _supabase_get(
            "subscriptions",
            {
                "select": (
                    "id,user_id,plan_code,status,billing_interval,price_usd,currency,"
                    "current_period_start,current_period_end,created_at"
                ),
                "id": f"eq.{subscription_id}",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Subscription not found.")
        subscription = rows[0]
        user_id = str(subscription.get("user_id") or "")
        user_rows = _supabase_get(
            "users",
            {"select": "id,email,full_name", "id": f"eq.{user_id}", "limit": "1"},
        )
        user = user_rows[0] if user_rows else {"id": user_id, "email": "-", "full_name": "Unknown user"}
        invoice_rows = _supabase_get(
            "subscription_invoices",
            {
                "select": "invoice_number,paid_at,created_at",
                "subscription_id": f"eq.{subscription_id}",
                "order": "created_at.desc",
                "limit": "1",
            },
        )
        invoice = invoice_rows[0] if invoice_rows else None
        pdf = _build_subscription_receipt_pdf(subscription, user, invoice)
        filename = f"receipt-{subscription_id[:8]}-{datetime.now(UTC).strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except RuntimeError as exc:
        missing_table = _extract_missing_table_name(exc)
        if missing_table:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing database table '{missing_table}'. "
                    "Run backend/sql/subscriptions_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Admin subscription receipt failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate receipt.") from exc


@router.get("/admin/content/export")
async def admin_content_export(
    request: Request,
    search: str = Query(default=""),
    status: str = Query(default="all"),
    language: str = Query(default="all"),
    limit: int = Query(default=300, ge=1, le=1000),
) -> StreamingResponse:
    admin = _ensure_admin_session(request)
    try:
        content_data = await admin_content(
            request=request,
            search=search,
            status=status,
            language=language,
            limit=limit,
        )

        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(
            [
                "job_id",
                "user",
                "source_language",
                "target_language",
                "status",
                "flagged",
                "words",
                "created",
                "preview",
                "output_path",
            ]
        )
        for item in content_data.items:
            writer.writerow(
                [
                    item.id,
                    item.user,
                    item.source,
                    item.target,
                    item.status,
                    "true" if item.flagged else "false",
                    str(item.words),
                    item.created,
                    item.preview,
                    item.output_path or "",
                ]
            )

        try:
            _supabase_post(
                "admin_audit_logs",
                {
                    "admin_id": str(admin.get("id") or ""),
                    "action": "content_export",
                    "entity_type": "dubbing_jobs",
                    "entity_id": None,
                    "details": json.dumps(
                        {
                            "search": search,
                            "status": status,
                            "language": language,
                            "limit": limit,
                            "exported_count": len(content_data.items),
                        }
                    ),
                    "created_at": datetime.now(UTC).isoformat(),
                },
                return_rows=False,
            )
        except RuntimeError as exc:
            if _is_missing_table_error(exc, "admin_audit_logs"):
                raise HTTPException(
                    status_code=400,
                    detail="Audit log table missing. Run backend/sql/admin_audit_logs.sql first.",
                ) from exc
            raise

        filename = f"admin-content-export-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}.csv"
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Admin content export failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to export content.") from exc
