"use client";

import type { DatasetReport } from "@/lib/api";

type WorkspaceTab =
  | "overview"
  | "ask"
  | "history"
  | "analysis"
  | "recommendations";

type Props = {
  filename: string;
  datasetId: string;
  cleaningId?: string;
  report: DatasetReport;
  optionsChanged: boolean;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
};

const sections: {
  id: WorkspaceTab;
  label: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Overview & Cleaning",
    description: "Inspect your data and manage cleaning settings.",
  },
  {
    id: "ask",
    label: "Ask AI",
    description: "Ask questions and explore calculated answers.",
  },
  {
    id: "history",
    label: "Query History",
    description: "Revisit questions and their saved results.",
  },
  {
    id: "analysis",
    label: "Automatic Analysis",
    description: "Explore statistics, distributions and advanced insights.",
  },
  {
    id: "recommendations",
    label: "Recommendations",
    description: "Review evidence-based suggestions for this dataset.",
  },
];

export default function DatasetHeader({
  filename,
  datasetId,
  cleaningId,
  report,
  optionsChanged,
  tab,
  onTabChange,
}: Props) {
  const excel = /\.xlsx$/i.test(filename);
  const currentSection = sections.find((section) => section.id === tab);

  const statistics = [
    {
      label: "Rows",
      value: report.total_rows,
      description: cleaningId ? "In saved cleaned version" : "In original dataset",
      accent: "border-t-blue-500",
    },
    {
      label: "Columns",
      value: report.total_columns,
      description: "Available data fields",
      accent: "border-t-indigo-400",
    },
    {
      label: "Missing cells",
      value: report.total_missing_values,
      description: "Cells without a value",
      accent: report.total_missing_values > 0
        ? "border-t-amber-400"
        : "border-t-emerald-400",
    },
    {
      label: "Duplicate rows",
      value: report.duplicate_rows,
      description: "Beyond the first occurrence",
      accent: report.duplicate_rows > 0
        ? "border-t-amber-400"
        : "border-t-emerald-400",
    },
  ];

  return (
    <>
      <header className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="flex min-w-0 items-start gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xs font-bold tracking-wide ${
                  excel
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {excel ? "XLSX" : "CSV"}
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Dataset workspace
                </p>
                <h1 className="mt-2 break-words text-xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-2xl">
                  {filename}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Explore, understand and return to your data.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  cleaningId
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {cleaningId ? "Saved cleaned version" : "Original dataset"}
              </span>

              {optionsChanged && (
                <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                  Unapplied settings
                </span>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {statistics.map((item) => (
              <div
                key={item.label}
                className={`min-w-0 rounded-xl border border-slate-100 border-t-2 bg-slate-50/70 p-4 ${item.accent}`}
              >
                <p className="text-xs font-medium text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {item.value.toLocaleString()}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {optionsChanged && (
            <p className="mt-4 text-xs leading-6 text-amber-800">
              Metrics still describe the saved version. Apply cleaning to
              update your dataset with the changed settings.
            </p>
          )}

          <details className="mt-5 rounded-xl border border-slate-100">
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-slate-500 hover:text-blue-700">
              Dataset details
            </summary>

            <dl className="space-y-3 border-t border-slate-100 px-4 py-4 text-xs">
              <div>
                <dt className="font-medium text-slate-500">Dataset ID</dt>
                <dd className="mt-1 break-all font-mono text-slate-700">
                  {datasetId}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Cleaning version</dt>
                <dd className="mt-1 break-all font-mono text-slate-700">
                  {cleaningId ?? "No cleaned version saved yet"}
                </dd>
              </div>
            </dl>
          </details>
        </div>

        <nav
          aria-label="Dataset sections"
          className="flex gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/60 px-3 py-2 sm:px-5"
        >
          {sections.map((section) => {
            const active = tab === section.id;

            return (
              <button
                key={section.id}
                type="button"
                aria-pressed={active}
                onClick={(event) => {
                  onTabChange(section.id);
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                    behavior: "auto",
                  });
                }}
                className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="px-1">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {currentSection?.label}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {currentSection?.description}
        </p>
      </div>
    </>
  );
}