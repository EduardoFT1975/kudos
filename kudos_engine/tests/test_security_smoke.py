"""Smoke tests T1.5 · seguridad."""
from __future__ import annotations

import os
os.environ.setdefault("JWT_SECRET", "test_secret_" + "x" * 40)

import pytest

from kudos_engine.security.cors import allowed_origins
from kudos_engine.security.validation import (
    validate_poi_id, validate_event_type, truncate_payload, truncate_reason,
    ALLOWED_EVENT_TYPES, MAX_PAYLOAD_BYTES,
)
from kudos_engine.security.trust import TrustLevel, DEFAULT_TRUST, quick_classify
from fastapi import HTTPException


# ───────── CORS ─────────

def test_cors_allowlist_includes_kudos_world():
    origins = allowed_origins()
    assert "https://kudos.world" in origins
    assert "https://www.kudos.world" in origins


def test_cors_does_not_include_wildcard():
    origins = allowed_origins()
    assert "*" not in origins


def test_cors_dev_adds_localhost(monkeypatch):
    monkeypatch.setenv("ENV", "development")
    # re-import not necessary; allowed_origins lee env en runtime
    origins = allowed_origins()
    assert "http://localhost:3000" in origins


def test_cors_prod_excludes_localhost(monkeypatch):
    monkeypatch.setenv("ENV", "production")
    origins = allowed_origins()
    assert "http://localhost:3000" not in origins


# ───────── Validation ─────────

def test_validate_poi_id_accepts_wd():
    validate_poi_id("wd-Q10285")
    validate_poi_id("wd-Q1")


def test_validate_poi_id_rejects_injection():
    with pytest.raises(HTTPException):
        validate_poi_id("'; DROP TABLE saves;--")
    with pytest.raises(HTTPException):
        validate_poi_id("../../../etc/passwd")
    with pytest.raises(HTTPException):
        validate_poi_id("x" * 200)


def test_validate_event_type_whitelist():
    validate_event_type("poi_view")
    validate_event_type("capsule_complete")
    with pytest.raises(HTTPException):
        validate_event_type("malicious_event")
    with pytest.raises(HTTPException):
        validate_event_type("")


def test_truncate_payload_rejects_oversized():
    big = {"x": "y" * (MAX_PAYLOAD_BYTES * 2)}
    with pytest.raises(HTTPException):
        truncate_payload(big)


def test_truncate_payload_accepts_small():
    p = {"duration_ms": 4200, "tag": "history"}
    assert truncate_payload(p) == p
    assert truncate_payload(None) == {}


def test_truncate_reason_cap():
    long_text = "a" * 5000
    assert len(truncate_reason(long_text)) == 500
    assert truncate_reason(None) is None


# ───────── Trust Layer ─────────

def test_trust_default_is_normal():
    assert DEFAULT_TRUST == TrustLevel.NORMAL


def test_trust_quick_classify_bot():
    assert quick_classify(events_in_session=3000, session_age_s=10, has_user_id=False) == TrustLevel.BOT


def test_trust_quick_classify_suspect():
    assert quick_classify(events_in_session=800, session_age_s=30, has_user_id=True) == TrustLevel.SUSPECT


def test_trust_quick_classify_trusted_user_with_history():
    assert quick_classify(events_in_session=50, session_age_s=7200, has_user_id=True) == TrustLevel.TRUSTED


def test_trust_quick_classify_normal_default():
    assert quick_classify(events_in_session=20, session_age_s=120, has_user_id=False) == TrustLevel.NORMAL
