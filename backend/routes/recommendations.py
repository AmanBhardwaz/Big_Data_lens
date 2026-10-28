import json
import logging
import os
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException

from services.analysis_engine import DATA_DIR, load_analysis
from services.dataset_store import require_dataset_owner
from services.recommendation_engine import (
    RULE_VERSION,
    build_recommendations,
)
from services.session import get_current_user, check_origin


router = APIRouter(tags=["Recommendations"])
logger = logging.getLogger(__name__)


def get_analysis_for_user(dataset_id, cleaning_id, user):
    require_dataset_owner(str(dataset_id), user["_id"])

    parquet_path = (
        DATA_DIR
        / str(dataset_id)
        / f"cleaned_{cleaning_id}.parquet"
    )

    if not parquet_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Cleaned dataset not found.",
        )

    return load_analysis(str(dataset_id), str(cleaning_id))


def recommendation_path(dataset_id, cleaning_id):
    return (
        DATA_DIR
        / str(dataset_id)
        / f"recommendations_v{RULE_VERSION}_{cleaning_id}.json"
    )


@router.get("/datasets/{dataset_id}/recommendations")
def get_recommendations(
    dataset_id: UUID,
    cleaning_id: UUID,
    user: dict = Depends(get_current_user),
):
    analysis = get_analysis_for_user(dataset_id, cleaning_id, user)

    if analysis is None:
        return {
            "recommendations": None,
            "analysis_required": True,
        }

    path = recommendation_path(dataset_id, cleaning_id)
    saved = None

    if path.is_file():
        try:
            candidate = json.loads(path.read_text(encoding="utf-8"))

            if (
                candidate["dataset_id"] == str(dataset_id)
                and candidate["cleaning_id"] == str(cleaning_id)
                and candidate["rule_version"] == RULE_VERSION
                and candidate["analysis_created_at"] == analysis["created_at"]
            ):
                saved = candidate

        except (OSError, ValueError, KeyError, TypeError):
            logger.warning("Saved recommendations could not be loaded")

    return {
        "recommendations": saved,
        "analysis_required": False,
    }


@router.post(
    "/datasets/{dataset_id}/recommendations",
    dependencies=[Depends(check_origin)],
)
def generate_recommendations(
    dataset_id: UUID,
    cleaning_id: UUID,
    user: dict = Depends(get_current_user),
):
    analysis = get_analysis_for_user(dataset_id, cleaning_id, user)

    if analysis is None:
        raise HTTPException(
            status_code=409,
            detail="Run Automatic Analysis for this cleaning version first.",
        )

    result = build_recommendations(analysis)
    destination = recommendation_path(dataset_id, cleaning_id)
    temporary = destination.with_name(
        f".{destination.name}.{uuid4().hex}.tmp"
    )

    try:
        temporary.write_text(
            json.dumps(result, ensure_ascii=False, allow_nan=False),
            encoding="utf-8",
        )
        os.replace(temporary, destination)

    except (OSError, ValueError, TypeError):
        logger.exception("Could not save recommendations")
        raise HTTPException(
            status_code=500,
            detail="Could not save recommendations.",
        ) from None

    finally:
        temporary.unlink(missing_ok=True)

    return {"recommendations": result}