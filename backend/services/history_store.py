import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from pymongo.errors import PyMongoError

from database import query_history_collection


logger = logging.getLogger(__name__)

# Bound individual saved results.
MAX_HISTORY_BYTES = 4 * 1024 * 1024


def save_query_history(
    user_id,
    dataset_id: str,
    cleaning_id: str,
    question: str,
    response: dict,
) -> dict:
    history_id = str(uuid4())

    try:
        # JSON string preserves arbitrary result-column names.
        response_json = json.dumps(
            response,
            ensure_ascii=False,
            allow_nan=False,
        )

        if len(response_json.encode("utf-8")) > MAX_HISTORY_BYTES:
            logger.warning("Query result too large for history")
            return {
                **response,
                "history_saved": False,
                "history_id": None,
            }

        query_history_collection.insert_one({
            "_id": history_id,
            "owner_id": user_id,
            "dataset_id": dataset_id,
            "cleaning_id": cleaning_id,
            "question": question,
            "status": response["status"],
            "created_at": datetime.now(timezone.utc),
            "response_json": response_json,
        })

        return {
            **response,
            "history_saved": True,
            "history_id": history_id,
        }

    except (PyMongoError, ValueError, TypeError, OverflowError):
        logger.exception("Could not save query history")

        return {
            **response,
            "history_saved": False,
            "history_id": None,
        }