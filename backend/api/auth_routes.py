from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import secrets

from db import get_db
from models import User, UserSession, LoginAudit
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token
)
from core.auth_dependency import get_current_user
from core.google_auth import verify_google_token
from core.rate_limit import check_rate_limit
from settings import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):

    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
    )

    csrf_token = secrets.token_urlsafe(32)

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=True,
        samesite="none"
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
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):

    ip = request.client.host
    user_agent = request.headers.get("user-agent")

    if not check_rate_limit(ip):
        raise HTTPException(429, "Too many requests")

    user = db.query(User).filter(User.email == payload.email).first()

    success = False
    reason = None

    if not user:
        reason = "user_not_found"

    elif user.password_hash is None:
       
        raise HTTPException(400, "Use Google login")

    elif not verify_password(payload.password, user.password_hash):
        reason = "invalid_password"

    else:
        success = True

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

    access_token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

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



@router.post("/signup")
def signup(payload: SignupRequest, request: Request, response: Response, db: Session = Depends(get_db)):

    ip = request.client.host
    user_agent = request.headers.get("user-agent")

    existing = db.query(User).filter(User.email == payload.email).first()

    if existing:
        raise HTTPException(400, "User already exists")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        token_version=0
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        ip_address=ip,
        user_agent=user_agent
    )

    db.add(session)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token)

    return {"message": "Signup successful"}



@router.post("/google")
def google_login(payload: GoogleAuthRequest, request: Request, response: Response, db: Session = Depends(get_db)):

    ip = request.client.host
    user_agent = request.headers.get("user-agent")

    user_info = verify_google_token(payload.token)

    if not user_info:
        raise HTTPException(401, "Invalid Google token")

    email = user_info["email"]

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(email=email, password_hash=None, token_version=0)
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

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


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}
from datetime import datetime
from fastapi import Cookie


@router.post("/refresh")
def refresh_token(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str = Cookie(default=None)
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

    session = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.refresh_token_hash == hashed,
        UserSession.is_active == True
    ).first()

    if not session:
        raise HTTPException(401, "Session invalid")

    #   ROTATE TOKENS (VERY IMPORTANT)
    new_access = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    new_refresh = create_refresh_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    # update session
    session.refresh_token_hash = hash_token(new_refresh)
    session.last_used_at = datetime.utcnow()
    db.commit()

    set_auth_cookies(response, new_access, new_refresh)

    return {"message": "refreshed"}