"use client";

import { useEffect, useState } from "react";
import {
  getSavedRecommendations,
  generateRecommendations,
  type RecommendationReport,
} from "@/lib/api";

const priorityStyles = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-800",
  low: "bg-blue-50 text-blue-700",
  info: "bg-slate-100 text-slate-600",
};

export default function Recommendations({
  datasetId,
  cleaningId,
  onOpenAnalysis,
}: {
  datasetId: string;
  cleaningId: string;
  onOpenAnalysis: () => void;
}) {
  const [report, setReport] = useState<RecommendationReport | null>(null);
  const [analysisRequired, setAnalysisRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setReport(null);

    getSavedRecommendations(datasetId, cleaningId)
      .then((result) => {
        if (!active) return;
        setReport(result.recommendations);
        setAnalysisRequired(result.analysis_required);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load recommendations.",
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

  async function handleGenerate() {
    if (generating) return;

    setGenerating(true);
    setError("");

    try {
      const result = await generateRecommendations(datasetId, cleaningId);
      setReport(result.recommendations);
      setAnalysisRequired(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Generation failed.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="surface-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Recommendations</h2>
          <p className="mt-2 text-sm text-slate-500">
            Evidence-based review suggestions from this version&apos;s analysis.
          </p>
        </div>

        {!analysisRequired && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || generating}
            className="primary-button px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : report
                ? "Regenerate"
                : "Generate recommendations"}
          </button>
        )}
      </div>

      {loading && (
        <p role="status" className="mt-5 text-sm text-slate-500">
          Checking saved recommendations...
        </p>
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
          <p>{error}</p>
          <button
            type="button"
            disabled={loading || generating}
            onClick={() => setRetry((value) => value + 1)}
            className="mt-3 text-sm font-semibold underline"
          >
            Retry loading
          </button>
        </div>
      )}

      {!loading && !error && analysisRequired && (
        <div className="mt-6 rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-blue-900">
            Run Automatic Analysis for this cleaning version first.
          </p>
          <button
            type="button"
            onClick={onOpenAnalysis}
            className="mt-3 text-sm font-semibold text-blue-700 underline"
          >
            Open Automatic Analysis →
          </button>
        </div>
      )}

      {!loading && !error && !analysisRequired && !report && (
        <p className="mt-5 text-sm text-slate-500">
          No current saved recommendations. Click Generate recommendations.
        </p>
      )}

      {report && (
        <>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            <p>
              Method: rule-based · Generated:{" "}
              {new Date(report.created_at).toLocaleString()}
            </p>
            <p>
              Based on analysis from:{" "}
              {new Date(report.analysis_created_at).toLocaleString()}
            </p>
            <p>
              Review thresholds: high missingness ≥{" "}
              {report.thresholds.high_missing_percent}% · Category concentration ≥{" "}
              {report.thresholds.category_concentration_percent}% with at least{" "}
              {report.thresholds.minimum_category_rows} non-missing rows.
            </p>
            <p>
              These are project review thresholds. No data changes are applied automatically.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {report.items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-100 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-semibold">{item.title}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}
                  >
                    {item.priority.toUpperCase()}
                  </span>
                </div>

                {item.column && (
                  <p className="mt-2 break-words text-xs text-slate-500">
                    Column: {item.column}
                  </p>
                )}

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Evidence
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.evidence}
                </p>

                <p className="mt-4 text-sm font-semibold text-blue-700">
                  Suggested action
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {item.action}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}