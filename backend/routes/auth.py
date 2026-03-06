import base64
import hashlib
import hmac
import io
import os
import secrets
import re
from datetime import UTC, datetime, timedelta
from typing import Any

import requests
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from backend.utils.logger import get_logger

router = APIRouter()
logger = get_logger("auth_route")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)
    preferred_language: str | None = Field(default=None, max_length=60)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    preferred_language: str | None = Field(default=None, max_length=60)
    active_languages: int | None = Field(default=None, ge=0, le=1000)
    plan_name: str | None = Field(default=None, max_length=60)
    next_billing_text: str | None = Field(default=None, max_length=80)
    member_since_text: str | None = Field(default=None, max_length=80)
    membership_duration_text: str | None = Field(default=None, max_length=80)


class CheckoutRequest(BaseModel):
    plan_code: str = Field(default="pro", max_length=40)
    billing_interval: str = Field(default="month", max_length=20)
    card_holder: str | None = Field(default=None, max_length=120)


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
        raise RuntimeError("SUPABASE key is not configured.")
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


def _pbkdf2_hash(password: str, *, iterations: int = 200_000) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii")
    digest_b64 = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${iterations}${salt_b64}${digest_b64}"


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


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


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


def _supabase_post(path: str, payload: dict[str, Any], *, return_rows: bool = False) -> list[dict[str, Any]]:
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


def _find_user_by_email(email: str) -> dict[str, Any] | None:
    rows = _supabase_get(
        "users",
        {
            "select": "id,email,password_hash,full_name,is_active",
            "email": f"eq.{email.lower()}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _find_user_by_id(user_id: str) -> dict[str, Any] | None:
    rows = _supabase_get(
        "users",
        {
            "select": (
                "id,email,full_name,is_active,preferred_language,"
                "active_languages,plan_name,next_billing_text,member_since_text,membership_duration_text,created_at"
            ),
            "id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def _resolve_request_user(request: Request) -> dict[str, Any]:
    token = request.cookies.get("vox_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    now_iso = datetime.now(UTC).isoformat()
    rows = _supabase_get(
        "user_sessions",
        {
            "select": "user_id,expires_at,revoked_at",
            "token_hash": f"eq.{_token_hash(token)}",
            "revoked_at": "is.null",
            "expires_at": f"gt.{now_iso}",
            "limit": "1",
        },
    )
    if not rows:
        raise HTTPException(status_code=401, detail="Session expired.")
    session = rows[0]
    user = _find_user_by_id(str(session.get("user_id")))
    if not user or not bool(user.get("is_active", True)):
        raise HTTPException(status_code=401, detail="User unavailable.")
    return user


def _create_session(user_id: str, *, hours: int = 72) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(hours=hours)
    _supabase_post(
        "user_sessions",
        {
            "user_id": user_id,
            "token_hash": _token_hash(token),
            "expires_at": expires_at.isoformat(),
        },
        return_rows=False,
    )
    return token, expires_at


def _safe_date(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "-"
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        return raw


def _build_invoice_pdf(user: dict[str, Any]) -> bytes:
    invoice_date = datetime.now(UTC)
    invoice_id = f"INV-{invoice_date.strftime('%Y%m%d')}-{str(user.get('id') or '')[:8].upper()}"

    full_name = str(user.get("full_name") or "").strip() or "Voxinity User"
    email = str(user.get("email") or "").strip() or "-"
    plan_name = str(user.get("plan_name") or "").strip() or "Free Plan"
    next_billing = str(user.get("next_billing_text") or "").strip() or "No active billing cycle"

    amount_usd = float(os.environ.get("INVOICE_DEFAULT_AMOUNT_USD", "0") or 0)
    subtotal = amount_usd
    tax = round(subtotal * 0.0, 2)
    total = round(subtotal + tax, 2)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Voxinity Invoice {invoice_id}",
        author="Voxinity",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading4"],
        fontSize=11,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )

    story = [
        Paragraph("Voxinity", title_style),
        Paragraph("AI Video Dubbing Platform", body_style),
        Spacer(1, 8),
        Table(
            [
                ["Invoice ID", invoice_id, "Date", invoice_date.strftime("%Y-%m-%d")],
                ["Customer", full_name, "Email", email],
                ["Plan", plan_name, "Next Billing", next_billing],
                ["Member Since", _safe_date(user.get("created_at")), "Status", "Issued"],
            ],
            colWidths=[30 * mm, 60 * mm, 30 * mm, 60 * mm],
            hAlign="LEFT",
        ),
        Spacer(1, 14),
        Paragraph("Billing Summary", heading_style),
    ]

    summary_table = Table(
        [
            ["Description", "Qty", "Unit Price", "Amount"],
            [f"{plan_name} subscription", "1", f"${amount_usd:,.2f}", f"${subtotal:,.2f}"],
            ["Tax", "", "", f"${tax:,.2f}"],
            ["Total", "", "", f"${total:,.2f}"],
        ],
        colWidths=[90 * mm, 18 * mm, 35 * mm, 35 * mm],
        hAlign="LEFT",
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 1), (-1, -2), "Helvetica"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(summary_table)
    story.extend(
        [
            Spacer(1, 14),
            Paragraph(
                "Thank you for using Voxinity. This is a system-generated invoice and does not require a signature.",
                body_style,
            ),
        ]
    )

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def _build_subscription_receipt_pdf(
    user: dict[str, Any],
    invoice: dict[str, Any],
    subscription: dict[str, Any] | None,
) -> bytes:
    now = datetime.now(UTC)
    receipt_id = f"RCT-{now.strftime('%Y%m%d')}-{str(invoice.get('id') or '')[:8].upper()}"
    full_name = str(user.get("full_name") or "").strip() or "Voxinity User"
    email = str(user.get("email") or "").strip() or "-"
    plan = str((subscription or {}).get("plan_code") or user.get("plan_name") or "Plan").capitalize()
    interval = str((subscription or {}).get("billing_interval") or "month").lower()
    amount = float(invoice.get("amount_total") or invoice.get("amount_subtotal") or 0.0)
    paid_at = _safe_date(invoice.get("paid_at") or now.isoformat())
    invoice_number = str(invoice.get("invoice_number") or "-")
    period_start = _safe_date(invoice.get("period_start"))
    period_end = _safe_date(invoice.get("period_end"))

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
    story.append(Paragraph("Official proof of successful subscription payment", meta_style))
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
    story.append(Paragraph(f"<b>Billed To:</b> {full_name}", body_style))
    story.append(Paragraph(f"<b>Email:</b> {email}", body_style))
    story.append(Spacer(1, 10))

    item_rows = [
        ["Description", "Billing", "Amount", "Status"],
        [f"{plan} subscription", interval.capitalize(), f"${amount:,.2f}", "Paid"],
    ]
    item_table = Table(item_rows, colWidths=[80 * mm, 30 * mm, 30 * mm, 28 * mm])
    item_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ALIGN", (2, 1), (2, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(item_table)
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Billing period: {period_start} to {period_end}", body_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("This is a system-generated receipt and does not require a signature.", meta_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


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
    return text[start:end].strip() or None


@router.post("/auth/register")
async def register(payload: RegisterRequest) -> dict[str, Any]:
    try:
        if not EMAIL_RE.match(payload.email.strip()):
            raise HTTPException(status_code=400, detail="Invalid email address.")
        existing = _find_user_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")

        rows = _supabase_post(
            "users",
            {
                "email": payload.email.lower().strip(),
                "password_hash": _pbkdf2_hash(payload.password),
                "full_name": (payload.full_name or "").strip() or None,
                "preferred_language": (payload.preferred_language or "").strip() or None,
                "plan_name": "Hobby",
                "is_active": True,
            },
            return_rows=True,
        )
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to create account.")
        created = rows[0]
        return {
            "ok": True,
            "user": {
                "id": created.get("id"),
                "email": created.get("email"),
                "full_name": created.get("full_name"),
                "preferred_language": created.get("preferred_language"),
            },
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Register failed: %s", exc)
        raise HTTPException(status_code=500, detail="Registration failed.") from exc


@router.post("/auth/login")
async def login(payload: LoginRequest, response: Response) -> dict[str, Any]:
    try:
        if not EMAIL_RE.match(payload.email.strip()):
            raise HTTPException(status_code=400, detail="Invalid email address.")
        user = _find_user_by_email(payload.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        if not bool(user.get("is_active", True)):
            raise HTTPException(status_code=403, detail="Your account is suspended. Contact admin.")
        if not _pbkdf2_verify(payload.password, str(user.get("password_hash") or "")):
            raise HTTPException(status_code=401, detail="Invalid credentials.")

        token, expires_at = _create_session(str(user["id"]))
        secure_cookie = (os.environ.get("AUTH_COOKIE_SECURE", "").lower() in {"1", "true", "yes"})
        response.set_cookie(
            key="vox_session",
            value=token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            expires=int(expires_at.timestamp()),
            path="/",
        )

        _supabase_patch(
            "users",
            {"last_login_at": datetime.now(UTC).isoformat()},
            {"id": f"eq.{user['id']}"},
        )
        return {
            "ok": True,
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "full_name": user.get("full_name"),
            },
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Login failed: %s", exc)
        raise HTTPException(status_code=500, detail="Login failed.") from exc


@router.post("/auth/logout")
async def logout(request: Request, response: Response) -> dict[str, bool]:
    token = request.cookies.get("vox_session")
    try:
        if token:
            _supabase_patch(
                "user_sessions",
                {"revoked_at": datetime.now(UTC).isoformat()},
                {"token_hash": f"eq.{_token_hash(token)}"},
            )
    except RuntimeError:
        # Non-fatal for logout UX.
        pass
    response.delete_cookie("vox_session", path="/")
    return {"ok": True}


@router.get("/auth/me")
async def me(request: Request) -> dict[str, Any]:
    soft_auth = request.headers.get("x-soft-auth", "").strip() == "1"
    try:
        user = _resolve_request_user(request)
        return {
            "ok": True,
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "full_name": user.get("full_name"),
                "preferred_language": user.get("preferred_language"),
                "active_languages": user.get("active_languages"),
                "plan_name": user.get("plan_name"),
                "next_billing_text": user.get("next_billing_text"),
                "member_since_text": user.get("member_since_text"),
                "membership_duration_text": user.get("membership_duration_text"),
                "created_at": user.get("created_at"),
            },
        }
    except HTTPException as exc:
        if soft_auth and exc.status_code == 401:
            return {"ok": False, "user": None}
        raise
    except RuntimeError as exc:
        logger.error("Auth me failed: %s", exc)
        if soft_auth:
            return {"ok": False, "user": None}
        raise HTTPException(status_code=500, detail="Failed to resolve session.") from exc


@router.patch("/auth/profile")
async def update_profile(payload: UpdateProfileRequest, request: Request) -> dict[str, Any]:
    try:
        user = _resolve_request_user(request)

        update_payload = {
            "full_name": (payload.full_name or "").strip() or None,
            "preferred_language": (payload.preferred_language or "").strip() or None,
            "active_languages": payload.active_languages,
            "plan_name": (payload.plan_name or "").strip() or None,
            "next_billing_text": (payload.next_billing_text or "").strip() or None,
            "member_since_text": (payload.member_since_text or "").strip() or None,
            "membership_duration_text": (payload.membership_duration_text or "").strip() or None,
            "updated_at": datetime.now(UTC).isoformat(),
        }

        _supabase_patch("users", update_payload, {"id": f"eq.{user['id']}"})
        refreshed = _find_user_by_id(str(user["id"]))
        if not refreshed:
            raise HTTPException(status_code=404, detail="User not found after update.")

        return {
            "ok": True,
            "user": {
                "id": refreshed.get("id"),
                "email": refreshed.get("email"),
                "full_name": refreshed.get("full_name"),
                "preferred_language": refreshed.get("preferred_language"),
                "active_languages": refreshed.get("active_languages"),
                "plan_name": refreshed.get("plan_name"),
                "next_billing_text": refreshed.get("next_billing_text"),
                "member_since_text": refreshed.get("member_since_text"),
                "membership_duration_text": refreshed.get("membership_duration_text"),
                "created_at": refreshed.get("created_at"),
            },
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Profile update failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update profile.") from exc


@router.post("/auth/delete-all-data")
async def delete_all_data(request: Request, response: Response) -> dict[str, bool]:
    try:
        user = _resolve_request_user(request)
        user_id = str(user["id"])

        # Remove all session records so user is fully logged out.
        _supabase_delete("user_sessions", {"user_id": f"eq.{user_id}"})

        # Keep account credentials, but remove profile/business data.
        _supabase_patch(
            "users",
            {
                "full_name": None,
                "preferred_language": None,
                "active_languages": 0,
                "plan_name": None,
                "next_billing_text": None,
                "member_since_text": None,
                "membership_duration_text": None,
                "last_login_at": None,
                "updated_at": datetime.now(UTC).isoformat(),
            },
            {"id": f"eq.{user_id}"},
        )
        response.delete_cookie("vox_session", path="/")
        return {"ok": True}
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Delete all data failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to delete user data.") from exc


@router.post("/auth/delete-account")
async def delete_account(request: Request, response: Response) -> dict[str, bool]:
    try:
        user = _resolve_request_user(request)
        user_id = str(user["id"])
        _supabase_delete("user_sessions", {"user_id": f"eq.{user_id}"})
        _supabase_delete("users", {"id": f"eq.{user_id}"})
        response.delete_cookie("vox_session", path="/")
        return {"ok": True}
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Delete account failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to delete account.") from exc


@router.get("/auth/invoice/download")
async def download_invoice(request: Request) -> StreamingResponse:
    try:
        user = _resolve_request_user(request)
        pdf_bytes = _build_invoice_pdf(user)
        filename = f"invoice-{datetime.now(UTC).strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error("Invoice generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate invoice.") from exc


@router.post("/billing/checkout")
async def billing_checkout(payload: CheckoutRequest, request: Request) -> dict[str, Any]:
    try:
        user = _resolve_request_user(request)
        user_id = str(user.get("id") or "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user session.")

        plan_code = payload.plan_code.strip().lower()
        billing_interval = payload.billing_interval.strip().lower()
        if billing_interval not in {"month", "year"}:
            raise HTTPException(status_code=400, detail="Unsupported billing interval.")

        plan_catalog: dict[str, dict[str, Any]] = {
            "hobby": {"display_name": "Hobby", "monthly": 0.0, "yearly": 0.0, "trial_days": 0},
            "pro": {"display_name": "Pro", "monthly": 20.0, "yearly": 16.0, "trial_days": 14},
            "business": {"display_name": "Business", "monthly": 80.0, "yearly": 64.0, "trial_days": 0},
        }
        plan = plan_catalog.get(plan_code)
        if not plan:
            raise HTTPException(status_code=400, detail="Unsupported plan.")

        amount = float(plan["yearly"] if billing_interval == "year" else plan["monthly"])
        now = datetime.now(UTC)
        period_end = now + (timedelta(days=365) if billing_interval == "year" else timedelta(days=30))
        trial_days = int(plan["trial_days"])
        trial_end = now + timedelta(days=trial_days) if trial_days > 0 else None
        status = "trialing" if trial_end else "active"

        _supabase_patch(
            "subscriptions",
            {"status": "canceled", "canceled_at": now.isoformat(), "updated_at": now.isoformat()},
            {"user_id": f"eq.{user_id}", "status": "in.(trialing,active,past_due)"},
        )

        subscription_rows = _supabase_post(
            "subscriptions",
            {
                "user_id": user_id,
                "plan_code": plan_code,
                "status": status,
                "billing_interval": billing_interval,
                "price_usd": amount,
                "currency": "USD",
                "trial_start_at": now.isoformat() if trial_end else None,
                "trial_end_at": trial_end.isoformat() if trial_end else None,
                "current_period_start": now.isoformat(),
                "current_period_end": period_end.isoformat(),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            },
            return_rows=True,
        )
        if not subscription_rows:
            raise HTTPException(status_code=500, detail="Failed to create subscription.")
        subscription = subscription_rows[0]
        subscription_id = str(subscription.get("id") or "")
        if not subscription_id:
            raise HTTPException(status_code=500, detail="Invalid subscription id.")

        invoice_number = f"SUB-{now.strftime('%Y%m%d')}-{user_id[:8].upper()}"
        invoice_rows = _supabase_post(
            "subscription_invoices",
            {
                "subscription_id": subscription_id,
                "user_id": user_id,
                "invoice_number": invoice_number,
                "amount_subtotal": amount,
                "amount_tax": 0.0,
                "amount_total": amount,
                "currency": "USD",
                "period_start": now.isoformat(),
                "period_end": period_end.isoformat(),
                "due_at": now.isoformat(),
                "paid_at": now.isoformat(),
                "status": "paid",
                "created_at": now.isoformat(),
            },
            return_rows=True,
        )
        invoice_id = str(invoice_rows[0].get("id") or "") if invoice_rows else None

        _supabase_post(
            "subscription_payments",
            {
                "invoice_id": invoice_id,
                "subscription_id": subscription_id,
                "user_id": user_id,
                "amount": amount,
                "currency": "USD",
                "status": "succeeded",
                "provider": "manual",
                "paid_at": now.isoformat(),
                "created_at": now.isoformat(),
            },
            return_rows=False,
        )

        next_billing = (
            f"Trial ends: {trial_end.strftime('%b %d, %Y')}"
            if trial_end
            else f"Next billing: {period_end.strftime('%b %d, %Y')}"
        )
        _supabase_patch(
            "users",
            {
                "plan_name": str(plan["display_name"]),
                "next_billing_text": next_billing,
                "updated_at": now.isoformat(),
            },
            {"id": f"eq.{user_id}"},
        )

        return {
            "ok": True,
            "subscription": {
                "id": subscription_id,
                "plan_code": plan_code,
                "status": status,
                "billing_interval": billing_interval,
                "price_usd": amount,
                "trial_end_at": trial_end.isoformat() if trial_end else None,
                "current_period_end": period_end.isoformat(),
            },
            "invoice_id": invoice_id,
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
                    "Run backend/sql/subscriptions_tables.sql, then run: notify pgrst, 'reload schema';"
                ),
            ) from exc
        logger.error("Checkout failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to complete checkout.") from exc


@router.get("/billing/subscription/me")
async def billing_subscription_me(request: Request) -> dict[str, Any]:
    try:
        user = _resolve_request_user(request)
        user_id = str(user.get("id") or "")
        rows = _supabase_get(
            "subscriptions",
            {
                "select": (
                    "id,plan_code,status,billing_interval,price_usd,currency,"
                    "trial_start_at,trial_end_at,current_period_start,current_period_end,created_at"
                ),
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": "1",
            },
        )
        return {"ok": True, "subscription": rows[0] if rows else None}
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
        logger.error("Fetch subscription failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch subscription.") from exc


@router.get("/billing/invoices/me")
async def billing_invoices_me(request: Request) -> dict[str, Any]:
    try:
        user = _resolve_request_user(request)
        user_id = str(user.get("id") or "")
        rows = _supabase_get(
            "subscription_invoices",
            {
                "select": "id,invoice_number,amount_total,status,paid_at,created_at,period_start,period_end,subscription_id",
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": "50",
            },
        )
        return {"ok": True, "items": rows}
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
        logger.error("Fetch invoices failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch invoices.") from exc


@router.get("/billing/invoices/{invoice_id}/receipt/download")
async def billing_invoice_receipt_download(invoice_id: str, request: Request) -> StreamingResponse:
    try:
        user = _resolve_request_user(request)
        user_id = str(user.get("id") or "")
        rows = _supabase_get(
            "subscription_invoices",
            {
                "select": "id,invoice_number,amount_total,amount_subtotal,status,paid_at,period_start,period_end,subscription_id,user_id",
                "id": f"eq.{invoice_id}",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Invoice not found.")
        invoice = rows[0]
        sub_id = str(invoice.get("subscription_id") or "")
        subscription = None
        if sub_id:
            sub_rows = _supabase_get(
                "subscriptions",
                {
                    "select": "id,plan_code,billing_interval,status,current_period_start,current_period_end",
                    "id": f"eq.{sub_id}",
                    "limit": "1",
                },
            )
            subscription = sub_rows[0] if sub_rows else None

        pdf_bytes = _build_subscription_receipt_pdf(user, invoice, subscription)
        filename = f"receipt-{str(invoice.get('invoice_number') or invoice_id)}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
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
        logger.error("Invoice receipt generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate receipt.") from exc
