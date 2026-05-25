import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";

function Boom({ thrown }: { thrown: boolean }): JSX.Element {
  if (thrown) throw new Error("kaboom!");
  return <span>safe</span>;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderInRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    renderInRouter(
      <ErrorBoundary>
        <Boom thrown={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("renders the fallback when a child throws", () => {
    renderInRouter(
      <ErrorBoundary>
        <Boom thrown />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("can toggle the details pane to show the underlying message", () => {
    renderInRouter(
      <ErrorBoundary>
        <Boom thrown />
      </ErrorBoundary>
    );
    expect(screen.queryByText("kaboom!")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show details/i }));
    expect(screen.getByText("kaboom!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /hide details/i }));
    expect(screen.queryByText("kaboom!")).not.toBeInTheDocument();
  });

  it("attempts recovery via the Try Again button", () => {
    renderInRouter(
      <ErrorBoundary>
        <Boom thrown />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    // After recovery there's no error path anymore: the boundary clears
    // hasError, but the next render still uses the same (throwing) child,
    // so React re-catches and the fallback persists. Verify the fallback
    // still renders without a crash.
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("links the user to the dashboard", () => {
    renderInRouter(
      <ErrorBoundary>
        <Boom thrown />
      </ErrorBoundary>
    );
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
