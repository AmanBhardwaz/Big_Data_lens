import json
import math
import os
from datetime import datetime, timezone
from uuid import uuid4

import numpy as np
import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_complex_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

from services.analysis_engine import DATA_DIR


TREND_VERSION = 1

DATE_FORMATS = {
    "year": "%Y",
    "month": "%Y-%m",
    "ymd": "%Y-%m-%d",
    "dmy": "%d/%m/%Y",
    "mdy": "%m/%d/%Y",
}

DATE_PATTERNS = {
    "year": r"\d{4}",
    "month": r"\d{4}-\d{2}",
    "ymd": r"\d{4}-\d{2}-\d{2}",
    "dmy": r"\d{2}/\d{2}/\d{4}",
    "mdy": r"\d{2}/\d{2}/\d{4}",
}


def trend_path(dataset_id, cleaning_id):
    return (
        DATA_DIR
        / dataset_id
        / f"trend_v{TREND_VERSION}_{cleaning_id}.json"
    )


def load_trend(dataset_id, cleaning_id):
    path = trend_path(dataset_id, cleaning_id)

    if not path.is_file():
        return None

    try:
        result = json.loads(path.read_text(encoding="utf-8"))

        if (
            result["dataset_id"] == dataset_id
            and result["cleaning_id"] == cleaning_id
            and result["trend_version"] == TREND_VERSION
        ):
            return result

    except (OSError, ValueError, KeyError, TypeError):
        pass

    return None


def save_trend(result):
    destination = trend_path(
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
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def build_trend(dataset_id, cleaning_id, settings):
    path = (
        DATA_DIR
        / dataset_id
        / f"cleaned_{cleaning_id}.parquet"
    )
    df = pd.read_parquet(path)

    time_column = settings["time_column"]
    metric = settings["metric"]
    date_format = settings["date_format"]
    period = settings["period"]
    aggregation = settings["aggregation"]

    for column in [time_column, metric]:
        if column not in df.columns:
            raise ValueError(f'Column "{column}" was not found.')

    if time_column == metric:
        raise ValueError("Choose different time and metric columns.")

    if date_format == "year" and period != "year":
        raise ValueError("Year-only data can only be grouped by year.")

    if date_format == "month" and period == "day":
        raise ValueError("Month-only data cannot be grouped by day.")

    metric_series = df[metric]

    if (
        not is_numeric_dtype(metric_series.dtype)
        or is_bool_dtype(metric_series.dtype)
        or is_complex_dtype(metric_series.dtype)
    ):
        raise ValueError("Select a numeric-typed metric column.")

    time_series = df[time_column]

    if is_datetime64_any_dtype(time_series.dtype):
        dates = pd.to_datetime(
            time_series,
            errors="coerce",
            utc=True,
        )
    else:
        text = time_series.astype("string").str.strip()

        if date_format == "year":
            # Accept numeric years such as 2023.0 without accepting 2023.5.
            text = text.str.replace(
                r"^(\d{4})\.0+$",
                r"\1",
                regex=True,
            )

        matches = text.str.fullmatch(
            DATE_PATTERNS[date_format],
            na=False,
        )

        dates = pd.to_datetime(
            text.where(matches),
            format=DATE_FORMATS[date_format],
            exact=True,
            errors="coerce",
            utc=True,
        )

    values = metric_series.to_numpy(dtype=float, na_value=np.nan)
    finite = np.isfinite(values)
    valid_time = dates.notna().to_numpy()
    valid = valid_time & finite

    if not valid.any():
        raise ValueError(
            "No usable rows. Check the selected date format and metric."
        )

    # Normalize native timestamp columns to UTC before calendar grouping.
    plain_dates = dates.dt.tz_convert(None)
    frequency = {"year": "Y", "month": "M", "day": "D"}[period]

    periods = plain_dates[valid].dt.to_period(frequency)

    working = pd.DataFrame({
        "period": periods.to_numpy(),
        "value": values[valid],
    })

    grouped = working.groupby("period", sort=True)["value"]
    function = {
        "avg": "mean",
        "sum": "sum",
        "min": "min",
        "max": "max",
    }[aggregation]

    calculated = grouped.agg(function)
    counts = grouped.size()

    if len(calculated) > 500:
        raise ValueError(
            "More than 500 periods. Select a coarser grouping."
        )

    if not np.isfinite(calculated.to_numpy(dtype=float)).all():
        raise ValueError(
            "An aggregate overflowed. Review the metric or aggregation."
        )

    points = []
    previous_value = None
    previous_period = None
    missing_periods = 0

    for bucket, value in calculated.items():
        value = float(value)
        change_percent = None

        if previous_value is not None and previous_value > 0:
            candidate = (value / previous_value - 1) * 100
            if math.isfinite(candidate):
                change_percent = candidate

        gap = (
            int(bucket.ordinal - previous_period.ordinal - 1)
            if previous_period is not None
            else 0
        )
        missing_periods += max(0, gap)

        points.append({
            "date": bucket.start_time.strftime("%Y-%m-%d"),
            "period_label": str(bucket),
            "value": value,
            "row_count": int(counts.loc[bucket]),
            "change_percent": change_percent,
            "gap_before": max(0, gap),
        })

        previous_value = value
        previous_period = bucket

    return {
        "trend_version": TREND_VERSION,
        "dataset_id": dataset_id,
        "cleaning_id": cleaning_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": settings,
        "total_rows": int(len(df)),
        "valid_rows": int(valid.sum()),
        "invalid_time_rows": int((~valid_time).sum()),
        "invalid_metric_rows": int((~finite).sum()),
        "excluded_rows": int((~valid).sum()),
        "missing_periods": missing_periods,
        "points": points,
    }