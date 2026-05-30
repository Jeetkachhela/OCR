import csv
import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.dependencies import get_current_user
from app.models import User, Document, OCRResult, ExtractedField, ValidationResult, AIInsight

router = APIRouter(prefix="/reports", tags=["Compliance & Reporting Engine"])

@router.get("/shipments/csv")
def download_shipments_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and streams a CSV report of all processed logistics shipments, 
    complete with validation outcomes and AI risk levels.
    """
    # 1. Fetch completed documents
    documents = db.query(Document).filter(Document.status == "completed").all()

    # 2. Setup CSV structure in-memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Document ID", "Filename", "Upload Date", "Status",
        "Shipment ID", "Sender Name", "Receiver Name", 
        "Weight", "Tracking Number", "Invoice Ref", "Cargo Type",
        "Validation Status", "AI Risk Level", "Executive Summary"
    ])

    for doc in documents:
        # Resolve relations
        fields = db.query(ExtractedField).filter(ExtractedField.document_id == doc.id).all()
        fields_dict = {f.field_name: f.field_value for f in fields}
        
        val = db.query(ValidationResult).filter(ValidationResult.document_id == doc.id).first()
        val_status = "Passed" if (val and val.is_valid) else "Flagged/Anomaly"
        
        insight = db.query(AIInsight).filter(AIInsight.document_id == doc.id).first()
        risk = insight.risk_level.upper() if insight else "LOW"
        summary = insight.summary if insight else "No summary available."

        writer.writerow([
            doc.id, doc.filename, doc.created_at.strftime("%Y-%m-%d %H:%M:%S"), doc.status,
            fields_dict.get("shipment_id", "N/A"),
            fields_dict.get("sender_name", "N/A"),
            fields_dict.get("receiver_name", "N/A"),
            fields_dict.get("shipment_weight", "N/A"),
            fields_dict.get("tracking_number", "N/A"),
            fields_dict.get("invoice_reference", "N/A"),
            fields_dict.get("cargo_type", "N/A"),
            val_status, risk, summary
        ])

    # Stream CSV payload back to browser
    output.seek(0)
    response = StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")), 
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=shipment_compliance_report.csv"
    return response


@router.get("/summary")
def get_compliance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns an executive, structured JSON compliance summary for high-level analyst reporting.
    """
    total = db.query(Document).count()
    completed = db.query(Document).filter(Document.status == "completed").count()
    failed = db.query(Document).filter(Document.status == "failed").count()
    anomalies = db.query(ValidationResult).filter(ValidationResult.is_valid == False).count()
    
    # Calculate risk splits
    low_risk = db.query(AIInsight).filter(AIInsight.risk_level == "low").count()
    med_risk = db.query(AIInsight).filter(AIInsight.risk_level == "medium").count()
    high_risk = db.query(AIInsight).filter(AIInsight.risk_level == "high").count()
    crit_risk = db.query(AIInsight).filter(AIInsight.risk_level == "critical").count()

    return {
        "report_generated_at": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "metrics": {
            "total_ingested": total,
            "success_rate": round(completed / total * 100, 2) if total > 0 else 100.0,
            "failure_rate": round(failed / total * 100, 2) if total > 0 else 0.0,
            "total_anomalies_flagged": anomalies,
            "unresolved_anomalies": anomalies
        },
        "ai_risk_distribution": {
            "low": low_risk,
            "medium": med_risk,
            "high": high_risk,
            "critical": crit_risk
        }
    }
