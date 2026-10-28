"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import QueryHistory from "@/components/QueryHistory";
import ResultChart from "@/components/ResultChart";
import Recommendations from "@/components/Recommendations";
import AutomaticAnalysis from "@/components/AutomaticAnalysis";
import DatasetHeader from "@/components/Datasetheader";

import DataTable from "@/components/DataTable";
import {
  reopenDataset,
  cleanDataset,
  askDataset,
  type UploadResponse,
  type CleanResponse,
  type AskResponse,
  type CleaningOptions,
} from "@/lib/api";

const defaultOptions: CleaningOptions = {
  trim_spaces: true,
  blank_as_missing: true,
  remove_duplicates: true,
  missing_strategy: "keep",
};

const cardClass =
  "min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7";

const buttonClass =
  "inline-flex items-center justify-center rounded-xl bg-blue-600 " +
  "px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-blue-600 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

type Tab = "overview" | "ask" | "history" | "analysis" | "recommendations";

export default function DatasetWorkspace({
  datasetId,
}: {
  datasetId: string;
}) {
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [cleaned, setCleaned] = useState<CleanResponse | null>(null);
  const [options, setOptions] = useState<CleaningOptions>(defaultOptions);
  const [optionsChanged, setOptionsChanged] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [busy, setBusy] = useState<"clean" | "ask" | null>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError("");

    reopenDataset(datasetId)
      .then((saved) => {
        if (!active) return;

        setUpload(saved.upload);
        setCleaned(saved.latest_cleaning);
        setOptions(
          saved.latest_cleaning?.options ?? { ...defaultOptions },
        );
        setOptionsChanged(false);
        setAnswer(null);
        setQuestion("");
      })
      .catch((err: unknown) => {
        if (!active) return;

        setLoadError(
          err instanceof Error
            ? err.message
            : "Could not open this dataset.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [datasetId, reload]);

  function updateOptions(patch: Partial<CleaningOptions>) {
    setOptions((current) => ({ ...current, ...patch }));
    setOptionsChanged(true);
    setError("");
  }

  async function handleClean() {
    if (!upload || busy) return;

    setBusy("clean");
    setError("");

    try {
      const result = await cleanDataset(datasetId, options);

      setCleaned(result);
      setOptionsChanged(false);
      setAnswer(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Cleaning failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !cleaned ||
      optionsChanged ||
      busy ||
      question.trim().length < 3
    ) {
      return;
    }

    setBusy("ask");
    setError("");
    setAnswer(null);

    try {
      const result = await askDataset(
        datasetId,
        cleaned.cleaning_id,
        question.trim(),
      );

      setAnswer(result);
            if (result.history_saved === false) {
        setError(
          "We got your answer, but it could not be saved to the query history as answer could be too long or database is temporarily unavailable. Please try again later.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Question failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (loading || loadError || !upload) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-slate-900 sm:px-6">
        <Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
          ← Back to datasets
        </Link>

        <div className={`${cardClass} mt-6`}>
          {loading ? (
            <p role="status">Opening your saved dataset...</p>
          ) : (
            <>
              <p role="alert" className="text-red-700">
                {loadError || "Dataset unavailable."}
              </p>
              <button
                type="button"
                onClick={() => setReload((value) => value + 1)}
                className={`${buttonClass} mt-5`}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  const report = cleaned?.after ?? upload;
  const canAsk = !!cleaned && !optionsChanged;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
  <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          href="/dashboard"
          className="inline-block text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to datasets
        </Link>

        <DatasetHeader
  filename={upload.filename}
  datasetId={datasetId}
  cleaningId={cleaned?.cleaning_id}
  report={report}
  optionsChanged={optionsChanged}
  tab={tab}
  onTabChange={setTab}
/>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
                {tab === "history" && (
          <QueryHistory
            key={datasetId}
            datasetId={datasetId}
            currentCleaningId={cleaned?.cleaning_id}
          />
        )}

        {tab === "analysis" && (
  cleaned ? (
    <div className="space-y-4">
      {optionsChanged && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Cleaning settings have unsaved changes. This analysis uses the
          saved cleaning version shown above.
        </p>
      )}

      <AutomaticAnalysis
        key={`${datasetId}:${cleaned.cleaning_id}`}
        datasetId={datasetId}
        cleaningId={cleaned.cleaning_id}
      />
    </div>
  ) : (
    <section className={cardClass}>
      <p className="text-slate-600">
        Apply cleaning in Overview & Cleaning before running analysis.
      </p>
    </section>
  )
)}
{tab === "recommendations" && (
  cleaned ? (
    <div className="space-y-4">
      {optionsChanged && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Cleaning settings have unsaved changes. Recommendations use
          the saved cleaning version shown above.
        </p>
      )}

      <Recommendations
        key={`${datasetId}:${cleaned.cleaning_id}`}
        datasetId={datasetId}
        cleaningId={cleaned.cleaning_id}
        onOpenAnalysis={() => setTab("analysis")}
      />
    </div>
  ) : (
    <section className={cardClass}>
      <p className="text-slate-600">
        Apply cleaning before generating recommendations.
      </p>
    </section>
  )
)}
        {tab === "overview" && (
          <>
            <section className={cardClass}>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Data preview</h2>
              <p className="mb-5 mt-2 text-sm text-slate-500">
                First 10 rows of the {cleaned ? "cleaned" : "original"} dataset.
              </p>

              <DataTable rows={report.preview} />

              <details className="mt-6">
                <summary className="cursor-pointer font-semibold">
                  Column quality report
                </summary>
                <div className="mt-4">
                  <DataTable
                    rows={report.column_report.map((column) => ({
                      Column: column.column,
                      Type: column.data_type,
                      Missing: column.missing_values,
                      "Missing %": column.missing_percentage,
                      "Unique values": column.unique_values,
                    }))}
                  />
                </div>
              </details>
            </section>

            <section className={cardClass}>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Cleaning controls</h2>
              <p className="mt-2 text-sm text-slate-500">
                Each cleaning run starts from the original file and saves a new version.
              </p>

              <fieldset disabled={busy !== null} className="mt-5 space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={options.trim_spaces}
                    onChange={(event) =>
                      updateOptions({ trim_spaces: event.target.checked })
                    }
                  />
                  Trim spaces around text
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={options.blank_as_missing}
                    onChange={(event) =>
                      updateOptions({ blank_as_missing: event.target.checked })
                    }
                  />
                  Treat blank cells as missing
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={options.remove_duplicates}
                    onChange={(event) =>
                      updateOptions({ remove_duplicates: event.target.checked })
                    }
                  />
                  Remove identical duplicate rows
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Missing values
                  </span>
                  <select
                    value={options.missing_strategy}
                    onChange={(event) =>
                      updateOptions({
                        missing_strategy:
                          event.target.value === "drop_rows"
                            ? "drop_rows"
                            : "keep",
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:w-auto"
                  >
                    <option value="keep">Keep rows with missing values</option>
                    <option value="drop_rows">
                      Remove rows with any missing value
                    </option>
                  </select>
                </label>
              </fieldset>

              {optionsChanged && (
                <p className="mt-4 text-sm text-amber-700">
                  Settings changed. Apply cleaning before asking another question.
                  The preview still shows the saved version.
                </p>
              )}

              <button
                type="button"
                onClick={handleClean}
                disabled={busy !== null}
                className={`${buttonClass} mt-5`}
              >
                {busy === "clean" ? "Cleaning..." : "Apply cleaning"}
              </button>

              {cleaned && (
                <p role="status" className="mt-4 text-sm text-emerald-700">
                  Saved version: {cleaned.before.total_rows} →{" "}
                  {cleaned.after.total_rows} rows. Removed{" "}
                  {cleaned.duplicate_rows_removed} duplicates and{" "}
                  {cleaned.missing_rows_removed} rows with missing values.
                </p>
              )}
            </section>
          </>
        )}

        {tab === "ask" && (
          <section className={cardClass}>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Ask this dataset</h2>

            <p className="mt-2 text-sm text-slate-500">
              {canAsk
                ? "Questions use the saved cleaning version shown above."
                : "Open Overview & Cleaning and apply your cleaning settings first."}
            </p>

            <form onSubmit={handleAsk} className="mt-5 space-y-4">
              <textarea
                aria-label="Question about this dataset"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="How many rows are in this dataset?"
                rows={3}
                maxLength={2000}
                disabled={!canAsk || busy !== null}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-4 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <button
                type="submit"
                disabled={!canAsk || busy !== null || question.trim().length < 3}
                className={buttonClass}
              >
                {busy === "ask" ? "Finding your answer..." : "Get Answer"}
              </button>
            </form>

            {busy === "ask" && (
              <p role="status" className="mt-4 text-sm text-slate-500">
                Processing your question...
              </p>
            )}

            {answer && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                {answer.status === "success" ? (
                  <>
                    <h3 className="font-semibold">{answer.question}</h3>
                    <p className="my-3 text-slate-600">{answer.calculation}</p>

                   <ResultChart
  rows={answer.result}
  truncated={answer.truncated}
/>

<DataTable rows={answer.result} />

                    {answer.truncated && (
                      <p className="mt-3 text-sm text-amber-700">
                        Showing a limited preview of the result.
                      </p>
                    )}

                    <details className="mt-5">
                      <summary className="cursor-pointer text-sm font-semibold">
                        View generated SQL
                      </summary>
                      <pre className="mt-3 overflow-auto rounded-xl bg-slate-900 p-4 text-sm text-white">
                        {answer.sql}
                      </pre>
                    </details>
                  </>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
                    <p className="font-semibold">
                      {answer.status === "clarification"
                        ? "Please clarify your question"
                        : "Required information is unavailable"}
                    </p>
                    <p className="mt-2">{answer.message}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}