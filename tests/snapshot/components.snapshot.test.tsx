/**
 * Snapshot tests.
 *
 * These freeze the rendered DOM for stable presentational components so any
 * structural change shows up in PR review as a diff. Run
 * `npm run test:snapshot -- -u` to update snapshots after a deliberate UI
 * change.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTitle } from "../../src/components/PageTitle";
import { Modal } from "../../src/components/Modal";
import { DataTable } from "../../src/components/DataTable";

describe("snapshot: PageTitle", () => {
  it("matches the saved snapshot without icon", () => {
    const { asFragment } = render(<PageTitle title="Sales" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the saved snapshot with icon", () => {
    const { asFragment } = render(<PageTitle title="Sales" icon="📈" />);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe("snapshot: Modal", () => {
  it("renders nothing when closed", () => {
    const { asFragment } = render(
      <Modal show={false} title="Confirm" onClose={() => {}}>
        <div>Body</div>
      </Modal>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders content when open", () => {
    const { asFragment } = render(
      <Modal show={true} title="Confirm" onClose={() => {}}>
        <div>Body</div>
      </Modal>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

describe("snapshot: DataTable", () => {
  it("renders headers + rows in a stable order", () => {
    const { asFragment } = render(
      <DataTable
        columns={[
          { key: "id", title: "ID" },
          { key: "name", title: "Name" },
        ]}
        data={[
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ]}
        rowKey={(r) => r.id}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders the empty message when no rows are supplied", () => {
    const { asFragment } = render(
      <DataTable
        columns={[{ key: "id", title: "ID" }]}
        data={[]}
        rowKey={() => "x"}
        emptyMessage="Nothing yet"
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
