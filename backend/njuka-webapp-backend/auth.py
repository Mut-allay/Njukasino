"""
Firebase ID token authentication for FastAPI.
Verifies Bearer token via firebase_admin.auth.verify_id_token and returns uid.
"""
import logging
from typing import Annotated

from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)


def _get_firebase_auth():
    try:
        from firebase_admin import auth as fb_auth
        return fb_auth
    except Exception as e:
        logger.error("Firebase auth not available: %s", e)
        return None


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """
    Verify Firebase ID token from Authorization: Bearer <token> and return uid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
        )

    fb_auth = _get_firebase_auth()
    if not fb_auth:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        )

    try:
        decoded = fb_auth.verify_id_token(token)
        uid = decoded.get("uid") or decoded.get("sub")
        if not uid:
            raise ValueError("No uid in token")
        return uid
    except Exception as e:
        logger.warning("Firebase token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from e
