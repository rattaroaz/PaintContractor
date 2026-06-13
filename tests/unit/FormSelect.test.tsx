import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormSelect } from "../../src/components/FormSelect";

describe("FormSelect", () => {
  it("renders a native select with form-select styling", () => {
    render(
      <FormSelect
        options={["Acme", "Beta Corp"]}
        value=""
        onChange={() => {}}
        id="company-select"
        placeholder="Select…"
      />
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("form-select");
    expect(select).toHaveAttribute("id", "company-select");
  });

  it("calls onChange when an option is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FormSelect
        options={["Acme", "Beta Corp"]}
        value=""
        onChange={onChange}
        placeholder="Select…"
      />
    );

    await user.selectOptions(screen.getByRole("combobox"), "Beta Corp");
    expect(onChange).toHaveBeenCalledWith("Beta Corp");
  });

  it("includes the current value even when it is not in options", () => {
    render(
      <FormSelect
        options={["Acme"]}
        value="Legacy Co"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole("option", { name: "Legacy Co" })).toBeInTheDocument();
  });
});
