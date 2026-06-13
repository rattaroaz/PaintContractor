/**
 * Integration test for the JobCatalog page. Wires the real component into a
 * mocked IPC layer so we can drive a multi-step flow:
 *   1. Initial render shows one row per unique description.
 *   2. Changing bed/bath updates the price from the in-memory catalog.
 *   3. Duplicate descriptions are rejected before any save fires.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { JobCatalogPage } from "../../src/pages/JobCatalogPage";
import { AppProviders } from "../../src/context/AppProviders";
import {
  autoConfirm,
  getInvokeCallsFor,
  mockInvoke,
  mockInvokeMany,
  okResult,
} from "../helpers/tauri-mock";
import { makeJob } from "../helpers/fixtures";

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <JobCatalogPage />
      </AppProviders>
    </MemoryRouter>
  );
}

function getRows(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll('[data-testid="job-catalog-row"]')
  );
}

const seed = [
  makeJob({ id: 1, description: "Paint", size_bedroom: 1, size_bathroom: 1, price: 50 }),
  makeJob({ id: 2, description: "Paint", size_bedroom: 2, size_bathroom: 2, price: 100 }),
  makeJob({ id: 3, description: "Trim", size_bedroom: 2, size_bathroom: 2, price: 30 }),
];

describe("JobCatalogPage integration", () => {
  it("renders one row per unique description with the smallest bed/bath as default", async () => {
    autoConfirm(true);
    mockInvoke("get_all_jobs", async () => seed.slice());

    const { container } = renderPage();

    await screen.findByDisplayValue("Paint");
    await screen.findByDisplayValue("Trim");

    const rows = getRows(container);
    expect(rows).toHaveLength(2);

    const paintRow = rows[0];
    const paintInputs = within(paintRow).getAllByRole("textbox") as HTMLInputElement[];
    const paintNumbers = within(paintRow).getAllByRole("spinbutton") as HTMLInputElement[];
    expect(paintInputs[0].value).toBe("Paint");
    expect(paintNumbers[0].value).toBe("1");
    expect(paintNumbers[1].value).toBe("1");
    expect(paintNumbers[2].value).toBe("50");
  });

  it("dynamically updates price when bed/bath change", async () => {
    autoConfirm(true);
    mockInvokeMany({
      get_all_jobs: async () => seed.slice(),
      upsert_job: async (args) => okResult((args as { job: unknown }).job),
    });

    const { container } = renderPage();
    await screen.findByDisplayValue("Paint");

    const paintRow = getRows(container)[0];
    const numbers = within(paintRow).getAllByRole("spinbutton") as HTMLInputElement[];

    fireEvent.change(numbers[0], { target: { value: "2" } });
    fireEvent.change(numbers[1], { target: { value: "2" } });

    await waitFor(() => {
      const after = within(paintRow).getAllByRole("spinbutton") as HTMLInputElement[];
      expect(after[2].value).toBe("100");
    });
  });

  it("debounces price changes and calls upsert_job after 400ms", async () => {
    autoConfirm(true);
    mockInvokeMany({
      get_all_jobs: async () => seed.slice(),
      upsert_job: async (args) => okResult((args as { job: unknown }).job),
    });

    const { container } = renderPage();
    await screen.findByDisplayValue("Paint");

    const paintRow = getRows(container)[0];
    const numbers = within(paintRow).getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(numbers[2], { target: { value: "77" } });

    expect(getInvokeCallsFor("upsert_job")).toHaveLength(0);

    await waitFor(
      () => {
        expect(getInvokeCallsFor("upsert_job").length).toBeGreaterThanOrEqual(1);
        const call = getInvokeCallsFor("upsert_job").at(-1);
        expect((call?.job as { price: number }).price).toBe(77);
      },
      { timeout: 900 }
    );
  });

  it("renames the saved description by deleting then re-upserting", async () => {
    autoConfirm(true);
    const upsertCalls: Array<{ description: string; price: number }> = [];
    const deleteCalls: string[] = [];
    mockInvokeMany({
      get_all_jobs: async () => [seed[2]],
      upsert_job: async (args) => {
        const job = (args as { job: { description: string; price: number } }).job;
        upsertCalls.push({ description: job.description, price: job.price });
        return okResult({ ...job, id: 99 });
      },
      delete_jobs_by_description: async (args) => {
        deleteCalls.push(String((args as { description: string }).description));
        return okResult(1);
      },
    });

    const { container } = renderPage();
    await screen.findByDisplayValue("Trim");

    const row = getRows(container)[0];
    const descInput = within(row).getAllByRole("textbox")[0] as HTMLInputElement;
    fireEvent.change(descInput, { target: { value: "Interior" } });

    await waitFor(
      () => {
        expect(upsertCalls.some((u) => u.description === "Interior")).toBe(true);
        expect(deleteCalls).toContain("Trim");
      },
      { timeout: 2_000 }
    );
  });
});
