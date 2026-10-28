import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.analysis_engine import DATA_DIR
from services.dataset_store import require_dataset_owner
from services.session import get_current_user, check_origin
from services.trend_engine import (
    build_trend,
    load_trend,
    save_trend,
)


router = APIRouter(tags=["Time Trends"])
logger = logging.getLogger(__name__)


class TrendRequest(BaseModel):
    cleaning_id: UUID
    time_column: str = Field(min_length=1)
    metric: str = Field(min_length=1)
    date_format: Literal["year", "month", "ymd", "dmy", "mdy"]
    period: Literal["year", "month", "day"]
    aggregation: Literal["avg", "sum", "min", "max"] = "avg"


def check_access(dataset_id, cleaning_id, user):
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


@router.get("/datasets/{dataset_id}/trend")
def get_saved_trend(
    dataset_id: UUID,
    cleaning_id: UUID,
    user: dict = Depends(get_current_user),
):
    check_access(dataset_id, cleaning_id, user)

    return {
        "trend": load_trend(str(dataset_id), str(cleaning_id)),
    }


@router.post(
    "/datasets/{dataset_id}/trend",
    dependencies=[Depends(check_origin)],
)
def calculate_trend(
    dataset_id: UUID,
    body: TrendRequest,
    user: dict = Depends(get_current_user),
):
    check_access(dataset_id, body.cleaning_id, user)

    settings = body.model_dump(exclude={"cleaning_id"})

    try:
        result = build_trend(
            str(dataset_id),
            str(body.cleaning_id),
            settings,
        )
        save_trend(result)

        return {"trend": result}

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from None

    except Exception:
        logger.exception("Trend calculation failed")
        raise HTTPException(
            status_code=500,
            detail="Could not calculate or save trend. Check server terminal.",
        ) from None