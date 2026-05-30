import os
import json
import logging

logger = logging.getLogger("system_settings")

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core", "runtime_settings.json")

class RuntimeSettings:
    def __init__(self):
        self.rate_limiting_enabled = True
        self.cdn_optimization_enabled = True
        self.qdrant_sync_enabled = True
        self.log_level = "INFO"
        self.load_settings()

    def load_settings(self):
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r") as f:
                    data = json.load(f)
                    self.rate_limiting_enabled = data.get("rate_limiting_enabled", True)
                    self.cdn_optimization_enabled = data.get("cdn_optimization_enabled", True)
                    self.qdrant_sync_enabled = data.get("qdrant_sync_enabled", True)
                    self.log_level = data.get("log_level", "INFO")
                logger.info("Runtime settings loaded successfully from disk.")
            except Exception as e:
                logger.error(f"Failed to load runtime settings: {e}")

    def save_settings(self):
        try:
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, "w") as f:
                json.dump({
                    "rate_limiting_enabled": self.rate_limiting_enabled,
                    "cdn_optimization_enabled": self.cdn_optimization_enabled,
                    "qdrant_sync_enabled": self.qdrant_sync_enabled,
                    "log_level": self.log_level
                }, f, indent=4)
            logger.info("Runtime settings saved successfully to disk.")
        except Exception as e:
            logger.error(f"Failed to save runtime settings: {e}")

# Global thread-safe singleton
runtime_settings = RuntimeSettings()
