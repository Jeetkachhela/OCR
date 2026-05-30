from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.dependencies import get_current_user
from app.models import User
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
