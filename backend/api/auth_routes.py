from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from db import get_db
from models import User
from core.security import hash_password, verify_password, create_access_token
from core.auth_dependency import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


# -----------------------------
# Helper: set cookie
# -----------------------------
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=(settings.environment == "production"),  # 🔥 KEY LINE
        samesite="lax",
        max_age=60 * 60 * 24
    )

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# -----------------------------
# Register
# -----------------------------
@router.post("/register")
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):

    existing = db.query(User).filter(User.email == payload.email).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    set_auth_cookie(response, token)

    return {
        "message": "User registered successfully",
        "user_id": user.id,
        "email": user.email
    }


# -----------------------------
# Login
# -----------------------------
@router.post("/login")
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "sub": str(user.id),
        "token_version": user.token_version
    })

    set_auth_cookie(response, token)

    return {
        "message": "Login successful",
        "user_id": user.id,
        "email": user.email
    }


# -----------------------------
# Logout (REAL INVALIDATION)
# -----------------------------
@router.post("/logout")
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # 🔥 invalidate all existing tokens
    current_user.token_version += 1
    db.commit()

    response.delete_cookie("access_token")

    return {
        "message": "Logged out successfully"
    }


# -----------------------------
# Current user
# -----------------------------
@router.get("/me")
def get_current_user_endpoint(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email
    }