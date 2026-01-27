"""
Lipila Payment Gateway client (Zambian MoMo + Card).
Sandbox: https://api.lipila.dev/api/v1
Auth: x-api-key header. Rate limit: 1 retry on 429.
"""
import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

LIPILA_BASE_URL = os.getenv("LIPILA_BASE_URL", "https://api.lipila.dev/api/v1")
LIPILA_API_KEY = os.getenv("LIPILA_API_KEY", "")


def _headers() -> dict[str, str]:
    return {
        "x-api-key": LIPILA_API_KEY,
        "Content-Type": "application/json",
    }


async def _request(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
    params: dict[str, str] | None = None,
) -> dict[str, Any]:
    url = f"{LIPILA_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    max_attempts = 2  # 1 retry on 429
    for attempt in range(max_attempts):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.request(
                    method,
                    url,
                    headers=_headers(),
                    json=json_body,
                    params=params,
                )
                if resp.status_code == 429 and attempt < max_attempts - 1:
                    logger.warning("Lipila rate limit (429), retrying once...")
                    await asyncio.sleep(2.0 * (attempt + 1))
                    continue
                data = resp.json() if resp.content else {}
                if resp.status_code >= 400:
                    logger.error(
                        "Lipila API error: status=%s body=%s",
                        resp.status_code,
                        data,
                    )
                    return {"_error": True, "status_code": resp.status_code, "body": data}
                return data
        except httpx.RequestError as e:
            logger.error("Lipila request error: %s", e)
            if attempt == max_attempts - 1:
                return {"_error": True, "request_error": str(e)}
            await asyncio.sleep(1.0 * (attempt + 1))
    return {"_error": True, "message": "Max retries exceeded"}


async def initiate_momo_deposit(
    amount: float,
    phone: str,
    reference: str,
    callback_url: str,
) -> dict[str, Any]:
    """
    Initiate a mobile money collection (deposit) via Lipila.
    POST /collections/mobile-money
    """
    payload = {
        "amount": amount,
        "phone": phone if phone.startswith("+") else f"+260{phone.lstrip('0')}"[:12],
        "referenceId": reference,
        "callbackUrl": callback_url,
        "currency": "ZMW",
    }
    return await _request("POST", "collections/mobile-money", json_body=payload)


async def initiate_momo_withdrawal(
    amount: float,
    phone: str,
    reference: str,
    callback_url: str,
) -> dict[str, Any]:
    """
    Initiate a mobile money disbursement (withdrawal) via Lipila.
    POST /disbursements/mobile-money
    """
    payload = {
        "amount": amount,
        "phone": phone if phone.startswith("+") else f"+260{phone.lstrip('0')}"[:12],
        "referenceId": reference,
        "callbackUrl": callback_url,
        "currency": "ZMW",
    }
    return await _request("POST", "disbursements/mobile-money", json_body=payload)


async def initiate_card_payment(
    amount: float,
    card_details: dict[str, Any],
    reference: str,
    callback_url: str,
) -> dict[str, Any]:
    """
    Initiate a card collection via Lipila.
    POST /collections/card
    card_details: { "cardNumber", "expiryMonth", "expiryYear", "cvv" }
    """
    payload = {
        "amount": amount,
        "currency": "ZMW",
        "referenceId": reference,
        "callbackUrl": callback_url,
        **card_details,
    }
    return await _request("POST", "collections/card", json_body=payload)


async def check_transaction_status(
    reference_id: str,
    transaction_type: str,
) -> dict[str, Any]:
    """
    Check status of a collection or disbursement.
    transaction_type: "collection" | "disbursement"
    GET /collections/check-status or GET /disbursements/check-status
    """
    if transaction_type == "disbursement":
        path = "disbursements/check-status"
    else:
        path = "collections/check-status"
    return await _request(
        "GET",
        path,
        params={"referenceId": reference_id},
    )
