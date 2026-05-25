import { useMemo, useState } from "react";

export interface DataColumn<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  pageSize?: number;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  rowKey,
  onRowClick,
  rowClassName,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return [...data];
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortable) return [...data];
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const aStr = av == null ? "" : String(av);
      const bStr = bv == null ? "" : String(bv);
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  return (
    <div className="data-table-wrapper">
      <div className="table-responsive">
        <table className="table table-striped table-hover table-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.sortable ? "sortable" : undefined}
                  onClick={() => toggleSort(col.key, col.sortable)}
                >
                  {col.title}
                  {col.sortable && sortKey === col.key && (
                    <span className="ms-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={[
                    onRowClick ? "table-row-clickable" : "",
                    rowClassName?.(row) ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? ""
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <nav className="d-flex justify-content-between align-items-center mt-2">
          <span className="text-muted small">
            Showing {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 0 ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                {currentPage + 1} / {totalPages}
              </span>
            </li>
            <li
              className={`page-item ${
                currentPage >= totalPages - 1 ? "disabled" : ""
              }`}
            >
              <button
                type="button"
                className="page-link"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
