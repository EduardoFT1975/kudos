"""
Verifica id_token de Google OAuth contra JWKS publicas.

Uso:
  payload = await verify_google_id_token(id_token)
  email = payload["email"]
  sub = payload["sub"]
"""
from __future__ import annotations

import os
from typing import Dict, Any

import httpx
from jose import jwt, jwk
from jose.utils import base64url_decode


GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")


# Cache de JWKS (10 min)
_jwks_cache: Dict[str, Any] = {}
_jwks_cache_ts: float = 0
_JWKS_TTL = 600


async def _get_jwks() -> Dict[str, Any]:
    import time
    global _jwks_cache, _jwks_cache_ts
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_ts) < _JWKS_TTL:
        return _jwks_cache
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(GOOGLE_JWKS_URL)
        r.raise_for_status()
        _jwks_cache = r.json()
        _jwks_cache_ts = now
    return _jwks_cache


class GoogleVerifyError(Exception):
    """Token Google invalido."""


async def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifica firma + claims contra Google JWKS.
    Devuelve payload con: sub, email, email_verified, name, picture, aud, iss, exp.
    """
    audience = os.getenv("GOOGLE_CLIENT_ID")
    if not audience:
        raise GoogleVerifyError("GOOGLE_CLIENT_ID env var no definida")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except Exception as e:
        raise GoogleVerifyError(f"Header invalido: {e}")

    kid = unverified_header.get("kid")
    if not kid:
        raise GoogleVerifyError("id_token sin kid")

    jwks = await _get_jwks()
    key_data = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key_data = k
            break
    if not key_data:
        raise GoogleVerifyError(f"kid {kid} no encontrado en JWKS Google")

    try:
        payload = jwt.decode(
            id_token,
            key_data,
            algorithms=[unverified_header.get("alg", "RS256")],
            audience=audience,
            options={"verify_aud": True, "verify_iss": False},  # iss manual
        )
    except Exception as e:
        raise GoogleVerifyError(f"verify falla: {e}")

    iss = payload.get("iss")
    if iss not in GOOGLE_ISSUERS:
        raise GoogleVerifyError(f"iss invalido: {iss}")

    if not payload.get("email_verified"):
        raise GoogleVerifyError("email no verificado en Google")

    return payload
