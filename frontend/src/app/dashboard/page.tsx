"use client";

import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

import MyDatasets from "@/components/MyDatasets";
import { uploadDataset } from "@/lib/api";

function UploadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function chooseFile(candidate: File | null) {
    if (busy || !candidate) return;

    setError("");
    setFile(null);

    if (!/\.(csv|xlsx)$/i.test(candidate.name)) {
      setError("Please choose a CSV or XLSX file.");
      return;
    }

    if (candidate.size === 0) {
      setError("This file is empty. Please choose another file.");
      return;
    }

    if (candidate.size > 20 * 1024 * 1024) {
      setError("Maximum file size is 20 MB.");
      return;
    }

    setFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    if (busy) return;

    if (event.dataTransfer.files.length !== 1) {
      setError("Please upload one dataset at a time.");
      return;
    }

    chooseFile(event.dataTransfer.files[0]);
  }

  async function openDataset(datasetId: string) {
    router.push(
      `/dashboard/datasets/${encodeURIComponent(datasetId)}`,
    );
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;

    setBusy(true);
    setError("");

    try {
      const dataset = await uploadDataset(file);

      router.push(
        `/dashboard/datasets/${encodeURIComponent(dataset.dataset_id)}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

        {/* Workspace header */}
        <header className="relative overflow-hidden rounded-[28px] bg-[#101b35] px-6 py-9 text-white sm:px-9 sm:py-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
                DataLens / Workspace
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your data. A clearer picture.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Bring your spreadsheets together. Explore your data,
                ask questions, and return to your saved analysis.
              </p>
            </div>

            <a
              href="#upload-dataset"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:self-auto"
            >
              <UploadIcon className="h-4 w-4" />
              New dataset
            </a>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs text-slate-300">
            <span>CSV & Excel</span>
            <span>Natural-language questions</span>
            <span>Saved analysis & history</span>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

          {/* Upload */}
          <section
            id="upload-dataset"
            aria-labelledby="upload-title"
            className="scroll-mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UploadIcon className="h-5 w-5" />
              </div>

              <div>
                <h2
                  id="upload-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Start with a dataset
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Upload a file to open its own analysis workspace.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="mt-6">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx"
                aria-label="Choose CSV or Excel file"
                disabled={busy}
                className="hidden"
                onChange={(event) => {
                  chooseFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />

              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (busy) return;
                  dragDepth.current += 1;
                  setDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = busy ? "none" : "copy";
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setDragging(false);
                }}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed px-5 py-9 text-center transition ${
                  dragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                  <UploadIcon className="h-6 w-6" />
                </div>

                <p className="mt-4 font-medium text-slate-800">
                  {dragging ? "Drop your file here" : "Drag and drop your file here"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  or choose a file from your computer
                </p>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                  className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                >
                  Browse files
                </button>

                <p className="mt-4 text-xs text-slate-400">
                  .CSV or .XLSX · Up to 20 MB · First Excel sheet
                </p>
              </div>

              {file && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold tracking-wide text-blue-700">
                    {file.name.toLowerCase().endsWith(".csv") ? "CSV" : "XLSX"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatSize(file.size)} · Ready to upload
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setFile(null);
                      setError("");
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white hover:text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Already uploaded? Open it from your saved datasets below.
                </p>

                <button
                  type="submit"
                  disabled={!file || busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                      />
                      Opening workspace...
                    </>
                  ) : (
                    <>
                      Upload & explore
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>

              {busy && (
                <p role="status" className="mt-3 text-sm text-blue-700">
                  Uploading your file and preparing its preview…
                </p>
              )}
            </form>
          </section>

          {/* Helpful introduction */}
          <aside className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              From file to insight
            </p>

            <h2 className="mt-3 text-lg font-semibold">
              A workspace for every file
            </h2>

            <ol className="mt-6 space-y-6">
              {[
                {
                  title: "Review & clean",
                  description: "Inspect columns, missing values and duplicate rows.",
                },
                {
                  title: "Ask & visualize",
                  description: "Ask a question and explore the result with charts.",
                },
                {
                  title: "Return & continue",
                  description: "Reopen saved datasets, query history and analysis.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        {/* Existing saved-dataset behavior stays connected */}
        <div id="saved-datasets" className="scroll-mt-6">
          <MyDatasets
            disabled={busy}
            onOpen={openDataset}
          />
        </div>

        <footer className="pb-2 text-center text-xs text-slate-400">
          DataLens · Your data workspace
        </footer>
      </div>
    </main>
  );
}