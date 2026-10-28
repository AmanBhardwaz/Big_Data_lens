from datetime import datetime, timezone


RULE_VERSION = 2


def build_recommendations(analysis: dict):
    recommendations = []

    def add(priority, title, evidence, action, column=None):
        recommendations.append({
            "id": f"rec-{len(recommendations) + 1}",
            "priority": priority,
            "title": title,
            "column": column,
            "evidence": evidence,
            "action": action,
        })

    summary = analysis["summary"]
    row_count = summary["rows"]

    for item in analysis["columns"]:
        column = item["column"]
        missing = item["missing"]
        missing_percent = item["missing_percent"]

        if row_count > 0 and missing == row_count:
            add(
                "high",
                "Review an entirely empty column",
                f'All {row_count} rows in "{column}" are missing.',
                "Check whether the source file should contain values. "
                "Restore the source data, or exclude this column from "
                "analysis if it is not required.",
                column,
            )
            continue

        if missing > 0:
            add(
                "high" if missing_percent >= 20 else "medium",
                "Choose a missing-value strategy",
                f'"{column}" has {missing} missing values '
                f"({missing_percent}% of rows).",
                "Check why values are missing before filling or deleting them. "
                "Compare affected and unaffected rows. Dropping rows with any "
                "missing value can remove more data than expected.",
                column,
            )

        if item["constant"]:
            add(
                "low",
                "Review a constant column",
                f'"{column}" has one distinct non-missing value.',
                "Keep it if it provides necessary context. "
                "It cannot explain differences between non-missing rows, "
                "so it may be unnecessary for comparisons or prediction.",
                column,
            )

    if summary["duplicate_rows"] > 0:
        add(
            "medium",
            "Check whether duplicate rows are legitimate",
            f'This cleaned version contains {summary["duplicate_rows"]} '
            "duplicate rows beyond their first occurrence.",
            "Check whether identical rows represent separate real events. "
            "Remove them only if they are accidental duplicates.",
        )

    for item in analysis["numeric"]:
        column = item["column"]

        if item["non_finite_count"] > 0:
            add(
                "high",
                "Investigate non-finite numeric values",
                f'"{column}" contains {item["non_finite_count"]} '
                "non-finite values excluded from its statistics.",
                "Inspect source calculations for division by zero or overflow. "
                "Correct the source values before using this column in decisions.",
                column,
            )

        if item["valid_count"] == 1:
            add(
                "medium",
                "Avoid distribution conclusions from one value",
                f'"{column}" has only one usable numeric value.',
                "Collect or recover more valid observations before interpreting "
                "its distribution or variability.",
                column,
            )

    for item in analysis["categories"]:
        total = item["non_missing_count"]

        if total < 20 or item["unique"] < 2 or not item["top"]:
            continue

        largest = item["top"][0]
        share = largest["count"] / total * 100

        if share >= 50:
            add(
                "medium",
                "Check category representation",
                f'In "{item["column"]}", "{largest["label"]}" accounts for '
                f'{largest["count"]} of {total} non-missing rows '
                f"({share:.1f}%).",
                "Check whether this concentration is expected from how data "
                "was collected. Review smaller categories separately before "
                "generalizing conclusions. Row frequency does not establish "
                "market share or customer preference.",
                item["column"],
            )

        if summary["numeric_columns"] == 0:
            add(
                "info",
                "Use categorical analysis",
                "No numeric-typed columns were found in this cleaned version.",
                "Use row counts, unique-value counts and category comparisons. "
                "If a column should be numeric, review its format and invalid "
                "values before converting it.",
            )

    # Keep this outside the conditional so it is defined for every dataset.
        advanced = analysis.get("advanced", {})

        for item in advanced.get("outliers", []):
            if item["count"] is not None and item["count"] > 0:
                add(
                "medium",
                "Review potentially unusual numeric values",
                f'"{item["column"]}" has {item["count"]} values '
                f'({item["percent"]:.2f}% of finite values) outside '
                f'the IQR boundaries [{item["lower"]}, {item["upper"]}].',
                "Inspect the flagged examples and verify units and source data. "
                "These values may be legitimate extremes. Do not delete them "
                "solely because the IQR rule flagged them.",
                item["column"],
            )
    if not recommendations:
        add(
            "info",
            "Continue with domain-specific checks",
            "The current rules found no missing-value, duplicate-row, "
            "constant-column or category-concentration issues.",
            "This does not establish that the data is correct. "
            "Check units, valid ranges, collection methods and whether "
            "the dataset represents the question you want to answer.",
        )

    order = {"high": 0, "medium": 1, "low": 2, "info": 3}
    recommendations.sort(key=lambda item: order[item["priority"]])

    return {
        "dataset_id": analysis["dataset_id"],
        "cleaning_id": analysis["cleaning_id"],
        "analysis_created_at": analysis["created_at"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "rule_version": RULE_VERSION,
        "method": "rule_based",
        "thresholds": {
            "high_missing_percent": 20,
            "category_concentration_percent": 50,
            "minimum_category_rows": 20,
        },
        "items": recommendations,
    }