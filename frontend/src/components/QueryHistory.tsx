"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import ResultChart from "@/components/ResultChart";
import {
  getQueryHistory,
  getHistoryResult,
  type HistoryItem,
  type HistoryDetail,
} from "@/lib/api";

export default function QueryHistory({
  datasetId,
  currentCleaningId,
}: {
  datasetId: string;
  currentCleaningId?: string;
}) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getQueryHistory(datasetId, offset)
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setHasMore(data.has_more);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load history.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [datasetId, offset, refresh]);

  useEffect(() => {
    let active = true;
    if (!selectedId) return;

    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    getHistoryResult(datasetId, selectedId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setDetailError(
            err instanceof Error ? err.message : "Could not load result.",
          );
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [datasetId, selectedId, refresh]);

  return (
    <section className="surface-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Query history</h2>
          <p className="mt-2 text-sm text-slate-500">
            Saved answers across this dataset&apos;s cleaning versions.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || detailLoading}
          onClick={() => setRefresh((value) => value + 1)}
          className="quiet-button px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-5">Loading history...</p>
      ) : error ? (
        <p role="alert" className="mt-5 text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-6 text-slate-500">
          {offset === 0
            ? "No saved questions yet. Ask a question in the Ask AI tab."
            : "No more questions on this page."}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border p-4 ${
                selectedId === item.id
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <p className="break-words font-semibold">{item.question}</p>

              <p className="mt-2 text-xs text-slate-500">
                {new Date(item.created_at).toLocaleString()} · {item.status}
              </p>

              <p className="mt-2 break-all text-xs text-slate-500">
                Version: {item.cleaning_id}
                {item.cleaning_id === currentCleaningId
                  ? " · Currently loaded"
                  : " · Different from loaded version"}
              </p>

              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
              >
                View saved result →
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-between">
        <button
          type="button"
          disabled={loading || offset === 0}
          onClick={() => setOffset((value) => Math.max(0, value - 20))}
          className="quiet-button px-4 py-2 text-sm disabled:opacity-40"
        >
          ← Previous
        </button>

        <button
          type="button"
          disabled={loading || !!error || !hasMore}
          onClick={() => setOffset((value) => value + 20)}
          className="quiet-button px-4 py-2 text-sm disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {detailLoading && (
        <p role="status" className="mt-6">Loading saved result...</p>
      )}

      {detailError && (
        <p role="alert" className="mt-6 text-red-700">{detailError}</p>
      )}

      {detail && !detailLoading && (
        <div className="mt-7 border-t border-slate-200 pt-6">
          <p className="page-eyebrow">
            Saved result
          </p>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{detail.question}</h3>
          <p className="mt-2 text-xs text-slate-500">
            {new Date(detail.created_at).toLocaleString()} · Not recalculated
          </p>

          {detail.cleaning_id !== currentCleaningId && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              This answer belongs to a different cleaning version.
            </p>
          )}

          {detail.response.status === "success" ? (
            <>
              <p className="my-4 text-slate-600">
                {detail.response.calculation}
              </p>

           <ResultChart
  key={detail.id}
  rows={detail.response.result}
  truncated={detail.response.truncated}
/>

<DataTable rows={detail.response.result} />

              {detail.response.truncated && (
                <p className="mt-3 text-sm text-amber-700">
                  This saved answer contains a limited result preview.
                </p>
              )}

              <details className="mt-5">
                <summary className="cursor-pointer font-medium">
                  Generated SQL
                </summary>
                <pre className="mt-3 overflow-auto rounded-xl bg-slate-900 p-4 text-sm text-white">
                  {detail.response.sql}
                </pre>
              </details>
            </>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
              {detail.response.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}