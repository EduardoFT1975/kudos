"""
Middleware HTTP de seguridad · T1.5.

- BodySizeLimit: rechaza Content-Length > MAX_BODY_BYTES.
- SecurityHeaders: anade X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
"""
from __future__ import annotations

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


MAX_BODY_BYTES = 256 * 1024     # 256 KB (capsulas videos van por CDN, no por API)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rechaza requests demasiado grandes. NO buffer entero · usa Content-Length."""

    async def dispatch(self, request: Request, call_next) -> Response:
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": f"body excede {MAX_BODY_BYTES} bytes"},
            )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Anade headers basicos de seguridad a cada respuesta."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(self), microphone=()")
        return response
