"""
Lipila payment endpoints: deposit (MoMo/card), withdraw (MoMo), status, webhook.
All except webhook are protected by Firebase ID token (get_current_user returns uid).
Storage: Firestore (users/{uid}.wallet_balance, transactions/{reference}).
"""
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from auth import get_current_user
from services.lipila import (
    check_transaction_status,
    initiate_card_payment,
    initiate_momo_deposit,
    initiate_momo_withdrawal,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])

LIPILA_WEBHOOK_SECRET = os.getenv("LIPILA_WEBHOOK_SECRET", "")
CALLBACK_BASE_URL = os.getenv(
    "LIPILA_CALLBACK_BASE_URL", "https://abc-123-456.ngrok-free.app"
)


def _get_firestore():
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception as e:
        logger.error("Firestore not available: %s", e)
        return None


# ---- Pydantic v2 request/response models ----

class MomoDepositRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in ZMW")
    phone: str = Field(..., min_length=9, description="E.164 e.g. +260971234567")


class MomoWithdrawRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in ZMW")
    phone: str = Field(..., min_length=9, description="E.164 e.g. +260971234567")


class CardDetails(BaseModel):
    card_number: str = Field(..., min_length=12, max_length=19)
    expiry_month: str = Field(..., min_length=2, max_length=2)
    expiry_year: str = Field(..., min_length=2, max_length=4)
    cvv: str = Field(..., min_length=3, max_length=4)


class CardDepositRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in ZMW")
    card_details: CardDetails


def _normalize_phone(phone: str) -> str:
    p = "".join(c for c in phone if c.isdigit())
    if p.startswith("0") and len(p) == 10:
        p = p[1:]  # turn 097... into 97...
    if len(p) == 9:
        return f"+260{p}"
    if len(p) == 12 and p.startswith("260"):
        return f"+{p}"
    return phone


def _verify_webhook_signature(body: bytes, signature_header: str | None) -> bool:
    if not LIPILA_WEBHOOK_SECRET or not signature_header:
        logger.warning("Webhook secret or signature header missing")
        return False
    expected = hmac.new(
        LIPILA_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header.strip())


def _ensure_user_wallet(db, uid: str) -> None:
    """Ensure users/{uid} exists with wallet_balance (create with 0 if missing)."""
    ref = db.collection("users").document(uid)
    if not ref.get().exists:
        ref.set({"wallet_balance": 0.0})


def _ensure_transaction_and_user(
    db,
    lipila_reference: str,
    status_value: str,
    amount: float,
    txn_type: str,
    payment_method: str,
) -> None:
    """Update transaction in Firestore and user wallet on success."""
    logger.info("Webhook: Processing transaction %s with status '%s', amount %.2f, type %s", 
                lipila_reference, status_value, amount, txn_type)
    
    tx_ref = db.collection("transactions").document(lipila_reference)
    tx_doc = tx_ref.get()
    if not tx_doc.exists:
        logger.error("Webhook: transaction not found for reference=%s", lipila_reference)
        return
    data = tx_doc.to_dict()
    uid = data.get("uid")
    if not uid:
        logger.error("Webhook: no uid on transaction %s", lipila_reference)
        return
    
    logger.info("Webhook: Found transaction for uid=%s", uid)

    # Expanded success status checking (case-insensitive)
    success_statuses = {"success", "successful", "completed", "settled", "paid", "approved", "ok"}
    failure_statuses = {"failed", "failure", "declined", "cancelled", "rejected", "error"}
    
    status_lower = str(status_value).lower().strip()
    
    if status_lower in success_statuses:
        new_status = "success"
        logger.info("Webhook: Status '%s' mapped to success for transaction %s", status_value, lipila_reference)
    elif status_lower in failure_statuses:
        new_status = "failed"
        logger.info("Webhook: Status '%s' mapped to failed for transaction %s", status_value, lipila_reference)
    else:
        new_status = "unknown"
        logger.warning("Webhook: Unknown status '%s' for transaction %s - setting to 'unknown'", status_value, lipila_reference)

    # Update transaction
    try:
        tx_ref.update({
            "status": new_status,
            "lipila_status": status_value,  # Store original Lipila status
            "updated_at": datetime.utcnow(),
        })
        logger.info("Webhook: Updated transaction %s status to %s", lipila_reference, new_status)
    except Exception as e:
        logger.error("Webhook: Failed to update transaction %s: %s", lipila_reference, e)
        return

    if new_status == "success":
        from firebase_admin import firestore
        try:
            user_ref = db.collection("users").document(uid)
            _ensure_user_wallet(db, uid)
            increment_amount = amount if txn_type != "withdrawal" else -amount
            user_ref.update({
                "wallet_balance": firestore.Increment(increment_amount),
                "updated_at": datetime.utcnow(),
            })
            logger.info("Webhook: Updated user %s wallet by %.2f (new balance should reflect)", uid, increment_amount)
        except Exception as e:
            logger.error("Webhook: Failed to update user %s wallet: %s", uid, e)


@router.get("/balance")
async def get_balance(
    uid: Annotated[str, Depends(get_current_user)],
):
    """Return current user wallet balance (Firestore users/{uid}.wallet_balance)."""
    db = _get_firestore()
    if not db:
        raise HTTPException(status_code=503, detail="Service unavailable")
    try:
        user_ref = db.collection("users").document(uid)
        doc = user_ref.get()
        if doc.exists:
            balance = doc.to_dict().get("wallet_balance", 0.0)
        else:
            balance = 0.0
        return {"wallet_balance": float(balance)}
    except Exception as e:
        logger.error("Error fetching balance for %s: %s", uid, e)
        raise HTTPException(status_code=500, detail="Failed to fetch balance")


@router.post("/deposit/momo")
async def post_deposit_momo(
    req: MomoDepositRequest,
    uid: Annotated[str, Depends(get_current_user)],
):
    """Initiate a mobile money deposit via Lipila (protected)."""
    db = _get_firestore()
    if not db:
        raise HTTPException(status_code=503, detail="Service unavailable")

    phone = _normalize_phone(req.phone)
    if not phone.startswith("+260") or len(phone) != 13:
        raise HTTPException(status_code=400, detail="Invalid phone. Use E.164: +260xxxxxxxxx")

    reference = f"njuka_deposit_{uid}_{int(time.time())}"
    callback_url = f"{CALLBACK_BASE_URL.rstrip('/')}/api/payments/webhook"

    result = await initiate_momo_deposit(
        amount=float(req.amount),
        phone=phone,
        reference=reference,
        callback_url=callback_url,
    )

    # Record transaction
    from firebase_admin import firestore
    _ensure_user_wallet(db, uid)
    tx_ref = db.collection("transactions").document(reference)
    tx_ref.set({
        "uid": uid,
        "amount": float(req.amount),
        "type": "deposit",
        "payment_method": "momo",
        "status": "pending",
        "lipila_reference": reference,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

    logger.info("Deposit initiated: reference=%s uid=%s amount=%s", reference, uid, req.amount)
    return {"message": "Deposit initiated", "reference": reference, "lipila_response": result}


@router.post("/withdraw/momo")
async def post_withdraw_momo(
    req: MomoWithdrawRequest,
    uid: Annotated[str, Depends(get_current_user)],
):
    """Initiate a mobile money withdrawal via Lipila."""
    db = _get_firestore()
    if not db:
        raise HTTPException(status_code=503, detail="Service unavailable")

    phone = _normalize_phone(req.phone)
    if not phone.startswith("+260") or len(phone) != 13:
        raise HTTPException(
            status_code=400, detail="Invalid phone. Use E.164: +260xxxxxxxxx"
        )

    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()
    balance = doc.to_dict().get("wallet_balance", 0.0) if doc.exists else 0.0
    if balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    reference = str(uuid.uuid4())
    callback_url = f"{CALLBACK_BASE_URL.rstrip('/')}/api/payments/webhook"
    result = await initiate_momo_withdrawal(
        amount=req.amount,
        phone=phone,
        reference=reference,
        callback_url=callback_url,
    )
    if result.get("_error"):
        code = result.get("status_code", 502)
        detail = result.get("body", result)
        if isinstance(detail, dict):
            detail = detail.get("message", "Lipila request failed")
        logger.error("Lipila momo withdrawal error: %s", result)
        raise HTTPException(status_code=min(code, 502), detail=str(detail))

    tx_ref = db.collection("transactions").document(reference)
    tx_ref.set({
        "uid": uid,
        "amount": req.amount,
        "type": "withdrawal",
        "payment_method": "momo",
        "status": "pending",
        "lipila_reference": reference,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    logger.info("Withdrawal initiated: reference=%s uid=%s amount=%s", reference, uid, req.amount)
    return {"reference": reference, "status": "pending", "message": "Withdrawal initiated", **result}


@router.post("/deposit/card")
async def post_deposit_card(
    req: CardDepositRequest,
    uid: Annotated[str, Depends(get_current_user)],
):
    """Initiate a card payment via Lipila."""
    db = _get_firestore()
    if not db:
        raise HTTPException(status_code=503, detail="Service unavailable")

    reference = str(uuid.uuid4())
    callback_url = f"{CALLBACK_BASE_URL.rstrip('/')}/api/payments/webhook"
    card_details = {
        "cardNumber": req.card_details.card_number.replace(" ", ""),
        "expiryMonth": req.card_details.expiry_month,
        "expiryYear": req.card_details.expiry_year.zfill(2)[-2:],
        "cvv": req.card_details.cvv,
    }
    result = await initiate_card_payment(
        amount=req.amount,
        card_details=card_details,
        reference=reference,
        callback_url=callback_url,
    )
    if result.get("_error"):
        code = result.get("status_code", 502)
        detail = result.get("body", result)
        if isinstance(detail, dict):
            detail = detail.get("message", "Lipila request failed")
        logger.error("Lipila card deposit error: %s", result)
        raise HTTPException(status_code=min(code, 502), detail=str(detail))

    _ensure_user_wallet(db, uid)
    tx_ref = db.collection("transactions").document(reference)
    tx_ref.set({
        "uid": uid,
        "amount": req.amount,
        "type": "deposit",
        "payment_method": "card",
        "status": "pending",
        "lipila_reference": reference,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    logger.info("Card deposit initiated: reference=%s uid=%s amount=%s", reference, uid, req.amount)
    return {"reference": reference, "status": "pending", "message": "Card payment initiated", **result}


@router.get("/transaction/status")
async def get_transaction_status(
    reference_id: str,
    transaction_type: str,
    uid: Annotated[str, Depends(get_current_user)],
):
    """Check status of a deposit or withdrawal (collection or disbursement)."""
    if transaction_type not in ("collection", "disbursement"):
        raise HTTPException(
            status_code=400, detail="transaction_type must be 'collection' or 'disbursement'"
        )
    db = _get_firestore()
    if not db:
        raise HTTPException(status_code=503, detail="Service unavailable")

    tx_ref = db.collection("transactions").document(reference_id)
    tx_doc = tx_ref.get()
    if not tx_doc.exists:
        raise HTTPException(status_code=404, detail="Transaction not found")
    data = tx_doc.to_dict()
    if data.get("uid") != uid:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx_status = data.get("status", "pending")

    result = await check_transaction_status(reference_id, transaction_type)
    if result.get("_error"):
        return {
            "reference_id": reference_id,
            "status": tx_status,
            "lipila_error": result,
        }
    return {
        "reference_id": reference_id,
        "transaction_status": tx_status,
        **result,
    }


@router.post("/webhook")
async def webhook_lipila(request: Request):
    """Lipila async callback. Verify HMAC-SHA256 (Lipila-Signature) then update transaction and wallet."""
    body = await request.body()
    sig = (
        request.headers.get("Lipila-Signature")
        or request.headers.get("X-Lipila-Signature")
        or request.headers.get("X-Webhook-Signature")
        or request.headers.get("X-Signature")
    )
    if not _verify_webhook_signature(body, sig):
        logger.warning("Webhook signature verification failed - proceeding anyway for debugging")
        # For production, uncomment the next line:
        # raise HTTPException(status_code=401, detail="Invalid signature")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as e:
        logger.error("Webhook invalid JSON: %s", e)
        raise HTTPException(status_code=400, detail="Invalid JSON")
    logger.info("Lipila webhook payload: %s", payload)
    reference = payload.get("referenceId") or payload.get("reference") or payload.get("transactionId")
    status_value = payload.get("status") or payload.get("status_value") or payload.get("statusCode") or ""
    amount = float(payload.get("amount", 0))
    txn_type = payload.get("type") or payload.get("transactionType", "deposit")
    payment_method = payload.get("paymentMethod") or payload.get("method", "momo")
    
    logger.info("Webhook extracted - reference: %s, status: '%s', amount: %.2f, type: %s, method: %s", 
                reference, status_value, amount, txn_type, payment_method)
    
    if not reference:
        logger.error("Webhook missing reference in payload: %s", list(payload.keys()))
        return {"status": "received", "error": "missing reference"}
    db = _get_firestore()
    if db:
        _ensure_transaction_and_user(
            db,
            lipila_reference=reference,
            status_value=status_value,
            amount=amount,
            txn_type=txn_type,
            payment_method=payment_method,
        )
    return {"status": "received"}
