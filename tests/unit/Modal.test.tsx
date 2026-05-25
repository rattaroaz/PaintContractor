import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "../../src/components/Modal";

describe("Modal", () => {
  it("does not render when show is false", () => {
    render(
      <Modal show={false} title="Hidden" onClose={() => undefined}>
        body
      </Modal>
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("renders the title and body when show is true", () => {
    render(
      <Modal show title="Confirm" onClose={() => undefined}>
        <p>Body content</p>
      </Modal>
    );
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("invokes onClose when the dismiss button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal show title="Close me" onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key while visible", () => {
    const onClose = vi.fn();
    render(
      <Modal show title="Esc" onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("ignores Escape when hidden", () => {
    const onClose = vi.fn();
    render(
      <Modal show={false} title="Hidden" onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the requested size modifier classes", () => {
    const { container, rerender } = render(
      <Modal show title="A" onClose={() => undefined} size="lg">
        body
      </Modal>
    );
    expect(container.querySelector(".modal-lg")).toBeInTheDocument();
    rerender(
      <Modal show title="B" onClose={() => undefined} size="xl">
        body
      </Modal>
    );
    expect(container.querySelector(".modal-xl")).toBeInTheDocument();
    rerender(
      <Modal show title="C" onClose={() => undefined} size="sm">
        body
      </Modal>
    );
    expect(container.querySelector(".modal-sm")).toBeInTheDocument();
  });

  it("renders an optional footer", () => {
    render(
      <Modal
        show
        title="With footer"
        onClose={() => undefined}
        footer={<button type="button">Submit</button>}
      >
        body
      </Modal>
    );
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});
