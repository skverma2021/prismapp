import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

type Column<T> = {
  /** Header label */
  header: string;
  /** Render the cell content for this column */
  render: (item: T, index: number) => ReactNode;
  /** Optional className for <th> and <td> */
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  items: T[];
  loading: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  /** Unique key extractor */
  rowKey: (item: T) => string | number;
};

export function DataTable<T>({
  columns,
  items,
  loading,
  loadingMessage = "Loading...",
  emptyMessage = "No items found for the current filter.",
  rowKey,
}: DataTableProps<T>) {
  const colSpan = columns.length;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={`px-3 py-2 text-left ${col.className ?? ""}`.trim()}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-4 text-slate-600" colSpan={colSpan}>
                {loadingMessage}
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-slate-600" colSpan={colSpan}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={rowKey(item)} className="border-t border-slate-100 align-top text-slate-700">
                {columns.map((col) => (
                  <td key={col.header} className={`px-3 py-3 ${col.className ?? ""}`.trim()}>
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
