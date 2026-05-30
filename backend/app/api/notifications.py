from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.dependencies import get_current_user
from app.models import User, Notification
from app.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notification & Alert Engine"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all operational notifications, sorted by timestamp descending.
    """
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(limit).all()


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a single notification as read.
    """
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
    
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n


@router.put("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks all notifications as read.
    """
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}
