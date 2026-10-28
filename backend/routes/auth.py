import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from pymongo.errors import DuplicateKeyError, PyMongoError
from fastapi import Depends, Request, Response

from services.session import (
    check_origin,
    create_session,
    delete_session,
    get_current_user,
)

from database import users_collection


router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

password_hasher = PasswordHash.recommended()


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class SignupResponse(BaseModel):
    message: str
    user: UserResponse


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=201,
)
def signup(body: SignupRequest):
    # This application treats email addresses as case-insensitive.
    email = str(body.email).lower()
    created_at = datetime.now(timezone.utc)

    user_document = {
        "name": body.name,
        "email": email,
        "password_hash": password_hasher.hash(body.password),
        "created_at": created_at,
    }

    try:
        # Repeating this with the same options is safe.
        # The unique index also prevents simultaneous duplicate signups.
        users_collection.create_index("email", unique=True)

        result = users_collection.insert_one(user_document)

    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        ) from None

    except PyMongoError:
        logger.exception("MongoDB signup operation failed")
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

    return {
        "message": "Account created successfully.",
        "user": {
            "id": str(result.inserted_id),
            "name": body.name,
            "email": email,
            "created_at": created_at,
        },
    }
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


# Unknown emails also go through password verification.
DUMMY_PASSWORD_HASH = password_hasher.hash(
    "dummy-password-for-timing-check"
)


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "created_at": user["created_at"],
    }


@router.post(
    "/login",
    dependencies=[Depends(check_origin)],
)
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
):
    email = str(body.email).lower()

    try:
        user = users_collection.find_one({"email": email})

        stored_hash = (
            user["password_hash"]
            if user
            else DUMMY_PASSWORD_HASH
        )

        password_matches = password_hasher.verify(
            body.password,
            stored_hash,
        )

        if not user or not password_matches:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        create_session(user["_id"], request, response)

        return {
            "message": "Login successful.",
            "user": public_user(user),
        }

    except PyMongoError:
        logger.exception("MongoDB login operation failed")
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None


@router.get("/me", response_model=UserResponse)
def me(
    response: Response,
    user: dict = Depends(get_current_user),
):
    response.headers["Cache-Control"] = "no-store"
    return public_user(user)


@router.post(
    "/logout",
    dependencies=[Depends(check_origin)],
)
def logout(request: Request, response: Response):
    try:
        delete_session(request, response)
        return {"message": "Logged out successfully."}

    except PyMongoError:
        logger.exception("MongoDB logout operation failed")
        raise HTTPException(
            status_code=503,
            detail="Logout failed. Please try again.",
        ) from None