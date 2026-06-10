
from collections import defaultdict
from time import time
from fastapi import Request, HTTPException, Depends
from app.dependencies import get_current_user
from app import models

class RateLimiter:
    def __init__(self, calls:int=60, period:int=60):
        self.calls=calls
        self.period=period
        self.storage=defaultdict(list)

    async def __call__(self, request: Request):
        ip=request.client.host
        now=time()
        self.storage[ip]=[t for t in self.storage[ip] if now-t < self.period]
        if len(self.storage[ip]) >= self.calls:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        self.storage[ip].append(now)

rate_limiter = RateLimiter()

def sanitize_input(value: str) -> str:
    if not value:
        return value
    blocked = ["<script>", "</script>", "$where", "{", "}"]
    for item in blocked:
        value = value.replace(item, "")
    return value.strip()

def role_required(*roles):
    def checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Permission denied")
        return current_user
    return checker
