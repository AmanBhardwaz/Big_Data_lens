"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import AdvancedInsights from "@/components/AdvancedInsights";
import TimeTrends from "@/components/TimeTrends";

import DataTable from "@/components/DataTable";
import {
  getSavedAnalysis,
  runAutomaticAnalysis,
  type AutomaticAnalysisReport,
} from "@/lib/api";

type ChartRow = {
  label: string;
  count: number;
};

function CountChart({
  rows,
  name,
}: {
  rows: ChartRow[];
  name: string;
}) {
  return (
    <div className="mt-4 h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
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
          <YAxis allowDecimals={false} width={65} />
          <Tooltip />
          <Bar
            dataKey="count"
            name={name}
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function displayNumber(value: number | null) {
  return value === null
    ? "Unavailable"
    : value.toLocaleString(undefined, {
        maximumSignificantDigits: 7,
      });
}

export default function AutomaticAnalysis({
  datasetId,
  cleaningId,
}: {
  datasetId: string;
  cleaningId: string;
}) {
  const [report, setReport] = useState<AutomaticAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [numericColumn, setNumericColumn] = useState("");
  const [categoryColumn, setCategoryColumn] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setReport(null);

    getSavedAnalysis(datasetId, cleaningId)
      .then((result) => {
        if (active) setReport(result.analysis);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load analysis.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [datasetId, cleaningId, retry]);

  async function handleRun() {
    if (running) return;

    setRunning(true);
    setError("");

    try {
      const result = await runAutomaticAnalysis(
        datasetId,
        cleaningId,
        report !== null,
      );

      setReport(result.analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  const numeric = report?.numeric.find(
    (item) => item.column === numericColumn,
  ) ?? report?.numeric[0];

  const category = report?.categories.find(
    (item) => item.column === categoryColumn,
  ) ?? report?.categories[0];

  const missingColumns = report?.columns
    .filter((item) => item.missing > 0)
    .sort((a, b) => b.missing - a.missing) ?? [];

  const cardClass = "surface-card p-5 sm:p-7";

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Automatic analysis</h2>
            <p className="mt-2 text-sm text-slate-500">
              Statistics calculated from every row of this cleaned version.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={loading || running}
            className="primary-button px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {running
              ? "Analyzing..."
              : report
                ? "Recalculate analysis"
                : "Run analysis"}
          </button>
        </div>

        {loading && (
          <p role="status" className="mt-5 text-sm text-slate-500">
            Checking for saved analysis...
          </p>
        )}

        {running && (
          <p role="status" className="mt-5 text-sm text-blue-700">
            Reading the full cleaned dataset and calculating statistics...
          </p>
        )}

        {error && (
          <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button
              type="button"
              disabled={loading || running}
              onClick={() => setRetry((value) => value + 1)}
              className="mt-3 text-sm font-semibold underline"
            >
              Retry loading saved analysis
            </button>
          </div>
        )}

        {!loading && !report && !error && !running && (
          <p className="mt-5 text-sm text-slate-500">
            No saved analysis for this version yet. Click Run analysis.
          </p>
        )}

        {report && (
          <>
            <p className="mt-5 text-xs text-slate-500">
              Calculated: {new Date(report.created_at).toLocaleString()}
              {" · "}Full dataset: {report.summary.rows.toLocaleString()} rows
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Missing cells", report.summary.missing_cells],
                ["Missing %", report.summary.missing_percent],
                ["Duplicate rows", report.summary.duplicate_rows],
                ["Numeric columns", report.summary.numeric_columns],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {report && (
  <>
    <AdvancedInsights report={report.advanced} />
    <TimeTrends
  key={`${datasetId}:${cleaningId}`}
  datasetId={datasetId}
  cleaningId={cleaningId}
  columns={report.columns.map((column) => column.column)}
  numericColumns={report.numeric.map((column) => column.column)}
/>

    <section className={cardClass}>
      <h3 className="text-lg font-semibold">Findings</h3>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-slate-700">
              {report.findings.map((finding, index) => (
                <li key={index}>{finding}</li>
              ))}
            </ul>
          </section>

          <section className={cardClass}>
            <h3 className="text-lg font-semibold">Column quality</h3>

            <div className="mt-4">
              <DataTable
                rows={report.columns.map((column) => ({
                  Column: column.column,
                  Type: column.dtype,
                  Missing: column.missing,
                  "Missing %": column.missing_percent,
                  Unique: column.unique,
                  Constant: column.constant ? "Yes" : "No",
                }))}
              />
            </div>

            {missingColumns.length > 0 && (
              <>
                <p className="mt-6 text-sm font-medium">
                  Missing values by column
                  {missingColumns.length > 20 ? " · Top 20 columns shown" : ""}
                </p>
                <CountChart
                  rows={missingColumns.slice(0, 20).map((column) => ({
                    label: column.column,
                    count: column.missing,
                  }))}
                  name="Missing cells"
                />
              </>
            )}
          </section>

          <section className={cardClass}>
            <h3 className="text-lg font-semibold">Numeric summary & histogram</h3>

            <p className="mt-2 text-sm text-slate-500">
              Missing and infinite values are excluded. Standard deviation
              describes this full dataset (population standard deviation).
              Numeric IDs and year codes may not be meaningful measurements.
            </p>

            {!numeric ? (
              <p className="mt-5 text-sm text-slate-500">
                No numeric-typed columns available.
              </p>
            ) : (
              <>
                <label className="mt-5 block text-sm font-medium">
                  Numeric column
                  <select
                    value={numeric.column}
                    onChange={(event) => setNumericColumn(event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {report.numeric.map((item) => (
                      <option key={item.column} value={item.column}>
                        {item.column}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {[
                    ["Minimum", numeric.minimum],
                    ["Maximum", numeric.maximum],
                    ["Mean", numeric.mean],
                    ["Median", numeric.median],
                    ["Std deviation", numeric.std],
                    ["Valid values", numeric.valid_count],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="mt-2 break-words font-semibold text-slate-900">
                        {displayNumber(value as number | null)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-xs text-slate-500">
                  Missing: {numeric.missing_count} · Non-finite:{" "}
                  {numeric.non_finite_count}
                </p>

                {numeric.bins.length > 0 && (
                  <>
                    <CountChart
                      rows={numeric.bins.map((bin) => ({
                        label: bin.lower === bin.upper
                          ? String(bin.lower)
                          : `[${bin.lower}, ${bin.upper}${bin.includes_upper ? "]" : ")"}`,
                        count: bin.count,
                      }))}
                      name="Rows in range"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      X-axis: value ranges. Y-axis: row count. Hover to see
                      exact boundaries. The final bin includes its upper boundary.
                    </p>
                  </>
                )}

                {numeric.histogram_note && (
                  <p className="mt-4 text-sm text-amber-700">
                    {numeric.histogram_note}
                  </p>
                )}
              </>
            )}
          </section>

          <section className={cardClass}>
            <h3 className="text-lg font-semibold">Category counts</h3>

            {!category ? (
              <p className="mt-4 text-sm text-slate-500">
                No low-cardinality category columns available.
              </p>
            ) : (
              <>
                <label className="mt-4 block text-sm font-medium">
                  Category column
                  <select
                    value={category.column}
                    onChange={(event) => setCategoryColumn(event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {report.categories.map((item) => (
                      <option key={item.column} value={item.column}>
                        {item.column}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="mt-4 text-sm text-slate-500">
                  {category.unique} distinct values ·{" "}
                  {category.non_missing_count.toLocaleString()} non-missing rows.
                  Showing up to 10 most frequent values.
                </p>

                <CountChart rows={category.top} name="Row count" />

                {category.other_count > 0 && (
                  <p className="mt-3 text-sm text-slate-500">
                    Other categories account for {category.other_count.toLocaleString()} rows
                    and are not shown in this chart.
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}