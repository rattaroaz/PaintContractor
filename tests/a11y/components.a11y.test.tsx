/**
 * Accessibility audit using axe-core against rendered components.
 *
 * The goal is not to be exhaustive, but to *fail the build* if a core,
 * production-facing component picks up a category of violations we
 * previously cleaned up (color contrast on toasts, missing labels on
 * dialogs/modals, etc.).
 */
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Modal } from "../../src/components/Modal";
import { DataTable, type DataColumn } from "../../src/components/DataTable";
import { PageTitle } from "../../src/components/PageTitle";
import {
  NotificationProvider,
  useNotification,
} from "../../src/context/NotificationContext";

async function audit(node: Element): Promise<void> {
  const results = await axe.run(node, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa"],
    },
    rules: {
      // The mocked DOM lacks loaded CSS, so color-contrast can't be
      // measured reliably.
      "color-contrast": { enabled: false },
      // Region rule complains about test-only roots not having a landmark.
      region: { enabled: false },
    },
  });
  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `  • ${v.id}: ${v.help} (${v.nodes.length} node${
            v.nodes.length === 1 ? "" : "s"
          })`
      )
      .join("\n");
    throw new Error(`axe violations:\n${summary}`);
  }
  expect(results.violations).toEqual([]);
}

describe("a11y", () => {
  it("Modal has no axe violations", async () => {
    const { container } = render(
      <Modal show title="Confirm" onClose={() => undefined}>
        <p>Body</p>
      </Modal>
    );
    await audit(container);
  });

  it("DataTable has no axe violations", async () => {
    const cols: DataColumn<{ id: number; name: string }>[] = [
      { key: "id", title: "ID" },
      { key: "name", title: "Name" },
    ];
    const { container } = render(
      <DataTable
        columns={cols}
        data={[{ id: 1, name: "A" }]}
        rowKey={(r) => r.id}
      />
    );
    await audit(container);
  });

  it("PageTitle has no axe violations", async () => {
    const { container } = render(
      <PageTitle title="Dashboard" icon="🏠" />
    );
    await audit(container);
  });

  it("Notification toasts have no axe violations", async () => {
    function Bootstrap() {
      const { success, error, info } = useNotification();
      return (
        <button
          type="button"
          onClick={() => {
            success("ok");
            error("bad");
            info("note");
          }}
        >
          fire
        </button>
      );
    }
    const { container, getByRole } = render(
      <NotificationProvider>
        <Bootstrap />
      </NotificationProvider>
    );
    getByRole("button", { name: /fire/i }).click();
    await audit(container);
  });
});
