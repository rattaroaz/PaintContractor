/**
 * Deep integration tests for EditCompany and EditContractor:
 * save, delete gated by confirmDelete, and validation.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  autoConfirm,
  getInvokeCallsFor,
  mockInvoke,
  mockInvokeMany,
  okResult,
  resetInvokeMock,
} from "../helpers/tauri-mock";
import { NotificationProvider } from "../../src/context/NotificationContext";
import { GlobalStateProvider } from "../../src/context/GlobalStateContext";
import { makeCompany, makeContractor } from "../helpers/fixtures";

function renderWithProviders(node: React.ReactNode) {
  return render(
    <NotificationProvider>
      <GlobalStateProvider>
        <MemoryRouter>{node}</MemoryRouter>
      </GlobalStateProvider>
    </NotificationProvider>
  );
}

beforeEach(() => {
  resetInvokeMock();
  mockInvoke("get_my_company_info", async () => ({
    id: 1,
    name: "DKSK",
    phone: "1",
    email: "a@b.c",
    address: "x",
    zip: "1",
    license_number: "L",
  }));
  mockInvoke("get_next_company_id", async () => 1003);
});

describe("EditCompany", () => {
  async function renderAndSelectCompany(seed = makeCompany({ id: 5, name: "Beta Corp" })) {
    autoConfirm(true);
    mockInvoke("get_all_companies", async () => [seed]);
    const { EditCompany } = await import("../../src/pages/EditCompany");
    renderWithProviders(<EditCompany />);
    await waitFor(() => screen.getByText(/select company/i));
    fireEvent.change(screen.getByPlaceholderText(/type first letters/i), {
      target: { value: seed.name },
    });
    // Delete Company only renders when company.id > 0 (proves selection stuck).
    await waitFor(() =>
      screen.getByRole("button", { name: /^delete company$/i })
    );
    return seed;
  }

  it("saves the selected company via save_company", async () => {
    mockInvoke("save_company", async (args) => {
      const c = (args as { company: ReturnType<typeof makeCompany> }).company;
      return okResult({ ...c, name: "Beta Corp Updated" });
    });

    const seed = await renderAndSelectCompany();
    const nameCol = screen.getByText(/^name \*$/i).closest(".col-md-5")!;
    const nameInput = within(nameCol).getByRole("textbox");
    fireEvent.change(nameInput, {
      target: { value: "Beta Corp Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(getInvokeCallsFor("save_company").length).toBe(1);
    });
  });

  it("does not delete when confirmDelete returns false", async () => {
    autoConfirm(false);
    mockInvoke("delete_company", async () => okResult(undefined));

    await renderAndSelectCompany();
    fireEvent.click(screen.getByRole("button", { name: /^delete company$/i }));

    expect(getInvokeCallsFor("delete_company")).toHaveLength(0);
  });

  it("deletes when confirmDelete returns true", async () => {
    autoConfirm(true);
    mockInvoke("delete_company", async () => okResult(undefined, "Deleted"));

    const seed = await renderAndSelectCompany();
    fireEvent.click(screen.getByRole("button", { name: /^delete company$/i }));

    await waitFor(() => {
      expect(getInvokeCallsFor("delete_company")[0]?.companyId).toBe(seed.id);
    });
  });
});

describe("EditContractor", () => {
  it("blocks save when name is empty", async () => {
    autoConfirm(true);
    mockInvoke("get_all_contractors", async () => []);

    const { EditContractor } = await import("../../src/pages/EditContractor");
    renderWithProviders(<EditContractor />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(getInvokeCallsFor("save_contractor")).toHaveLength(0);
    });
  });

  it("saves contractor when name is provided", async () => {
    autoConfirm(true);
    mockInvokeMany({
      get_all_contractors: async () => [],
      save_contractor: async (args) => {
        const saved = (args as { contractor: ReturnType<typeof makeContractor> })
          .contractor;
        return okResult({ ...saved, id: 9, name: "New Painter" });
      },
    });

    const { EditContractor } = await import("../../src/pages/EditContractor");
    renderWithProviders(<EditContractor />);

    fireEvent.click(screen.getByRole("button", { name: /add contractor/i }));
    const nameInputs = screen.getAllByRole("textbox");
    const nameInput = nameInputs.find(
      (el) => (el as HTMLInputElement).value === ""
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "New Painter" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(getInvokeCallsFor("save_contractor").length).toBe(1);
    });
  });

  async function selectContractor(c = makeContractor({ id: 3, name: "Alex Painter" })) {
    mockInvoke("get_all_contractors", async () => [c]);
    const { EditContractor } = await import("../../src/pages/EditContractor");
    renderWithProviders(<EditContractor />);
    // Browse button only renders after contractors load; avoids racing the async fetch.
    fireEvent.click(await screen.findByTitle("Browse all"));
    fireEvent.click(await screen.findByRole("button", { name: c.name }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    });
    return c;
  }

  it("does not delete contractor when user cancels confirm", async () => {
    autoConfirm(false);
    mockInvoke("delete_contractor", async () => okResult(undefined));
    await selectContractor();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(getInvokeCallsFor("delete_contractor")).toHaveLength(0);
  });

  it("deletes contractor after confirm", async () => {
    autoConfirm(true);
    mockInvoke("delete_contractor", async () => okResult(undefined));
    const c = await selectContractor();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(getInvokeCallsFor("delete_contractor").length).toBe(1);
      expect(getInvokeCallsFor("delete_contractor")[0]?.id).toBe(c.id);
    });
  });
});
