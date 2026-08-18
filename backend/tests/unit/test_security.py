from __future__ import annotations

import time

import pytest
from fastapi import HTTPException

from app.core import security

pytestmark = pytest.mark.unit


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = security.hash_password("correct horse battery staple")
        assert "correct horse battery staple" not in hashed
        assert hashed.startswith("pbkdf2_sha256$")

    def test_same_password_hashes_differently_each_time(self):
        first = security.hash_password("same-password")
        second = security.hash_password("same-password")
        assert first != second  # random salt per call

    def test_verify_password_accepts_correct_password(self):
        hashed = security.hash_password("s3cret!")
        assert security.verify_password("s3cret!", hashed) is True

    def test_verify_password_rejects_wrong_password(self):
        hashed = security.hash_password("s3cret!")
        assert security.verify_password("wrong-password", hashed) is False

    def test_verify_password_rejects_malformed_hash(self):
        assert security.verify_password("anything", "not-a-real-hash") is False

    def test_verify_password_rejects_unknown_algorithm(self):
        forged = "bcrypt$10$somesalt$somedigest"
        assert security.verify_password("anything", forged) is False


class TestAccessTokens:
    def test_round_trip(self):
        token = security.create_access_token(user_id="user-1", email="a@b.com", role="admin")
        payload = security.decode_access_token(token)
        assert payload.sub == "user-1"
        assert payload.email == "a@b.com"
        assert payload.role == "admin"

    def test_tampered_payload_is_rejected(self):
        token = security.create_access_token(user_id="user-1", email="a@b.com", role="user")
        payload_b64, signature_b64 = token.split(".", 1)
        # Flip the role claim without re-signing.
        tampered = security.base64.urlsafe_b64encode(b'{"sub":"user-1","email":"a@b.com","role":"admin","exp":9999999999}').decode().rstrip("=")
        forged_token = f"{tampered}.{signature_b64}"
        with pytest.raises(HTTPException) as exc:
            security.decode_access_token(forged_token)
        assert exc.value.status_code == 401

    def test_missing_dot_separator_is_rejected(self):
        with pytest.raises(HTTPException) as exc:
            security.decode_access_token("not-a-valid-token")
        assert exc.value.status_code == 401

    def test_expired_token_is_rejected(self):
        stale_payload = security.json.dumps({
            "sub": "user-1", "email": "a@b.com", "role": "user", "exp": int(time.time()) - 10,
        }, separators=(",", ":"))
        payload_b64 = security.base64.urlsafe_b64encode(stale_payload.encode()).decode().rstrip("=")
        signature_b64 = security._sign(payload_b64)
        token = f"{payload_b64}.{signature_b64}"
        with pytest.raises(HTTPException) as exc:
            security.decode_access_token(token)
        assert exc.value.status_code == 401
        assert "expired" in exc.value.detail.lower()

    def test_revoked_token_is_rejected(self):
        token = security.create_access_token(user_id="user-1", email="a@b.com", role="user")
        security.blocklist.revoke(token)
        try:
            with pytest.raises(HTTPException) as exc:
                security.decode_access_token(token)
            assert exc.value.status_code == 401
        finally:
            security.blocklist._revoked_tokens.clear()

    def test_token_invalid_after_secret_rotation(self):
        token = security.create_access_token(user_id="user-1", email="a@b.com", role="user")

        object.__setattr__(security.settings, "app_secret", "a-completely-different-secret")
        try:
            with pytest.raises(HTTPException) as exc:
                security.decode_access_token(token)
            assert exc.value.status_code == 401
        finally:
            object.__setattr__(security.settings, "app_secret", "test-secret-key")
