import datetime
from typing import Optional, Union, Any
import jwt
import bcrypt

# Monkeypatch passlib bcrypt bug on modern bcrypt versions
if not hasattr(bcrypt, "__about__"):
    class MockAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = MockAbout()

from passlib.context import CryptContext
from fastapi import Request, HTTPException, status
from app.core.config import settings

# Initialize CryptContext for bcrypt password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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
