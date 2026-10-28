import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from services.analysis_engine import (
    DATA_DIR,
    build_analysis,
    load_analysis,
    save_analysis,
)
from services.dataset_store import require_dataset_owner
from services.session import get_current_user, check_origin


router = APIRouter(tags=["Automatic Analysis"])
logger = logging.getLogger(__name__)


def check_access(dataset_id: UUID, cleaning_id: UUID, user: dict):
    require_dataset_owner(str(dataset_id), user["_id"])

    path = (
        DATA_DIR
        / str(dataset_id)
        / f"cleaned_{cleaning_id}.parquet"
    )

    if not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Cleaned dataset not found.",
        )


@router.get("/datasets/{dataset_id}/analysis")
def get_saved_analysis(
    dataset_id: UUID,
    cleaning_id: UUID,
    user: dict = Depends(get_current_user),
):
    check_access(dataset_id, cleaning_id, user)

    return {
        "analysis": load_analysis(str(dataset_id), str(cleaning_id)),
    }


@router.post(
    "/datasets/{dataset_id}/analysis",
    dependencies=[Depends(check_origin)],
)
def run_analysis(
    dataset_id: UUID,
    cleaning_id: UUID,
    force: bool = Query(default=False),
    user: dict = Depends(get_current_user),
):
    check_access(dataset_id, cleaning_id, user)

    if not force:
        saved = load_analysis(str(dataset_id), str(cleaning_id))

        if saved is not None:
            return {"analysis": saved}

    try:
        result = build_analysis(str(dataset_id), str(cleaning_id))
        save_analysis(result)

        return {"analysis": result}

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Cleaned dataset not found.",
        ) from None

    except Exception:
        logger.exception("Automatic analysis failed")

        raise HTTPException(
            status_code=500,
            detail="Could not calculate or save analysis. Check the server terminal.",
        ) from None