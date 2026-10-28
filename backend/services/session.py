import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response
from pymongo.errors import PyMongoError

from database import sessions_collection, users_collection


COOKIE_NAME = "lens_session"
SESSION_SECONDS = 7 * 24 * 60 * 60

# Local HTTP development: false. HTTPS deployment: true.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
}


def check_origin(request: Request):
    origin = request.headers.get("origin")

    if origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(
            status_code=403,
            detail="Request origin is not allowed.",
        )


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id, request: Request, response: Response):
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)

    sessions_collection.create_index(
        "expires_at",
        expireAfterSeconds=0,
    )

    # Replace this browser's previous session after successful login.
    previous_token = request.cookies.get(COOKIE_NAME)

    if previous_token:
        sessions_collection.delete_one({
            "_id": token_hash(previous_token)
        })

    sessions_collection.insert_one({
        "_id": token_hash(token),
        "user_id": user_id,
        "created_at": now,
        "expires_at": now + timedelta(seconds=SESSION_SECONDS),
    })

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"


def get_current_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Please log in.",
        )

    try:
        session = sessions_collection.find_one({
            "_id": token_hash(token),
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        })

        if not session:
            raise HTTPException(
                status_code=401,
                detail="Session expired. Please log in again.",
            )

        user = users_collection.find_one({
            "_id": session["user_id"]
        })

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User account not found.",
            )

        return user

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None


def delete_session(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)

    if token:
        sessions_collection.delete_one({
            "_id": token_hash(token)
        })

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"