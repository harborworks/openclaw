import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function AdminTable<T>({
  columns,
  rows,
  getRowId,
  onEdit,
  onDelete,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: AdminTableProps<T>) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
            {(onEdit || onDelete) && <th style={{ width: 100 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}
              >
                No records found
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
              {(onEdit || onDelete) && (
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    {onEdit && (
                      <button className="admin-btn admin-btn-sm" onClick={() => onEdit(row)}>
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => onDelete(row)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div style={{ textAlign: "center", padding: "var(--space-lg)" }}>
          <button
            className="admin-btn"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
