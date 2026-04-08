from datetime import datetime, timedelta
import hashlib

from jose import jwt
from passlib.context import CryptContext

from settings import get_settings

settings = get_settings()

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"

pwd_context = CryptContext(
    schemes=["bcrypt"],
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
    safe_password = _truncate_password_bytes(password)
    return pwd_context.hash(safe_password)


def verify_password(password: str, hashed_password: str) -> bool:
    safe_password = _truncate_password_bytes(password)
    return pwd_context.verify(safe_password, hashed_password)


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