import os
import logging
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger("cloudinary_service")

# Ensure local uploads directory exists for fallback operations
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

# Initialize Cloudinary if keys are present
_cloudinary_configured = False
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    try:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )
        _cloudinary_configured = True
        logger.info("Cloudinary Cloud File Storage successfully integrated.")
    except Exception as e:
        logger.error(f"Cloudinary configuration failed: {e}. Falling back to local disk storage.")


class CloudinaryService:
    @classmethod
    def upload_file(cls, file_bytes: bytes, filename: str, hash_sha256: str) -> str:
        """
        Uploads a logistics document (PDF or image) securely.
        Uses Cloudinary CDN in production, or falls back to local uploads disk storage.
        
        Returns:
            str: Publicly accessible secure file URL
        """
        from app.core.system_settings import runtime_settings
        if _cloudinary_configured and runtime_settings.cdn_optimization_enabled:
            try:
                logger.info(f"Uploading file '{filename}' securely to Cloudinary...")
                
                # Determine resource type (PDFs must be uploaded as raw, images as image)
                ext = filename.split(".")[-1].lower()
                resource_type = "raw" if ext == "pdf" else "image"
                
                upload_result = cloudinary.uploader.upload(
                    file_bytes,
                    public_id=f"logistics_docs/{hash_sha256}",
                    resource_type=resource_type,
                    overwrite=True
                )
                
                secure_url = upload_result.get("secure_url")
                logger.info(f"File successfully uploaded to Cloudinary. CDN Link: {secure_url}")
                return secure_url
            except Exception as e:
                logger.error(f"Cloudinary upload failed: {e}. Falling back to local disk storage.")

        # Fallback Local Disk Storage
        try:
            ext = filename.split(".")[-1].lower()
            local_filename = f"{hash_sha256}.{ext}"
            local_path = os.path.join(LOCAL_UPLOAD_DIR, local_filename)
            
            with open(local_path, "wb") as f:
                f.write(file_bytes)
                
            logger.info(f"File successfully saved to local persistent uploads folder: {local_path}")
            
            # Return relative endpoint path which FastAPI will serve
            return f"/api/documents/file/{hash_sha256}"
        except Exception as local_err:
            logger.error(f"Critical: Local file storage write failed: {local_err}")
            raise local_err
