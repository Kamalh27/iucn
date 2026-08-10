from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass

from fastapi import HTTPException, status

from .config import settings


@dataclass(frozen=True)
class TokenPayload:
    sub: str
    email: str
    role: str
    exp: int


class TokenBlocklist:
    def __init__(self) -> None:
        self._revoked_tokens: set[str] = set()

    def revoke(self, token: str) -> None:
        self._revoked_tokens.add(token)

    def is_revoked(self, token: str) -> bool:
        return token in self._revoked_tokens


blocklist = TokenBlocklist()


def hash_password(password: str, *, salt: str | None = None, rounds: int = 310_000) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        rounds,
    )
    encoded = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
    return f"pbkdf2_sha256${rounds}${salt_value}${encoded}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, rounds_value, salt, _digest = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hash_password(password, salt=salt, rounds=int(rounds_value))
    except (TypeError, ValueError):
        return False
    return hmac.compare_digest(candidate, password_hash)


def _sign(payload: str) -> str:
    signature = hmac.new(
        settings.app_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")


def create_access_token(*, user_id: str, email: str, role: str) -> str:
    expires_at = int(time.time()) + settings.access_token_expire_minutes * 60
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expires_at,
    }
    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8").rstrip("=")
    signature_b64 = _sign(payload_b64)
    return f"{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> TokenPayload:
    if blocklist.is_revoked(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    expected_signature = _sign(payload_b64)
    if not hmac.compare_digest(signature_b64, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

    padding = "=" * (-len(payload_b64) % 4)
    payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
    data = json.loads(payload_bytes.decode("utf-8"))

    exp = int(data.get("exp", 0))
    if exp < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    user_id = data.get("sub")
    email = data.get("email")
    role = data.get("role")

    if not isinstance(user_id, str) or not isinstance(email, str) or not isinstance(role, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    return TokenPayload(sub=user_id, email=email, role=role, exp=exp)
