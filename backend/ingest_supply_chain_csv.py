import os
import csv
import zipfile
import datetime
import random
import bcrypt

# Monkeypatch passlib bcrypt bug on modern bcrypt versions
if not hasattr(bcrypt, "__about__"):
    class MockAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = MockAbout()

from app.core.db import SessionLocal, Base, engine
from app.models import Document, ExtractedField, OCRResult, ValidationResult, AIInsight, AuditLog, User

def ingest_csv_data():
    print("Initiating batch ingestion for supply chain CSV dataset...")
    db = SessionLocal()
    
    zip_path = os.path.join(os.path.dirname(__file__), "..", "archive (3).zip")
    if not os.path.exists(zip_path):
        print(f"Error: Dataset zip file '{zip_path}' could not be found.")
        db.close()
        return

    try:
        # 1. Fetch system operator
        operator = db.query(User).filter(User.role == "operator").first()
        operator_id = operator.id if operator else 1

        # 2. Extract supply chain CSV
        with zipfile.ZipFile(zip_path) as z:
            with z.open("supply_chain_data.csv") as f:
                # Read bytes as text
                text_stream = [line.decode("utf-8") for line in f.readlines()]
                reader = csv.DictReader(text_stream)
                
                rows = list(reader)
                print(f"Extracted CSV successfully. Found {len(rows)} supply chain records.")

                # We will import the first 50 rows to scatter beautiful KPI trends in Neon database
                today = datetime.datetime.utcnow()
                count = 0
                
                for idx, row in enumerate(rows[:50]):
                    sku = row.get("SKU", f"SKU-{random.randint(100, 999)}")
                    product_type = row.get("Product type", "Logistics Cargo")
                    carrier = row.get("Shipping carriers", "Carrier B")
                    location = row.get("Location", "Mumbai")
                    weight = f"{row.get('Stock levels', '50')} kg" # Stock levels serves as realistic weight metric
                    price = row.get("Price", "50.00")
                    revenue = row.get("Revenue generated", "1000.00")
                    
                    shipment_id = f"INV-{random.randint(10000, 99999)}"
                    tracking = f"TRK-{random.randint(10000000, 99999999)}"
                    ref = f"REF-{sku}"

                    created_time = today - datetime.timedelta(days=idx % 7, hours=random.randint(1, 23))

                    # Ingest Document
                    doc = Document(
                        filename=f"commercial_invoice_{sku.lower()}.pdf",
                        mime_type="application/pdf",
                        file_size=random.randint(150000, 450000),
                        hash_sha256=f"csv_seed_sha256_{sku.lower()}_{idx}",
                        file_path=None, # Ingested metadata only
                        status="completed",
                        created_at=created_time,
                        updated_at=created_time
                    )
                    db.add(doc)
                    db.flush()


                    # Ingest OCR Result
                    raw_text = (
                        f"LOGISTICS COMMERCE INVOICE\n"
                        f"SKU REFERENCE: {sku}\n"
                        f"PRODUCT GROUP: {product_type}\n"
                        f"CARRIER SOURCE: {carrier}\n"
                        f"DEPOT PORT: {location}\n"
                        f"GROSS WEIGHT: {weight}\n"
                        f"COMMERCIAL PRICE: ${float(price):.2f}\n"
                        f"REVENUE DECLARED: ${float(revenue):.2f}\n"
                    )
                    ocr = OCRResult(
                        document_id=doc.id,
                        raw_text=raw_text,
                        page_count=1,
                        avg_confidence=round(random.uniform(0.94, 0.99), 2),
                        processed_at=created_time
                    )
                    db.add(ocr)

                    # Ingest Extracted Fields
                    fields = {
                        "shipment_id": shipment_id,
                        "sender_name": f"SUPPLIER LOGISTICS HUB ({location.upper()})",
                        "sender_address": f"{location} industrial corridor, India",
                        "receiver_name": "GLOBAL DISTRIBUTION WAREHOUSE",
                        "receiver_address": "APEX HUB REGION TERMINAL A",
                        "shipment_weight": weight,
                        "tracking_number": tracking,
                        "invoice_reference": ref,
                        "cargo_type": f"{product_type} logistics items"
                    }

                    for f_name, f_val in fields.items():
                        random_x = int(100 + 400 * (1 if "sender" in f_name else 0))
                        random_y = 150 + int(300 * (1 if "receiver" in f_name else 0))
                        box = [random_x, random_y, random_x + 300, random_y + 40]
                        
                        ext_field = ExtractedField(
                            document_id=doc.id,
                            field_name=f_name,
                            field_value=f_val,
                            original_value=f_val,
                            confidence=0.98,
                            bounding_box={"bbox": box},
                            created_at=created_time
                        )
                        db.add(ext_field)

                    # Ingest Validation Result
                    validation = ValidationResult(
                        document_id=doc.id,
                        is_valid=True,
                        validation_errors=None,
                        validated_at=created_time
                    )
                    db.add(validation)

                    # Ingest AI Insight
                    insight = AIInsight(
                        document_id=doc.id,
                        summary=f"Automated CSV seed validation complete for {sku}.",
                        risk_level="low",
                        delay_risk_explanation="Clean compliance parameters.",
                        recommendations=["Automatic audit pass."],
                        generated_at=created_time
                    )
                    db.add(insight)

                    # Log Audit
                    db.add(AuditLog(
                        user_id=operator_id,
                        action="BATCH_CSV_INGEST",
                        details=f"Ingested and indexed commercial invoice for SKU {sku}",
                        ip_address="batch_runner",
                        created_at=created_time
                    ))
                    
                    count += 1

                db.commit()
                print(f"Successfully processed and seeded {count} supply chain records into the Neon Database!")

    except Exception as e:
        db.rollback()
        print(f"Error during CSV ingestion: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    ingest_csv_data()
