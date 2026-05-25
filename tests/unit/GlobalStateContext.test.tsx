import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { mockInvoke, resetInvokeMock } from "../helpers/tauri-mock";
import {
  GlobalStateProvider,
  useGlobalState,
} from "../../src/context/GlobalStateContext";
import { makeMyCompanyInfo as makeMyCompany } from "../helpers/fixtures";

beforeEach(() => {
  resetInvokeMock();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <GlobalStateProvider>{children}</GlobalStateProvider>;
}

describe("GlobalStateProvider", () => {
  it("loads my company info on mount", async () => {
    mockInvoke("get_my_company_info", async () => makeMyCompany({ name: "DKSK" }));
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myCompanyInfo?.name).toBe("DKSK");
  });

  it("falls back to the default company shape on failure", async () => {
    mockInvoke("get_my_company_info", async () => {
      throw new Error("offline");
    });
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myCompanyInfo).toMatchObject({ id: 0, name: "" });
  });

  it("updates currentSection synchronously", async () => {
    mockInvoke("get_my_company_info", async () => makeMyCompany({ name: "X" }));
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setCurrentSection("Finance"));
    expect(result.current.currentSection).toBe("Finance");
  });

  it("re-runs refreshCompanyInfo on demand", async () => {
    let counter = 0;
    mockInvoke("get_my_company_info", async () => {
      counter += 1;
      return makeMyCompany({ name: `Co${counter}` });
    });
    const { result } = renderHook(() => useGlobalState(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refreshCompanyInfo();
    });
    expect(result.current.myCompanyInfo?.name).toBe("Co2");
  });

  it("throws if useGlobalState is called without a provider", () => {
    expect(() => renderHook(() => useGlobalState())).toThrow(
      /GlobalStateProvider/
    );
  });
});
