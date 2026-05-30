import datetime
from typing import Optional, Union, Any
import jwt
import bcrypt
from fastapi import Request
from app.core.config import settings

# Hashing is performed directly using the native 'bcrypt' package to prevent
# unmaintained passlib library errors on newer bcrypt versions (e.g. bcrypt 5.0.0+).

def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using native bcrypt.
    """
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a bcrypt hash.
    Supports standard passlib/bcrypt hashes seamlessly.
    """
    try:
        password_bytes = plain_password.encode("utf-8")
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_token_from_request(request: Request) -> Optional[str]:
    """
    Tries to retrieve the token first from an HTTP-only cookie,
    and secondarily from the standard Authorization Header (Bearer token).
    This meets our strict no-localStorage security requirements.
    """
    # 1. Cookie check
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        # Check if cookie contains "Bearer " prefix and strip if necessary
        if cookie_token.startswith("Bearer "):
            return cookie_token[7:]
        return cookie_token

    # 2. Authorization Header check
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]

    return None

def verify_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        return None
