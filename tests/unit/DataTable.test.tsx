import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DataTable, type DataColumn } from "../../src/components/DataTable";

interface Row {
  id: number;
  name: string;
  amount: number;
}

const columns: DataColumn<Row>[] = [
  { key: "id", title: "ID", sortable: true },
  { key: "name", title: "Name", sortable: true },
  { key: "amount", title: "Amount", sortable: true, render: (r) => `$${r.amount}` },
];

const sample: Row[] = [
  { id: 3, name: "Charlie", amount: 30 },
  { id: 1, name: "Alpha", amount: 10 },
  { id: 2, name: "Bravo", amount: 20 },
];

describe("DataTable", () => {
  it("renders all rows with column headers and render callbacks", () => {
    render(<DataTable columns={columns} data={sample} rowKey={(r) => r.id} />);
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
  });

  it("shows the empty message when data is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        emptyMessage="Nothing here"
      />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("sorts rows asc and toggles to desc when the header is clicked twice", () => {
    render(<DataTable columns={columns} data={sample} rowKey={(r) => r.id} />);
    const header = screen.getByRole("columnheader", { name: /name/i });
    fireEvent.click(header);
    let rows = screen.getAllByRole("row").slice(1).map((tr) => within(tr).getAllByRole("cell")[1].textContent);
    expect(rows).toEqual(["Alpha", "Bravo", "Charlie"]);
    fireEvent.click(header);
    rows = screen.getAllByRole("row").slice(1).map((tr) => within(tr).getAllByRole("cell")[1].textContent);
    expect(rows).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("ignores sort clicks on non-sortable columns", () => {
    const cols: DataColumn<Row>[] = [
      { key: "id", title: "ID" },
      { key: "name", title: "Name" },
    ];
    render(<DataTable columns={cols} data={sample} rowKey={(r) => r.id} />);
    fireEvent.click(screen.getByRole("columnheader", { name: /name/i }));
    const rows = screen.getAllByRole("row").slice(1).map((tr) => within(tr).getAllByRole("cell")[1].textContent);
    expect(rows).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("paginates and navigates using Previous / Next", () => {
    const data: Row[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      name: `Row${i}`,
      amount: i,
    }));
    render(
      <DataTable columns={columns} data={data} rowKey={(r) => r.id} pageSize={5} />
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("fires onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={sample}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />
    );
    fireEvent.click(screen.getByText("Charlie"));
    expect(onRowClick).toHaveBeenCalledWith(sample[0]);
  });

  it("renders custom rowClassName when provided", () => {
    render(
      <DataTable
        columns={columns}
        data={sample}
        rowKey={(r) => r.id}
        rowClassName={(r) => (r.amount > 20 ? "row-hot" : "")}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].className).toContain("row-hot");
    expect(rows[1].className).not.toContain("row-hot");
  });
});
