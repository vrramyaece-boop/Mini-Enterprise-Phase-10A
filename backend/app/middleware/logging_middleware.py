# middleware/logging_middleware.py — Phase 4: Request logging
import time, logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
logger = logging.getLogger("api")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start    = time.time()
        response = await call_next(request)
        duration = round((time.time() - start) * 1000, 1)
        fn = logger.warning if response.status_code >= 400 else logger.info
        fn(f"{request.method} {request.url.path} → {response.status_code} [{duration}ms]")
        return response
