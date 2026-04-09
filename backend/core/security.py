from datetime import datetime, timedelta
import hashlib

from jose import jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from settings import get_settings

settings = get_settings()

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"

# Supports both:
# 1) new bcrypt_sha256
# 2) old legacy bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
)


# -----------------------------
# PASSWORD
# -----------------------------
def _truncate_password_bytes(password: str) -> str:
    """
    bcrypt supports a maximum of 72 BYTES.
    This safely truncates UTF-8 passwords
    without breaking multibyte characters.
    """
    password_bytes = password.encode("utf-8")

    if len(password_bytes) <= 72:
        return password

    truncated = password_bytes[:72]

    # avoid broken unicode boundaries
    return truncated.decode("utf-8", errors="ignore")


def hash_password(password: str) -> str:
    """
    Always stores passwords using the strongest current scheme.
    """
    safe_password = _truncate_password_bytes(password)
    return pwd_context.hash(safe_password)


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verifies both legacy bcrypt and new bcrypt_sha256 hashes.
    Prevents crashes on malformed or null hashes.
    """
    if not hashed_password:
        return False

    safe_password = _truncate_password_bytes(password)

    try:
        return pwd_context.verify(safe_password, hashed_password)
    except UnknownHashError:
        return False


def needs_rehash(hashed_password: str) -> bool:
    """
    Returns True if stored hash uses old deprecated scheme
    and should be upgraded after successful login.
    """
    if not hashed_password:
        return False

    try:
        return pwd_context.needs_update(hashed_password)
    except UnknownHashError:
        return False


# -----------------------------
# TOKENS
# -----------------------------
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def create_refresh_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=7)

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str):
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
    )


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()