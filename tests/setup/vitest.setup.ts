import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetInvokeMock } from "../helpers/tauri-mock";

// Stub the Tauri updater plugin so pages that dynamically import it remain testable in Vitest/happy-dom
vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn().mockResolvedValue(null),
  // any other named exports the page might touch in the future
}));

beforeEach(() => {
  resetInvokeMock();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
