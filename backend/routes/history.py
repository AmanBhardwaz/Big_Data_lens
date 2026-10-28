import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import PyMongoError

from database import query_history_collection
from services.dataset_store import require_dataset_owner
from services.session import get_current_user


router = APIRouter(tags=["Query History"])
logger = logging.getLogger(__name__)


@router.get("/datasets/{dataset_id}/history")
def list_history(
    dataset_id: UUID,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user),
):
    require_dataset_owner(str(dataset_id), user["_id"])

    try:
        documents = list(
            query_history_collection.find(
                {
                    "owner_id": user["_id"],
                    "dataset_id": str(dataset_id),
                },
                {"response_json": 0},
            )
            .sort([("created_at", -1), ("_id", -1)])
            .skip(offset)
            .limit(limit + 1)
        )
    except PyMongoError:
        logger.exception("History listing failed")
        raise HTTPException(
            status_code=503,
            detail="Could not load query history.",
        ) from None

    return {
        "items": [
            {
                "id": document["_id"],
                "question": document["question"],
                "status": document["status"],
                "cleaning_id": document["cleaning_id"],
                "created_at": document["created_at"],
            }
            for document in documents[:limit]
        ],
        "has_more": len(documents) > limit,
    }


@router.get("/datasets/{dataset_id}/history/{history_id}")
def get_history_result(
    dataset_id: UUID,
    history_id: UUID,
    user: dict = Depends(get_current_user),
):
    require_dataset_owner(str(dataset_id), user["_id"])

    try:
        document = query_history_collection.find_one({
            "_id": str(history_id),
            "owner_id": user["_id"],
            "dataset_id": str(dataset_id),
        })
    except PyMongoError:
        logger.exception("History lookup failed")
        raise HTTPException(
            status_code=503,
            detail="Could not load saved result.",
        ) from None

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Saved result not found.",
        )

    try:
        response = json.loads(document["response_json"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=500,
            detail="Saved result could not be read.",
        ) from None

    return {
        "id": document["_id"],
        "question": document["question"],
        "cleaning_id": document["cleaning_id"],
        "created_at": document["created_at"],
        "response": response,
    }