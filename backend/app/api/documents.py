import hashlib
import logging
import datetime
import random
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.db import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Document, OCRResult, ExtractedField, ValidationResult, AIInsight, Notification, AuditLog
from app.schemas import DocumentResponse, DocumentDetailResponse, FieldCorrection
from app.services.ocr_service import OCRService
from app.services.ai_service import AIService
from app.services.validation_service import ValidationService
from app.services.vector_service import VectorService
from app.services.cloudinary_service import CloudinaryService, LOCAL_UPLOAD_DIR

logger = logging.getLogger("documents_router")
router = APIRouter(prefix="/documents", tags=["Document Ingestion & Extraction Pipeline"])

def execute_ingestion_pipeline(document_id: int, filename: str, file_bytes: bytes, user_id: int, db_session_maker):
    """
    Asynchronous background task executing the heavy cognitive processing pipelines:
    OCR deskewing, Groq Llama-3 entity parsing, Validation, Vector indexing, and Auditing.
    Runs non-blockingly inside the FastAPI native background worker thread pool.
    """
    logger.info(f"Background worker initiating processing for Doc ID: {document_id} ('{filename}')")
    db = db_session_maker()
    
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        db.close()
        return

    try:
        # 1. OCR text layout coordinate bounds extraction
        ocr_out = OCRService.extract_text(filename, file_bytes)
        
        ocr_result = OCRResult(
            document_id=doc.id,
            raw_text=ocr_out["raw_text"],
            page_count=ocr_out["page_count"],
            avg_confidence=ocr_out["avg_confidence"]
        )
        db.add(ocr_result)
        db.commit()

        # 2. Extract structured semantics using Llama-3 (Groq API fallbacks)
        ai_out = AIService.analyze_document(ocr_out["raw_text"], filename)

        # 3. Mapped extracted fields with approximate bounding box coordinates
        field_mappings = {
            "shipment_id": ai_out.get("shipment_id"),
            "sender_name": ai_out.get("sender_name"),
            "sender_address": ai_out.get("sender_address"),
            "receiver_name": ai_out.get("receiver_name"),
            "receiver_address": ai_out.get("receiver_address"),
            "shipment_weight": ai_out.get("shipment_weight"),
            "tracking_number": ai_out.get("tracking_number"),
            "invoice_reference": ai_out.get("invoice_reference"),
            "cargo_type": ai_out.get("cargo_type")
        }

        # Associate bounding boxes from OCR blocks to matching fields to render coordinates
        for field_name, value in field_mappings.items():
            box = None
            if value:
                clean_val = str(value).lower()
                for block in ocr_out["text_blocks"]:
                    if clean_val in block["text"].lower() or block["text"].lower() in clean_val:
                        box = block["bbox"]
                        break
            
            if not box:
                # Approximate bounding box coordinates generator
                random_x = int(100 + 400 * (1 if "sender" in field_name else 0))
                random_y = 150 + int(300 * (1 if "receiver" in field_name else 0))
                box = [random_x, random_y, random_x + 300, random_y + 40]

            ext_field = ExtractedField(
                document_id=doc.id,
                field_name=field_name,
                field_value=str(value) if value else None,
                original_value=str(value) if value else None,
                confidence=ocr_out["avg_confidence"],
                bounding_box={"bbox": box}
            )
            db.add(ext_field)
        
        # 4. Perform business rule validations
        is_valid, validation_errors = ValidationService.validate_extracted_fields(
            field_mappings, 
            ocr_out["avg_confidence"]
        )
        
        val_res = ValidationResult(
            document_id=doc.id,
            is_valid=is_valid,
            validation_errors=validation_errors
        )
        db.add(val_res)

        # Trigger alerts for anomalous documents
        if not is_valid:
            for error in validation_errors:
                anomaly_alert = Notification(
                    type="anomaly_detected",
                    title="Cargo Discrepancy Flagged",
                    message=f"Document '{filename}' audit failed: {error['message']}",
                    level="error" if "low" in error["code"] or "heavy" in error["code"] else "warning"
                )
                db.add(anomaly_alert)

        # 5. Generate AI insights summaries
        insight = AIInsight(
            document_id=doc.id,
            summary=ai_out.get("summary"),
            risk_level=ai_out.get("risk_level", "low"),
            delay_risk_explanation=ai_out.get("delay_risk_explanation"),
            recommendations=ai_out.get("recommendations", [])
        )
        db.add(insight)

        # 6. Index document semantically inside Qdrant Cloud Vector DB
        VectorService.index_document(
            document_id=doc.id,
            filename=doc.filename,
            mime_type=doc.mime_type,
            text=f"Filename: {doc.filename}\nType: {ocr_out.get('document_type')}\n{ocr_out['raw_text']}",
            status="completed"
        )

        doc.status = "completed"
        db.commit()

        # Log audit entry
        audit_entry = AuditLog(
            user_id=user_id,
            action="DOCUMENT_PIPELINE_COMPLETE",
            details=f"Asynchronous pipeline completed for: '{filename}' (Doc ID: {doc.id})",
            ip_address="background_worker"
        )
        db.add(audit_entry)
        db.commit()

    except Exception as pipeline_err:
        logger.error(f"Async pipeline crashed for '{filename}': {pipeline_err}")
        db.rollback()
        
        doc.status = "failed"
        doc.error_message = str(pipeline_err)
        db.commit()

        system_alert = Notification(
            type="system_issue",
            title="Async Pipeline Failure",
            message=f"Processing crashed for file '{filename}': {str(pipeline_err)}",
            level="error"
        )
        db.add(system_alert)
        db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests file uploads asynchronously. Prevents duplicates using SHA-256 digests.
    Saves file payload in Cloudinary or local fallback directories, queues pipeline tasks, 
    and returns processing logs in 50ms.
    """
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file.content_type}'. Accepts PDFs and Images."
        )

    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds standard limits (15MB)."
        )

    # SHA-256 Integrity check
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()
    existing_doc = db.query(Document).filter(Document.hash_sha256 == sha256_hash).first()
    if existing_doc:
        logger.info(f"Duplicate upload blocked. Reference ID: {existing_doc.id}")
        
        db.add(Notification(
            type="duplicate_detected",
            title="Duplicate File Ignored",
            message=f"Upload blocked for file '{file.filename}'. Referencing ID: {existing_doc.id}.",
            level="warning"
        ))
        db.commit()
        return existing_doc

    # Save file securely using Cloudinary or Local Fallback Storage
    file_storage_path = CloudinaryService.upload_file(file_bytes, file.filename, sha256_hash)

    # Ingest baseline Document record
    new_doc = Document(
        filename=file.filename,
        mime_type=file.content_type,
        file_size=len(file_bytes),
        hash_sha256=sha256_hash,
        file_path=file_storage_path,
        status="processing"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Log initial upload audit
    client_ip = request.client.host if request.client else "unknown"
    db.add(AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_UPLOADED",
        details=f"Uploaded document '{file.filename}' queued for parsing. Storage: {file_storage_path}",
        ip_address=client_ip
    ))
    db.commit()

    # Retrieve base session maker for background task database access
    from app.core.db import SessionLocal
    background_tasks.add_task(
        execute_ingestion_pipeline, 
        new_doc.id, 
        file.filename, 
        file_bytes, 
        current_user.id, 
        SessionLocal
    )

    return new_doc


@router.get("/file/{hash_sha256}")
def stream_uploaded_file(
    hash_sha256: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Streams file bytes from local uploads storage if local fallback storage is active.
    """
    # Find document to resolve extension type
    doc = db.query(Document).filter(Document.hash_sha256 == hash_sha256).first()
    if not doc:
        raise HTTPException(status_code=404, detail="File could not be found.")

    ext = doc.filename.split(".")[-1].lower()
    local_path = os.path.join(LOCAL_UPLOAD_DIR, f"{hash_sha256}.{ext}")
    
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Localized persistent file scan does not exist on disk.")

    return FileResponse(local_path, media_type=doc.mime_type)


@router.get("", response_model=List[DocumentResponse])
def get_documents(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)
    if status_filter:
        query = query.filter(Document.status == status_filter)
    if search:
        query = query.filter(Document.filename.ilike(f"%{search}%"))
    return query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_by_id(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document ID {document_id} was not found.")
    return doc


@router.put("/{document_id}/fields", response_model=DocumentDetailResponse)
def correct_document_fields(
    request: Request,
    document_id: int,
    corrections: List[FieldCorrection],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "viewer":
        raise HTTPException(status_code=403, detail="Access Denied: Lacks editor clearances.")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document ID {document_id} not found.")

    for correction in corrections:
        field = db.query(ExtractedField).filter(
            ExtractedField.document_id == document_id,
            ExtractedField.id == correction.field_id
        ).first()
        if field:
            field.is_corrected = True
            field.field_value = correction.corrected_value

    db.commit()

    active_fields = db.query(ExtractedField).filter(ExtractedField.document_id == document_id).all()
    fields_dict = {f.field_name: f.field_value for f in active_fields}

    ocr_res = db.query(OCRResult).filter(OCRResult.document_id == document_id).first()
    ocr_confidence = ocr_res.avg_confidence if ocr_res else 0.95

    is_valid, new_validation_errors = ValidationService.validate_extracted_fields(fields_dict, ocr_confidence)
    
    val_res = db.query(ValidationResult).filter(ValidationResult.document_id == document_id).first()
    if val_res:
        val_res.is_valid = is_valid
        val_res.validation_errors = new_validation_errors
        val_res.validated_at = datetime.datetime.utcnow()
    else:
        db.add(ValidationResult(
            document_id=document_id,
            is_valid=is_valid,
            validation_errors=new_validation_errors
        ))
    db.commit()

    full_raw_text = ocr_res.raw_text if ocr_res else ""
    VectorService.index_document(
        document_id=doc.id,
        filename=doc.filename,
        mime_type=doc.mime_type,
        text=f"Filename: {doc.filename}\nFields: {str(fields_dict)}\n{full_raw_text}",
        status="completed"
    )

    client_ip = request.client.host if request.client else "unknown"
    db.add(AuditLog(
        user_id=current_user.id,
        action="MANUAL_FIELD_CORRECTION",
        details=f"Audited and updated {len(corrections)} fields for Doc ID: {document_id}",
        ip_address=client_ip
    ))
    db.commit()

    db.refresh(doc)
    return doc
