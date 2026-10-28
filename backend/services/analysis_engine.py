import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from services.advanced_insights import build_advanced_insights
import numpy as np
import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_numeric_dtype,
    is_datetime64_any_dtype,
)


logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
ANALYSIS_VERSION = 2


def finite_number(value):
    """JSON cannot safely represent NaN or infinity."""
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None

    return number if math.isfinite(number) else None


def analysis_path(dataset_id: str, cleaning_id: str):
    return (
        DATA_DIR
        / dataset_id
        / f"analysis_v{ANALYSIS_VERSION}_{cleaning_id}.json"
    )


def load_analysis(dataset_id: str, cleaning_id: str):
    path = analysis_path(dataset_id, cleaning_id)

    if not path.is_file():
        return None

    try:
        result = json.loads(path.read_text(encoding="utf-8"))

        if (
            result["analysis_version"] != ANALYSIS_VERSION
            or result["dataset_id"] != dataset_id
            or result["cleaning_id"] != cleaning_id
        ):
            return None

        return result

    except (OSError, ValueError, KeyError, TypeError):
        logger.warning("Saved analysis could not be loaded")
        return None


def histogram_bins(values: np.ndarray):
    if len(values) == 0:
        return [], None

    minimum = float(values.min())
    maximum = float(values.max())

    if minimum == maximum:
        return [{
            "lower": minimum,
            "upper": maximum,
            "count": int(len(values)),
            "includes_upper": True,
        }], None

    try:
        # At most 10 equal-width bins over all finite values.
        bin_count = min(10, max(2, math.ceil(math.sqrt(len(values)))))
        counts, edges = np.histogram(values, bins=bin_count)

        if not np.isfinite(edges).all():
            raise ValueError("Non-finite histogram edges")

        bins = [
            {
                "lower": float(edges[index]),
                "upper": float(edges[index + 1]),
                "count": int(count),
                "includes_upper": index == len(counts) - 1,
            }
            for index, count in enumerate(counts)
        ]

        return bins, None

    except (ValueError, OverflowError, FloatingPointError, IndexError):
        return [], "Histogram unavailable for this numeric range."


def build_analysis(dataset_id: str, cleaning_id: str):
    parquet_path = (
        DATA_DIR
        / dataset_id
        / f"cleaned_{cleaning_id}.parquet"
    )

    if not parquet_path.is_file():
        raise FileNotFoundError("Cleaned dataset not found.")

    # Read the full cleaned dataset.
    df = pd.read_parquet(parquet_path)

    row_count = len(df)
    column_count = len(df.columns)
    total_cells = row_count * column_count
    missing_cells = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    columns = []
    numeric = []
    categories = []
    findings = []

    for column in df.columns:
        series = df[column]
        present = series.dropna()

        missing = int(series.isna().sum())
        unique = int(present.nunique())

        columns.append({
            "column": str(column),
            "dtype": str(series.dtype),
            "missing": missing,
            "missing_percent": round(
                missing / row_count * 100, 2
            ) if row_count else 0,
            "unique": unique,
            "constant": unique == 1,
        })

        if len(present) == 0:
            findings.append(f'"{column}" has no non-missing values.')
            continue

        if is_numeric_dtype(series.dtype) and not is_bool_dtype(series.dtype):
            values = present.to_numpy(dtype=float)
            finite_mask = np.isfinite(values)
            finite_values = values[finite_mask]
            non_finite = int((~finite_mask).sum())

            bins, histogram_note = histogram_bins(finite_values)

            if len(finite_values):
                with np.errstate(over="ignore", invalid="ignore"):
                    stats = {
                        "minimum": finite_number(np.min(finite_values)),
                        "maximum": finite_number(np.max(finite_values)),
                        "mean": finite_number(np.mean(finite_values)),
                        "median": finite_number(np.median(finite_values)),
                        # Population standard deviation of this dataset.
                        "std": finite_number(np.std(finite_values, ddof=0)),
                    }
            else:
                stats = {
                    "minimum": None,
                    "maximum": None,
                    "mean": None,
                    "median": None,
                    "std": None,
                }

            numeric.append({
                "column": str(column),
                "valid_count": int(len(finite_values)),
                "missing_count": missing,
                "non_finite_count": non_finite,
                **stats,
                "bins": bins,
                "histogram_note": histogram_note,
            })

            if non_finite:
                findings.append(
                    f'"{column}": {non_finite} infinite/non-finite values '
                    "were excluded from numeric statistics."
                )

        elif not is_datetime64_any_dtype(series.dtype):
            # Avoid huge charts for names, emails and other high-cardinality fields.
            if unique <= 50:
                counts = present.astype(str).value_counts()
                top = counts.head(10)

                categories.append({
                    "column": str(column),
                    "unique": unique,
                    "non_missing_count": int(len(present)),
                    "top": [
                        {"label": str(label), "count": int(count)}
                        for label, count in top.items()
                    ],
                    "other_count": int(counts.iloc[10:].sum()),
                })
            else:
                findings.append(
                    f'"{column}" has {unique} distinct values; '
                    "its category chart was skipped."
                )

        if unique == 1:
            findings.append(
                f'"{column}" is constant among its non-missing values.'
            )

    if missing_cells:
        most_missing = max(columns, key=lambda item: item["missing"])
        findings.insert(
            0,
            f'"{most_missing["column"]}" has the most missing values: '
            f'{most_missing["missing"]} '
            f'({most_missing["missing_percent"]}%).',
        )
    else:
        findings.insert(0, "No missing cells were found in this cleaned version.")

    findings.insert(
        1,
        f"{duplicate_rows} duplicate rows were found beyond their first occurrence.",
    )

    if not numeric:
        findings.append(
            "No numeric-typed columns were found. "
            "Text values were not automatically converted into numbers."
        )

    return {
        "analysis_version": ANALYSIS_VERSION,
        "dataset_id": dataset_id,
        "cleaning_id": cleaning_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scope": "full_cleaned_dataset",
        "summary": {
            "rows": row_count,
            "columns": column_count,
            "missing_cells": missing_cells,
            "missing_percent": round(
                missing_cells / total_cells * 100, 2
            ) if total_cells else 0,
            "duplicate_rows": duplicate_rows,
            "numeric_columns": len(numeric),
        },
        "columns": columns,
        "numeric": numeric,
        "categories": categories,
        "findings": findings,
        "advanced": build_advanced_insights(df),
    }


def save_analysis(result: dict):
    destination = analysis_path(
        result["dataset_id"],
        result["cleaning_id"],
    )

    temporary = destination.with_name(
        f".{destination.name}.{uuid4().hex}.tmp"
    )

    try:
        temporary.write_text(
            json.dumps(result, ensure_ascii=False, allow_nan=False),
            encoding="utf-8",
        )

        # Readers see either the old complete file or the new complete file.
        os.replace(temporary, destination)

    finally:
        temporary.unlink(missing_ok=True)