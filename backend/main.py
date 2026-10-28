import io
import json
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.history import router as history_router
from routes.recommendations import router as recommendations_router
import shutil
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4
from routes.ask import router as ask_router
import duckdb
from fastapi import Query
from pandas.api.types import is_numeric_dtype
from fastapi import Depends

from services.session import get_current_user, check_origin
from routes.analysis import router as analysis_router
from routes.trends import router as trends_router
from services.dataset_store import (
    save_dataset_owner,
    require_dataset_owner,
    list_owned_datasets,
)

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Big Data AI Lens")
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(analysis_router)
app.include_router(recommendations_router)
app.include_router(trends_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(ask_router)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ---------- Helpers ----------

def dataframe_report(df: pd.DataFrame):
    """Preview aur data-quality report banata hai."""
    columns = []

    for column in df.columns:
        missing = int(df[column].isna().sum())

        columns.append({
            "column": column,
            "data_type": str(df[column].dtype),
            "missing_values": missing,
            "missing_percentage": (
                round(missing / len(df) * 100, 2)
                if len(df) else 0
            ),
            "unique_values": int(df[column].nunique()),
        })

    return {
        "total_rows": int(df.shape[0]),
        "total_columns": int(df.shape[1]),
        "duplicate_rows": int(df.duplicated().sum()),
        "total_missing_values": int(df.isna().sum().sum()),
        "column_report": columns,
        "preview": json.loads(
            df.head(10).to_json(
                orient="records",
                date_format="iso"
            )
        ),
    }


def read_original(folder: Path):
    """Saved original file se dataset read karta hai."""
    csv_path = folder / "original.csv"
    excel_path = folder / "original.xlsx"

    if csv_path.exists():
        df = pd.read_csv(csv_path)
    elif excel_path.exists():
        df = pd.read_excel(excel_path, engine="openpyxl")
    else:
        raise HTTPException(
            status_code=404,
            detail="Original dataset not found."
        )

    df.columns = [str(column) for column in df.columns]
    return df


class CleaningOptions(BaseModel):
    trim_spaces: bool = True
    blank_as_missing: bool = True
    remove_duplicates: bool = True
    missing_strategy: Literal["keep", "drop_rows"] = "keep"


# ---------- Routes ----------

@app.get("/")
def home():
    return {"message": "Big Data AI Lens backend is running"}


@app.post("/upload", dependencies=[Depends(check_origin)])
def upload_dataset(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()

    if extension not in {".csv", ".xlsx"}:
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV or XLSX file."
        )

    try:
        contents = file.file.read(MAX_FILE_SIZE + 1)
    finally:
        file.file.close()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="File is empty."
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 20 MB."
        )

    try:
        if extension == ".csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            # Abhi first Excel sheet process hogi.
            df = pd.read_excel(
                io.BytesIO(contents),
                engine="openpyxl"
            )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Cannot read file. Check format; CSV must use UTF-8."
        )

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Dataset must contain at least one data row."
        )

    df.columns = [str(column) for column in df.columns]

    if df.columns.duplicated().any():
        raise HTTPException(
            status_code=400,
            detail="Please use unique column names."
        )

    report = dataframe_report(df)
    # Har upload ka alag folder.
    dataset_id = str(uuid4())
    folder = DATA_DIR / dataset_id

    try:
        folder.mkdir()

        (folder / f"original{extension}").write_bytes(contents)

        metadata = {
            "dataset_id": dataset_id,
            "filename": filename,
            "original_report": report,
        }

        (folder / "metadata.json").write_text(
            json.dumps(metadata, indent=2),
            encoding="utf-8",
        )

    except OSError:
        shutil.rmtree(folder, ignore_errors=True)

        raise HTTPException(
            status_code=500,
            detail="Could not save dataset.",
        ) from None

    # Except block ke BAHAR: successful file save ke baad chalega.
    save_dataset_owner(
        dataset_id=dataset_id,
        user_id=user["_id"],
        filename=filename,
        report=report,
    )

    return {
        "message": "Dataset uploaded and saved.",
        "dataset_id": dataset_id,
        "filename": filename,
        **report,
    }
@app.post(
    "/datasets/{dataset_id}/clean",
    dependencies=[Depends(check_origin)],
)
def clean_dataset(
    dataset_id: UUID,
    options: CleaningOptions,
    user: dict = Depends(get_current_user),
):
    require_dataset_owner(str(dataset_id), user["_id"])

    folder = DATA_DIR / str(dataset_id)
   

    if not folder.is_dir():
        raise HTTPException(
            status_code=404,
            detail="Dataset not found. Upload it first."
        )

    # Har cleaning run original se start hota hai.
    df = read_original(folder)
    before = dataframe_report(df)

    if options.trim_spaces:
        for column in df.columns:
            df[column] = df[column].map(
                lambda value: value.strip()
                if isinstance(value, str) else value
            )

    if options.blank_as_missing:
        # Empty ya whitespace-only cells ko missing maana jayega.
        df = df.replace(r"^\s*$", pd.NA, regex=True)

    duplicate_rows_removed = 0

    if options.remove_duplicates:
        previous_rows = len(df)
        df = df.drop_duplicates()
        duplicate_rows_removed = previous_rows - len(df)

    missing_rows_removed = 0

    if options.missing_strategy == "drop_rows":
        previous_rows = len(df)
        df = df.dropna()
        missing_rows_removed = previous_rows - len(df)

    df = df.reset_index(drop=True)

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cleaning would remove all rows. "
                "Try missing_strategy='keep'."
            )
        )

    after = dataframe_report(df)

    # Har cleaning run ki alag version save hogi.
    cleaning_id = str(uuid4())
    parquet_path = folder / f"cleaned_{cleaning_id}.parquet"
    report_path = folder / f"cleaning_{cleaning_id}.json"

    result = {
        "message": "Dataset cleaned and saved as Parquet.",
        "dataset_id": str(dataset_id),
        "cleaning_id": cleaning_id,
        "cleaned_file": parquet_path.name,
        "options": options.model_dump(),
        "duplicate_rows_removed": duplicate_rows_removed,
        "missing_rows_removed": missing_rows_removed,
        "before": before,
        "after": after,
    }

    try:
        df.to_parquet(
            parquet_path,
            engine="pyarrow",
            index=False
        )

        report_path.write_text(
            json.dumps(result, indent=2),
            encoding="utf-8"
        )
    except Exception:
        parquet_path.unlink(missing_ok=True)
        report_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not save cleaned data. Check disk space, "
                "pyarrow installation and mixed data types."
            )
        )

    return result
@app.get("/datasets/{dataset_id}/analytics")
def dataset_analytics(
    dataset_id: UUID,
    cleaning_id: UUID,
    group_by: str,
    metric: str,
    aggregation: Literal["sum", "avg", "min", "max"] = "sum",
    limit: int = Query(default=10, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    require_dataset_owner(str(dataset_id), user["_id"])

    parquet_path = (
        DATA_DIR
        / str(dataset_id)
        / f"cleaned_{cleaning_id}.parquet"
    )

    if not parquet_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Cleaned dataset not found. Check both IDs."
        )

    df = pd.read_parquet(parquet_path)

    # User ke selected columns dataset mein hone chahiye.
    for column in [group_by, metric]:
        if column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"Column '{column}' not found.",
                    "available_columns": list(df.columns),
                }
            )

    if group_by == metric:
        raise HTTPException(
            status_code=400,
            detail="Choose different group_by and metric columns."
        )

    if not is_numeric_dtype(df[metric]):
        raise HTTPException(
            status_code=400,
            detail=f"Column '{metric}' must contain numeric data."
        )

    # Column names ko safely SQL identifiers banate hain.
    def quote_identifier(name: str):
        return '"' + name.replace('"', '""') + '"'

    group_column = quote_identifier(group_by)
    metric_column = quote_identifier(metric)

    # Allowed functions fixed hain.
    functions = {
        "sum": "SUM",
        "avg": "AVG",
        "min": "MIN",
        "max": "MAX",
    }

    function = functions[aggregation]

    sql = f"""
        SELECT
            {group_column} AS category,
            {function}({metric_column}) AS value
        FROM dataset
        WHERE {group_column} IS NOT NULL
          AND {metric_column} IS NOT NULL
        GROUP BY {group_column}
        ORDER BY value DESC, category ASC
        LIMIT ?
    """

    connection = duckdb.connect(database=":memory:")

    try:
        connection.register("dataset", df)
        result = connection.execute(sql, [limit]).fetchdf()
    finally:
        connection.close()

    return {
        "dataset_id": str(dataset_id),
        "cleaning_id": str(cleaning_id),
        "group_by": group_by,
        "metric": metric,
        "aggregation": aggregation,
        "sql": sql.strip(),
        "parameters": [limit],
        "result": json.loads(
            result.to_json(
                orient="records",
                date_format="iso"
            )
        ),
    }
@app.get("/datasets")
def my_datasets(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user),
):
    datasets = list_owned_datasets(
        user_id=user["_id"],
        limit=limit,
        offset=offset,
    )

    return {
        "datasets": datasets,
        "limit": limit,
        "offset": offset,
    }


@app.get("/datasets/{dataset_id}")
def reopen_dataset(
    dataset_id: UUID,
    user: dict = Depends(get_current_user),
):
    dataset = require_dataset_owner(
        str(dataset_id),
        user["_id"],
    )

    folder = DATA_DIR / str(dataset_id)
    metadata_path = folder / "metadata.json"

    if not metadata_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Saved dataset files are missing from the server.",
        )

    try:
        metadata = json.loads(
            metadata_path.read_text(encoding="utf-8")
        )

        # Most recently saved cleaning report first.
        report_paths = sorted(
            folder.glob("cleaning_*.json"),
            key=lambda path: path.stat().st_mtime_ns,
            reverse=True,
        )

        latest_cleaning = None

        for report_path in report_paths:
            candidate = json.loads(
                report_path.read_text(encoding="utf-8")
            )

            cleaning_id = str(UUID(candidate["cleaning_id"]))

            if candidate["dataset_id"] != str(dataset_id):
                raise ValueError("Cleaning report dataset mismatch.")

            parquet_path = folder / f"cleaned_{cleaning_id}.parquet"

            if parquet_path.is_file():
                latest_cleaning = candidate
                break

        return {
            "upload": {
                "message": "Saved dataset reopened.",
                "dataset_id": str(dataset_id),
                "filename": dataset["filename"],
                **metadata["original_report"],
            },
            "latest_cleaning": latest_cleaning,
        }

    except (OSError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=500,
            detail="Could not read saved dataset reports.",
        ) from None