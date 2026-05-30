import datetime
import random
import bcrypt

# Monkeypatch passlib bcrypt bug on modern bcrypt versions
if not hasattr(bcrypt, "__about__"):
    class MockAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = MockAbout()

from sqlalchemy.orm import Session
from app.core.db import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import User, Document, OCRResult, ExtractedField, ValidationResult, AIInsight, Notification, AuditLog
from app.services.vector_service import VectorService

def seed_database():
    print("Seeding database tables...")
    db = SessionLocal()
    
    try:
        # Create Tables if not exist
        Base.metadata.create_all(bind=engine)
        
        # 1. Clear existing seed data to allow repeated seed runs cleanly
        db.query(AuditLog).delete()
        db.query(Notification).delete()
        db.query(AIInsight).delete()
        db.query(ValidationResult).delete()
        db.query(ExtractedField).delete()
        db.query(OCRResult).delete()
        db.query(Document).delete()
        db.query(User).delete()
        db.commit()

        # 2. Seed RBAC Users
        admin = User(
            email="admin@logistics.ai",
            hashed_password=hash_password("adminpassword"),
            full_name="Chief Administrator",
            role="admin",
            is_active=True
        )
        operator = User(
            email="operator@logistics.ai",
            hashed_password=hash_password("operatorpassword"),
            full_name="Operations Auditor",
            role="operator",
            is_active=True
        )
        db.add(admin)
        db.add(operator)
        db.commit()
        db.refresh(admin)
        db.refresh(operator)
        print("RBAC Users seeded successfully.")

        # 3. Seed historical documents with high-fidelity logistics parameters
        historical_docs = [
            ("invoice_consignee_2026_01.pdf", "Invoice", "INV-88291", "REF-50291", "TRK-90028120", "280.50 kg", "GLOBAL CARGO SOLUTIONS INC", "APEX MANUFACTURING GROUP", "Industrial Equipment", "low", True, 0.98),
            ("ocean_manifest_voyage_10.jpg", "Cargo Manifest", "MNF-44812", "REF-99201", "TRK-88192084", "15400.00 kg", "EASTERN LOGISTICS CO. LTD", "EURO SUPPLY HUB BV", "Consumer Electronics", "low", True, 0.94),
            ("airwaybill_intl_priority.png", "Waybill", "WAY-10928", "REF-11204", "TRK-44719283", "75.40 kg", "TOKYO ROBOTICS CORP", "ROBOTICS LAB DEUTSCHLAND GMBH", "High-Precision Robotics", "low", True, 0.96),
            ("shipping_label_ups_express.jpg", "Shipping Label", "LBL-66521", "REF-00293", "TRK-33419201", "12.20 kg", "CREATIVE GADGETS INC", "JOHN DOE / WAREHOUSE DEPT", "Consumer Electronics / Gadgets", "medium", False, 0.73), # low confidence OCR/validation
            ("customs_declaration_entry_c.pdf", "Customs Declaration", "CUS-77612", "REF-44910", "TRK-22819203", "4500.00 kg", "MERIDIAN LOGISTIC SERVICES LTD", "EURO SUPPLY HUB BV", "Industrial Materials", "high", False, 0.88), # anomalous state mismatch
        ]

        today = datetime.datetime.utcnow()
        for idx, doc_data in enumerate(historical_docs):
            filename, dtype, ship_id, ref, tracking, weight, sender, receiver, cargo, risk, is_valid, ocr_conf = doc_data
            
            # Scatter timestamps over the past week for dashboard analytics volume trend rendering
            created_time = today - datetime.timedelta(days=idx, hours=random.randint(1, 10))
            
            # Base document
            doc = Document(
                filename=filename,
                mime_type="application/pdf" if filename.endswith("pdf") else "image/png",
                file_size=random.randint(200000, 1500000),
                hash_sha256=f"seed_hash_sha256_mock_digest_{idx}_{random.randint(100,999)}",
                status="completed",
                created_at=created_time,
                updated_at=created_time
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            # OCR Results
            raw_text = (
                f"LOGISTICS DOCUMENT TYPE: {dtype}\n"
                f"===================================\n"
                f"Shipment ID: {ship_id}\n"
                f"Reference Code: {ref}\n"
                f"Tracking Master: {tracking}\n"
                f"Cargo Weight: {weight}\n"
                f"Sender / Shipper Name: {sender}\n"
                f"Receiver / Consignee: {receiver}\n"
                f"Commodity Group: {cargo}\n"
            )
            ocr = OCRResult(
                document_id=doc.id,
                raw_text=raw_text,
                page_count=1,
                avg_confidence=ocr_conf,
                processed_at=created_time
            )
            db.add(ocr)

            # Extracted Fields
            fields = {
                "shipment_id": ship_id,
                "sender_name": sender,
                "sender_address": f"Address corridor for {sender}",
                "receiver_name": receiver,
                "receiver_address": f"Address corridor for {receiver}",
                "shipment_weight": weight,
                "tracking_number": tracking,
                "invoice_reference": ref,
                "cargo_type": cargo
            }

            for f_name, f_val in fields.items():
                # Bounding coordinates
                box = [random.randint(100, 400), random.randint(100, 700), random.randint(500, 900), random.randint(750, 950)]
                ext_field = ExtractedField(
                    document_id=doc.id,
                    field_name=f_name,
                    field_value=f_val,
                    original_value=f_val,
                    confidence=ocr_conf,
                    bounding_box={"bbox": box},
                    created_at=created_time
                )
                db.add(ext_field)

            # Validation
            val_errors = []
            if not is_valid:
                if "label" in filename:
                    val_errors.append({
                        "code": "low_confidence_ocr",
                        "message": f"Document OCR average confidence is critically low ({int(ocr_conf * 100)}%). Verification required."
                    })
                else:
                    val_errors.append({
                        "code": "excessive_weight",
                        "message": "Gross weight exceeds standard cargo capacity boundaries for designated shipping lines."
                    })
            
            validation = ValidationResult(
                document_id=doc.id,
                is_valid=is_valid,
                validation_errors=val_errors if val_errors else None,
                validated_at=created_time
            )
            db.add(validation)

            # AI Insights
            ai_risk_desc = "Clean ingest parameters." if risk == "low" else "Operator review recommended due to document scanning noise and layout offsets."
            insight = AIInsight(
                document_id=doc.id,
                summary=f"Automated audit completed for {dtype} document relative to cargo shipment {ship_id}.",
                risk_level=risk,
                delay_risk_explanation=ai_risk_desc,
                recommendations=["Automatic audit verification approved."] if risk == "low" else ["Contact shipper for digital copy verification", "Audit billing items against customs ledger"],
                generated_at=created_time
            )
            db.add(insight)

            # Index doc into Vector store
            VectorService.index_document(
                document_id=doc.id,
                filename=doc.filename,
                mime_type=doc.mime_type,
                text=raw_text,
                status="completed"
            )

            # Seeding audits
            audit = AuditLog(
                user_id=operator.id,
                action="SYSTEM_AUTO_INGEST",
                details=f"Autopiloted processing run completed for: {filename}",
                ip_address="127.0.0.1",
                created_at=created_time
            )
            db.add(audit)

        # 4. Seed system notifications
        db.add(Notification(
            type="anomaly_detected",
            title="Cargo Discrepancy Audited",
            message="Document 'shipping_label_ups_express.jpg' flagged: low confidence OCR rating (73%). Audit required.",
            level="warning",
            created_at=today
        ))
        db.add(Notification(
            type="system_issue",
            title="External Queue Latency Warning",
            message="Distributed ingestion buffer reports latency metrics above threshold targets.",
            level="error",
            created_at=today - datetime.timedelta(hours=2)
        ))
        
        db.commit()
        print("Historical logistics documents and notifications seeded successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
