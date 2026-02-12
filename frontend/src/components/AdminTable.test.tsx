import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminTable, type Column } from "./AdminTable";

type Row = { id: string; name: string; email: string };

const columns: Column<Row>[] = [
  { key: "name", header: "Name", render: (r) => r.name },
  { key: "email", header: "Email", render: (r) => r.email },
];

const rows: Row[] = [
  { id: "1", name: "Alice", email: "alice@test.com" },
  { id: "2", name: "Bob", email: "bob@test.com" },
];

describe("AdminTable", () => {
  it("renders column headers", () => {
    render(<AdminTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(<AdminTable columns={columns} rows={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });

  it("shows empty state when no rows", () => {
    render(<AdminTable columns={columns} rows={[]} getRowId={(r) => r.id} />);
    expect(screen.getByText("No records found")).toBeInTheDocument();
  });

  it("renders edit and delete buttons when handlers provided", () => {
    render(
      <AdminTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getAllByText("Edit")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
  });

  it("calls onEdit with the correct row", () => {
    const onEdit = vi.fn();
    render(
      <AdminTable columns={columns} rows={rows} getRowId={(r) => r.id} onEdit={onEdit} />
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
  });

  it("calls onDelete with the correct row", () => {
    const onDelete = vi.fn();
    render(
      <AdminTable columns={columns} rows={rows} getRowId={(r) => r.id} onDelete={onDelete} />
    );
    fireEvent.click(screen.getAllByText("Delete")[1]);
    expect(onDelete).toHaveBeenCalledWith(rows[1]);
  });

  it("shows load more button when hasMore is true", () => {
    const onLoadMore = vi.fn();
    render(
      <AdminTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );
    const btn = screen.getByText("Load more");
    fireEvent.click(btn);
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("hides load more button when hasMore is false", () => {
    render(
      <AdminTable columns={columns} rows={rows} getRowId={(r) => r.id} hasMore={false} />
    );
    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });
});
