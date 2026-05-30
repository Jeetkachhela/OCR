from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.db import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models import User, AuditLog
from app.schemas import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user in the system with roles.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists in the system."
        )
    
    hashed_pwd = hash_password(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log action
    audit_entry = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTRATION",
        details=f"User registered with role: {new_user.role}"
    )
    db.add(audit_entry)
    db.commit()

    return new_user


@router.post("/login", response_model=Token)
def login(response: Response, request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates a user and sets an HTTP-Only secure cookie containing the JWT access token.
    Also returns token parameters for client stores.
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password combination."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your user account is currently deactivated."
        )

    # Issue JWT access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": user.email,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }
    token_str = create_access_token(data=token_payload, expires_delta=access_token_expires)

    # Set secure HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token_str}",
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=True  # Production-grade HTTPS enforce (browsers allow secure cookies on localhost over HTTP)
    )

    # Log authentication audit
    client_ip = request.client.host if request.client else "unknown"
    audit_entry = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        details=f"User successfully logged in. IP: {client_ip}",
        ip_address=client_ip
    )
    db.add(audit_entry)
    db.commit()

    return Token(
        access_token=token_str,
        token_type="bearer",
        role=user.role,
        email=user.email,
        full_name=user.full_name
    )


@router.post("/logout")
def logout(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Clears the authentication HTTP-Only cookie, invalidating the session.
    """
    response.delete_cookie("access_token")
    
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="USER_LOGOUT",
        details="User successfully logged out."
    )
    db.add(audit_entry)
    db.commit()

    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns profile information for the currently active session.
    """
    return current_user
