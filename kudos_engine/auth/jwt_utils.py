"""
JWT encode / decode / rotation utilities.

Diseno H1.T1.0:
  Access HS256 15 minutos
  Refresh HS256 7 dias con jti unico + rotacion estricta
"""
from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple

from jose import jwt, JWTError


JWT_ALG = "HS256"
ACCESS_TTL_MIN = 15
REFRESH_TTL_DAYS = 7
ISSUER = "kudos.world"


class AuthError(Exception):
    """Raised cuando un token es invalido o expirado."""


def _secret() -> str:
    s = os.getenv("JWT_SECRET")
    if not s or len(s) < 32:
        raise RuntimeError(
            "JWT_SECRET no definida o demasiado corta (>=32 chars). "
            "Setea env var en Render. Genera con: openssl rand -hex 48"
        )
    return s


def encode_access(user_id: uuid.UUID, *,
                   interest: Optional[str] = None,
                   scope: str = "user") -> Tuple[str, datetime]:
    """Emite access token. Devuelve (token, exp_datetime)."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=ACCESS_TTL_MIN)
    payload: Dict[str, Any] = {
        "iss": ISSUER,
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "scope": scope,
    }
    if interest:
        payload["interest"] = interest
    token = jwt.encode(payload, _secret(), algorithm=JWT_ALG)
    return token, exp


def encode_refresh(user_id: uuid.UUID) -> Tuple[str, str, datetime]:
    """Emite refresh token. Devuelve (token, jti, exp_datetime)."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=REFRESH_TTL_DAYS)
    jti = uuid.uuid4().hex
    payload: Dict[str, Any] = {
        "iss": ISSUER,
        "sub": str(user_id),
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, _secret(), algorithm=JWT_ALG)
    return token, jti, exp


def decode_token(token: str) -> Dict[str, Any]:
    """Decode + verify. Lanza AuthError si invalido."""
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALG], issuer=ISSUER)
        return payload
    except JWTError as e:
        raise AuthError(f"JWT invalido: {e}")


def hash_token(token: str) -> str:
    """SHA256 del JWT entero. Usado para guardar en refresh_tokens.hash."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_ip(ip: str) -> str:
    """SHA256 truncado. NO guardamos IP en claro."""
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:32] if ip else ""
