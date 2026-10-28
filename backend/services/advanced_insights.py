import re
from itertools import combinations

import numpy as np
import pandas as pd
from pandas.api.types import (
    is_numeric_dtype,
    is_bool_dtype,
    is_complex_dtype,
)


# Project safeguards, not statistical guarantees.
MAX_COLUMNS = 20
MIN_PAIRS = 10
MIN_OUTLIER_ROWS = 8


def build_advanced_insights(df: pd.DataFrame):
    arrays = {}
    excluded = []

    for column in df.columns:
        series = df[column]

        if (
            not is_numeric_dtype(series.dtype)
            or is_bool_dtype(series.dtype)
            or is_complex_dtype(series.dtype)
        ):
            continue

        name = str(column)

        # Split camelCase, then inspect name tokens.
        words = re.sub(
            r"([a-z])([A-Z])",
            r"\1 \2",
            name,
        ).lower()

        if re.search(
            r"(^|[^a-z0-9])(id|identifier|code|year|yr)([^a-z0-9]|$)",
            words,
        ):
            excluded.append({
                "column": name,
                "reason": (
                    "Name suggests an ID, code or year; "
                    "excluded by heuristic."
                ),
            })
            continue

        if len(arrays) >= MAX_COLUMNS:
            excluded.append({
                "column": name,
                "reason": "Beyond the first 20 eligible numeric columns.",
            })
            continue

        # Preserve row positions. Never drop missing values independently
        # before matching two columns.
        arrays[name] = series.to_numpy(
            dtype=float,
            na_value=np.nan,
        )

    correlations = []

    for left, right in combinations(arrays, 2):
        a = arrays[left]
        b = arrays[right]

        valid = np.isfinite(a) & np.isfinite(b)
        x = a[valid]
        y = b[valid]
        n = int(valid.sum())

        coefficient = None
        reason = None

        if n < MIN_PAIRS:
            reason = "Fewer than 10 paired finite rows."

        elif x.min() == x.max() or y.min() == y.max():
            reason = "A column is constant on the paired rows."

        else:
            # Scaling reduces overflow risk without changing Pearson r.
            with np.errstate(all="ignore"):
                value = float(
                    np.corrcoef(
                        x / np.max(np.abs(x)),
                        y / np.max(np.abs(y)),
                    )[0, 1]
                )

            if np.isfinite(value):
                coefficient = float(np.clip(value, -1, 1))
            else:
                reason = "Correlation numerically unavailable."

        correlations.append({
            "left": left,
            "right": right,
            "paired_rows": n,
            "excluded_rows": int(len(df) - n),
            "coefficient": coefficient,
            "reason": reason,
        })

    correlations.sort(
        key=lambda item: (
            abs(item["coefficient"])
            if item["coefficient"] is not None
            else -1
        ),
        reverse=True,
    )

    outliers = []

    for column, array in arrays.items():
        positions = np.flatnonzero(np.isfinite(array))
        values = array[positions]

        item = {
            "column": column,
            "valid_rows": int(len(values)),
            "excluded_rows": int(len(df) - len(values)),
            "q1": None,
            "q3": None,
            "lower": None,
            "upper": None,
            "count": None,
            "percent": None,
            "examples": [],
            "reason": None,
        }

        if len(values) < MIN_OUTLIER_ROWS:
            item["reason"] = "Fewer than 8 finite values; check skipped."

        else:
            with np.errstate(all="ignore"):
                q1, q3 = np.quantile(
                    values,
                    [0.25, 0.75],
                    method="linear",
                )

                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr

            if not np.isfinite([q1, q3, iqr, lower, upper]).all():
                item["reason"] = "IQR bounds numerically unavailable."

            elif iqr <= 0:
                item["reason"] = (
                    "IQR is zero; rule skipped, "
                    "not evidence of no unusual values."
                )

            else:
                mask = (values < lower) | (values > upper)
                flagged = np.flatnonzero(mask)

                item.update({
                    "q1": float(q1),
                    "q3": float(q3),
                    "lower": float(lower),
                    "upper": float(upper),
                    "count": int(mask.sum()),
                    "percent": float(mask.mean() * 100),
                    "examples": [
                        {
                            "cleaned_row": int(positions[index]) + 1,
                            "value": float(values[index]),
                        }
                        for index in flagged[:5]
                    ],
                })

        outliers.append(item)

    return {
        "method": "pearson_and_iqr",
        "min_paired_rows": MIN_PAIRS,
        "min_outlier_rows": MIN_OUTLIER_ROWS,
        "max_columns": MAX_COLUMNS,
        "selected_columns": list(arrays),
        "excluded_columns": excluded,
        "correlations": correlations,
        "outliers": outliers,
    }