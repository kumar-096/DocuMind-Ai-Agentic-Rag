from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import secrets

from db import get_db
from models import User
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from core.auth_dependency import get_current_user
from core.google_auth import verify_google_token
from settings import get_settings
from models import User, UserSession, LoginAudit
from core.security import hash_token
from core.rate_limit import check_rate_limit
settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])


# -----------------------------
# COOKIE SETTER
# -----------------------------
def set_auth_cookies(response: Response, access_token: str, refresh_token: str):

    # Access token
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 15
    )

    # Refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 7
    )

    # CSRF token (NOT httponly)
    csrf_token = secrets.token_urlsafe(32)

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=False,
        samesite="lax"
    )


# -----------------------------
# CSRF VALIDATION
# -----------------------------
def verify_csrf(request: Request):
    cookie_token = request.cookies.get("csrf_token")
    header_token = request.headers.get("X-CSRF-Token")

    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=403, detail="CSRF validation failed")


# -----------------------------
# SCHEMAS
# -----------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    token: str


# -----------------------------
# LOGIN
# -----------------------------
@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):

    ip = request.client.host
    user_agent = request.headers.get("user-agent")

    # 🔴 RATE LIMIT
    if not check_rate_limit(ip):
        raise HTTPException(429, "Too many requests")

    user = db.query(User).filter(User.email == payload.email).first()

    success = False
    reason = None

    if not user:
        reason = "user_not_found"
    elif not verify_password(payload.password, user.password_hash):
        reason = "invalid_password"
    else:
        success = True

    # 🔴 AUDIT LOG
    audit = LoginAudit(
        email=payload.email,
        ip_address=ip,
        user_agent=user_agent,
        success=success,
        reason=reason
    )
    db.add(audit)
    db.commit()

    if not success:
        raise HTTPException(401, "Invalid credentials")

    # 🔴 CREATE TOKENS
    access_token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    # 🔴 STORE SESSION
    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        ip_address=ip,
        user_agent=user_agent
    )

    db.add(session)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token)

    return {"message": "Login successful"}
# -----------------------------
# GOOGLE LOGIN
# -----------------------------
@router.post("/google")
def google_login(
    payload: GoogleAuthRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):

    ip = request.client.host
    user_agent = request.headers.get("user-agent")

    user_info = verify_google_token(payload.token)

    if not user_info:
        raise HTTPException(status_code=401)

    email = user_info["email"]

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(email=email, password_hash=None, token_version=0)
        db.add(user)
        db.commit()
        db.refresh(user)

    # 🔴 CREATE TOKENS
    access_token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    # 🔴 STORE SESSION (THIS WAS MISSING)
    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        ip_address=ip,
        user_agent=user_agent
    )

    db.add(session)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token)

    return {"message": "Google login successful"}
# -----------------------------
# REFRESH (ROTATION)
# -----------------------------
@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):

    token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(401)

    from jose.exceptions import ExpiredSignatureError

    try:
        payload = decode_token(token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()

    session = db.query(UserSession).filter(
        UserSession.refresh_token_hash == hash_token(token),
        UserSession.is_active == True
    ).first()

    if not user or not session:
        raise HTTPException(401)

    # 🔴 ANOMALY DETECTION
    current_ip = request.client.host

    if session.ip_address != current_ip:
        print("⚠️ Suspicious login detected")

    # 🔴 ROTATE SESSION
    session.is_active = False
    db.commit()

    new_access = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    new_refresh = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(new_refresh),
        ip_address=current_ip,
        user_agent=request.headers.get("user-agent")
    )

    db.add(new_session)
    db.commit()

    set_auth_cookies(response, new_access, new_refresh)

    return {"message": "refreshed"}

# -----------------------------
# LOGOUT
# -----------------------------
@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    token = request.cookies.get("refresh_token")

    if token:
        session = db.query(UserSession).filter(
            UserSession.refresh_token_hash == hash_token(token)
        ).first()

        if session:
            session.is_active = False
            db.commit()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    response.delete_cookie("csrf_token")

    return {"message": "Logged out"}

# -----------------------------
# ME
# -----------------------------
@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}