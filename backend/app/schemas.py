from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth & User ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "operator"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    full_name: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# --- Extracted Fields ---
class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class ExtractedFieldBase(BaseModel):
    field_name: str
    field_value: Optional[str] = None
    confidence: float
    bounding_box: Optional[Dict[str, Any]] = None
    is_corrected: bool = False

class ExtractedFieldResponse(ExtractedFieldBase):
    id: int
    original_value: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FieldCorrection(BaseModel):
    field_id: int
    corrected_value: str


# --- OCR Results ---
class OCRResultResponse(BaseModel):
    id: int
    raw_text: str
    page_count: int
    avg_confidence: float
    processed_at: datetime

    class Config:
        from_attributes = True


# --- Validation Results ---
class ValidationErrorDetail(BaseModel):
    code: str
    message: str

class ValidationResultResponse(BaseModel):
    id: int
    is_valid: bool
    validation_errors: Optional[List[ValidationErrorDetail]] = None
    validated_at: datetime

    class Config:
        from_attributes = True


# --- AI Insights ---
class AIInsightResponse(BaseModel):
    id: int
    summary: Optional[str] = None
    risk_level: str
    delay_risk_explanation: Optional[str] = None
    recommendations: Optional[List[str]] = None
    generated_at: datetime

    class Config:
        from_attributes = True


# --- Document ---
class DocumentBase(BaseModel):
    filename: str
    mime_type: str
    file_size: int

class DocumentResponse(DocumentBase):
    id: int
    status: str
    hash_sha256: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    ocr_results: List[OCRResultResponse] = []
    extracted_fields: List[ExtractedFieldResponse] = []
    validation_results: List[ValidationResultResponse] = []
    ai_insights: List[AIInsightResponse] = []

    class Config:
        from_attributes = True


# --- Semantic Search ---
class SearchRequest(BaseModel):
    query: str
    limit: int = 5

class SearchMatchResponse(BaseModel):
    document_id: int
    filename: str
    mime_type: str
    similarity_score: float
    matched_text_snippet: str
    status: str
    created_at: datetime

class SearchResponse(BaseModel):
    query: str
    matches: List[SearchMatchResponse]


# --- Operational Analytics ---
class AnalyticsSummaryResponse(BaseModel):
    total_processed: int
    processing_success_rate: float
    avg_ocr_confidence: float
    active_anomalies_count: int
    processing_volume_trend: List[Dict[str, Any]]
    confidence_distribution: List[Dict[str, Any]]
    document_type_split: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


# --- Notifications & Alerts ---
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    level: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Audit Logs ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
