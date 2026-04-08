from datetime import datetime
import secrets
import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    Request,
    Cookie,
)
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from db import get_db
from models import User, UserSession, LoginAudit
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from core.auth_dependency import get_current_user
from core.google_auth import verify_google_token
from core.rate_limit import check_rate_limit
from settings import get_settings


settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_cookie_security(request: Request):
    """
    Detect real transport security safely behind proxies like Render.
    """
    forwarded_proto = request.headers.get("x-forwarded-proto")

    cookie_secure = (
        forwarded_proto == "https"
        or request.url.scheme == "https"
    )

    cookie_samesite = "none" if cookie_secure else "lax"

    return cookie_secure, cookie_samesite


def set_auth_cookies(
    request: Request,
    response: Response,
    access_token: str,
    refresh_token: str,
):
    cookie_secure, cookie_samesite = _get_cookie_security(request)

    common = {
        "httponly": True,
        "secure": cookie_secure,
        "samesite": cookie_samesite,
        "path": "/",
    }

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=60 * 60 * 24,
        **common,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=60 * 60 * 24 * 7,
        **common,
    )

    response.set_cookie(
        key="csrf_token",
        value=secrets.token_urlsafe(32),
        httponly=False,
        secure=cookie_secure,
        samesite=cookie_samesite,
        path="/",
        max_age=60 * 60 * 24 * 7,
    )


def clear_auth_cookies(
    request: Request,
    response: Response,
):
    cookie_secure, cookie_samesite = _get_cookie_security(request)

    response.delete_cookie(
        "access_token",
        path="/",
        secure=cookie_secure,
        samesite=cookie_samesite,
    )

    response.delete_cookie(
        "refresh_token",
        path="/",
        secure=cookie_secure,
        samesite=cookie_samesite,
    )

    response.delete_cookie(
        "csrf_token",
        path="/",
        secure=cookie_secure,
        samesite=cookie_samesite,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    token: str


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip = request.client.host
    user_agent = request.headers.get("user-agent")
    normalized_email = payload.email.strip().lower()

    if not check_rate_limit(ip):
        raise HTTPException(429, "Too many requests")

    user = (
        db.query(User)
        .filter(User.email == normalized_email)
        .first()
    )

    success = False
    reason = None

    if not user:
        reason = "user_not_found"

    elif user.password_hash is None:
        raise HTTPException(
            status_code=400,
            detail="This account was created with Google. Please continue with Google Sign-In."
        )

    elif not verify_password(
        payload.password,
        user.password_hash
    ):
        reason = "invalid_password"

    else:
        success = True

    audit = LoginAudit(
        email=normalized_email,
        ip_address=ip,
        user_agent=user_agent,
        success=success,
        reason=reason,
    )
    db.add(audit)
    db.commit()

    if not success:
        raise HTTPException(401, "Invalid credentials")

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    refresh_token_value = create_refresh_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token_value),
        ip_address=ip,
        user_agent=user_agent,
    )

    db.add(session)
    db.commit()

    set_auth_cookies(
        request,
        response,
        access_token,
        refresh_token_value,
    )

    return {"message": "Login successful"}

@router.post("/signup")
def signup(
    payload: SignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip = request.client.host
    user_agent = request.headers.get("user-agent")
    normalized_email = payload.email.strip().lower()

    if not normalized_email.endswith("@gmail.com"):
        raise HTTPException(400, "Use a valid Gmail address")

    password = payload.password

    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    if not re.search(r"[A-Z]", password):
        raise HTTPException(400, "Password must include one uppercase letter")

    if not re.search(r"[0-9]", password):
        raise HTTPException(400, "Password must include one number")

    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(400, "Password must include one special symbol")

    existing = (
        db.query(User)
        .filter(User.email == normalized_email)
        .first()
    )

    if existing:
        raise HTTPException(400, "User already exists")

    user = User(
        email=normalized_email,
        password_hash=hash_password(password),
        token_version=0,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    refresh_token_value = create_refresh_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token_value),
        ip_address=ip,
        user_agent=user_agent,
    )

    db.add(session)
    db.commit()

    set_auth_cookies(
        request,
        response,
        access_token,
        refresh_token_value,
    )

    return {"message": "Signup successful"}
@router.post("/google")

@router.post("/google")
def google_login(
    payload: GoogleAuthRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ip = request.client.host
    user_agent = request.headers.get("user-agent")

    user_info = verify_google_token(payload.token)

    if not user_info:
        raise HTTPException(401, "Invalid Google token")

    email = user_info["email"].strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        user = User(
            email=email,
            password_hash=None,
            token_version=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    refresh_token_value = create_refresh_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token_value),
        ip_address=ip,
        user_agent=user_agent,
    )

    db.add(session)
    db.commit()

    set_auth_cookies(
        request,
        response,
        access_token,
        refresh_token_value,
    )

    return {"message": "Google login successful"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
    }


@router.post("/refresh")
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str = Cookie(default=None),
):
    if not refresh_token:
        raise HTTPException(401, "Missing refresh token")

    try:
        payload = decode_token(refresh_token)
        user_id = int(payload.get("sub"))
        token_version = payload.get("token_version")
    except Exception:
        raise HTTPException(401, "Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(401, "User not found")

    if token_version != user.token_version:
        raise HTTPException(401, "Token expired")

    hashed = hash_token(refresh_token)

    session = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == user.id,
            UserSession.refresh_token_hash == hashed,
            UserSession.is_active == True,
        )
        .first()
    )

    if not session:
        raise HTTPException(401, "Session invalid")

    new_access = create_access_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    new_refresh = create_refresh_token(
        {
            "sub": str(user.id),
            "token_version": user.token_version,
        }
    )

    session.refresh_token_hash = hash_token(new_refresh)
    session.last_used_at = datetime.utcnow()
    db.commit()

    set_auth_cookies(
        request,
        response,
        new_access,
        new_refresh,
    )

    return {"message": "refreshed"}


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    (
        db.query(UserSession)
        .filter(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
        )
        .update({"is_active": False})
    )

    db.commit()

    clear_auth_cookies(request, response)

    return {"message": "Logged out"}