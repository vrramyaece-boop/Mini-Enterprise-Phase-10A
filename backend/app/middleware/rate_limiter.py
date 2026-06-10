# middleware/rate_limiter.py — Phase 4: API rate limiting
import time, logging
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)
_store: dict = defaultdict(lambda: {"count": 0, "window_start": 0.0})
import threading
_lock = threading.Lock()

RATE_LIMITS = {
    "/auth/login":    {"limit": 10,  "window": 60},
    "/auth/register": {"limit": 5,   "window": 60},
    "/auth/refresh":  {"limit": 20,  "window": 60},
    "default":        {"limit": 120, "window": 60},
}

def _get_rule(path: str) -> dict:
    for prefix, rule in RATE_LIMITS.items():
        if prefix != "default" and path.startswith(prefix):
            return rule
    return RATE_LIMITS["default"]

class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/", "/docs", "/openapi.json", "/redoc", "/health"):
            return await call_next(request)
        client_ip = request.client.host if request.client else "unknown"
        rule  = _get_rule(request.url.path)
        limit = rule["limit"]
        window= rule["window"]
        now   = time.time()
        key   = f"{client_ip}:{request.url.path.split('/')[1]}"
        with _lock:
            entry = _store[key]
            if now - entry["window_start"] > window:
                entry["count"] = 0; entry["window_start"] = now
            entry["count"] += 1
            count = entry["count"]
        if count > limit:
            logger.warning(f"Rate limit: {client_ip} on {request.url.path}")
            raise HTTPException(status_code=429,
                detail=f"Too many requests. Limit: {limit}/min.",
                headers={"Retry-After": str(window)})
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"]     = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
        return response
