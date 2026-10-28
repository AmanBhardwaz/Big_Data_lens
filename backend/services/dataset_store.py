import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from pymongo.errors import PyMongoError

from database import datasets_collection


logger = logging.getLogger(__name__)


def save_dataset_owner(
    dataset_id: str,
    user_id,
    filename: str,
    report: dict,
):
    document = {
        "_id": dataset_id,
        "owner_id": user_id,
        "filename": filename,
        "total_rows": report["total_rows"],
        "total_columns": report["total_columns"],
        "created_at": datetime.now(timezone.utc),
    }

    try:
        datasets_collection.insert_one(document)
    except PyMongoError:
        logger.exception("Could not register dataset ownership")
        raise HTTPException(
            status_code=503,
            detail="Could not register dataset. Please try uploading again.",
        ) from None


def require_dataset_owner(dataset_id: str, user_id):
    try:
        dataset = datasets_collection.find_one({
            "_id": dataset_id,
            "owner_id": user_id,
        })
    except PyMongoError:
        logger.exception("Dataset ownership lookup failed")
        raise HTTPException(
            status_code=503,
            detail="Dataset service is temporarily unavailable.",
        ) from None

    if not dataset:
        # Same response for missing and another user's dataset.
        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    return dataset


def list_owned_datasets(user_id, limit: int, offset: int):
    try:
        documents = list(
            datasets_collection.find({"owner_id": user_id})
            .sort([("created_at", -1), ("_id", -1)])
            .skip(offset)
            .limit(limit)
        )
    except PyMongoError:
        logger.exception("Dataset listing failed")
        raise HTTPException(
            status_code=503,
            detail="Dataset service is temporarily unavailable.",
        ) from None

    return [
        {
            "dataset_id": document["_id"],
            "filename": document["filename"],
            "total_rows": document["total_rows"],
            "total_columns": document["total_columns"],
            "created_at": document["created_at"],
        }
        for document in documents
    ]