import uvicorn
import time
import logging
from fastapi import FastAPI, Request, Response, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# Import core configurations and session
from app.core.config import settings
from app.core.db import engine, Base

# Import API Routers
from app.api import auth, documents, search, analytics, notifications, reports, admin_settings

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("main")

# Auto-migrate database tables on startup for instant Neon cloud deployments
logger.info("Initializing database migrations...")
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized/verified successfully.")
except Exception as e:
    logger.error(f"Critical: Database migration failed: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade AI logistics document intelligence and operations infrastructure.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# --- Subclassed Dynamic CORS Middleware to fix Starlette exception headers bug ---
class DynamicCORSMiddleware(CORSMiddleware):
    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        origin = None
        for key, value in scope.get("headers", []):
            if key == b"origin":
                origin = value.decode("latin-1")
                break

        if origin:
            allowed = False
            if origin in self.allow_origins:
                allowed = True
            elif origin.endswith(".vercel.app") or origin.endswith(".onrender.com"):
                allowed = True
            elif "localhost" in origin or "127.0.0.1" in origin:
                allowed = True

            if allowed:
                if origin not in self.allow_origins:
                    self.allow_origins.append(origin)
                if hasattr(self, "all_origins"):
                    if isinstance(self.all_origins, set):
                        self.all_origins.add(origin)
                    elif isinstance(self.all_origins, list) and origin not in self.all_origins:
                        self.all_origins.append(origin)

        await super().__call__(scope, receive, send)

# Custom Rate Limiter Middleware
_request_records = {} # sliding window tracking

@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    """
    Implements a sliding window rate limiter to protect our API endpoints 
    against brute force, API flooding, and credential stuffing.
    """
    from app.core.system_settings import runtime_settings
    if not runtime_settings.rate_limiting_enabled:
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean old records
    _request_records[client_ip] = [t for t in _request_records.get(client_ip, []) if now - t < 60]
    
    # 60 requests per minute limit
    if len(_request_records[client_ip]) > 100:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests in a minute. API rate limit exceeded."
        )
    
    _request_records[client_ip].append(now)
    
    # XSS Protection & Security Headers
    response = await call_next(request)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    
    return response


# Register Dynamic CORS Middleware at the very end to ensure it is the OUTERMOST middleware
app.add_middleware(
    DynamicCORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)


# --- WebSocket Core for Real-Time Dashboard updates ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New live WebSocket client registered.")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info("Live WebSocket client disconnected.")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Client disconnected silently
                pass

ws_manager = ConnectionManager()

@app.websocket("/api/ws/status")
async def websocket_status_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Maintain connection alive (client sends ping / requests)
            data = await websocket.receive_text()
            await websocket.send_text(f"ACK: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# Register modular routers under V1 prefix
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(admin_settings.router, prefix=settings.API_V1_STR)


@app.get("/")
@app.head("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "api_v1_docs": "/api/docs"
    }

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
