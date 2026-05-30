import re
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("validation_service")

class ValidationService:
    @classmethod
    def validate_extracted_fields(
        cls, 
        fields: Dict[str, Any], 
        ocr_confidence: float
    ) -> Tuple[bool, List[Dict[str, str]]]:
        """
        Audits extracted logistics metadata for inconsistencies, malformations, 
        or critical data missing states.
        
        Returns:
            Tuple[bool, List[Dict[str, str]]]: (is_valid, validation_errors_list)
        """
        logger.info("Initiating logistics rule validation engine.")
        errors = []

        # 1. OCR Confidence check
        if ocr_confidence < 0.75:
            errors.append({
                "code": "low_confidence_ocr",
                "message": f"Document OCR average confidence is critically low ({int(ocr_confidence * 100)}%). Verification required."
            })

        # 2. Shipment ID validation
        shipment_id = fields.get("shipment_id")
        if not shipment_id:
            errors.append({
                "code": "missing_shipment_id",
                "message": "Shipment Identification Code could not be identified."
            })
        else:
            # Check for standard prefixes: INV, MNF, WAY, LBL, CUS followed by numbers
            pattern = r"^(INV|MNF|WAY|LBL|CUS)-\d+$"
            if not re.match(pattern, str(shipment_id).strip().upper()):
                errors.append({
                    "code": "malformed_shipment_id",
                    "message": f"Shipment ID '{shipment_id}' does not match standard patterns (e.g. INV-XXXXX)."
                })

        # 3. Address validation
        sender_addr = fields.get("sender_address")
        receiver_addr = fields.get("receiver_address")

        if not sender_addr or len(str(sender_addr).strip()) < 10:
            errors.append({
                "code": "invalid_sender_address",
                "message": "Sender Consignor Address is missing or is too brief to process routing."
            })

        if not receiver_addr or len(str(receiver_addr).strip()) < 10:
            errors.append({
                "code": "invalid_receiver_address",
                "message": "Receiver Consignee Address is missing or is too brief to process routing."
            })

        # 4. Weight verification
        weight_str = fields.get("shipment_weight")
        if not weight_str:
            errors.append({
                "code": "missing_weight",
                "message": "Shipment weight statement is missing or could not be parsed."
            })
        else:
            # Parse number from weight string (e.g. '123.45 kg' -> 123.45)
            try:
                numeric_part = re.search(r"(\d+(\.\d+)?)", str(weight_str))
                if numeric_part:
                    weight_val = float(numeric_part.group(1))
                    if weight_val <= 0:
                        errors.append({
                            "code": "invalid_weight",
                            "message": f"Parsed weight '{weight_val}' is zero or negative."
                        })
                    elif weight_val > 100000: # Overly heavy, possible typo
                        errors.append({
                            "code": "excessive_weight",
                            "message": f"Gross weight ({weight_val} kg) exceeds container limit of 100,000 kg. Manual audit required."
                        })
                else:
                    errors.append({
                        "code": "malformed_weight",
                        "message": f"Shipment weight value '{weight_str}' could not be parsed to numeric value."
                    })
            except Exception:
                errors.append({
                    "code": "weight_parsing_error",
                    "message": "An error occurred while evaluating weight parameters."
                })

        # 5. Core logistics fields checklist
        tracking = fields.get("tracking_number")
        if not tracking:
            errors.append({
                "code": "missing_tracking_number",
                "message": "Master tracking reference code is missing from document details."
            })

        is_valid = len(errors) == 0
        logger.info(f"Logistics validation complete. Status: {is_valid}. Error Count: {len(errors)}")
        return is_valid, errors
