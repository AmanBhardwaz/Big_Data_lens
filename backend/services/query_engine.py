import json
from pathlib import Path
from threading import Timer
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["AI Questions"])
import duckdb
import sqlglot
from sqlglot import exp


DATA_DIR = Path(__file__).resolve().parents[1] / "data"

ALLOWED_FUNCTIONS = {
    "SUM", "AVG", "MIN", "MAX", "COUNT",
    "ROUND", "ABS", "COALESCE", "NULLIF",
    "CAST", "TRY_CAST", "EXTRACT",
    "DATE_TRUNC", "TIMESTAMP_TRUNC",
    "YEAR", "MONTH", "DAY", "LOWER", "UPPER",
}


def open_dataset(dataset_id: str, cleaning_id: str):
    parquet_path = (
        DATA_DIR
        / dataset_id
        / f"cleaned_{cleaning_id}.parquet"
    )

    if not parquet_path.is_file():
        raise FileNotFoundError(
            "Cleaned dataset not found. Check both IDs."
        )

    connection = duckdb.connect(
        database=":memory:",
        config={
            "memory_limit": "512MB",
            "threads": "2",
            "temp_directory": ""
        }
    )

    try:
        # Backend apni selected Parquet file load karta hai.
        connection.execute(
            "CREATE TABLE dataset AS SELECT * FROM read_parquet(?)",
            [str(parquet_path)]
        )

        # LLM ki queries ko external file/network access nahi milega.
        connection.execute("SET enable_external_access = false")

        schema = connection.execute(
            "DESCRIBE dataset"
        ).fetchall()

        sample = connection.execute(
            "SELECT * FROM dataset LIMIT 3"
        ).fetchdf()

        sample_rows = json.loads(
            sample.to_json(
                orient="records",
                date_format="iso"
            )
        )

        for row in sample_rows:
            for key, value in row.items():
                if isinstance(value, str):
                    row[key] = value[:200]

        context = {
            "table": "dataset",
            "columns": [
                {"name": column[0], "type": column[1]}
                for column in schema
            ],
            "sample_rows": sample_rows
        }

        return connection, context

    except Exception:
        connection.close()
        raise


def validate_sql(sql: str) -> str:
    if not sql.strip():
        raise ValueError("Grok returned empty SQL.")

    statements = sqlglot.parse(sql, read="duckdb")

    if len(statements) != 1:
        raise ValueError("Only one SQL statement is allowed.")

    tree = statements[0]

    if not isinstance(tree, exp.Select):
        raise ValueError("Only SELECT queries are allowed.")

    if tree.find(exp.With) is not None:
        raise ValueError("WITH queries are not supported yet.")

    if tree.find(exp.Into) is not None:
        raise ValueError("SELECT INTO is not allowed.")

    tables = list(tree.find_all(exp.Table))

    if not tables:
        raise ValueError("Query must read the dataset table.")

    for table in tables:
        if (
            not isinstance(table.this, exp.Identifier)
            or table.name != "dataset"
            or table.db
            or table.catalog
        ):
            raise ValueError(
                "Only the selected dataset table can be queried."
            )

    for function in tree.find_all(exp.Func):
        if (
            isinstance(function, exp.Anonymous)
            or function.sql_name().upper() not in ALLOWED_FUNCTIONS
        ):
            raise ValueError(
                f"Unsupported SQL function: {function.sql_name()}"
            )

    return tree.sql(dialect="duckdb")


def execute_sql(connection, sql: str):
    validated_sql = validate_sql(sql)

    # Ek extra row se pata chalega ki result truncate hua hai.
    limited_sql = f"""
        SELECT *
        FROM ({validated_sql}) AS answer
        LIMIT 201
    """

    timer = Timer(15, connection.interrupt)
    timer.daemon = True
    timer.start()

    try:
        # DuckDB actual column names aur types bhi validate karega.
        connection.execute("EXPLAIN " + limited_sql)
        result = connection.execute(limited_sql).fetchdf()
    finally:
        timer.cancel()
        timer.join()

    truncated = len(result) > 200
    result = result.head(200)

    return {
        "sql": validated_sql,
        "rows_returned": len(result),
        "truncated": truncated,
        "result": json.loads(
            result.to_json(
                orient="records",
                date_format="iso"
            )
        )
    }