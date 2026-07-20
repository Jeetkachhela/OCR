import os
from pydantic_settings import BaseSettings
from typing import List, Dict

DEPRECATED_MODEL_MAPPINGS: Dict[str, str] = {
    "llama-3.1-8b-instant": "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768": "mistral-saba-24b",
    "gemma2-9b-it": "llama-3.3-70b-versatile",
}

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise AI Logistics Document Intelligence Platform"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite:////tmp/logistics.db" if os.name != "nt" else "sqlite:///./logistics.db"
    
    # Security
    JWT_SECRET: str = "super_secure_jwt_secret_key_default_38128"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # API Integrations
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    QDRANT_HOST: str = ""
    QDRANT_API_KEY: str = ""
    CLOUDINARY_URL: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    # CORS Origins
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    
    @property
    def active_groq_model(self) -> str:
        model = self.GROQ_MODEL.strip()
        if model in DEPRECATED_MODEL_MAPPINGS:
            return DEPRECATED_MODEL_MAPPINGS[model]
        return model

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

