import hashlib
import hmac
import secrets
import time
import base64
import json
import re
from typing import Optional, Tuple, Dict, Any

SECRET_KEY = "nutrigen_ai_production_secret_key_fixed_salt"

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a 128-bit random salt and 100,000 iterations.
    Format: salt$derived_key_hex
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"{salt}${key}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored salt$derived_key_hex hash using constant-time comparison.
    """
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, expected_key = hashed_password.split("$", 1)
        actual_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
        return hmac.compare_digest(expected_key, actual_key)
    except Exception:
        return False

def validate_registration_input(name: str, email: str, password: str, confirm_password: str) -> Tuple[bool, str]:
    """
    Validates user registration input according to clinical system security standards:
    - Name is non-empty
    - Email is valid format
    - Password is at least 8 characters with at least one letter and one number
    - Password and confirm_password match
    """
    name_clean = (name or "").strip()
    if not name_clean or len(name_clean) < 2:
        return False, "Full name must be at least 2 characters long."
        
    email_clean = (email or "").strip().lower()
    email_pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_pattern, email_clean):
        return False, "Please provide a valid email address (e.g. user@example.com)."
        
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
        
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        return False, "Password must contain both letters and numbers."
        
    if password != confirm_password:
        return False, "Password and confirmation password do not match."
        
    return True, ""

def create_access_token(user_id: int, email: str, expires_in_sec: int = 86400 * 7) -> str:
    """
    Creates a tamper-proof signed session token using HMAC-SHA256.
    """
    payload = {
        "uid": user_id,
        "email": email,
        "exp": int(time.time()) + expires_in_sec
    }
    raw_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{signature}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a session token. Returns the payload if valid and not expired, else None.
    """
    if not token or "." not in token:
        return None
    try:
        b64_payload, signature = token.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        # Add back base64 padding
        padding = "=" * ((4 - len(b64_payload) % 4) % 4)
        raw_json = base64.urlsafe_b64decode(b64_payload + padding).decode("utf-8")
        payload = json.loads(raw_json)
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

