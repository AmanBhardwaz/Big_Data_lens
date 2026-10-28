"use client";

import DataTable from "@/components/DataTable";
import type { AdvancedInsightsReport } from "@/lib/api";

function numberText(value: number | null) {
  return value === null
    ? "Unavailable"
    : value.toLocaleString(undefined, {
        maximumSignificantDigits: 7,
      });
}

export default function AdvancedInsights({
  report,
}: {
  report: AdvancedInsightsReport;
}) {
  const cardClass = "surface-card p-5 sm:p-7";

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <p className="page-eyebrow">
          Advanced Insights
        </p>

        <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
          Relationships between numeric columns
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pearson correlation measures linear association from −1 to +1.
          A value near zero does not rule out a nonlinear relationship.
          Correlation does not establish causation.
        </p>

        <p className="mt-3 text-xs leading-6 text-slate-500">
          Each pair uses rows where both values are finite.
          Minimum: {report.min_paired_rows} paired rows.
          This minimum is a project safeguard, not proof of statistical
          reliability. No significance test is performed.
        </p>

        {report.correlations.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            At least two eligible numeric columns are needed.
          </p>
        ) : (
          <div className="mt-5">
            <DataTable
              rows={report.correlations.map((pair) => ({
                "Column A": pair.left,
                "Column B": pair.right,
                "Pearson r":
                  pair.coefficient === null
                    ? "Unavailable"
                    : pair.coefficient.toFixed(4),
                "Paired rows": pair.paired_rows,
                "Excluded rows": pair.excluded_rows,
                Note: pair.reason ?? "Descriptive association only",
              }))}
            />
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Pairs are sorted by absolute correlation. With many pairs,
          large correlations can occur by chance. Check domain meaning,
          sampling and possible confounding factors before interpretation.
        </p>
      </section>

      <section className={cardClass}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">
          Potential unusual values
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          The IQR rule flags values below Q1 − 1.5 × IQR or above
          Q3 + 1.5 × IQR. Flagged values may be valid observations;
          nothing is deleted or changed.
        </p>

        <p className="mt-2 text-xs leading-6 text-slate-500">
          Minimum: {report.min_outlier_rows} finite values.
          Percentages use finite values as the denominator.
          Skewed or discrete distributions need additional interpretation.
        </p>

        {report.outliers.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No eligible numeric columns.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {report.outliers.map((item) => (
              <article
                key={item.column}
                className="rounded-xl border border-slate-200 p-5"
              >
                <h4 className="break-words font-semibold">{item.column}</h4>

                <p className="mt-2 text-xs text-slate-500">
                  Finite values: {item.valid_rows.toLocaleString()} ·
                  Excluded: {item.excluded_rows.toLocaleString()}
                </p>

                {item.reason ? (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    {item.reason}
                  </p>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs text-slate-500">Flagged values</p>
                        <p className="mt-1 text-lg font-semibold text-blue-700">
                          {item.count?.toLocaleString()} (
                          {item.percent?.toFixed(2)}%)
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Lower boundary</p>
                        <p className="mt-1 break-words font-semibold">
                          {numberText(item.lower)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Upper boundary</p>
                        <p className="mt-1 break-words font-semibold">
                          {numberText(item.upper)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Q1: {numberText(item.q1)} · Q3: {numberText(item.q3)}
                    </p>

                    {item.examples.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-semibold text-blue-700">
                          View up to 5 flagged examples
                        </summary>

                        <p className="my-3 text-xs text-slate-500">
                          Row numbers are 1-based positions in the cleaned
                          dataset, not original spreadsheet row numbers.
                          Examples are the first flagged rows, not a random sample.
                        </p>

                        <DataTable
                          rows={item.examples.map((example) => ({
                            "Cleaned row": example.cleaned_row,
                            Value: example.value,
                          }))}
                        />
                      </details>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h3 className="font-semibold">Coverage and exclusions</h3>

        <p className="mt-3 text-sm text-slate-600">
          These checks use all rows of up to {report.max_columns} eligible
          numeric columns, in dataset column order. Text is not automatically
          converted to numbers. Boolean and complex-valued columns are excluded.
        </p>

        <p className="mt-3 break-words text-sm text-slate-600">
          Selected: {report.selected_columns.join(", ") || "None"}
        </p>

        {report.excluded_columns.length > 0 && (
          <div className="mt-4">
            <DataTable
              rows={report.excluded_columns.map((item) => ({
                Column: item.column,
                Reason: item.reason,
              }))}
            />
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Name-based ID/year/code detection is a heuristic. Some numeric
          identifiers may remain, and some genuine measurements may be excluded.
          Review the selected columns before interpreting results.
        </p>
      </section>
    </div>
  );
}