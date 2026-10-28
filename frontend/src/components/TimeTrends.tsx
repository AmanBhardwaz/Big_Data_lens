"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import ResultChart from "@/components/ResultChart";

import {
  calculateTrend,
  getSavedTrend,
  type TrendReport,
  type TrendSettings,
} from "@/lib/api";

export default function TimeTrends({
  datasetId,
  cleaningId,
  columns,
  numericColumns,
}: {
  datasetId: string;
  cleaningId: string;
  columns: string[];
  numericColumns: string[];
}) {
  const [settings, setSettings] = useState<TrendSettings>({
    time_column: "",
    metric: "",
    date_format: "year",
    period: "year",
    aggregation: "avg",
  });

  const [report, setReport] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setReport(null);

    getSavedTrend(datasetId, cleaningId)
      .then(({ trend }) => {
        if (!active) return;

        setReport(trend);
        if (trend) setSettings(trend.settings);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load trend.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [datasetId, cleaningId]);

  function update(patch: Partial<TrendSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    setError("");
  }

  async function run() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await calculateTrend(datasetId, cleaningId, settings);
      setReport(result.trend);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not calculate trend.",
      );
    } finally {
      setBusy(false);
    }
  }

  const changed = report && (
    Object.keys(settings) as (keyof TrendSettings)[]
  ).some((key) => settings[key] !== report.settings[key]);

  const selectClass =
    "mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return (
    <section className="surface-card p-5 sm:p-7">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">Time trends</h3>
      <p className="mt-2 text-sm text-slate-500">
        Select the time field and metric. Calculations use all valid rows
        of the cleaned dataset.
      </p>

      <fieldset
        disabled={loading || busy}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <label className="text-sm font-medium">
          Time column
          <select
            value={settings.time_column}
            onChange={(e) => update({ time_column: e.target.value })}
            className={selectClass}
          >
            <option value="">Select time column</option>
            {columns.map((column) => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Numeric metric
          <select
            value={settings.metric}
            onChange={(e) => update({ metric: e.target.value })}
            className={selectClass}
          >
            <option value="">Select metric</option>
            {numericColumns
              .filter((column) => column !== settings.time_column)
              .map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Source date format
          <select
            value={settings.date_format}
            onChange={(e) => {
              const format = e.target.value as TrendSettings["date_format"];
              update({
                date_format: format,
                ...(format === "year" ? { period: "year" as const } : {}),
                ...(format === "month" && settings.period === "day"
                  ? { period: "month" as const }
                  : {}),
              });
            }}
            className={selectClass}
          >
            <option value="year">Year only: 2023</option>
            <option value="month">Year-month: 2023-07</option>
            <option value="ymd">YYYY-MM-DD: 2023-07-25</option>
            <option value="dmy">DD/MM/YYYY: 25/07/2023</option>
            <option value="mdy">MM/DD/YYYY: 07/25/2023</option>
          </select>
        </label>

        <label className="text-sm font-medium">
          Group by
          <select
            value={settings.period}
            onChange={(e) =>
              update({ period: e.target.value as TrendSettings["period"] })
            }
            className={selectClass}
          >
            <option value="year">Year</option>
            <option value="month" disabled={settings.date_format === "year"}>
              Month
            </option>
            <option
              value="day"
              disabled={["year", "month"].includes(settings.date_format)}
            >
              Day
            </option>
          </select>
        </label>

        <label className="text-sm font-medium">
          Aggregation
          <select
            value={settings.aggregation}
            onChange={(e) =>
              update({
                aggregation: e.target.value as TrendSettings["aggregation"],
              })
            }
            className={selectClass}
          >
            <option value="avg">Average — equal weight per row</option>
            <option value="sum">Sum</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </label>
      </fieldset>

      <button
        type="button"
        onClick={run}
        disabled={
          loading || busy ||
          !settings.time_column || !settings.metric ||
          settings.time_column === settings.metric
        }
        className="primary-button mt-5 px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Loading saved trend..." : busy ? "Calculating..." : "Calculate trend"}
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          {changed && (
            <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Settings changed. The result below still uses the previously
              calculated configuration. Click Calculate trend to update it.
            </p>
          )}

          <h4 className="break-words font-semibold">
            {report.settings.aggregation.toUpperCase()} of{" "}
            {report.settings.metric} by {report.settings.period}
          </h4>

          <p className="mt-2 text-sm text-slate-500">
            Time field: {report.settings.time_column}
            {" · "}Calculated: {new Date(report.created_at).toLocaleString()}
          </p>

          <p className="mt-3 text-sm text-slate-600">
            Total rows: {report.total_rows.toLocaleString()} · Used:{" "}
            {report.valid_rows.toLocaleString()} · Excluded:{" "}
            {report.excluded_rows.toLocaleString()}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Invalid/missing time: {report.invalid_time_rows} ·
            Invalid/missing metric: {report.invalid_metric_rows}.
            These two counts may overlap.
          </p>

          {report.missing_periods > 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              {report.missing_periods} periods have no usable observations
              between the first and last displayed periods. They are not filled
              with zero. The line connects observed points across gaps.
            </p>
          )}

          {report.points.length < 2 && (
            <p className="mt-4 text-sm text-amber-700">
              Only one period is available; there is no time trend to compare.
            </p>
          )}

          <ResultChart
            key={report.created_at}
            rows={report.points.map((point) => ({
              date: point.date,
              metric_value: point.value,
            }))}
          />

          <DataTable
            rows={report.points.map((point) => ({
              Period: point.period_label,
              Value: point.value,
              "Valid rows": point.row_count,
              "Change vs previous observed period %":
                point.change_percent === null
                  ? "N/A"
                  : point.change_percent.toFixed(2),
              "Missing periods before": point.gap_before,
            }))}
          />

          <p className="mt-4 text-xs leading-6 text-slate-500">
            Percentage change is shown only when the previous observed value is
            positive. It is not annualized. Native timestamp columns use UTC.
            Period dates represent period starts. Changing row composition can
            affect averages and totals; this chart does not establish causation.
          </p>
        </div>
      )}
    </section>
  );
}