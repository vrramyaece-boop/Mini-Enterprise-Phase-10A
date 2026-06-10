# middleware/input_sanitizer.py — Phase 4: Input validation & sanitization
import re, html, logging
logger = logging.getLogger(__name__)
_SQL = re.compile(r"\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|SCRIPT)\b", re.I)

def sanitize_string(value: str | None, max_length: int = 500) -> str | None:
    if not value: return value
    cleaned = html.escape(value.strip())[:max_length]
    if _SQL.search(cleaned):
        logger.warning(f"Suspicious input: {cleaned[:80]}")
    return cleaned

def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    return True, ""
