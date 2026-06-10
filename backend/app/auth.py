# auth.py — Phase 1 + Phase 4
# ONLY contains: password hashing, JWT creation/decoding, token utilities
# NO imports from dependencies.py — that would cause circular imports

import bcrypt
import secrets
from jose import JWTError, jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY          = os.getenv("SECRET_KEY", "mysecretkey123")
ALGORITHM           = os.getenv("ALGORITHM", "HS256")
EXPIRE_MIN          = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update({
        "exp":  datetime.utcnow() + timedelta(minutes=EXPIRE_MIN),
        "type": "access"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token_value() -> str:
    return secrets.token_urlsafe(64)


def refresh_token_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)


def create_password_reset_token() -> str:
    return secrets.token_urlsafe(48)


def password_reset_expiry() -> datetime:
    return datetime.utcnow() + timedelta(hours=1)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
