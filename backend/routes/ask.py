import logging
from uuid import UUID
from services.history_store import save_query_history
import duckdb
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlglot.errors import ParseError

from services.dataset_store import require_dataset_owner
from services.llm import generate_sql
from services.query_engine import open_dataset, execute_sql
from services.session import get_current_user, check_origin


router = APIRouter(tags=["AI Questions"])
logger = logging.getLogger(__name__)


class AskRequest(BaseModel):
    dataset_id: UUID
    cleaning_id: UUID
    question: str = Field(min_length=3, max_length=2000)


@router.post("/ask", dependencies=[Depends(check_origin)])
def ask_dataset(
    body: AskRequest,
    user: dict = Depends(get_current_user),
):
    # Run before accessing files or calling the LLM.
    require_dataset_owner(
        str(body.dataset_id),
        user["_id"],
    )

    connection = None

    try:
        question = body.question.strip()

        if len(question) < 3:
            raise ValueError("Please enter a meaningful question.")

        connection, context = open_dataset(
            str(body.dataset_id),
            str(body.cleaning_id),
        )

        plan = generate_sql(question, context)

        if plan.status != "ok":
            response = {
                "status": plan.status,
                "message": plan.message,
            }
            return save_query_history(
                user_id=user["_id"],
                dataset_id=str(body.dataset_id),
                cleaning_id=str(body.cleaning_id),
                question=question,
                response=response,
            )

        answer = execute_sql(connection, plan.sql)

        response = {
            "status": "success",
            "question": question,
            "calculation": plan.message,
            **answer,
        }
        return save_query_history(
            user_id=user["_id"],
            dataset_id=str(body.dataset_id),
            cleaning_id=str(body.cleaning_id),
            question=question,
            response=response,
        )

    except HTTPException:
        raise

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from None

    except requests.Timeout:
        raise HTTPException(
            status_code=504,
            detail="AI provider response timed out. Please try again.",
        ) from None

    except requests.RequestException:
        logger.exception("AI provider request failed")
        raise HTTPException(
            status_code=502,
            detail="AI provider request failed. Check the server terminal.",
        ) from None

    except (ValueError, ParseError) as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from None

    except duckdb.Error:
        logger.exception("DuckDB operation failed")
        raise HTTPException(
            status_code=422,
            detail="DuckDB query failed. Check the server terminal.",
        ) from None

    except Exception:
        logger.exception("Ask request failed")
        raise HTTPException(
            status_code=500,
            detail="Request failed. Check the server terminal.",
        ) from None

    finally:
        if connection is not None:
            connection.close()