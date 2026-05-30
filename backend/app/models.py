import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="operator")  # admin, operator, analyst, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False, index=True)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String, default="queued")  # queued, processing, completed, failed
    hash_sha256 = Column(String, unique=True, index=True, nullable=False) # Duplicate uploads detection
    file_path = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    ocr_results = relationship("OCRResult", back_populates="document", cascade="all, delete-orphan")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="document", cascade="all, delete-orphan")
    ai_insights = relationship("AIInsight", back_populates="document", cascade="all, delete-orphan")


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    raw_text = Column(Text, nullable=False)
    page_count = Column(Integer, default=1)
    avg_confidence = Column(Float, default=0.0)
    processed_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="ocr_results")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String, nullable=False, index=True) # e.g. shipment_id, sender_name, tracking_number
    field_value = Column(String, nullable=True)
    original_value = Column(String, nullable=True) # Before operators manually edit it
    confidence = Column(Float, default=1.0)
    bounding_box = Column(JSON, nullable=True) # [x_min, y_min, x_max, y_max] / structural positioning
    is_corrected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="extracted_fields")


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(JSON, nullable=True)  # List of validation errors: {"code": "missing_weight", "message": "..."}
    validated_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="validation_results")


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, nullable=True)
    risk_level = Column(String, default="low")  # low, medium, high, critical
    delay_risk_explanation = Column(Text, nullable=True)
    recommendations = Column(JSON, nullable=True)  # List of actions: ["Check customs form index A", "Confirm shipper phone"]
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="ai_insights")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # failed_ocr, anomaly_detected, security_alert, system_issue
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    level = Column(String, default="info")  # info, warning, error
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False, index=True)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
