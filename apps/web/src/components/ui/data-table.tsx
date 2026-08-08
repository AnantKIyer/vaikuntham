import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-(--color-border) bg-(--color-paper)",
        className,
      )}
    >
      <table className="w-full min-w-160 border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) bg-(--color-surface)">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-(--color-muted)",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-(--color-border) last:border-0 hover:bg-(--color-surface)/60"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-(--color-ink-soft)",
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
