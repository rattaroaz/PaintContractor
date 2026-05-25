import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditableDropdown } from "../../src/components/EditableDropdown";

describe("EditableDropdown", () => {
  it("calls onChange for every keystroke", async () => {
    const onChange = vi.fn();
    render(
      <EditableDropdown
        data={["Acme", "Beta", "Gamma"]}
        value=""
        onChange={onChange}
        id="company-dd"
      />
    );
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Be");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("opens the picker modal and selects a value", async () => {
    const onChange = vi.fn();
    render(
      <EditableDropdown
        data={["Acme", "Beta"]}
        value=""
        onChange={onChange}
        id="company-dd"
      />
    );
    await userEvent.click(screen.getByTitle("Browse all"));
    await userEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("Beta");
  });

  it("hides the picker button when no data is supplied", () => {
    render(<EditableDropdown data={[]} value="" onChange={() => {}} />);
    expect(screen.queryByTitle("Browse all")).not.toBeInTheDocument();
  });
});
