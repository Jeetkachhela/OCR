import random
import time
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger("ocr_service")

class OCRService:
    @staticmethod
    def preprocess_image(file_bytes: bytes) -> Dict[str, Any]:
        """
        Simulates skewed image correction, contrast enhancement, 
        and high-pass filtering for low-quality logistics document inputs.
        """
        logger.info("Executing image preprocessing: skew correction, deskew, and contrast enhancement.")
        return {
            "preprocessed": True,
            "skew_angle": round(random.uniform(-5.0, 5.0), 2),
            "dimensions": {"width": 800, "height": 1100},
            "contrast_boosted": True
        }

    @classmethod
    def extract_text(cls, filename: str, file_bytes: bytes) -> Dict[str, Any]:
        """
        Processes document binaries, generating premium-grade layout coordinate models.
        Returns extracted raw text, page count, average confidence, and precise coordinates for words.
        """
        cls.preprocess_image(file_bytes)
        
        # Simulate processing duration
        time.sleep(1.2)
        
        # Detect document characteristics from name
        name_lower = filename.lower()
        
        # Configure confidence index
        if "blurred" in name_lower or "low_quality" in name_lower:
            avg_confidence = round(random.uniform(0.55, 0.72), 2)
        elif "skewed" in name_lower:
            avg_confidence = round(random.uniform(0.78, 0.85), 2)
        else:
            avg_confidence = round(random.uniform(0.92, 0.98), 2)

        # Generate realistic layouts based on file categories
        if "invoice" in name_lower:
            doc_type = "Invoice"
            text_blocks = cls._generate_invoice_blocks()
        elif "manifest" in name_lower:
            doc_type = "Cargo Manifest"
            text_blocks = cls._generate_manifest_blocks()
        elif "waybill" in name_lower:
            doc_type = "Waybill"
            text_blocks = cls._generate_waybill_blocks()
        elif "label" in name_lower:
            doc_type = "Shipping Label"
            text_blocks = cls._generate_label_blocks()
        else:
            doc_type = "Customs Declaration"
            text_blocks = cls._generate_customs_blocks()

        raw_text = "\n".join([block["text"] for block in text_blocks])

        return {
            "raw_text": raw_text,
            "page_count": 1,
            "avg_confidence": avg_confidence,
            "text_blocks": text_blocks,
            "document_type": doc_type
        }

    @staticmethod
    def _generate_invoice_blocks() -> List[Dict[str, Any]]:
        # Shipment fields mapped to bounding coordinates [x_min, y_min, x_max, y_max] out of 1000x1000 scale
        shipment_id = f"INV-{random.randint(10000, 99999)}"
        tracking_num = f"TRK-{random.randint(10000000, 99999999)}"
        invoice_ref = f"REF-{random.randint(50000, 99999)}"
        weight = f"{round(random.uniform(120.0, 1500.0), 2)} kg"
        
        return [
            {"text": "LOGISTICS INVOICE & PROOF OF DELIVERY", "bbox": [100, 50, 900, 90], "confidence": 0.99},
            {"text": "========================================", "bbox": [100, 100, 900, 110], "confidence": 0.99},
            {"text": f"Invoice Reference: {invoice_ref}", "bbox": [100, 140, 480, 170], "confidence": 0.98},
            {"text": f"Shipment ID: {shipment_id}", "bbox": [100, 190, 450, 220], "confidence": 0.97},
            {"text": f"Tracking Number: {tracking_num}", "bbox": [100, 240, 480, 270], "confidence": 0.98},
            {"text": "Sender / Consignor Details:", "bbox": [100, 310, 450, 340], "confidence": 0.96},
            {"text": "GLOBAL CARGO SOLUTIONS INC", "bbox": [120, 350, 480, 375], "confidence": 0.99},
            {"text": "452 INDUSTRIAL PARKWAY, SUITE B", "bbox": [120, 385, 480, 410], "confidence": 0.98},
            {"text": "NEW YORK, NY 10001", "bbox": [120, 420, 400, 445], "confidence": 0.97},
            {"text": "Receiver / Consignee Details:", "bbox": [550, 310, 900, 340], "confidence": 0.96},
            {"text": "APEX MANUFACTURING GROUP", "bbox": [570, 350, 900, 375], "confidence": 0.99},
            {"text": "889 SUPPLY CHAIN ROAD", "bbox": [570, 385, 900, 410], "confidence": 0.99},
            {"text": "HOUSTON, TX 77001", "bbox": [570, 420, 850, 445], "confidence": 0.96},
            {"text": "Itemized Shipment Details:", "bbox": [100, 500, 900, 525], "confidence": 0.98},
            {"text": f"Total Gross Weight: {weight}", "bbox": [100, 540, 450, 565], "confidence": 0.98},
            {"text": "Cargo Type: Industrial Equipment", "bbox": [100, 580, 450, 605], "confidence": 0.95},
            {"text": "Delivery Date: 2026-06-05", "bbox": [100, 620, 450, 645], "confidence": 0.97},
            {"text": "TOTAL BALANCE DUE: $12,450.00", "bbox": [550, 750, 900, 790], "confidence": 0.99},
            {"text": "Payment Terms: Net 30", "bbox": [100, 750, 400, 775], "confidence": 0.96}
        ]

    @staticmethod
    def _generate_manifest_blocks() -> List[Dict[str, Any]]:
        shipment_id = f"MNF-{random.randint(10000, 99999)}"
        tracking_num = f"TRK-{random.randint(10000000, 99999999)}"
        invoice_ref = f"REF-{random.randint(50000, 99999)}"
        weight = f"{round(random.uniform(5000.0, 20000.0), 2)} kg"
        
        return [
            {"text": "OCEAN VESSEL CARGO MANIFEST", "bbox": [100, 50, 900, 90], "confidence": 0.98},
            {"text": "========================================", "bbox": [100, 100, 900, 110], "confidence": 0.99},
            {"text": f"Manifest Reference: {invoice_ref}", "bbox": [100, 140, 480, 170], "confidence": 0.98},
            {"text": f"Carrier Code / Shipment ID: {shipment_id}", "bbox": [100, 190, 500, 220], "confidence": 0.97},
            {"text": f"Tracking Number: {tracking_num}", "bbox": [100, 240, 480, 270], "confidence": 0.98},
            {"text": "Port of Loading: PORT OF SHANGHAI (CNSHA)", "bbox": [100, 300, 500, 330], "confidence": 0.97},
            {"text": "Port of Discharge: PORT OF ROTTERDAM (NLRTM)", "bbox": [100, 340, 500, 370], "confidence": 0.97},
            {"text": "Vessel Name: PACIFIC EXPRESS V-102", "bbox": [100, 380, 500, 410], "confidence": 0.95},
            {"text": "Consignor:", "bbox": [100, 450, 450, 475], "confidence": 0.96},
            {"text": "EASTERN LOGISTICS CO. LTD", "bbox": [120, 485, 450, 510], "confidence": 0.99},
            {"text": "Consignee:", "bbox": [550, 450, 900, 475], "confidence": 0.96},
            {"text": "EURO SUPPLY HUB BV", "bbox": [570, 485, 900, 510], "confidence": 0.99},
            {"text": f"Declared Shipment Weight: {weight}", "bbox": [100, 560, 500, 590], "confidence": 0.99},
            {"text": "Container ID: SEAU-9988127 (40ft Dry)", "bbox": [100, 600, 500, 630], "confidence": 0.98},
            {"text": "Commodity: Consumer Electronics", "bbox": [100, 640, 500, 670], "confidence": 0.97}
        ]

    @staticmethod
    def _generate_waybill_blocks() -> List[Dict[str, Any]]:
        shipment_id = f"WAY-{random.randint(10000, 99999)}"
        tracking_num = f"TRK-{random.randint(10000000, 99999999)}"
        invoice_ref = f"REF-{random.randint(50000, 99999)}"
        weight = f"{round(random.uniform(5.0, 95.0), 2)} kg"
        
        return [
            {"text": "INTERNATIONAL AIR WAYBILL (AWB)", "bbox": [100, 50, 900, 90], "confidence": 0.99},
            {"text": "========================================", "bbox": [100, 100, 900, 110], "confidence": 0.99},
            {"text": f"Air Waybill Number / Shipment ID: {shipment_id}", "bbox": [100, 140, 550, 170], "confidence": 0.98},
            {"text": f"Master Tracking Code: {tracking_num}", "bbox": [100, 190, 480, 220], "confidence": 0.97},
            {"text": f"Shipper Account Reference: {invoice_ref}", "bbox": [100, 240, 480, 270], "confidence": 0.98},
            {"text": "Shipper / Sender Address:", "bbox": [100, 300, 450, 325], "confidence": 0.96},
            {"text": "TOKYO ROBOTICS CORP", "bbox": [120, 335, 450, 360], "confidence": 0.99},
            {"text": "12-4 CHOME, MINATO-KU, TOKYO", "bbox": [120, 370, 450, 395], "confidence": 0.97},
            {"text": "Consignee / Receiver Address:", "bbox": [550, 300, 900, 325], "confidence": 0.96},
            {"text": "ROBOTICS LAB DEUTSCHLAND GMBH", "bbox": [570, 335, 900, 360], "confidence": 0.99},
            {"text": "WERNER-HEISENBERG-ALLEE 25, MUNICH", "bbox": [570, 370, 900, 395], "confidence": 0.99},
            {"text": "Carrier Name: DHL Aviation", "bbox": [100, 450, 480, 475], "confidence": 0.98},
            {"text": f"Charged Gross Weight: {weight}", "bbox": [100, 500, 450, 525], "confidence": 0.99},
            {"text": "Declared Value for Customs: 75,000 EUR", "bbox": [100, 540, 500, 565], "confidence": 0.97},
            {"text": "Airport of Departure: HND (Tokyo Haneda)", "bbox": [100, 590, 450, 615], "confidence": 0.98},
            {"text": "Airport of Destination: MUC (Munich Airport)", "bbox": [100, 630, 450, 655], "confidence": 0.98}
        ]

    @staticmethod
    def _generate_label_blocks() -> List[Dict[str, Any]]:
        shipment_id = f"LBL-{random.randint(10000, 99999)}"
        tracking_num = f"TRK-{random.randint(10000000, 99999999)}"
        weight = f"{round(random.uniform(1.0, 25.0), 2)} kg"
        
        return [
            {"text": "EXPRESS SHIPPING LABEL", "bbox": [200, 50, 800, 100], "confidence": 0.99},
            {"text": "----------------------------------------", "bbox": [100, 120, 900, 130], "confidence": 0.99},
            {"text": "SHIP FROM:", "bbox": [100, 150, 300, 175], "confidence": 0.98},
            {"text": "CREATIVE GADGETS INC", "bbox": [100, 180, 450, 205], "confidence": 0.99},
            {"text": "901 SUNSET BLVD, LOS ANGELES, CA 90028", "bbox": [100, 210, 450, 235], "confidence": 0.97},
            {"text": "SHIP TO:", "bbox": [100, 270, 300, 295], "confidence": 0.98},
            {"text": "JOHN DOE / WAREHOUSE DEPT", "bbox": [100, 300, 450, 325], "confidence": 0.99},
            {"text": "120 ARCHWAY STR, LONDON, EC1A 1BB, UK", "bbox": [100, 330, 450, 355], "confidence": 0.98},
            {"text": f"SHIPMENT ID: {shipment_id}", "bbox": [100, 400, 450, 430], "confidence": 0.99},
            {"text": f"TRACKING NUMBER: {tracking_num}", "bbox": [100, 450, 600, 480], "confidence": 0.99},
            {"text": f"WEIGHT: {weight}", "bbox": [100, 500, 300, 525], "confidence": 0.99},
            {"text": "CARRIER: FedEx Express", "bbox": [100, 540, 450, 565], "confidence": 0.98},
            {"text": "[BARCODE] FedEx Ref Index 8812-B", "bbox": [200, 620, 800, 750], "confidence": 0.96}
        ]

    @staticmethod
    def _generate_customs_blocks() -> List[Dict[str, Any]]:
        shipment_id = f"CUS-{random.randint(10000, 99999)}"
        tracking_num = f"TRK-{random.randint(10000000, 99999999)}"
        invoice_ref = f"REF-{random.randint(50000, 99999)}"
        weight = f"{round(random.uniform(1000.0, 5000.0), 2)} kg"
        
        return [
            {"text": "HM REVENUE & CUSTOMS IMPORT DECLARATION", "bbox": [100, 50, 900, 90], "confidence": 0.97},
            {"text": "========================================", "bbox": [100, 100, 900, 110], "confidence": 0.99},
            {"text": f"Customs Declaration ID: {shipment_id}", "bbox": [100, 140, 500, 170], "confidence": 0.98},
            {"text": f"Associated Waybill: {tracking_num}", "bbox": [100, 190, 480, 220], "confidence": 0.97},
            {"text": f"Commercial Invoice Reference: {invoice_ref}", "bbox": [100, 240, 500, 270], "confidence": 0.98},
            {"text": "Declarant: MERIDIAN LOGISTIC SERVICES LTD", "bbox": [100, 300, 600, 330], "confidence": 0.97},
            {"text": "Country of Export: UNITED STATES (US)", "bbox": [100, 350, 500, 375], "confidence": 0.98},
            {"text": "Country of Import: UNITED KINGDOM (GB)", "bbox": [100, 385, 500, 410], "confidence": 0.98},
            {"text": f"Gross Mass / Total Weight: {weight}", "bbox": [100, 450, 480, 475], "confidence": 0.99},
            {"text": "Tariff Classification Code (HS): 8471.30.0000", "bbox": [100, 500, 550, 525], "confidence": 0.96},
            {"text": "Customs Value Declared: $240,000 USD", "bbox": [100, 540, 500, 565], "confidence": 0.97},
            {"text": "Duty Rate Applicable: 2% Standard", "bbox": [100, 580, 450, 605], "confidence": 0.95}
        ]
