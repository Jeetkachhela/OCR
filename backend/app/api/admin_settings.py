from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.dependencies import get_current_user
from app.models import User, AuditLog
from app.core.system_settings import runtime_settings

router = APIRouter(prefix="/admin/settings", tags=["Administrative Settings Engine"])

class SettingsUpdateSchema(BaseModel):
    rate_limiting_enabled: bool
    cdn_optimization_enabled: bool
    qdrant_sync_enabled: bool
    log_level: str

@router.get("")
def get_system_settings(current_user: User = Depends(get_current_user)):
    """
    Retrieves the active global system security and performance settings.
    Enforces strict administrator role verification.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    
    return {
        "rate_limiting_enabled": runtime_settings.rate_limiting_enabled,
        "cdn_optimization_enabled": runtime_settings.cdn_optimization_enabled,
        "qdrant_sync_enabled": runtime_settings.qdrant_sync_enabled,
        "log_level": runtime_settings.log_level
    }

@router.put("")
def update_system_settings(
    payload: SettingsUpdateSchema,
    current_user: User = Depends(get_current_user)
):
    """
    Updates global system security policies in real-time.
    Propagates changes immediately to database, storage, and caching layers.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )

    # Apply properties
    runtime_settings.rate_limiting_enabled = payload.rate_limiting_enabled
    runtime_settings.cdn_optimization_enabled = payload.cdn_optimization_enabled
    runtime_settings.qdrant_sync_enabled = payload.qdrant_sync_enabled
    runtime_settings.log_level = payload.log_level
    runtime_settings.save_settings()

    # Dynamic log level adjustment
    import logging
    root_logger = logging.getLogger()
    if payload.log_level == "DEBUG":
        root_logger.setLevel(logging.DEBUG)
    elif payload.log_level == "INFO":
        root_logger.setLevel(logging.INFO)
    elif payload.log_level == "WARNING":
        root_logger.setLevel(logging.WARNING)
    elif payload.log_level == "ERROR":
        root_logger.setLevel(logging.ERROR)

    return {
        "status": "success",
        "message": "Global runtime policies updated and propagated successfully.",
        "settings": {
            "rate_limiting_enabled": runtime_settings.rate_limiting_enabled,
            "cdn_optimization_enabled": runtime_settings.cdn_optimization_enabled,
            "qdrant_sync_enabled": runtime_settings.qdrant_sync_enabled,
            "log_level": runtime_settings.log_level
        }
    }


# --- User Management & Privilege Controls for Admins ---

@router.get("/users")
def list_system_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all users registered in the Aetheria platform.
    Restricted entirely to Administrators.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    
    # Query all users from db
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at
        }
        for u in users
    ]


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enables/Disables operator accounts, immediately revoking/restoring session access keys.
    Restricted entirely to Administrators.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    
    # Do not allow admin to deactivate themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-deactivation is restricted to prevent complete administrative lockout."
        )
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested user was not found."
        )
        
    # Toggle status
    target_user.is_active = not target_user.is_active
    db.commit()
    db.refresh(target_user)
    
    # Audit log
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="USER_STATUS_TOGGLE",
        details=f"Admin updated user {target_user.email} state to: {'ACTIVE' if target_user.is_active else 'INACTIVE'}"
    )
    db.add(audit_entry)
    db.commit()
    
    return {
        "status": "success",
        "message": f"User {target_user.email} is now {'active' if target_user.is_active else 'inactive'}.",
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "is_active": target_user.is_active
        }
    }
