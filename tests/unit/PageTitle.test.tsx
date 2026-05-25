import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTitle } from "../../src/components/PageTitle";

describe("PageTitle", () => {
  it("renders the heading text", () => {
    render(<PageTitle title="Start Job" />);
    expect(screen.getByRole("heading", { name: /start job/i })).toBeInTheDocument();
  });

  it("shows the icon when provided", () => {
    render(<PageTitle title="Sales" icon="📈" />);
    expect(screen.getByText("📈")).toBeInTheDocument();
  });
});
