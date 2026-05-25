import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import {
  NotificationProvider,
  useNotification,
} from "../../src/context/NotificationContext";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

describe("NotificationProvider", () => {
  it("renders success / error / info toasts with their bootstrap classes", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => {
      result.current.success("Saved!");
      result.current.error("Oops");
      result.current.info("FYI");
    });
    expect(screen.getByText("Saved!")).toBeInTheDocument();
    expect(screen.getByText("Oops")).toBeInTheDocument();
    expect(screen.getByText("FYI")).toBeInTheDocument();

    const okToast = screen.getByText("Saved!").closest(".toast");
    const errorToast = screen.getByText("Oops").closest(".toast");
    expect(okToast?.className).toContain("bg-success");
    expect(errorToast?.className).toContain("bg-danger");
  });

  it("removes toasts automatically after their duration", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => result.current.notify("info", "transient", 100));
    expect(screen.getByText("transient")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText("transient")).not.toBeInTheDocument();
  });

  it("can dismiss a toast via the close button", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => result.current.success("Hello"));
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("throws if useNotification is called without a provider", () => {
    expect(() => renderHook(() => useNotification())).toThrow(
      /NotificationProvider/
    );
  });
});

describe("Notification UI with provider", () => {
  it("renders the toast container at the top right", () => {
    render(
      <NotificationProvider>
        <span>app</span>
      </NotificationProvider>
    );
    const container = document.querySelector(".toast-container");
    expect(container).not.toBeNull();
  });
});
