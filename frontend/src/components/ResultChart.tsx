"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import type { DataRow } from "@/lib/api";

type Props = {
  rows: DataRow[];
  truncated?: boolean;
};

type ChartKind = "bar" | "line" | "histogram";

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Accept clear calendar dates/months; avoid guessing formats like 01/02/2026.
function dateTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;

  const normalized = /^\d{4}-\d{2}$/.test(value)
    ? `${value}-01`
    : value;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const timestamp = Date.parse(`${normalized}T00:00:00Z`);

  if (!Number.isFinite(timestamp)) return null;

  return new Date(timestamp).toISOString().slice(0, 10) === normalized
    ? timestamp
    : null;
}

function formatDate(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumSignificantDigits: 6,
  });
}

function makeHistogram(values: number[]) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  if (minimum === maximum) {
    return [{
      label: String(minimum),
      value: values.length,
    }];
  }

  const count = Math.min(10, Math.ceil(Math.sqrt(values.length)));
  const width = (maximum - minimum) / count;

  if (!Number.isFinite(width) || width <= 0) return [];

  const bins = Array.from({ length: count }, (_, index) => {
    const lower = minimum + index * width;
    const upper = index === count - 1
      ? maximum
      : minimum + (index + 1) * width;

    return {
      label: `[${lower}, ${upper}${index === count - 1 ? "]" : ")"}`,
      value: 0,
    };
  });

  for (const value of values) {
    const index = Math.max(
      0,
      Math.min(count - 1, Math.floor((value - minimum) / width)),
    );

    bins[index].value += 1;
  }

  return bins;
}

export default function ResultChart({
  rows,
  truncated = false,
}: Props) {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  );

  const numericColumns = columns.filter((column) => {
    const values = rows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined);

    return values.length > 0 && values.every(isNumber);
  });

  const labelColumns = columns.filter((column) => {
    const values = rows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined);

    return values.length > 0 &&
      values.every((value) => typeof value === "string");
  });

  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedKind, setSelectedKind] = useState<ChartKind | "auto">("auto");

  const metric = numericColumns.includes(selectedMetric)
    ? selectedMetric
    : numericColumns[0];

  const label = labelColumns.includes(selectedLabel)
    ? selectedLabel
    : labelColumns[0];

  const labels = label
    ? rows.map((row) => row[label]).filter((value) => value != null)
    : [];

  const isDateColumn =
    labels.length > 0 &&
    labels.every((value) => dateTimestamp(value) !== null);

  const defaultKind: ChartKind = label
    ? isDateColumn ? "line" : "bar"
    : "histogram";

  const kind = selectedKind === "auto" ? defaultKind : selectedKind;

  if (rows.length === 0) {
    return (
      <p className="my-4 text-sm text-slate-500">
        No result rows to visualize.
      </p>
    );
  }

  // Only a single row of entirely numeric columns becomes number cards.
  if (
    rows.length === 1 &&
    numericColumns.length > 0 &&
    numericColumns.length === columns.length
  ) {
    return (
      <section className="surface-card my-5 border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5">
        <p className="page-eyebrow">
          Query result
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {numericColumns.map((column) => (
            <div key={column}>
              <p className="break-words text-sm text-slate-600">{column}</p>
              <p className="mt-2 break-words text-3xl font-semibold tracking-tight text-blue-700">
                {String(rows[0][column])}
              </p>
            </div>
          ))}
        </div>

        {truncated && (
          <p className="mt-4 text-sm text-amber-800">
            Partial query result.
          </p>
        )}
      </section>
    );
  }

  if (!metric) {
    return (
      <p className="my-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        This result has no numeric column suitable for a chart. See the table below.
      </p>
    );
  }

  const numericValues = rows
    .map((row) => row[metric])
    .filter(isNumber);

  const pairedRows = label
    ? rows.filter(
        (row) =>
          typeof row[label] === "string" &&
          isNumber(row[metric]),
      )
    : [];

  const duplicateLabels =
    new Set(pairedRows.map((row) => row[label])).size !== pairedRows.length;

  let problem = "";

  if (kind !== "histogram" && !label) {
    problem = "A category or date column is required for this chart.";
  } else if (kind !== "histogram" && duplicateLabels) {
    problem =
      "Repeated labels found. Ask for a grouped result, such as a count or total per category.";
  } else if (kind === "line" && !isDateColumn) {
    problem =
      "Line charts need dates formatted as YYYY-MM-DD or YYYY-MM.";
  } else if (kind === "line" && pairedRows.length < 2) {
    problem = "At least two dates with numeric values are needed.";
  } else if (kind === "bar" && pairedRows.length > 30) {
    problem =
      "Too many categories for a readable bar chart. Ask for the top 10 or top 20.";
  } else if (kind !== "histogram" && pairedRows.length === 0) {
    problem = "No usable category/date and numeric pairs were returned.";
  }

  const histogram = kind === "histogram"
    ? makeHistogram(numericValues)
    : [];

  if (kind === "histogram" && histogram.length === 0) {
    problem = "The numeric range could not be plotted.";
  }

  const chartData = kind === "histogram"
    ? histogram
    : pairedRows.map((row) => ({
        label: String(row[label]),
        value: row[metric] as number,
        time: dateTimestamp(row[label]) ?? 0,
      }));

  const lineData = pairedRows
    .map((row) => ({
      time: dateTimestamp(row[label]) ?? 0,
      value: row[metric] as number,
    }))
    .sort((a, b) => a.time - b.time);

  const excludedRows = rows.length - (
    kind === "histogram" ? numericValues.length : pairedRows.length
  );

  const selectClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return (
    <section className="my-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold tracking-tight text-slate-900">Result visualization</h3>
      <p className="mt-1 text-xs text-slate-500">
        Based on returned SQL rows. Choose columns that match your question.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Chart type
          <select
            value={selectedKind}
            onChange={(event) =>
              setSelectedKind(event.target.value as ChartKind | "auto")
            }
            className={selectClass}
          >
            <option value="auto">Auto</option>
            <option value="bar">Bar chart</option>
            <option value="line">Line chart</option>
            <option value="histogram">Histogram</option>
          </select>
        </label>

        <label className="text-sm font-medium">
          Numeric column
          <select
            value={metric}
            onChange={(event) => setSelectedMetric(event.target.value)}
            className={selectClass}
          >
            {numericColumns.map((column) => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </label>

        {kind !== "histogram" && (
          <label className="text-sm font-medium">
            Category / date
            <select
              value={label ?? ""}
              onChange={(event) => setSelectedLabel(event.target.value)}
              className={selectClass}
            >
              {!label && <option value="">No suitable column</option>}
              {labelColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {truncated && (
        <p className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          Partial result: this chart uses only the returned preview rows,
          not all rows of the query result.
        </p>
      )}

      {kind === "histogram" && (
        <p className="mt-4 text-sm text-slate-600">
          Distribution of “{metric}” across returned query rows.
          This is not automatically the full dataset distribution.
          IDs and numeric codes are usually unsuitable.
        </p>
      )}

      {excludedRows > 0 && !problem && (
        <p className="mt-3 text-xs text-slate-500">
          {excludedRows} rows excluded because the selected value or label is missing.
        </p>
      )}

      {problem ? (
        <p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-600">
          {problem}
        </p>
      ) : (
        <>
          <p className="mt-5 text-sm font-medium">
            {kind === "histogram"
              ? `${metric} distribution · Y-axis: row count`
              : `${metric} by ${label}`}
          </p>

          <div className="mt-3 h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {kind === "line" ? (
                <LineChart
                  data={lineData}
                  margin={{ top: 15, right: 20, bottom: 20, left: 10 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    scale="time"
                    tickFormatter={formatDate}
                    minTickGap={35}
                  />
                  <YAxis tickFormatter={formatNumber} width={80} />
                  <Tooltip
                    labelFormatter={(value) => formatDate(Number(value))}
                  />
                  <Line
                    type="linear"
                    dataKey="value"
                    name={metric}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 15, right: 20, bottom: 30, left: 10 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickFormatter={(value: string) =>
                      value.length > 18 ? `${value.slice(0, 18)}…` : value
                    }
                    minTickGap={15}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    allowDecimals={kind !== "histogram"}
                    width={80}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name={kind === "histogram" ? "Row count" : metric}
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {kind === "histogram" && (
            <p className="mt-2 text-xs text-slate-500">
              Intervals include the lower bound and exclude the upper bound,
              except the final interval which includes both.
            </p>
          )}
        </>
      )}
    </section>
  );
}