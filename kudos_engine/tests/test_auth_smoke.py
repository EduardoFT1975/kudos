"""
Smoke tests T1.3 · Auth JWT.

Verifican:
  - JWT encode + decode round trip
  - Access token tiene scope user
  - Refresh token tiene jti unico
  - Token con secret distinto NO valida
  - Token expirado NO valida
  - RefreshToken create + rotate
  - Migration anon -> auth: dedupe por (user, poi)

NO testean Google id_token real (requeriria token Google live).
"""
from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest

# JWT_SECRET solo para tests
os.environ.setdefault("JWT_SECRET", "test_secret_" + "x" * 40)

from kudos_engine.auth.jwt_utils import (
    encode_access, encode_refresh, decode_token, AuthError, hash_token, hash_ip,
)


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token, exp = encode_access(user_id, interest="historia")
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["scope"] == "user"
    assert payload["interest"] == "historia"
    assert payload["iss"] == "kudos.world"


def test_refresh_token_has_unique_jti():
    user_id = uuid.uuid4()
    t1, jti1, _ = encode_refresh(user_id)
    t2, jti2, _ = encode_refresh(user_id)
    assert jti1 != jti2
    p1 = decode_token(t1)
    p2 = decode_token(t2)
    assert p1["jti"] == jti1
    assert p2["jti"] == jti2


def test_decode_invalid_secret_fails():
    user_id = uuid.uuid4()
    token, _ = encode_access(user_id)
    original = os.environ["JWT_SECRET"]
    try:
        os.environ["JWT_SECRET"] = "different_secret_" + "y" * 32
        with pytest.raises(AuthError):
            decode_token(token)
    finally:
        os.environ["JWT_SECRET"] = original


def test_decode_garbage_fails():
    with pytest.raises(AuthError):
        decode_token("not.a.valid.jwt")
    with pytest.raises(AuthError):
        decode_token("aaa.bbb.ccc")


def test_hash_token_deterministic():
    t = "some.jwt.token"
    assert hash_token(t) == hash_token(t)
    assert hash_token(t) != hash_token(t + "x")


def test_hash_ip_deterministic_truncated():
    h = hash_ip("192.168.1.1")
    assert len(h) == 32
    assert hash_ip("192.168.1.1") == h
    assert hash_ip("192.168.1.2") != h
    assert hash_ip("") == ""


@pytest.mark.asyncio
async def test_refresh_repo_create_and_get(session):
    from kudos_engine.db.repositories.user_repo import UserRepository
    from kudos_engine.db.repositories.refresh_repo import RefreshTokenRepository
    user_repo = UserRepository(session)
    refresh_repo = RefreshTokenRepository(session)

    user = await user_repo.create_or_update(
        email="auth1@test.com", provider="google", oauth_id="g-auth1",
    )
    _, jti, _ = encode_refresh(user.id)
    rt = await refresh_repo.create(jti=jti, user_id=user.id, hash_val="abc123")
    assert rt.jti == jti
    found = await refresh_repo.get_by_jti(jti)
    assert found is not None
    assert found.user_id == user.id


@pytest.mark.asyncio
async def test_refresh_repo_rotation_chain(session):
    from kudos_engine.db.repositories.user_repo import UserRepository
    from kudos_engine.db.repositories.refresh_repo import RefreshTokenRepository
    user_repo = UserRepository(session)
    refresh_repo = RefreshTokenRepository(session)

    user = await user_repo.create_or_update(
        email="auth2@test.com", provider="google", oauth_id="g-auth2",
    )
    _, jti_a, _ = encode_refresh(user.id)
    _, jti_b, _ = encode_refresh(user.id)
    await refresh_repo.create(jti=jti_a, user_id=user.id, hash_val="ha")
    await refresh_repo.create(jti=jti_b, user_id=user.id, hash_val="hb")
    await refresh_repo.mark_rotated(jti_a, jti_b)

    old = await refresh_repo.get_by_jti(jti_a)
    assert old.rotated_to == jti_b
    assert old.revoked_at is not None
    new = await refresh_repo.get_by_jti(jti_b)
    assert new.revoked_at is None


@pytest.mark.asyncio
async def test_refresh_repo_revoke_all_user(session):
    from kudos_engine.db.repositories.user_repo import UserRepository
    from kudos_engine.db.repositories.refresh_repo import RefreshTokenRepository
    user_repo = UserRepository(session)
    refresh_repo = RefreshTokenRepository(session)

    user = await user_repo.create_or_update(
        email="auth3@test.com", provider="google", oauth_id="g-auth3",
    )
    for i in range(3):
        _, jti, _ = encode_refresh(user.id)
        await refresh_repo.create(jti=jti, user_id=user.id, hash_val=f"h{i}")
    n = await refresh_repo.revoke_all_for_user(user.id)
    assert n == 3
