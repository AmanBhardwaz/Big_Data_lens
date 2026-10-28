"use client";

import { useEffect, useState } from "react";
import { listDatasets, type SavedDataset } from "@/lib/api";

type Props = {
  activeDatasetId?: string;
  disabled: boolean;
  onOpen: (datasetId: string) => Promise<void>;
};

const PAGE_SIZE = 20;

function uploadedDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function MyDatasets({
  activeDatasetId,
  disabled,
  onOpen,
}: Props) {
  const [datasets, setDatasets] = useState<SavedDataset[]>([]);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openError, setOpenError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setOpenError("");

    listDatasets(PAGE_SIZE, offset)
      .then((response) => {
        if (active) setDatasets(response.datasets);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load saved datasets.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [offset, refresh]);

  async function handleOpen(datasetId: string) {
    if (disabled || opening) return;

    setOpening(datasetId);
    setOpenError("");

    try {
      await onOpen(datasetId);
    } catch (err) {
      setOpenError(
        err instanceof Error ? err.message : "Could not open dataset.",
      );
    } finally {
      setOpening(null);
    }
  }

  const locked = disabled || opening !== null;

  return (
    <section
      aria-labelledby="datasets-heading"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2
              id="datasets-heading"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Saved datasets
            </h2>

            {!loading && !error && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                {datasets.length} on this page
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Pick up where you left off.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || locked}
          onClick={() => setRefresh((value) => value + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {openError && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {openError}
        </p>
      )}

      {error ? (
        <div role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800">
            We couldn&apos;t load your datasets
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            disabled={locked}
            onClick={() => setRefresh((value) => value + 1)}
            className="mt-4 text-sm font-semibold text-red-800 underline disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <>
          <p role="status" className="sr-only">
            Loading saved datasets
          </p>
          <div aria-hidden="true" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-100 p-5 motion-reduce:animate-none"
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100" />
                <div className="mt-5 h-4 w-3/4 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                <div className="mt-6 h-10 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        </>
      ) : datasets.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-400"
          >
            ▤
          </span>
          <h3 className="mt-5 font-semibold text-slate-800">
            {offset === 0 ? "Your first insight starts with a file" : "You've reached the end"}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {offset === 0
              ? "Use the upload section above to add a CSV or Excel file. Your saved datasets will appear here."
              : "Go back to the previous page to open a saved dataset."}
          </p>

          {offset === 0 && (
            <a
              href="/dashboard#upload-dataset"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Upload your first dataset →
            </a>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {datasets.map((dataset) => {
            const selected = activeDatasetId === dataset.dataset_id;
            const excel = /\.xlsx$/i.test(dataset.filename);

            return (
              <article
                key={dataset.dataset_id}
                className={`group flex min-w-0 flex-col rounded-2xl border p-5 transition duration-200 ${
                  selected
                    ? "border-blue-300 bg-blue-50/40"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-xl text-[10px] font-bold tracking-wide ${
                      excel
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {excel ? "XLSX" : "CSV"}
                  </span>

                  {selected ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                      Saved dataset
                    </span>
                  )}
                </div>

                <h3 className="mt-5 break-words text-sm font-semibold leading-6 text-slate-900">
                  {dataset.filename}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Uploaded {uploadedDate(dataset.created_at)}
                </p>

                <div className="mb-5 mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Original rows
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {dataset.total_rows.toLocaleString()}
                    </p>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Columns
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {dataset.total_columns.toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void handleOpen(dataset.dataset_id)}
                  className="mt-auto flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    {opening === dataset.dataset_id
                      ? "Opening..."
                      : selected
                        ? "Reopen workspace"
                        : "Open workspace"}
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          disabled={offset === 0 || loading || locked}
          onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          ← Previous
        </button>

        <span className="text-xs text-slate-400">
          Page {Math.floor(offset / PAGE_SIZE) + 1}
        </span>

        <button
          type="button"
          disabled={loading || locked || !!error || datasets.length < PAGE_SIZE}
          onClick={() => setOffset((value) => value + PAGE_SIZE)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </section>
  );
}