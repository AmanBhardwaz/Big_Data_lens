import type { DataRow } from "@/lib/api";

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DataTable({ rows }: { rows: DataRow[] }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-slate-500">No results found.</p>;
  }

  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row)))
  );

  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
          {rows.map((row, index) => (
            <tr key={index} className="transition-colors hover:bg-blue-50/40">
              {columns.map((column) => (
                <td key={column} className="px-4 py-3">
                  {displayValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}